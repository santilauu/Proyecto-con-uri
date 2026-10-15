import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/*
 * Fotos libres de derechos (Openverse): solo licencias CC0 y CC BY (sin NC ni ND).
 * Se guardan optimizadas (WebP <= 200 KB) con su atribución, y se marcan como "ilustrativas":
 * no son fotos del negocio, así que la página las rotula como tales.
 */

const API = 'https://api.openverse.org/v1/images/';
const UA = 'mi-automatizador/2.0 (sitios web; contacto local)';
const MAX_KB = 200;

/** Solo cuentan las fotos cuyo título o etiquetas contengan las palabras buscadas (la mayoría si son varias). */
function esRelevante(r, query) {
  const terminos = query.toLowerCase().split(/s+/).filter((t) => t.length >= 4);
  if (!terminos.length) return false;
  const texto = `${r.title ?? ''} ${(r.tags ?? []).map((t) => t.name).join(' ')}`.toLowerCase();
  const minimo = terminos.length <= 2 ? terminos.length : Math.ceil((terminos.length * 2) / 3);
  return terminos.filter((t) => texto.includes(t)).length >= minimo;
}

async function buscar(query, cantidad) {
  const url = `${API}?q=${encodeURIComponent(query)}&license=cc0,by&page_size=${cantidad * 3}&mature=false`;
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Openverse respondió ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).filter((r) => r.url && r.width >= 800 && (r.license === 'cc0' || r.license === 'by') && esRelevante(r, query));
}

async function aWebp(buf) {
  for (const ancho of [1600, 1280, 960]) {
    for (const calidad of [78, 66, 54]) {
      const out = await sharp(buf).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: calidad }).toBuffer();
      if (out.length <= MAX_KB * 1024 || (ancho === 960 && calidad === 54)) {
        const { width, height } = await sharp(out).metadata();
        return { buf: out, w: width, h: height };
      }
    }
  }
}

/**
 * Descarga `cantidad` fotos libres para `palabras` y las guarda en dirSitio/public/media/stock.
 * Devuelve [{ src, alt, w, h, ilustrativa: true, atribucion, origen, licencia }].
 */
export async function traerFotosLibres(dirSitio, palabras, { cantidad = 4, nombre = 'negocio', log = () => {} } = {}) {
  const destino = path.join(dirSitio, 'public', 'media', 'stock');
  fs.mkdirSync(destino, { recursive: true });
  const elegidas = [];
  const vistos = new Set();

  for (const palabra of palabras) {
    if (elegidas.length >= cantidad) break;
    let candidatas = [];
    try { candidatas = await buscar(palabra, cantidad); } catch (e) { log(`  ! búsqueda "${palabra}": ${e.message}`); continue; }
    for (const c of candidatas) {
      if (elegidas.length >= cantidad) break;
      if (vistos.has(c.id)) continue;
      vistos.add(c.id);
      try {
        const res = await fetch(c.url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
        if (!res.ok) continue;
        const optim = await aWebp(Buffer.from(await res.arrayBuffer()));
        const nombreArchivo = `stock-${elegidas.length + 1}.webp`;
        fs.writeFileSync(path.join(destino, nombreArchivo), optim.buf);
        elegidas.push({
          src: `/media/stock/${nombreArchivo}`,
          alt: `Imagen ilustrativa: ${c.title ?? palabra}`,
          w: optim.w, h: optim.h, ilustrativa: true,
          creador: c.creator ?? 'autor desconocido',
          atribucion: c.attribution ?? '',
          origen: c.foreign_landing_url ?? c.url,
          licencia: c.license === 'cc0' ? 'CC0' : `CC BY ${c.license_version ?? ''}`.trim(),
        });
        log(`  foto libre ${elegidas.length}/${cantidad}: ${c.title ?? palabra}`);
      } catch (e) {
        log(`  ! foto descartada: ${e.message.split('\n')[0]}`);
      }
    }
  }
  if (!elegidas.length) log(`  sin fotos libres para ${nombre}`);
  return elegidas;
}
