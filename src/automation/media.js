import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './util.js';

const IMG = /\.(jpe?g|png|webp|avif|heic|gif)$/i;
const VID = /\.(mp4|webm|mov|m4v)$/i;
const MAX_FOTO = 200 * 1024;   // CLAUDE.md: ninguna imagen mayor a 200 KB
const MAX_VIDEO = 25 * 1024 * 1024;
const MAX_FOTOS = 9, MAX_VIDEOS = 2;

export const dirMedia = (lead) => path.join(ROOT, 'data', 'media', lead.id);
export const cantidadMedia = (lead) => (fs.existsSync(dirMedia(lead)) ? fs.readdirSync(dirMedia(lead)).length : 0);

/** Guarda un archivo que el cliente mandó (WhatsApp) o que importamos a mano. */
export function guardarMedia(lead, buffer, extension) {
  const dir = dirMedia(lead);
  fs.mkdirSync(dir, { recursive: true });
  const n = String(fs.readdirSync(dir).length + 1).padStart(2, '0');
  const archivo = path.join(dir, `${n}.${extension.replace(/^\./, '')}`);
  fs.writeFileSync(archivo, buffer);
  return archivo;
}

export function importarCarpeta(lead, carpeta) {
  let n = 0;
  for (const f of fs.readdirSync(carpeta)) {
    if (!IMG.test(f) && !VID.test(f)) continue;
    guardarMedia(lead, fs.readFileSync(path.join(carpeta, f)), path.extname(f));
    n++;
  }
  return n;
}

async function aWebp(origen, destino) {
  for (const ancho of [1600, 1280, 960]) {
    for (const calidad of [78, 66, 54]) {
      const buf = await sharp(origen).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: calidad }).toBuffer();
      if (buf.length <= MAX_FOTO || (ancho === 960 && calidad === 54)) {
        fs.writeFileSync(destino, buf);
        const { width, height } = await sharp(buf).metadata();
        return { w: width, h: height, kb: Math.round(buf.length / 1024) };
      }
    }
  }
}

/**
 * Optimiza lo que haya en data/media/<lead> y lo deja en public/media del sitio.
 * Devuelve el bloque `media` para cliente.json (vacío si el cliente no mandó nada).
 */
export async function prepararMedia(lead, dirSitio) {
  const origen = dirMedia(lead);
  const vacio = { fotos: [], videos: [], avisos: [] };
  if (!fs.existsSync(origen)) return vacio;
  const destino = path.join(dirSitio, 'public', 'media');
  fs.mkdirSync(destino, { recursive: true });
  const archivos = fs.readdirSync(origen).sort();
  const fotos = [], videos = [], avisos = [];

  for (const f of archivos.filter((x) => IMG.test(x)).slice(0, MAX_FOTOS)) {
    try {
      const nombre = `foto-${fotos.length + 1}.webp`;
      const info = await aWebp(path.join(origen, f), path.join(destino, nombre));
      fotos.push({ src: `/media/${nombre}`, alt: `${lead.nombre}: foto ${fotos.length + 1}`, w: info.w, h: info.h });
    } catch (e) { avisos.push(`No pude procesar ${f}: ${e.message}`); }
  }
  // La foto más apaisada va primero: es la que se usa en la portada.
  fotos.sort((a, b) => b.w / b.h - a.w / a.h);

  for (const f of archivos.filter((x) => VID.test(x)).slice(0, MAX_VIDEOS)) {
    const p = path.join(origen, f);
    if (fs.statSync(p).size > MAX_VIDEO) { avisos.push(`Video ${f} pesa más de 25 MB: se omitió.`); continue; }
    const ext = path.extname(f).toLowerCase();
    const nombre = `video-${videos.length + 1}${ext}`;
    fs.copyFileSync(p, path.join(destino, nombre));
    videos.push({ src: `/media/${nombre}`, type: ext === '.webm' ? 'video/webm' : 'video/mp4' });
  }
  return { fotos, videos, avisos };
}
