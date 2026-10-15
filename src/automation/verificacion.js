import { EXCLUIR } from './benchmark.js';
import { esSoloRed } from './webcheck.js';
import { telefonoEnTexto } from './filtros.js';
import { jitter } from './util.js';

/*
 * Verificaciones antes de marcar un negocio:
 * - verificarWebEnBuscador: busca el nombre en el buscador y mira si aparece un sitio propio.
 * - buscarTelefonoEnRedes: si Maps no tiene teléfono, mira la biografía pública de Instagram/Facebook.
 * Solo se lee información visible sin iniciar sesión. Nada se guarda sin origen.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const sinAcentos = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const GENERICAS = ['cafe', 'restaurante', 'salon', 'estudio', 'centro', 'peluqueria', 'barberia', 'tienda', 'local', 'iglesia', 'clinica'];

const palabrasDelNombre = (nombre) =>
  sinAcentos(nombre).split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !GENERICAS.includes(t));

async function buscarEnDuckDuckGo(consulta) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(consulta)}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
    const html = await res.text();
    return [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => decodeURIComponent(m[1]));
  } catch { return []; }
}

/**
 * Busca un sitio propio del negocio en el buscador.
 * Devuelve { url, fuerte } o null. "fuerte" = el nombre completo aparece en el dominio (se descarta el negocio);
 * si solo aparecen palabras sueltas, es "posible" y el negocio se conserva para revisar a mano.
 */
export async function verificarWebEnBuscador(nombre, barrio) {
  const palabras = palabrasDelNombre(nombre);
  if (!palabras.length) return null;
  for (const u of await buscarEnDuckDuckGo(`${nombre} ${barrio}`)) {
    let host;
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch { continue; }
    if (esSoloRed(u) || EXCLUIR.some((e) => host.includes(e))) continue;
    const dominio = sinAcentos(host).replace(/[^a-z0-9]/g, '');
    const junto = palabras.join('');
    // Fuerte: el nombre completo es la primera parte del dominio (ej. pittibimbo.com.ar).
    const primeraParte = sinAcentos(host.split('.')[0]).replace(/[^a-z0-9]/g, '');
    if (primeraParte === junto) return { url: u, fuerte: true };
    if (palabras.every((p) => dominio.includes(p))) return { url: u, fuerte: false };
  }
  return null;
}

/** Busca un teléfono en la biografía pública de Instagram o Facebook. */
export async function buscarTelefonoEnRedes(redes = {}) {
  for (const red of ['instagram', 'facebook']) {
    const perfil = redes[red];
    if (!perfil?.url) continue;
    const html = await fetch(perfil.url, { headers: { 'user-agent': UA, 'accept-language': 'es-AR,es;q=0.9' }, signal: AbortSignal.timeout(12000) })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    // Solo la descripción pública del perfil (meta description / og:description).
    const bio = (html.match(/<meta[^>]+(?:property=["']og:description|name=["']description)["'][^>]+content=["']([^"']*)/i)?.[1] ?? '').replace(/&amp;/g, '&');
    const encontrado = telefonoEnTexto(bio);
    if (encontrado) return { ...encontrado, origen: red, url: perfil.url };
    await jitter(800, 1500);
  }
  return null;
}
