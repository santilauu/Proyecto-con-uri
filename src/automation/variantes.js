import fs from 'node:fs';
import path from 'node:path';
import { ROOT, estilos, fuentes } from './util.js';

/*
 * Motor de variaciones: cada sitio recibe un "ADN" determinístico (misma semilla = mismo sitio)
 * que combina estilo, tipografías, color de acento calculado, portada, layout de servicios,
 * decoración y textos de sección. La firma del ADN se registra para no repetir combinaciones.
 */

const BIBLIOTECA = path.join(ROOT, 'data', 'biblioteca.json');
const leerBiblioteca = () => { try { return JSON.parse(fs.readFileSync(BIBLIOTECA, 'utf8')); } catch { return { firmas: {}, sitios: [] }; } };

// ---------- azar con semilla ----------
function semilla(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) { h = Math.imul(h ^ texto.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function azar(texto) {
  const next = semilla(texto);
  let a = next();
  const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.entre = (lista) => lista[Math.floor(r() * lista.length)];
  return r;
}

// ---------- color ----------
const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function hexAHsl(hex) {
  const [r, g, b] = aRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}
export function hslAHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}
const lum = (hex) => { const c = aRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const AA = 4.6; // margen sobre 4.5
function tokensValidos(t) {
  return contraste(t.fg, t.bg) >= AA && contraste(t.muted, t.bg) >= AA && contraste(t.muted, t.surface) >= AA
    && contraste(t.accentInk, t.accent) >= AA && contraste(t.accent, t.bg) >= AA;
}

/** Cambia el matiz de un color conservando su luminosidad (para teñir fondos con el acento). */
const teñir = (hex, h, techoS) => { const [, s, l] = hexAHsl(hex); return hslAHex(h, Math.min(Math.max(s, 0.05), techoS), l); };

function colores(estilo, r) {
  const base = estilo.tokens;
  if (estilo.acentoFijo) return { ...base, matiz: 0 };
  const oscuro = estilo.modo === 'oscuro';
  const matizBase = hexAHsl(base.accent)[0];
  let matiz = r() < 0.35 ? matizBase : r() * 360;
  if (matiz > 255 && matiz < 310) matiz = matizBase; // sin violetas ni azul-violeta por defecto
  const s = 0.5 + r() * 0.35;
  for (let paso = 0; paso <= 30; paso++) {
    const l = oscuro ? 0.76 - paso * 0.008 : 0.3 + paso * 0.008;
    const accent = hslAHex(matiz, s, l);
    const accentInk = oscuro ? base.bg : '#ffffff';
    const candidato = { ...base, accent, accentInk };
    if (estilo.tinte) {
      Object.assign(candidato, {
        bg: teñir(base.bg, matiz, oscuro ? 0.3 : 0.22),
        surface: teñir(base.surface, matiz, oscuro ? 0.3 : 0.25),
        line: teñir(base.line, matiz, oscuro ? 0.28 : 0.25),
      });
      if (oscuro) candidato.accentInk = candidato.bg;
    }
    if (tokensValidos(candidato)) return { ...candidato, matiz };
  }
  return { ...base, matiz: matizBase };
}

const TEXTOS_DATOS = ['Pasá a vernos', 'Dónde y cuándo', 'Visitanos', 'Cómo llegar'];
// Todas las combinaciones de los bloques que se pueden reordenar en la portada.
const BLOQUES = ['servicios', 'datos', 'galeria'];
// Disposiciones disponibles (las implementa Sitio.astro). Cada sitio elige una combinación según su ID.
export const HEROES = ['gigante', 'split', 'asimetrico', 'lateral', 'tarjeta', 'pantalla', 'columna', 'mosaico'];
export const SERVICIOS = ['lista', 'grid', 'bento', 'escalera', 'linea', 'acordeon'];
export const DATOS_LAYOUT = ['columnas', 'tarjetas', 'centrado'];
export const GALERIA_LAYOUT = ['mosaico', 'tira', 'doble'];
const PERMUTACIONES = BLOQUES.flatMap((a) => BLOQUES.flatMap((b) => BLOQUES.filter((c) => c !== a && c !== b).map((c) => [a, b, c])));
const TEXTOS_CONTACTO = ['Hablemos', 'Escribinos', 'Coordinemos', 'Charlemos'];

/**
 * Genera el ADN de un sitio. `base` (ADN de otro sitio) conserva estilo y tipografía
 * pero cambia portada, layout, decoración y color: sirve para "otro cliente parecido".
 */
export function generarADN({ leadId, estiloKey, base = null, evitar = new Set() }) {
  const estilo = estilos[estiloKey];
  for (let intento = 0; intento < 60; intento++) {
    const r = azar(`${leadId}|${estiloKey}|${intento}`);
    const parId = base?.par ?? r.entre(estilo.pares);
    const par = fuentes[parId];
    const col = colores(estilo, r);
    const adn = {
      estilo: estiloKey,
      par: parId,
      hero: r.entre(HEROES),
      servicios: r.entre(SERVICIOS),
      decor: r.entre(estilo.decor),
      animacion: r.entre(estilo.animaciones),
      marquee: r() < 0.7,
      datosAntes: r() < 0.3,
      orden: r.entre(PERMUTACIONES),
      datosLayout: r.entre(DATOS_LAYOUT),
      galeriaLayout: r.entre(GALERIA_LAYOUT),
      textos: { datos: r.entre(TEXTOS_DATOS), contacto: r.entre(TEXTOS_CONTACTO) },
      matiz: Math.round(col.matiz),
      vars: {
        '--bg': col.bg, '--fg': col.fg, '--muted': col.muted, '--accent': col.accent, '--accent-ink': col.accentInk,
        '--surface': col.surface, '--line': col.line, '--radius': estilo.radio, '--shadow': estilo.sombra,
        '--h-case': estilo.hCase, '--h-track': estilo.hTrack, '--h-weight': String(estilo.hWeight),
        '--f-titulo': `"${par.titulo.familia}", system-ui, sans-serif`, '--f-texto': `"${par.texto.familia}", system-ui, sans-serif`,
      },
    };
    if (base && adn.hero === base.hero && adn.servicios === base.servicios) continue;
    adn.firma = [adn.estilo, adn.par, adn.hero, adn.servicios, adn.decor, adn.animacion, Math.round(adn.matiz / 30), adn.orden.join('-'), adn.datosLayout, adn.galeriaLayout].join('|');
    if (!evitar.has(adn.firma)) return adn;
  }
  throw new Error('No encontré una combinación de diseño libre; ampliá el catálogo de estilos.');
}

/** Hasta 4 paletas de acento para una plantilla, todas con contraste AA sobre su fondo. */
export function paletasSugeridas(estiloKey) {
  const e = estilos[estiloKey];
  const bg = e.tokens.bg;
  const [h, s, l] = hexAHsl(e.tokens.accent);
  const candidatas = [
    { nombre: 'Original de la plantilla', accent: e.tokens.accent },
    { nombre: 'Contraste fuerte', accent: hslAHex((h + 180) % 360, Math.max(0.45, s), l) },
    { nombre: 'Tonos cercanos', accent: hslAHex((h + 30) % 360, s, l) },
    { nombre: 'Profundo', accent: hslAHex(h, Math.min(0.8, s + 0.15), Math.max(0.25, l - 0.15)) },
    { nombre: 'Suave', accent: hslAHex((h + 330) % 360, Math.max(0.35, s - 0.1), Math.min(0.75, l + 0.1)) },
  ];
  const out = [];
  for (const c of candidatas) {
    if (out.some((o) => o.accent === c.accent)) continue;
    if (validarAcento(c.accent, bg)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

/** ¿El color de acento alcanza contraste AA sobre el fondo y tiene un texto legible encima? */
export function validarAcento(accent, bg) {
  if (contraste(accent, bg) < 4.5) return false;
  return Math.max(contraste('#ffffff', accent), contraste(bg, accent)) >= 4.5;
}

/** Aplica lo que eligió el cliente (tipografía y color de acento) sobre un ADN generado. */
export function personalizar(adn, cfg = {}) {
  const vars = { ...adn.vars };
  if (cfg.par && fuentes[cfg.par] && cfg.par !== adn.par) {
    adn.par = cfg.par;
    vars['--f-titulo'] = `"${fuentes[cfg.par].titulo.familia}", system-ui, sans-serif`;
    vars['--f-texto'] = `"${fuentes[cfg.par].texto.familia}", system-ui, sans-serif`;
  }
  if (cfg.accent) {
    const bg = vars['--bg'];
    if (!validarAcento(cfg.accent, bg)) throw new Error(`El color ${cfg.accent} no tiene contraste suficiente (WCAG AA) con el fondo de la plantilla.`);
    vars['--accent'] = cfg.accent;
    vars['--accent-ink'] = contraste('#ffffff', cfg.accent) >= contraste(bg, cfg.accent) ? '#ffffff' : bg;
    adn.acentoPersonalizado = true;
  }
  adn.vars = vars;
  return adn;
}

/**
 * ADN de cada estilo para un lead. Si el cliente configuró la demo (lead.config), se respeta su elección
 * y se regenera desde cero; si no, se evitan las firmas ya usadas por otros sitios.
 */
export function adnsParaLead(lead, estiloKeys) {
  const cfg = lead.config ?? null;
  const usadas = new Set(Object.keys(leerBiblioteca().firmas));
  const propios = cfg ? {} : lead.adn ?? {};
  const resultado = {};
  for (const k of estiloKeys) {
    const base = propios[k] ?? generarADN({ leadId: lead.id, estiloKey: k, base: lead.basarEn?.estilo === k ? lead.basarEn : null, evitar: usadas });
    resultado[k] = cfg ? personalizar(base, cfg) : base;
    if (cfg && resultado[k].acentoPersonalizado) resultado[k].firma += '|acento';
    usadas.add(resultado[k].firma);
  }
  return resultado;
}

/** Reserva las firmas para que ningún otro sitio repita el diseño. */
export function registrarADN(lead, adns) {
  const bib = leerBiblioteca();
  for (const adn of Object.values(adns)) bib.firmas[adn.firma] = lead.id;
  const sitio = { lead: lead.id, nombre: lead.nombre, rubro: lead.rubro, firmas: Object.values(adns).map((a) => a.firma), fecha: new Date().toISOString() };
  bib.sitios = [...bib.sitios.filter((s) => s.lead !== lead.id), sitio];
  fs.mkdirSync(path.dirname(BIBLIOTECA), { recursive: true });
  fs.writeFileSync(BIBLIOTECA, JSON.stringify(bib, null, 2));
}

export const sitiosPrevios = () => leerBiblioteca().sitios;
