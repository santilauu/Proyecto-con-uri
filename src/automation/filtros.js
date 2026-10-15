import { normalizarTelefonoAR } from './util.js';

/*
 * Filtros de la búsqueda en Maps. Cada función es pura: recibe datos y devuelve si el negocio pasa.
 * El buscador las usa en orden y registra en el log cuántos negocios descarta cada una.
 */

export const OPCIONES = {
  estadoWeb: ['cualquiera', 'sin_web', 'desactualizada'],
  telefono: ['cualquiera', 'con', 'sin', 'celular'],
  redes: ['cualquiera', 'instagram', 'facebook', 'sin_redes'],
};

export const FILTROS_DEFAULT = {
  estadoWeb: 'cualquiera', telefono: 'cualquiera', redes: 'cualquiera',
  calificacionMinima: 0, resenasMinimas: 0, excluir: [],
};

/** Valida lo que llega desde el panel. Devuelve { filtros } o { error }. */
export function validarFiltros(entrada = {}) {
  const f = { ...FILTROS_DEFAULT };
  for (const k of Object.keys(OPCIONES)) {
    if (entrada[k] === undefined || entrada[k] === '') continue;
    if (!OPCIONES[k].includes(entrada[k])) return { error: `Valor no válido para el filtro "${k}".` };
    f[k] = entrada[k];
  }
  if (entrada.calificacionMinima !== undefined && entrada.calificacionMinima !== '') {
    const n = Number(entrada.calificacionMinima);
    if (!(n >= 0 && n <= 5)) return { error: 'La calificación mínima tiene que estar entre 0 y 5.' };
    f.calificacionMinima = n;
  }
  if (entrada.resenasMinimas !== undefined && entrada.resenasMinimas !== '') {
    const n = Number(entrada.resenasMinimas);
    if (!Number.isInteger(n) || n < 0) return { error: 'Las reseñas mínimas tienen que ser un número entero, 0 o más.' };
    f.resenasMinimas = n;
  }
  if (entrada.excluir !== undefined && entrada.excluir !== null) {
    if (!Array.isArray(entrada.excluir) || entrada.excluir.length > 20) return { error: 'Excluir: lista de hasta 20 palabras.' };
    f.excluir = entrada.excluir.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  }
  return { filtros: f };
}

const sinAcentos = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const tieneExcluida = (f, nombre, categoria) => {
  const t = sinAcentos(`${nombre ?? ''} ${categoria ?? ''}`);
  return f.excluir.find((p) => t.includes(sinAcentos(p))) ?? null;
};

export const cumpleCalificacion = (f, rating, resenas) => {
  if (f.calificacionMinima > 0 && (rating == null || rating < f.calificacionMinima)) return false;
  if (f.resenasMinimas > 0 && (resenas == null || resenas < f.resenasMinimas)) return false;
  return true;
};

/** webEstado viene de webcheck: 'sin_web' | 'desactualizada'. */
export const cumpleEstadoWeb = (f, webEstado) => f.estadoWeb === 'cualquiera' || f.estadoWeb === webEstado;

export const cumpleTelefono = (f, telefono, movil) => {
  if (f.telefono === 'con') return !!telefono;
  if (f.telefono === 'sin') return !telefono;
  if (f.telefono === 'celular') return !!telefono && !!movil;
  return true;
};

export const cumpleRedes = (f, redes = {}) => {
  if (f.redes === 'cualquiera') return true;
  if (f.redes === 'sin_redes') return !redes.instagram && !redes.facebook;
  return !!redes[f.redes];
};

/** Hace falta buscar redes si el filtro lo pide, o si hay que buscar teléfono en ellas. */
export const necesitaRedes = (f, telefono) =>
  f.redes !== 'cualquiera' || (!telefono && (f.telefono === 'con' || f.telefono === 'celular'));

/** Teléfono argentino dentro de un texto (por ejemplo, la biografía pública de un perfil). */
export function telefonoEnTexto(texto = '') {
  const candidatos = texto.match(/\+?\d[\d\s().-]{7,}\d/g) ?? [];
  for (const c of candidatos) {
    const { telefono, movil } = normalizarTelefonoAR(c);
    if (telefono) return { telefono, movil, crudo: c.trim() };
  }
  return null;
}

/** Resumen legible de los filtros activos, para el log y para guardar en cada negocio. */
export function resumenFiltros(f) {
  const partes = [];
  if (f.estadoWeb !== 'cualquiera') partes.push(`web: ${f.estadoWeb}`);
  if (f.telefono !== 'cualquiera') partes.push(`teléfono: ${f.telefono}`);
  if (f.redes !== 'cualquiera') partes.push(`redes: ${f.redes}`);
  if (f.calificacionMinima > 0) partes.push(`calificación ≥ ${f.calificacionMinima}`);
  if (f.resenasMinimas > 0) partes.push(`reseñas ≥ ${f.resenasMinimas}`);
  if (f.excluir.length) partes.push(`excluye: ${f.excluir.join(', ')}`);
  return partes.join(' · ') || 'sin filtros extra';
}
