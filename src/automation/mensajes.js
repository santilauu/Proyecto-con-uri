import { rubros } from './util.js';

/** Primer mensaje en modo manual (texto libre, para enviar desde tu propio WhatsApp). */
export function mensajeInicial(lead) {
  const motivo = lead.webEstado === 'desactualizada'
    ? 'vi que su página web está algo desactualizada'
    : 'vi que todavía no tienen una página web propia';
  return `Hola, ¿cómo están en ${lead.nombre}? Soy ${process.env.TU_NOMBRE || '[TU NOMBRE]'}, diseño páginas web para ${rubros[lead.rubro].nombre.split(',')[0].toLowerCase()}. Los busqué en Google y ${motivo}. Les armo una demostración gratis con el nombre de su negocio, sin compromiso, para que vean cómo quedaría. ¿Les interesa verla? Si no, me avisan y no los molesto más.`;
}

export const enlaceWhatsApp = (telefono, texto) => `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
