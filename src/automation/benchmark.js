import fs from 'node:fs';
import path from 'node:path';
import { ROOT, rubros, jitter } from './util.js';

/*
 * Verificación de rubro + análisis de competencia.
 * 1) clasificarRubro: confirma que el negocio es del rubro asignado (nombre + categoría de Google Maps).
 * 2) analizarRubro: mira sitios reales del mismo rubro y mide qué secciones y funciones suelen tener.
 *    Solo se analiza ESTRUCTURA (qué secciones existen); no se copia ningún texto ni imagen.
 *    El resultado se guarda en data/benchmark/<rubro>.json y se reutiliza (vence a los 90 días).
 */

const DIR = path.join(ROOT, 'data', 'benchmark');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const VIGENCIA_DIAS = 90;

const limpiar = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Empresas grandes: no encajan con el modelo de negocio (ver CLAUDE.md).
const GRANDES = ['cine', 'teatro', 'colegio', 'universidad', 'facultad', 'shopping', 'supermercado', 'hipermercado', 'hospital', 'banco', 'estadio', 'aeropuerto', 'terminal de', 'municipalidad', 'ministerio de', 'cadena', 'carrefour', 'coto', 'jumbo', 'cinemark', 'hoyts', 'mcdonald', 'burger king', 'starbucks', 'farmacity', 'sanatorio'];
export const esEmpresaGrande = (lead) => { const t = ` ${limpiar(lead.nombre)} | ${limpiar(lead.categoria)} `; return GRANDES.find((g) => new RegExp(String.raw`(?<![\p{L}])${g}(?![\p{L}])`, 'u').test(t)) ?? null; };

// ---------- 1) clasificación de rubro ----------
export function clasificarRubro(lead) {
  const texto = ` ${limpiar(lead.nombre)} | ${limpiar(lead.categoria)} `;
  const categoria = limpiar(lead.categoria);
  const puntajes = {};
  for (const [k, r] of Object.entries(rubros)) {
    puntajes[k] = (r.claves ?? []).reduce((n, c) => n + (texto.includes(c) ? 1 : 0) + (categoria.includes(c) ? 1 : 0), 0);
  }
  const [mejor, puntaje] = Object.entries(puntajes).sort((a, b) => b[1] - a[1])[0];
  const actual = puntajes[lead.rubro] ?? 0;
  // Cambio "fuerte": otro rubro tiene evidencia clara y el asignado no tiene ninguna.
  const dudoso = mejor !== lead.rubro && puntaje >= 2 && actual === 0;
  return { asignado: lead.rubro, detectado: puntaje >= 1 ? mejor : null, puntaje, dudoso, puntajes };
}

// ---------- 2) análisis de competencia ----------
const SECCIONES = {
  servicios: ['servicios', 'tratamientos', 'especialidades', 'prestaciones', 'que hacemos', 'clases', 'disciplinas', 'cursos', 'menu', 'carta', 'productos', 'actividades'],
  precios: ['precios', 'tarifas', 'planes', 'valores', 'cuotas', 'aranceles', 'presupuesto', 'costos'],
  equipo: ['equipo', 'profesionales', 'nosotros', 'quienes somos', 'staff', 'nuestro equipo', 'historia'],
  galeria: ['galeria', 'fotos', 'instalaciones', 'trabajos', 'portfolio', 'proyectos', 'antes y despues'],
  testimonios: ['testimonios', 'opiniones', 'clientes', 'reseñas', 'resenas', 'dicen de nosotros'],
  faq: ['preguntas frecuentes', 'faq', 'dudas'],
  turnos: ['turnos', 'reservas', 'reservar', 'agenda', 'pedir turno', 'solicitar turno'],
  promos: ['promociones', 'ofertas', 'combos', 'beneficios', 'promos'],
  horarios: ['horarios', 'horario de atencion', 'cuando'],
  ubicacion: ['ubicacion', 'como llegar', 'donde estamos', 'contacto', 'sucursales'],
  tienda: ['tienda', 'comprar', 'carrito', 'catalogo', 'shop'],
};
export const EXCLUIR = ['facebook.', 'instagram.', 'tiktok.', 'youtube.', 'twitter.', 'x.com', 'linkedin.', 'mercadolibre.', 'tripadvisor.', 'yelp.', 'paginasamarillas.', 'guiaoleo.', 'google.', 'wikipedia.', 'doctoralia.', 'cylex.', 'foursquare.', 'pedidosya.', 'rappi.', 'zonaprop.', 'argenprop.', 'infobae.', 'clarin.', 'lanacion.', 'booking.', 'despegar.', 'olx.', 'pinterest.', 'fresha.', 'booksy.', 'wonoma.', 'treatwell.', 'miturno.', 'turnolibre.', 'guiabuenosaires.', 'agora.red', 'mercadopago.', 'tiendanube.', 'wix.', 'wordpress.com', 'blogspot.', 'linktr.ee', 'cybo.', 'infoisinfo.', 'hotfrog.', 'directorio', 'pagina12.', 'perfil.com'];

async function buscarDDG(consulta) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(consulta)}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
    const html = await res.text();
    return [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => decodeURIComponent(m[1]));
  } catch { return []; }
}

export function analizarHtml(html) {
  const plano = limpiar(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' '));
  const textos = [...plano.matchAll(/<(?:a|h1|h2|h3|button|li)[^>]*>([\s\S]*?)<\/(?:a|h1|h2|h3|button|li)>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 2 && t.length < 60);
  const secciones = {};
  for (const [k, claves] of Object.entries(SECCIONES)) secciones[k] = textos.some((t) => claves.some((c) => t.includes(c)));
  return {
    secciones,
    funciones: {
      whatsapp: /wa\.me|api\.whatsapp\.com|whatsapp/i.test(html),
      mapa: /google\.com\/maps|maps\.google|<iframe[^>]+map/i.test(html),
      formulario: /<form\b/i.test(html),
      video: /<video\b|youtube\.com\/embed|player\.vimeo/i.test(html),
      instagram: /instagram\.com\//i.test(html),
      datosEstructurados: /application\/ld\+json/i.test(html),
      adaptadoACelular: /name=["']viewport["']/i.test(html),
    },
  };
}

function agregar(muestras) {
  const n = muestras.length || 1;
  const cuenta = (campo) => Object.fromEntries(Object.keys(muestras[0]?.[campo] ?? {}).map((k) => [k, +(muestras.filter((m) => m[campo][k]).length / n).toFixed(2)]));
  return { secciones: cuenta('secciones'), funciones: cuenta('funciones') };
}

/** Qué secciones suma el análisis a la página (solo las que aparecen en la mayoría de los competidores). */
function sugerencias(sec) {
  const extras = [];
  if ((sec.precios ?? 0) >= 0.4) extras.push('precios');
  if ((sec.equipo ?? 0) >= 0.5) extras.push('equipo');
  if ((sec.faq ?? 0) >= 0.3) extras.push('faq');
  return extras;
}

export function leerBenchmark(rubroKey) {
  try {
    const b = JSON.parse(fs.readFileSync(path.join(DIR, `${rubroKey}.json`), 'utf8'));
    return (Date.now() - new Date(b.fecha).getTime()) / 864e5 <= VIGENCIA_DIAS ? b : null;
  } catch { return null; }
}

/** Analiza hasta `max` sitios competidores del rubro en la zona. Usa caché si está vigente. */
export async function analizarRubro(rubroKey, zona, { max = 8, forzar = false, log = () => {} } = {}) {
  const previo = leerBenchmark(rubroKey);
  if (previo && !forzar) return previo;
  const r = rubros[rubroKey];
  const barrio = zona.split(',')[0];
  const consultas = [`${r.busqueda || r.singular} ${barrio}`, `${r.busqueda || r.singular} ${zona} sitio oficial`, `mejores ${r.nombre.split(/[ ,]/)[0].toLowerCase()} Argentina`];
  const vistos = new Set(), muestras = [], urls = [];
  for (const q of consultas) {
    for (const u of await buscarDDG(q)) {
      let host; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch { continue; }
      if (vistos.has(host) || EXCLUIR.some((e) => host.includes(e))) continue;
      vistos.add(host);
      try {
        const res = await fetch(u, { headers: { 'user-agent': UA, 'accept-language': 'es-AR,es;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
        if (!res.ok) continue;
        muestras.push(analizarHtml((await res.text()).slice(0, 500_000)));
        urls.push(`${new URL(u).origin}/`);
        log(`  analizado: ${host}`);
      } catch { /* sitio caído: se ignora */ }
      await jitter(500, 1200);
      if (muestras.length >= max) break;
    }
    if (muestras.length >= max) break;
  }
  const resultado = { rubro: rubroKey, fecha: new Date().toISOString(), zona, muestras: urls, cantidad: muestras.length, ...(muestras.length ? agregar(muestras) : { secciones: {}, funciones: {} }) };
  resultado.sugerencias = sugerencias(resultado.secciones);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${rubroKey}.json`), JSON.stringify(resultado, null, 2));
  return resultado;
}

// ---------- preguntas extra según lo que hace la competencia ----------
const PREGUNTAS_EXTRA = {
  precios: { campo: 'precios', texto: 'Muchos negocios del rubro muestran precios. ¿Querés mostrar los tuyos? Mandalos uno por línea con este formato: "Servicio: $monto". Si preferís no mostrarlos, escribí "no".' },
  equipo: { campo: 'equipo', texto: 'En el rubro suele haber una sección sobre el equipo o el negocio. Contame en pocas líneas quiénes son o cómo trabajan (solo datos reales), o escribí "no".' },
  faq: { campo: 'faq', texto: 'Una sección de preguntas frecuentes ayuda a vender. Mandame 2 o 3 con este formato: "¿Pregunta? Respuesta", una por línea, o escribí "no".' },
};

/** Preguntas del rubro + las que sugiere el análisis (si ya hay uno guardado). Deja "extra" al final. */
export function preguntasDe(rubroKey) {
  const base = rubros[rubroKey].preguntas;
  const extras = (leerBenchmark(rubroKey)?.sugerencias ?? []).map((k) => PREGUNTAS_EXTRA[k]).filter((p) => p && !base.some((b) => b.campo === p.campo));
  const sinExtra = base.filter((p) => p.campo !== 'extra');
  const final = base.filter((p) => p.campo === 'extra');
  return [...sinExtra, ...extras, ...final];
}

/** Texto corto para mostrar en el menú. */
export function resumenBenchmark(b) {
  if (!b?.cantidad) return 'Sin análisis de competencia (no se encontraron sitios).';
  const top = Object.entries(b.secciones).filter(([, v]) => v >= 0.4).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100)}%`);
  const fn = Object.entries(b.funciones).filter(([, v]) => v >= 0.5).map(([k]) => k);
  return `${b.cantidad} sitios del rubro analizados. Secciones comunes: ${top.join(', ') || 'ninguna clara'}. Funciones frecuentes: ${fn.join(', ') || 'ninguna clara'}. Se suman: ${b.sugerencias.join(', ') || 'nada extra'}.`;
}
