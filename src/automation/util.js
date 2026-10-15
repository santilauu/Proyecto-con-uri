import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rubros = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/rubros.json'), 'utf8'));
export const estilos = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/estilos.json'), 'utf8'));
export const fuentes = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/fuentes.json'), 'utf8'));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const jitter = (min, max) => sleep(min + Math.random() * (max - min));

export function slugify(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Normaliza un teléfono argentino a formato WhatsApp (549 + área + número, sin signos).
 * `movil` es false si el número parece fijo: esos no suelen tener WhatsApp.
 */
export function normalizarTelefonoAR(crudo) {
  if (!crudo) return { telefono: null, movil: false };
  let d = crudo.replace(/\D/g, '');
  let movil = false;
  if (d.startsWith('549')) { movil = true; d = d.slice(3); }
  else if (d.startsWith('54')) d = d.slice(2);
  d = d.replace(/^0/, '');
  const quince = d.match(/^(\d{2,4}?)15(\d{6,8})$/);
  if (!movil && quince && (quince[1] + quince[2]).length === 10) { d = quince[1] + quince[2]; movil = true; }
  if (d.length !== 10) return { telefono: null, movil: false };
  return { telefono: movil ? `549${d}` : `54${d}`, movil };
}

export const mismoTelefono = (a, b) => !!a && !!b && a.slice(-10) === b.slice(-10);
