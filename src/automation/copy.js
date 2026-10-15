import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { ROOT, rubros, slugify } from './util.js';
import { azar } from './variantes.js';
import { normalizarTelefonoAR } from './util.js';

/*
 * Textos sin gastar tokens: titulares, bajadas y descripciones salen de patrones por rubro
 * elegidos con la semilla del lead (cada sitio queda distinto). Claude solo se usa, de forma
 * opcional, para redactar servicios NUEVOS que no estén en la caché; lo que escribe se guarda
 * en data/cache-servicios.json y se reutiliza en los próximos clientes.
 */

const CACHE = path.join(ROOT, 'data', 'cache-servicios.json');
const leerCache = () => { try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { return {}; } };
const guardarCache = (c) => { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(c, null, 2)); };

const PROHIBIDAS = ['En el mundo actual', 'Descubre la magia', 'Potencia tu negocio', 'Revoluciona', 'Sumérgete', 'Eleva tu experiencia'];
const lista = (t) => (t || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
const dice = (t) => (t ?? '').trim() && !/^(no|nada|ninguno)\.?$/i.test(t.trim());
const lineas = (t) => (dice(t) ? t.split(/\n|;/).map((l) => l.trim()).filter(Boolean) : []);
const parsePrecios = (t) => lineas(t).map((l) => { const i = l.lastIndexOf(':'); return i > 0 ? { item: l.slice(0, i).trim(), monto: l.slice(i + 1).trim() } : { item: l, monto: '' }; });
const parseFaq = (t) => lineas(t).map((l) => { const i = l.indexOf('?'); return i > 0 ? { q: l.slice(0, i + 1).replace(/^¿?/, '¿'), a: l.slice(i + 1).trim() } : null; }).filter((x) => x?.a);
const faltante = (que) => `[COMPLETAR: ${que}]`;
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const unir = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a.at(-1)}`);
const llenar = (patron, d) => patron
  .replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '')
  .replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, (_, a, b) => a + b.toUpperCase());

async function redactarNuevos(rubroKey, nuevos) {
  if (!process.env.ANTHROPIC_API_KEY || !nuevos.length) return {};
  const r = rubros[rubroKey];
  const prompt = `Escribí descripciones muy breves para servicios de un negocio de rubro "${r.nombre}", en español rioplatense neutro, tono: ${r.tono}.
Servicios: ${JSON.stringify(nuevos)}
Reglas: una frase de hasta 14 palabras por variante; 2 variantes distintas por servicio. NO afirmes nada sobre un negocio concreto (sin precios, años, cifras, calidad, equipo, ubicación ni promesas). Describí qué es el servicio o invitá a consultar. Prohibido: ${PROHIBIDAS.join(', ')}.
Devolvé SOLO JSON: {"<servicio exacto>": ["variante 1", "variante 2"]}`;
  try {
    const msg = await new Anthropic().messages.create({ model: 'claude-haiku-5-5', max_tokens: 900, messages: [{ role: 'user', content: prompt }] });
    const t = msg.content.find((b) => b.type === 'text')?.text ?? '';
    return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  } catch (e) {
    console.warn(`Claude no respondió (${e.message}); uso descripciones base.`);
    return {};
  }
}

/** Datos del negocio -> contenido final del sitio. `demo` usa servicios de ejemplo del rubro. */
export async function armarContenido(lead, { demo = false } = {}) {
  const r = rubros[lead.rubro];
  const resp = lead.respuestas ?? {};
  const rnd = azar(`${lead.id}|copy`);
  // Datos de Instagram/Facebook: solo si el cliente los confirmó en el asistente (config.usarRedes).
  const red = lead.config?.usarRedes ? (lead.infoRedes?.consolidado ?? {}) : {};
  const servicios = demo ? r.ejemploServicios : lista(resp.servicios);
  const barrio = lead.zona.split(',')[0].trim();
  const datos = { nombre: lead.nombre, zona: lead.zona, barrio, singular: r.singular, Singular: mayus(r.singular), s1: servicios[0] ?? '', s2: servicios[1] ?? '', lista: unir(servicios.map((s) => s.toLowerCase())) };

  const titulares = r.titulares.filter((p) => !/\{s[12]\}/.test(p) || servicios.length >= (p.includes('{s2}') ? 2 : 1));
  const titulo = llenar(rnd.entre(titulares), datos);
  const bajada = servicios.length
    ? llenar(rnd.entre(r.bajadas), datos)
    : `${datos.Singular} en ${lead.zona}. ${demo ? '' : faltante('presentación del negocio')}`;

  // Descripciones: caché > Claude (solo faltantes) > patrón genérico del rubro.
  const cache = leerCache();
  const clave = (s) => `${lead.rubro}:${slugify(s)}`;
  if (!demo) {
    const nuevos = servicios.filter((s) => !cache[clave(s)]);
    const redactados = await redactarNuevos(lead.rubro, nuevos);
    for (const [s, vars] of Object.entries(redactados)) if (Array.isArray(vars) && vars.length) cache[clave(s)] = vars;
    if (Object.keys(redactados).length) guardarCache(cache);
  }
  const items = (servicios.length ? servicios : [faltante('servicio')]).map((s) => ({
    titulo: mayus(s),
    texto: cache[clave(s)] ? rnd.entre(cache[clave(s)]) : llenar(rnd.entre(r.descGenericas), { S: mayus(s), s: s.toLowerCase() }),
  }));

  const nombreCorto = lead.nombre.length > 28 ? lead.nombre.slice(0, 28).trim() : lead.nombre;
  return {
    rubro: r.nombre.split(/[ ,]/)[0],
    nombre: lead.nombre,
    titulo: lead.datos?.titulo || titulo,
    bajada: lead.datos?.bajada || bajada,
    cta: lead.datos?.cta || rnd.entre(r.ctas),
    etiquetaServicios: r.etiquetaServicios,
    servicios: lead.datos?.servicios?.length && !demo
      ? lead.datos.servicios.map((d) => ({ titulo: d.titulo, texto: d.texto || faltante(`descripción de ${d.titulo}`) }))
      : items,
    horarios: resp.horarios || red.horarios || faltante('horarios de atención'),
    direccion: resp.direccion || lead.direccion || red.direccion || faltante('dirección'),
    telefono: lead.telefonoCrudo || red.telefono || '',
    whatsapp: lead.telefono || normalizarTelefonoAR(red.telefono ?? '').telefono || '',
    instagram: (lead.redes?.instagram?.confirmado && lead.redes.instagram.usuario) || (resp.instagram && !/^no$/i.test(resp.instagram) ? resp.instagram : ''),
    facebook: lead.redes?.facebook?.confirmado ? lead.redes.facebook.url : '',
    extras: [
      resp.obrassociales && { etiqueta: 'Obras sociales', valor: resp.obrassociales },
      resp.delivery && { etiqueta: 'Delivery y take away', valor: resp.delivery },
      resp.zonas && { etiqueta: 'Zonas', valor: resp.zonas },
      resp.modalidad && { etiqueta: 'Modalidad', valor: resp.modalidad },
      resp.checkin && { etiqueta: 'Check-in y check-out', valor: resp.checkin },
      resp.afiliacion && { etiqueta: 'Cómo afiliarse', valor: resp.afiliacion },
      resp.urgencias && { etiqueta: 'Urgencias', valor: resp.urgencias },
      resp.marcas && { etiqueta: 'Marcas', valor: resp.marcas },
      resp.contacto && { etiqueta: 'Contacto', valor: resp.contacto },
      resp.extra && !/^(no|nada)$/i.test(resp.extra) && { etiqueta: 'Sobre nosotros', valor: resp.extra },
      !resp.extra && red.bio && { etiqueta: 'Sobre nosotros', valor: red.bio },
    ].filter(Boolean),
    precios: parsePrecios(resp.precios),
    equipo: dice(resp.equipo) ? resp.equipo.trim() : '',
    faq: parseFaq(resp.faq),
    seo: {
      titulo: `${nombreCorto} | ${mayus(r.singular)} en ${barrio}`.slice(0, 60),
      descripcion: bajada.replace(/\s+/g, ' ').slice(0, 155),
    },
  };
}
