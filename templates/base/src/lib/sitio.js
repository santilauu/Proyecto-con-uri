// Utilidades compartidas por la portada y las subpáginas.

export const soloDigitos = (t = '') => t.replace(/\D/g, '');

export function whatsapp(c) {
  const d = soloDigitos(c.whatsapp || c.telefono || '');
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(`Hola ${c.nombre}, vi su página y quería consultar.`)}` : '#contacto';
}

export const instagram = (c) => (c.instagram ? `https://instagram.com/${c.instagram.replace('@', '')}` : '');

export const mapa = (c) =>
  c.direccion && !c.direccion.startsWith('[')
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion)}`
    : '';

export const slug = (t = '') =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Créditos de fotos libres (CC BY exige atribución visible). */
export const creditos = (c) => c.media?.creditos ?? [];
