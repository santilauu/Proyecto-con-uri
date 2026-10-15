import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, jitter, normalizarTelefonoAR } from './util.js';
import { evaluarWeb } from './webcheck.js';
import { esEmpresaGrande } from './benchmark.js';
import { FILTROS_DEFAULT, tieneExcluida, cumpleCalificacion, cumpleEstadoWeb, cumpleTelefono, cumpleRedes, necesitaRedes, resumenFiltros } from './filtros.js';
import { verificarWebEnBuscador, buscarTelefonoEnRedes } from './verificacion.js';
import { detectarRedes } from './redes.js';

const sinAcentos = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function aceptarConsentimiento(page) {
  const boton = page.locator('button:has-text("Aceptar todo"), button:has-text("Accept all")').first();
  if (await boton.isVisible({ timeout: 3000 }).catch(() => false)) await boton.click();
}

/** Calificación y cantidad de reseñas, si la ficha las muestra. */
const leerReputacion = (texto) => {
  const rating = texto.match(/(\d[.,]\d)\s*(?:estrellas|stars)/i);
  const resenas = texto.match(/([\d.]+)\s*(?:reseñas|opiniones|reviews)/i);
  return {
    rating: rating ? parseFloat(rating[1].replace(',', '.')) : null,
    resenas: resenas ? parseInt(resenas[1].replace(/\./g, ''), 10) : null,
  };
};

/**
 * Busca "<consulta> en <zona>" en Google Maps y devuelve los negocios que pasan los filtros.
 * Cada descarte se registra en el log con su motivo. Ritmo lento a propósito.
 */
export async function buscarNegocios({ consulta, rubroKey, zona, maximo = 20, filtros = FILTROS_DEFAULT, log = console.log }) {
  const f = { ...FILTROS_DEFAULT, ...filtros };
  const barrioElegido = sinAcentos(zona.split(',')[0]).trim();
  const descartes = {};
  const descartar = (motivo) => { descartes[motivo] = (descartes[motivo] ?? 0) + 1; };

  log(`Filtros activos: ${resumenFiltros(f)}`);
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '1' });
  const page = await (await browser.newContext({ locale: 'es-AR' })).newPage();
  const encontrados = [];
  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(`${consulta} en ${zona}`)}?hl=es`, { waitUntil: 'domcontentloaded' });
    await aceptarConsentimiento(page);
    const feed = page.locator('div[role="feed"]');
    // Google muestra la lista de resultados, o directamente una ficha si la búsqueda tiene una sola coincidencia.
    const forma = await Promise.any([
      feed.waitFor({ timeout: 20000 }).then(() => 'lista'),
      page.locator('h1').first().waitFor({ timeout: 20000 }).then(() => 'ficha'),
    ]).catch(async () => {
      const captura = path.join(ROOT, 'data', 'diagnostico-maps.png');
      await page.screenshot({ path: captura, fullPage: false }).catch(() => {});
      throw new Error(`Google Maps no mostró resultados (URL: ${page.url().slice(0, 120)}). Puede ser una pantalla de consentimiento o de verificación. Captura en ${captura}.`);
    });

    let enlaces;
    if (forma === 'lista') {
      log('Cargando resultados...');
      let previos = 0;
      for (let i = 0; i < 12; i++) {
        await feed.evaluate((n) => n.scrollTo(0, n.scrollHeight));
        await jitter(1500, 2500);
        const n = await page.locator('div[role="feed"] a.hfpxzc').count();
        if (n >= maximo * 2 || n === previos) break;
        previos = n;
      }
      enlaces = await page.locator('div[role="feed"] a.hfpxzc').evaluateAll((as) => as.map((a) => a.href));
    } else {
      log('Google mostró una sola ficha para esta búsqueda.');
      enlaces = [page.url()];
    }
    log(`${enlaces.length} resultados. Revisando cada ficha...`);

    for (const href of enlaces) {
      if (encontrados.length >= maximo) break;
      try {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
        await page.locator('h1').first().waitFor({ timeout: 10000 });
        await jitter(1200, 2200);
        const datos = await page.evaluate(() => {
          const txt = (sel) => document.querySelector(sel)?.getAttribute('aria-label')?.replace(/^[^:]+:\s*/, '').trim() ?? null;
          return {
            nombre: document.querySelector('h1')?.textContent?.trim() ?? null,
            direccion: txt('button[data-item-id="address"]'),
            telefono: txt('button[data-item-id^="phone"]'),
            web: document.querySelector('a[data-item-id="authority"]')?.href ?? null,
            categoria: document.querySelector('button[jsaction*="category"]')?.textContent?.trim() ?? null,
            reputacion: document.querySelector('div.F7nice')?.textContent ?? '',
          };
        });
        if (!datos.nombre) continue;

        // 1. Zona: Maps ordena por tu ubicación y puede mostrar negocios de otro barrio.
        if (barrioElegido && !sinAcentos(datos.direccion).includes(barrioElegido)) {
          log(`  - ${datos.nombre}: fuera de ${zona.split(',')[0]}, se descarta`);
          descartar('fuera de la zona');
          continue;
        }
        // 2. Palabras excluidas (nombre o categoría).
        const excluida = tieneExcluida(f, datos.nombre, datos.categoria);
        if (excluida) { log(`  - ${datos.nombre}: contiene "${excluida}", se descarta`); descartar('palabra excluida'); continue; }
        // 3. Empresas grandes (CLAUDE.md).
        const grande = esEmpresaGrande(datos);
        if (grande) { log(`  - ${datos.nombre}: empresa grande (${grande}), se descarta`); descartar('empresa grande'); continue; }
        // 4. Calificación y reseñas.
        const { rating, resenas } = leerReputacion(datos.reputacion);
        if (!cumpleCalificacion(f, rating, resenas)) {
          log(`  - ${datos.nombre}: calificación ${rating ?? 'sin dato'} / reseñas ${resenas ?? 'sin dato'}, se descarta`);
          descartar('calificación o reseñas');
          continue;
        }
        // 5. Web: primero lo que dice Maps; después, si no hay web, se confirma en el buscador.
        let { webEstado, motivos } = await evaluarWeb(datos.web);
        let webVerificada = null;
        if (webEstado === 'ok') { log(`  - ${datos.nombre}: web correcta, se descarta`); descartar('web correcta'); continue; }
        if (webEstado === 'sin_web') {
          const hallazgo = await verificarWebEnBuscador(datos.nombre, barrioElegido || zona);
          if (hallazgo?.fuerte) {
            log(`  - ${datos.nombre}: tiene sitio propio en el buscador (${hallazgo.url}), se descarta`);
            descartar('tiene web en el buscador');
            continue;
          }
          if (hallazgo) {
            webVerificada = hallazgo.url;
            motivos = [...motivos, 'posible web en el buscador, revisar'];
          } else {
            motivos = [...motivos, 'confirmado en el buscador: sin web'];
          }
        }
        if (!cumpleEstadoWeb(f, webEstado)) { descartar('estado de web'); continue; }

        // 6. Teléfono: si Maps no lo tiene, se busca en las redes cuando el filtro lo necesita.
        let { telefono, movil } = normalizarTelefonoAR(datos.telefono);
        let telefonoOrigen = telefono ? 'maps' : null;
        let telefonoCrudo = datos.telefono;
        let redes = {};
        if (necesitaRedes(f, telefono)) {
          redes = await detectarRedes({ nombre: datos.nombre, zona, web: datos.web });
          if (!telefono) {
            const hallado = await buscarTelefonoEnRedes(redes);
            if (hallado) {
              ({ telefono, movil } = hallado);
              telefonoOrigen = hallado.origen;
              telefonoCrudo = hallado.crudo;
              log(`    teléfono hallado en ${hallado.origen}: ${telefono} (a confirmar)`);
            }
          }
        }
        if (!cumpleTelefono(f, telefono, movil)) {
          log(`  - ${datos.nombre}: no cumple el filtro de teléfono, se descarta`);
          descartar('teléfono');
          continue;
        }
        // 7. Redes sociales.
        if (!cumpleRedes(f, redes)) {
          log(`  - ${datos.nombre}: no cumple el filtro de redes, se descarta`);
          descartar('redes');
          continue;
        }

        log(`  + ${datos.nombre}: ${webEstado}${motivos.length ? ` (${motivos.join(', ')})` : ''}${telefono ? '' : ' [sin teléfono]'}`);
        encontrados.push({
          id: Math.random().toString(36).slice(2, 9),
          nombre: datos.nombre, direccion: datos.direccion, telefonoCrudo, categoria: datos.categoria,
          telefono, movil, telefonoOrigen, web: datos.web, webEstado, motivos, webVerificada,
          rating, resenas, redes: Object.keys(redes).length ? redes : undefined,
          rubro: rubroKey, zona, filtrosAplicados: resumenFiltros(f),
        });
      } catch (e) {
        log(`  ! ficha omitida: ${e.message.split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
  }
  const resumen = Object.entries(descartes).map(([k, v]) => `${k}: ${v}`).join(' · ');
  log(`Descartados: ${resumen || 'ninguno'}`);
  return encontrados;
}
