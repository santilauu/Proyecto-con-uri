import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, fuentes } from './util.js';
import { plantillasDe } from './plantillas-rubro.js';

/*
 * Composición dinámica: la distribución de cada página la define Lovable. Este módulo:
 *  - arma el ADN visual (solo colores y tipografías) a partir de una plantilla de referencia,
 *  - calcula la firma de distribución y el esqueleto de una composición (Home.tsx de Lovable),
 *  - valida que la composición cumpla las reglas del proyecto,
 *  - convierte el JSX a un componente Astro,
 *  - compara dos versiones para comprobar que una edición de contenido no cambió el diseño.
 */

const BIBLIOTECA = path.join(ROOT, 'data', 'biblioteca.json');
const leerBib = () => { try { return JSON.parse(fs.readFileSync(BIBLIOTECA, 'utf8')); } catch { return { firmas: {}, sitios: [] }; } };
const escribirBib = (b) => { fs.mkdirSync(path.dirname(BIBLIOTECA), { recursive: true }); fs.writeFileSync(BIBLIOTECA, JSON.stringify(b, null, 2)); };

export const SECCIONES_PERMITIDAS = ['portada', 'datos', 'cinta', 'servicios', 'galeria', 'videos', 'precios', 'equipo', 'faq', 'contacto'];

/** ADN de una página compuesta: solo tokens de color y tipografía de la plantilla elegida. */
export function adnDePlantilla(plantilla, modo = 'claro', par = null) {
  const p = plantilla.paleta[modo] ?? plantilla.paleta.claro;
  const parId = par && fuentes[par] ? par : plantilla.pareja;
  const f = fuentes[parId];
  return {
    estilo: 'compuesta', plantilla: plantilla.clave, modo: p.modo, par: parId, animacion: 'fade', decor: 'ninguno',
    textos: { datos: 'Dónde y cuándo', contacto: 'Hablemos' },
    vars: {
      '--bg': p.bg, '--fg': p.fg, '--muted': p.muted, '--accent': p.accent, '--accent-ink': p.accentInk,
      '--surface': p.surface, '--line': p.line, '--radius': '8px', '--shadow': 'none',
      '--h-case': 'none', '--h-track': '-0.02em', '--h-weight': '700',
      '--f-titulo': `"${f.titulo.familia}", system-ui, sans-serif`, '--f-texto': `"${f.texto.familia}", system-ui, sans-serif`,
    },
  };
}

// ---------- ubicación de los trabajos ----------
const SOLO_ID = (id) => String(id).replace(/[^a-z0-9]/gi, '');
export const carpetaLovable = (id) => path.join(ROOT, 'data', 'lovable', SOLO_ID(id));
/** Hay una composición aceptada para este negocio. */
export const tieneComposicion = (id) => fs.existsSync(path.join(carpetaLovable(id), 'actual', 'Home.tsx'));
export const leerComposicion = (id) => fs.readFileSync(path.join(carpetaLovable(id), 'actual', 'Home.tsx'), 'utf8');

/** Plantilla, ADN y configuración elegidos en el asistente. */
export function plantillaDeConfig(lead) {
  const cfg = lead.config;
  if (!cfg?.plantilla) throw new Error('Primero elegí la plantilla de referencia en "Crear DEMO".');
  const plantilla = plantillasDe(lead.rubro).find((p) => p.clave === cfg.plantilla);
  if (!plantilla) throw new Error(`La plantilla "${cfg.plantilla}" no existe para este rubro.`);
  const adn = adnDePlantilla(plantilla, cfg.modo ?? 'claro', cfg.par && cfg.par !== 'auto' ? cfg.par : null);
  return { plantilla, adn, cfg };
}

/** Composición aceptada del negocio lista para construir el sitio (o null si todavía no tiene). */
export function composicionDe(lead) {
  if (!tieneComposicion(lead.id)) return null;
  const { adn } = plantillaDeConfig(lead);
  const tsx = leerComposicion(lead.id);
  adn.firma = firmaDe(tsx);
  return { tsx, adn };
}

// ---------- lectura de JSX ----------
const LLAVES = String.raw`\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}`;
const RE_TAG = new RegExp(String.raw`<([A-Za-z][\w.]*)((?:\s+[\w:@-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|${LLAVES}))?)*)\s*\/?>`, 'g');
const RE_ATTR = new RegExp(String.raw`([\w:@-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(${LLAVES})))?`, 'g');

function tagsDe(tsx) {
  const tags = [];
  for (const m of tsx.matchAll(RE_TAG)) {
    const attrs = {};
    for (const a of m[2].matchAll(RE_ATTR)) attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? true;
    tags.push({ tag: m[1], attrs });
  }
  return tags;
}

const hash = (t) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 16);

/** Secciones en orden, cada una con su tipo de composición (data-seccion / data-composicion). */
export function seccionesDe(tsx) {
  return tagsDe(tsx)
    .filter((t) => t.attrs['data-seccion'])
    .map((t) => ({ seccion: String(t.attrs['data-seccion']), composicion: t.attrs['data-composicion'] === true ? '' : String(t.attrs['data-composicion'] ?? '') }));
}

/** Firma de distribución: secuencia ordenada de secciones con su composición. No depende de colores ni textos. */
export const firmaDe = (tsx) => 'lovable|' + seccionesDe(tsx).map((s) => `${s.seccion}:${s.composicion}`).join('|');

/** Esqueleto: solo la secuencia de etiquetas. Dos páginas con el mismo esqueleto tienen la misma disposición. */
export const esqueletoDe = (tsx) => hash(tagsDe(tsx).map((t) => t.tag).join(','));

/** Estructura completa: etiquetas, clases y marcas de sección. Cambia si cambia el diseño; no si cambian los textos. */
export function estructuraDe(tsx) {
  const lineas = tagsDe(tsx).map((t) => {
    const clases = String(t.attrs.className ?? t.attrs.class ?? '').replace(/\s+/g, ' ').trim();
    const datos = Object.keys(t.attrs).filter((k) => k.startsWith('data-')).sort().map((k) => `${k}=${t.attrs[k]}`).join(';');
    return `${t.tag}.${clases}|${datos}`;
  });
  return hash(lineas.join('\n'));
}

export const firmasUsadas = () => Object.keys(leerBib().firmas).filter((f) => f.startsWith('lovable|'));
export const esqueletosUsados = () => new Set(Object.keys(leerBib().esqueletos ?? {}));

export function registrarEsqueleto(leadId, esqueleto) {
  const bib = leerBib();
  bib.esqueletos = { ...(bib.esqueletos ?? {}) };
  for (const [k, v] of Object.entries(bib.esqueletos)) if (v === leadId) delete bib.esqueletos[k];
  bib.esqueletos[esqueleto] = leadId;
  escribirBib(bib);
}

/** Suelta una firma concreta si pertenece a ese negocio (al reemplazar su demo por otra distinta). */
export function soltarFirma(leadId, firma) {
  const bib = leerBib();
  if (bib.firmas[firma] === leadId) { delete bib.firmas[firma]; escribirBib(bib); }
}

/** Libera la firma y el esqueleto de un negocio (si su demo se reemplaza o falla). */
export function liberarComposicion(leadId) {
  const bib = leerBib();
  for (const [k, v] of Object.entries(bib.firmas)) if (v === leadId && k.startsWith('lovable|')) delete bib.firmas[k];
  for (const [k, v] of Object.entries(bib.esqueletos ?? {})) if (v === leadId) delete bib.esqueletos[k];
  escribirBib(bib);
}

// ---------- validación ----------
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/;

/**
 * Revisa una composición. Devuelve la lista de problemas (vacía = aceptable).
 * `secciones`: las que eligió el cliente, en orden. `previa`: datos de la versión aceptada anterior (ediciones).
 * `excluirLead`: negocio al que pertenece (su firma anterior no cuenta como repetida).
 */
export function validarComposicion(tsx, { secciones = [], previa = null, excluirLead = null } = {}) {
  const problemas = [];
  const bib = leerBib();

  for (const m of tsx.matchAll(/^import\b[^;]*?from\s*['"]([^'"]+)['"]/gms)) {
    if (!/^react$|cliente(\.json)?$/.test(m[1])) problemas.push(`Importa "${m[1]}": solo se permite react y ./cliente.json. Usá marcado JSX y clases de Tailwind.`);
  }
  if (!/export\s+default\s+function\s+Home\b/.test(tsx)) problemas.push('Falta "export default function Home()".');
  if (/\buse(State|Effect|Ref|Memo|Callback|Navigate|Location)\b/.test(tsx)) problemas.push('No uses hooks de React: la página es solo marcado.');
  if (/\son[A-Z]\w*=/.test(tsx)) problemas.push('No uses manejadores de eventos (onClick, etc.).');
  if (/\sstyle=/.test(tsx)) problemas.push('No uses style en línea: usá clases de Tailwind con las variables de color.');
  if (/<img\b[^>]*\salt=\{?["']?["']?\}?\s*\/?>/.test(tsx)) problemas.push('Hay imágenes con alt vacío.');

  const tags = tagsDe(tsx);
  for (const t of tags) {
    const clases = String(t.attrs.className ?? '');
    if (HEX.test(clases) || /\b(rgb|hsl)a?\(/.test(clases)) problemas.push(`Color fijo en las clases de <${t.tag}>: usá solo las variables (bg-bg, text-fg, text-muted, bg-accent, text-accent-ink, bg-surface, border-line).`);
  }

  const lista = seccionesDe(tsx);
  if (!lista.length) problemas.push('No hay secciones marcadas con data-seccion.');
  for (const s of lista) {
    if (!SECCIONES_PERMITIDAS.includes(s.seccion)) problemas.push(`Sección no permitida: "${s.seccion}".`);
    if (!s.composicion) problemas.push(`La sección "${s.seccion}" no tiene data-composicion.`);
  }
  const nombres = lista.map((s) => s.seccion);
  if (nombres[0] !== 'portada') problemas.push('La primera sección tiene que ser "portada".');
  if (nombres.at(-1) !== 'contacto') problemas.push('La última sección tiene que ser "contacto".');
  const pedidas = secciones.filter((s) => s !== 'contacto');
  const faltan = pedidas.filter((s) => !nombres.includes(s));
  if (faltan.length) problemas.push(`Faltan secciones pedidas: ${faltan.join(', ')}.`);
  const sobran = nombres.filter((s) => !['portada', 'datos', 'cinta', 'contacto'].includes(s) && !pedidas.includes(s) && !(previa && previa.secciones?.includes(s)));
  if (sobran.length) problemas.push(`Secciones que no se pidieron: ${sobran.join(', ')}.`);
  const enOrden = nombres.filter((s) => pedidas.includes(s));
  if (enOrden.join() !== pedidas.filter((s) => enOrden.includes(s)).join()) problemas.push(`Las secciones no respetan el orden pedido (${pedidas.join(' > ')}).`);

  const firma = firmaDe(tsx);
  const esqueleto = esqueletoDe(tsx);
  if (!previa) {
    const otraFirma = bib.firmas[firma];
    if (otraFirma && otraFirma !== excluirLead) problemas.push('La distribución repite la de otra página ya creada. Cambiá la composición de las secciones y la estructura general.');
    const otroEsqueleto = bib.esqueletos?.[esqueleto];
    if (otroEsqueleto && otroEsqueleto !== excluirLead) problemas.push('La estructura de etiquetas es idéntica a la de otra página. Hacé una composición distinta.');
  } else {
    if (firma !== previa.firma) problemas.push('La edición cambió la distribución (firma). Solo se pueden cambiar contenidos.');
    if (esqueleto !== previa.esqueleto) problemas.push('La edición cambió el esqueleto de la página.');
    if (estructuraDe(tsx) !== previa.estructura) problemas.push('La edición cambió clases o estructura. Solo se pueden cambiar contenidos.');
  }
  return problemas;
}

/** Datos que el cliente cargó pero que la página no tiene dónde mostrar (no se crean secciones nuevas). */
export function datosSinEspacio(tsx, cliente) {
  const hay = new Set(seccionesDe(tsx).map((s) => s.seccion));
  const sin = [];
  if ((cliente.precios?.length ?? 0) > 0 && !hay.has('precios')) sin.push('precios');
  if (cliente.equipo && !hay.has('equipo')) sin.push('equipo');
  if ((cliente.faq?.length ?? 0) > 0 && !hay.has('faq')) sin.push('preguntas frecuentes');
  if ((cliente.media?.fotos?.length ?? 0) > 1 && !hay.has('galeria')) sin.push('galería de fotos');
  if ((cliente.media?.videos?.length ?? 0) > 0 && !hay.has('videos')) sin.push('videos');
  return sin;
}

// ---------- conversión a Astro ----------
const ATRIBUTOS = [
  ['className', 'class'], ['htmlFor', 'for'], ['tabIndex', 'tabindex'], ['strokeWidth', 'stroke-width'], ['strokeLinecap', 'stroke-linecap'],
  ['strokeLinejoin', 'stroke-linejoin'], ['fillRule', 'fill-rule'], ['clipRule', 'clip-rule'], ['crossOrigin', 'crossorigin'], ['srcSet', 'srcset'],
];

/** Convierte el Home.tsx de Lovable (solo marcado) en un componente Astro. */
export function tsxAAstro(tsx) {
  const inicio = tsx.search(/export\s+default\s+function\s+Home\b/);
  if (inicio < 0) throw new Error('No encontré "export default function Home".');
  const llave = tsx.indexOf('{', tsx.indexOf(')', inicio));
  const ret = tsx.slice(llave).search(/return\s*\(\s*(?=<)/);
  if (ret < 0) throw new Error('No encontré el "return (" con el JSX de Home.');
  const preambulo = tsx.slice(llave + 1, llave + ret).trim();
  let jsx = tsx.slice(llave + ret).replace(/^return\s*\(\s*/, '');
  jsx = jsx.replace(/\)\s*;?\s*\}\s*(?:export\s+default\s+Home\s*;?)?\s*$/, '').trim();
  for (const [de, a] of ATRIBUTOS) jsx = jsx.replace(new RegExp(`\\b${de}=`, 'g'), `${a}=`);
  jsx = jsx.replace(/\s+key=\{[^{}]*\}/g, '');
  const cuerpo = preambulo.split('\n').map((l) => l.replace(/^ {2}/, '')).join('\n');
  // Tipos y constantes que Lovable declaró fuera de la función (sin sus imports).
  const modulo = tsx.slice(0, inicio).replace(/^import\b[^;]*?from\s*['"][^'"]+['"];?/gms, '').trim();
  return `---\nimport cliente from '../content/cliente.json';\n${modulo}\n${cuerpo}\n---\n${jsx}\n`;
}

/** Escribe en un sitio ya copiado: el componente de Lovable y la portada que lo envuelve con la infraestructura. */
export function escribirComposicion(dir, tsx) {
  fs.writeFileSync(path.join(dir, 'src/components/Composicion.astro'), tsxAAstro(tsx));
  fs.rmSync(path.join(dir, 'src/pages/demo'), { recursive: true, force: true });
  fs.writeFileSync(path.join(dir, 'src/pages/index.astro'), `---
import Base from '../layouts/Base.astro';
import Composicion from '../components/Composicion.astro';
import cliente from '../content/cliente.json';
import { whatsapp, creditos } from '../lib/sitio.js';
const wa = whatsapp(cliente);
---
<Base adn={cliente.adn} titulo={cliente.seo.titulo} descripcion={cliente.seo.descripcion}>
  {cliente.demo && <p class="bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-ink">Demostración con textos de ejemplo. Los reemplazamos con los datos reales de tu negocio.</p>}
  <Composicion />
  <footer class="border-t border-line px-4 py-6 text-sm text-muted md:px-10">
    <p>© {new Date().getFullYear()} {cliente.nombre}</p>
    {creditos(cliente).length > 0 && (
      <p class="mt-2 max-w-3xl text-xs">
        Fotos ilustrativas:{' '}
        {creditos(cliente).map((c: any, i: number) => (
          <>
            {i > 0 && ' · '}
            <a class="inline-flex min-h-11 items-center underline" href={c.origen} rel="noopener">{c.creador}</a> ({c.licencia})
          </>
        ))}
      </p>
    )}
  </footer>
  <a href={wa} aria-label="Escribir por WhatsApp" class="btn fixed bottom-4 right-4 z-40 !min-h-14 !min-w-14 justify-center !rounded-full !p-0 md:hidden">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>
  </a>
</Base>
`);
}
