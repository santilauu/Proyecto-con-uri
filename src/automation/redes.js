import { chromium } from 'playwright';
import { guardarMedia } from './media.js';
import { jitter } from './util.js';
import { telefonoEnTexto } from './filtros.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const RESERVADOS = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv', 'share', 'sharer', 'sharer.php', 'login', 'groups', 'events', 'watch', 'photo', 'photo.php', 'people', 'pages', 'public', 'hashtag']);

const tokens = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !['gimnasio', 'salon', 'estudio', 'centro', 'peluqueria', 'barberia', 'restaurante'].includes(t));
const parsearNumero = (t) => { const m = String(t).replace(',', '.').match(/([\d.]+)\s*([kKmM])?/); if (!m) return null; return Math.round(parseFloat(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]?.toLowerCase()] ?? 1)); };

function usuarioDe(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (!/^(instagram|facebook)\.com$/.test(host)) return null;
    const seg = u.pathname.split('/').filter(Boolean)[0];
    if (!seg || RESERVADOS.has(seg.toLowerCase())) return null;
    return { red: host.startsWith('instagram') ? 'instagram' : 'facebook', usuario: seg, url: `https://${host === 'instagram.com' ? 'www.instagram.com' : 'www.facebook.com'}/${seg}${host === 'instagram.com' ? '/' : ''}` };
  } catch { return null; }
}

/** Lee los metadatos públicos de un perfil. No inicia sesión ni descarga contenido. */
export async function inspeccionarPerfil(perfil) {
  try {
    const res = await fetch(perfil.url, { headers: { 'user-agent': UA, 'accept-language': 'es-AR,es;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    const html = await res.text();
    const og = (p) => html.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']*)`, 'i'))?.[1]
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${p}["']`, 'i'))?.[1] ?? '';
    const titulo = og('title').replace(/&amp;/g, '&');
    const desc = og('description');
    const posts = desc.match(/([\d.,]+[kKmM]?)\s*(?:Posts|publicaciones)/i)?.[1];
    return { ...perfil, titulo, publico: res.ok && !!titulo && !/log\s?in|iniciar sesi/i.test(titulo), publicaciones: posts ? parsearNumero(posts) : null };
  } catch {
    return { ...perfil, titulo: '', publico: false, publicaciones: null };
  }
}

async function buscarEnDuckDuckGo(consulta) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(consulta)}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
    const html = await res.text();
    return [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => decodeURIComponent(m[1]));
  } catch { return []; }
}

/**
 * Busca el Instagram y el Facebook del negocio y mira si el perfil es público y tiene publicaciones.
 * El resultado es una HIPÓTESIS: el cliente la confirma por WhatsApp antes de usar nada.
 */
export async function detectarRedes(lead) {
  const barrio = lead.zona.split(',')[0];
  const tk = tokens(lead.nombre);
  const candidatos = new Map();
  const considerar = (url) => { const p = usuarioDe(url); if (p && !candidatos.has(p.red)) candidatos.set(p.red, p); };

  if (lead.web) considerar(lead.web);
  for (const red of ['instagram', 'facebook']) {
    if (candidatos.has(red)) continue;
    for (const url of await buscarEnDuckDuckGo(`${lead.nombre} ${barrio} ${red}`)) {
      const p = usuarioDe(url);
      if (p?.red !== red) continue;
      // Evita falsos positivos: el usuario o el título deben compartir una palabra con el nombre.
      const candidato = await inspeccionarPerfil(p);
      const texto = tokens(`${p.usuario} ${candidato.titulo}`);
      if (!tk.length || tk.some((t) => texto.some((x) => x.includes(t) || t.includes(x)))) { candidatos.set(red, candidato); break; }
      await jitter(500, 1200);
    }
    await jitter(800, 1800);
  }

  const redes = {};
  for (const [red, p] of candidatos) {
    const info = p.titulo === undefined ? await inspeccionarPerfil(p) : p;
    redes[red] = { url: info.url, usuario: info.usuario, publico: info.publico, publicaciones: info.publicaciones, confirmado: false };
  }
  return redes;
}

/** Resumen corto para mostrar en el menú y armar el mensaje al cliente. */
export function resumenRedes(redes = {}) {
  return Object.entries(redes).map(([red, r]) => `${red}: @${r.usuario}${r.publicaciones != null ? ` (${r.publicaciones} publicaciones)` : r.publico ? ' (público)' : ' (no se pudo ver)'}`).join(' | ');
}
/** Hay un perfil candidato para preguntarle al cliente (Instagram suele ocultar el contenido sin login). */
export const tieneContenido = (redes = {}) => Object.values(redes).some((r) => r.publicaciones == null || r.publicaciones > 0);

/**
 * Baja fotos del perfil público SOLO si el cliente lo autorizó por escrito.
 * Mejor esfuerzo: Instagram suele pedir login y puede devolver 0. La vía confiable es que el
 * cliente mande las fotos y videos por WhatsApp. Respetá los términos de la plataforma.
 */
export async function traerFotosDePerfil(lead, red = 'instagram', maximo = 8) {
  const perfil = lead.redes?.[red];
  if (!perfil?.confirmado) return 0;
  const browser = await chromium.launch({ headless: true });
  let n = 0;
  try {
    const ctx = await browser.newContext({ userAgent: UA, locale: 'es-AR' });
    const page = await ctx.newPage();
    await page.goto(perfil.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await jitter(2500, 4000);
    const urls = await page.$$eval('img', (imgs) => imgs.filter((i) => i.naturalWidth >= 300 && !/profile/i.test(i.alt)).map((i) => i.currentSrc || i.src));
    for (const u of [...new Set(urls)].slice(0, maximo)) {
      const r = await ctx.request.get(u).catch(() => null);
      if (r?.ok()) { guardarMedia(lead, await r.body(), 'jpg'); n++; }
    }
  } catch { /* se informa 0 y se pide al cliente que mande las fotos */ } finally { await browser.close(); }
  return n;
}

const HORARIO = /((?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[^\n.|]{0,40}?\d{1,2}(?::\d{2})?\s*(?:a|-|–|hs|h)\s*\d{1,2}(?::\d{2})?(?:\s*hs?)?)/i;
const DIRECCION = /((?:calle|av\.?|avenida|pasaje|pje\.?)\s+[^\n,.|]{3,40}?\s+\d{2,5})/i;

/**
 * Lee lo que se ve públicamente en el perfil: biografía, teléfono, horarios y dirección si aparecen.
 * No inicia sesión y no lee publicaciones privadas. Cada dato queda con su origen.
 */
export async function extraerInfoPublica(perfil) {
  if (!perfil?.url) return null;
  const html = await fetch(perfil.url, { headers: { 'user-agent': UA, 'accept-language': 'es-AR,es;q=0.9' }, signal: AbortSignal.timeout(12000) })
    .then((r) => (r.ok ? r.text() : ''))
    .catch(() => '');
  const meta = (p) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${p}["'][^>]+content=["']([^"']*)`, 'i'))?.[1] ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const bio = meta('description');
  const texto = `${meta('title')} ${bio}`;
  if (!texto.trim()) return null;
  const telefono = telefonoEnTexto(bio);
  return {
    origen: perfil.red ?? null,
    url: perfil.url,
    bio: bio.trim() || null,
    telefono: telefono?.crudo ?? null,
    horarios: bio.match(HORARIO)?.[1]?.trim() ?? null,
    direccion: bio.match(DIRECCION)?.[1]?.trim() ?? null,
  };
}

/** Une lo encontrado en Instagram y Facebook: primero el que tenga cada dato. */
export function consolidarInfo(infos = []) {
  const elegir = (campo) => infos.find((i) => i?.[campo])?.[campo] ?? null;
  return { bio: elegir('bio'), telefono: elegir('telefono'), horarios: elegir('horarios'), direccion: elegir('direccion') };
}
