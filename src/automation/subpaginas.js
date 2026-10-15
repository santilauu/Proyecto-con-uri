import { rubros } from './util.js';

/*
 * Decide qué subpáginas lleva cada sitio. Regla general: solo se crea una página si hay contenido
 * real para llenarla (nunca páginas vacías). El rubro indica si conviene una página por servicio.
 */

const tieneDato = (v) => !!v && !/^\s*(no|nada|ninguno|ninguna)\.?\s*$/i.test(String(v));

export function planSubpaginas(lead, contenido, fotos = []) {
  const r = rubros[lead.rubro];
  const resp = lead.respuestas ?? {};
  const servicios = contenido.servicios ?? [];
  const paginas = [];

  if (r.detalleServicios || servicios.length >= 2) {
    paginas.push({ ruta: '/servicios/', titulo: 'Servicios', tipo: 'servicios' });
  }
  if (contenido.precios?.length) paginas.push({ ruta: '/precios/', titulo: 'Precios', tipo: 'precios' });
  if (tieneDato(resp.equipo)) paginas.push({ ruta: '/nosotros/', titulo: 'Nosotros', tipo: 'nosotros' });
  if (contenido.faq?.length) paginas.push({ ruta: '/preguntas-frecuentes/', titulo: 'Preguntas', tipo: 'faq' });
  if (fotos.length >= 2) paginas.push({ ruta: '/galeria/', titulo: 'Galería', tipo: 'galeria' });
  paginas.push({ ruta: '/contacto/', titulo: 'Contacto', tipo: 'contacto' });

  // Páginas de detalle por servicio (solo rubros donde cada servicio se explica aparte).
  const detalles = r.detalleServicios ? servicios.map((s) => ({ slug: s.slug, titulo: s.titulo })) : [];
  // Si el cliente eligió secciones en el asistente, solo se crean esas (contacto siempre).
  const elegidas = lead.config?.secciones;
  const equivalente = { nosotros: 'equipo' };
  const filtradas = elegidas
    ? paginas.filter((p) => p.tipo === 'contacto' || elegidas.includes(equivalente[p.tipo] ?? p.tipo))
    : paginas;
  const posicion = (p) => {
    if (p.tipo === 'contacto') return 999;
    const i = elegidas ? elegidas.indexOf(equivalente[p.tipo] ?? p.tipo) : -1;
    return i < 0 ? 500 : i;
  };
  const ordenadas = [...filtradas].sort((x, y) => posicion(x) - posicion(y));
  return { paginas: ordenadas.slice(0, 6), detalles };
}
