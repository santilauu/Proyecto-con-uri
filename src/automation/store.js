import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.js';

const FILE = path.join(ROOT, 'data', 'leads.json');

/*
 * Estados de un lead:
 * nuevo -> contactado -> armando_demo -> eligiendo_estilo -> recopilando -> construyendo -> entregado
 * y los terminales: rechazado, opt_out, error
 */
function leer() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function escribir(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export const todos = () => Object.values(leer());
export const obtener = (id) => leer()[id] ?? null;

export function guardar(lead) {
  const db = leer();
  db[lead.id] = { ...db[lead.id], ...lead, actualizado: new Date().toISOString() };
  escribir(db);
  return db[lead.id];
}

export function agregarSiNoExiste(lead) {
  const db = leer();
  const existe = Object.values(db).some(
    (l) => (l.telefono && l.telefono === lead.telefono) || (l.nombre === lead.nombre && l.direccion === lead.direccion),
  );
  if (existe) return false;
  db[lead.id] = { ...lead, estado: 'nuevo', respuestas: {}, creado: new Date().toISOString() };
  escribir(db);
  return true;
}

export function porTelefono(tel) {
  const ult = tel.replace(/\D/g, '').slice(-10);
  return todos().find((l) => l.telefono && l.telefono.slice(-10) === ult) ?? null;
}
