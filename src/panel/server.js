import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ROOT, rubros, estilos, normalizarTelefonoAR } from '../automation/util.js';
import { todos, guardar, obtener, agregarSiNoExiste } from '../automation/store.js';
import { buscarNegocios } from '../automation/scraper.js';
import { validarFiltros } from '../automation/filtros.js';

/*
 * Panel local: se abre en el navegador (http://localhost:3300) desde iniciar.bat.
 * Es SOLO la etapa de prospección: buscar negocios en Google Maps con sus filtros, guardarlos
 * agrupados por rubro (y en data/leads.json), cargar uno a mano, y completar sus datos, fotos y
 * el prompt visual que define cómo quiere verse la página. Las tareas largas (la búsqueda) corren
 * en segundo plano y el navegador va mostrando su registro.
 *
 * La creación y edición de cada página NO se hace desde acá: es una conversación con Claude,
 * documentada en CLAUDE.md ("Generar la página de un negocio").
 */

const PUERTO = Number(process.env.PANEL_PORT) || 3300;
const HTML = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html');

// ---------- tareas en segundo plano ----------
const tareas = new Map();
let secuencia = 0;

function correr(nombre, fn) {
  const id = String(++secuencia);
  const tarea = { id, nombre, log: [], terminada: false, ok: null, resultado: null };
  tareas.set(id, tarea);
  const log = (m) => { tarea.log.push(String(m)); if (tarea.log.length > 400) tarea.log.shift(); };
  Promise.resolve()
    .then(() => fn(log))
    .then((r) => { tarea.resultado = r ?? null; tarea.ok = true; log('Listo.'); })
    .catch((e) => { tarea.ok = false; log(`ERROR: ${e.message}`); })
    .finally(() => { tarea.terminada = true; });
  return id;
}

// ---------- servidor HTTP ----------
const app = express();
app.use(express.json({ limit: '40mb' }));

app.get('/', (_req, res) => res.sendFile(HTML));

app.get('/api/datos', (_req, res) => {
  res.json({
    rubros: Object.entries(rubros).map(([key, r]) => ({ key, nombre: r.nombre, fotos: r.fotos, preguntas: r.preguntas })),
    estilos: Object.entries(estilos).map(([key, e]) => ({ key, nombre: e.nombre, descripcion: e.descripcion })),
    prospectos: todos().map((l) => ({ id: l.id, nombre: l.nombre, rubro: l.rubro, zona: l.zona, telefono: l.telefono ?? null, estado: l.estado, webEstado: l.webEstado ?? null, direccion: l.direccion ?? null })),
  });
});

app.post('/api/prospecto', (req, res) => {
  const b = req.body ?? {};
  if (!b.nombre || !b.rubro) return res.status(400).json({ error: 'Falta el nombre o el rubro.' });
  const { telefono, movil } = normalizarTelefonoAR(b.telefono ?? '');
  const id = Math.random().toString(36).slice(2, 9);
  const lead = {
    id, nombre: b.nombre, rubro: b.rubro, zona: b.zona || 'Sin zona', direccion: b.direccion || null,
    telefono, telefonoCrudo: b.telefono || '', movil, web: b.web || null, webEstado: b.web ? 'desactualizada' : 'sin_web',
    estado: 'recopilando', estilo: b.estilo || rubros[b.rubro].estilosSugeridos[0],
    respuestas: b.respuestas ?? {}, terminosFotos: b.terminosFotos || null,
  };
  const agregado = agregarSiNoExiste(lead);
  if (!agregado) return res.status(409).json({ error: 'Ya existe un negocio con ese teléfono o nombre y dirección.' });
  res.json(lead);
});

app.post('/api/scrap', (req, res) => {
  const { rubro, zona, consulta, maximo = 15, verNavegador = false, filtros: entradaFiltros = {} } = req.body ?? {};
  if (!rubro || !zona) return res.status(400).json({ error: 'Elegí rubro y zona.' });
  if (!rubros[rubro]) return res.status(400).json({ error: 'Rubro no válido.' });
  const busqueda = consulta || rubros[rubro].busqueda;
  if (!busqueda) return res.status(400).json({ error: 'Escribí qué buscar.' });
  const max = Number(maximo);
  if (!Number.isInteger(max) || max < 1 || max > 50) return res.status(400).json({ error: 'El máximo tiene que estar entre 1 y 50.' });
  const { filtros, error } = validarFiltros(entradaFiltros);
  if (error) return res.status(400).json({ error });
  const id = correr(`Buscar ${busqueda} en ${zona}`, async (log) => {
    if (!verNavegador) process.env.HEADLESS = '1';
    else delete process.env.HEADLESS;
    const nuevos = await buscarNegocios({ consulta: busqueda, rubroKey: rubro, zona, maximo: max, filtros, log });
    const guardados = nuevos.filter(agregarSiNoExiste).length;
    log(`${nuevos.length} prospectos encontrados, ${guardados} nuevos guardados.`);
    return { encontrados: nuevos.length, guardados };
  });
  res.json({ tarea: id });
});

app.get('/api/tarea/:id', (req, res) => {
  const t = tareas.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'No existe la tarea.' });
  res.json({ id: t.id, nombre: t.nombre, log: t.log, terminada: t.terminada, ok: t.ok, resultado: t.resultado });
});

// ---------- datos del negocio cargados desde el panel (fotos, videos y el prompt visual) ----------
const MEDIA_EXT_FOTO = ['jpg', 'jpeg', 'png', 'webp'];
const MEDIA_EXT_VIDEO = ['mp4', 'webm'];
const extension = (n) => path.extname(String(n)).slice(1).toLowerCase();
const carpetaMedia = (id) => path.join(ROOT, 'data', 'media', String(id).replace(/[^a-z0-9]/gi, ''));

function listarMedia(id) {
  const d = carpetaMedia(id);
  if (!fs.existsSync(d)) return { fotos: [], videos: [] };
  const archivos = fs.readdirSync(d).sort();
  return {
    fotos: archivos.filter((a) => MEDIA_EXT_FOTO.includes(extension(a))),
    videos: archivos.filter((a) => MEDIA_EXT_VIDEO.includes(extension(a))),
  };
}

const texto = (v, max) => String(v ?? '').trim().slice(0, max);

/** Valida y limpia los datos que carga el panel. Devuelve { datos, promptVisual } o { error }. */
function validarDatos(b) {
  const servicios = (Array.isArray(b.servicios) ? b.servicios : [])
    .map((x) => ({ titulo: texto(x?.titulo, 80), texto: texto(x?.texto, 300) }))
    .filter((x) => x.titulo);
  if (servicios.length > 12) return { error: 'Como máximo 12 servicios.' };
  const precios = (Array.isArray(b.precios) ? b.precios : [])
    .map((x) => ({ item: texto(x?.item, 80), monto: texto(x?.monto, 40) }))
    .filter((x) => x.item);
  if (precios.length > 30) return { error: 'Como máximo 30 precios.' };
  const faq = (Array.isArray(b.faq) ? b.faq : [])
    .map((x) => ({ q: texto(x?.q, 160), a: texto(x?.a, 500) }))
    .filter((x) => x.q && x.a);
  if (faq.length > 10) return { error: 'Como máximo 10 preguntas frecuentes.' };
  const ig = texto(b.instagram, 60).replace(/^@/, '');
  if (ig && !/^[a-z0-9._]{1,30}$/i.test(ig)) return { error: 'El usuario de Instagram solo puede tener letras, números, punto y guion bajo.' };
  return {
    datos: {
      titulo: texto(b.titulo, 120), bajada: texto(b.bajada, 400), cta: texto(b.cta, 40),
      horarios: texto(b.horarios, 200), direccion: texto(b.direccion, 200), telefono: texto(b.telefono, 40),
      instagram: ig, facebook: texto(b.facebook, 200), sobre: texto(b.sobre, 1000),
      servicios, precios, faq, equipo: texto(b.equipo, 2000),
    },
    promptVisual: texto(b.promptVisual, 1500),
  };
}

app.get('/api/negocio/:id', (req, res) => {
  const lead = obtener(req.params.id);
  if (!lead) return res.status(404).json({ error: 'No existe ese negocio.' });
  res.json({ lead: { id: lead.id, nombre: lead.nombre, rubro: lead.rubro, zona: lead.zona }, datos: lead.datos ?? {}, promptVisual: lead.promptVisual ?? '', media: listarMedia(lead.id) });
});

app.post('/api/negocio/:id', (req, res) => {
  const lead = obtener(req.params.id);
  if (!lead) return res.status(404).json({ error: 'No existe ese negocio.' });
  const { datos, promptVisual, error } = validarDatos(req.body ?? {});
  if (error) return res.status(400).json({ error });
  // Los campos del formulario también alimentan las respuestas que usa el generador de textos.
  const respuestas = {
    ...lead.respuestas,
    servicios: datos.servicios.map((x) => x.titulo).join(', ') || lead.respuestas?.servicios,
    horarios: datos.horarios || lead.respuestas?.horarios,
    direccion: datos.direccion || lead.respuestas?.direccion,
    instagram: datos.instagram || 'no',
    extra: datos.sobre || lead.respuestas?.extra,
    precios: datos.precios.map((p) => `${p.item}: ${p.monto}`).join('\n'),
    equipo: datos.equipo,
    faq: datos.faq.map((f) => (f.q.includes('?') ? `${f.q} ${f.a}` : `${f.q}? ${f.a}`)).join('\n'),
  };
  const cambios = { id: lead.id, datos, respuestas, promptVisual };
  if (datos.direccion) cambios.direccion = datos.direccion;
  if (datos.telefono) {
    const { telefono, movil } = normalizarTelefonoAR(datos.telefono);
    cambios.telefonoCrudo = datos.telefono;
    if (telefono) { cambios.telefono = telefono; cambios.movil = movil; }
  }
  guardar(cambios);
  res.json({ ok: true, datos, promptVisual });
});

/** Arma el prompt que se le pega a Claude para crear o actualizar la página del negocio. */
function promptParaClaude(lead) {
  const d = lead.datos ?? {};
  const lineas = (titulo, items) => (items?.length ? `${titulo}\n${items.map((i) => `- ${i}`).join('\n')}` : null);
  const servicios = (d.servicios ?? []).map((s) => (s.texto ? `${s.titulo}: ${s.texto}` : s.titulo));
  const precios = (d.precios ?? []).map((p) => (p.monto ? `${p.item}: ${p.monto}` : p.item));
  const faq = (d.faq ?? []).map((f) => `${f.q} ${f.a}`);
  const redes = [d.instagram && `Instagram: @${d.instagram}`, d.facebook && `Facebook: ${d.facebook}`].filter(Boolean);
  const media = listarMedia(lead.id);
  const partes = [
    `Armá la página web de este negocio siguiendo CLAUDE.md. Usá solo los datos de abajo; lo que falte va como [COMPLETAR: ...].`,
    `Negocio: ${lead.nombre}\nRubro: ${rubros[lead.rubro]?.nombre ?? lead.rubro}\nZona: ${lead.zona}`,
    lead.promptVisual
      ? `Cómo quiere verse la página (pedido del cliente):\n${lead.promptVisual}`
      : 'El cliente no cargó un pedido visual: elegí una dirección razonable para el rubro y decí cuál elegiste.',
    d.titulo && `Título de la portada: ${d.titulo}`,
    d.bajada && `Texto de la portada: ${d.bajada}`,
    d.cta && `Botón principal: ${d.cta}`,
    d.sobre && `Sobre el negocio: ${d.sobre}`,
    lineas('Servicios:', servicios),
    lineas('Precios:', precios),
    d.equipo && `Quiénes son: ${d.equipo}`,
    lineas('Preguntas frecuentes:', faq),
    d.horarios && `Horarios: ${d.horarios}`,
    (d.direccion || lead.direccion) && `Dirección: ${d.direccion || lead.direccion}`,
    (d.telefono || lead.telefono) && `Teléfono: ${d.telefono || lead.telefono}`,
    lineas('Redes:', redes),
    `Fotos cargadas: ${media.fotos.length}. Videos cargados: ${media.videos.length}. Están en data/media/${lead.id}.`,
  ];
  return partes.filter(Boolean).join('\n\n');
}

app.get('/api/negocio/:id/prompt', (req, res) => {
  const lead = obtener(req.params.id);
  if (!lead) return res.status(404).json({ error: 'No existe ese negocio.' });
  res.json({ prompt: promptParaClaude(lead) });
});

app.post('/api/media/:id', (req, res) => {
  const lead = obtener(req.params.id);
  if (!lead) return res.status(404).json({ error: 'No existe ese negocio.' });
  const nombre = path.basename(String(req.body?.nombre ?? ''));
  const e = extension(nombre);
  const esVideo = MEDIA_EXT_VIDEO.includes(e);
  if (!esVideo && !MEDIA_EXT_FOTO.includes(e)) return res.status(400).json({ error: 'Tipo de archivo no permitido. Usá jpg, png, webp, mp4 o webm.' });
  const base64 = String(req.body?.data ?? '').split(',').pop();
  const buf = Buffer.from(base64, 'base64');
  if (!buf.length) return res.status(400).json({ error: 'El archivo está vacío.' });
  if (buf.length > (esVideo ? 25 : 8) * 1024 * 1024) return res.status(400).json({ error: esVideo ? 'El video supera los 25 MB.' : 'La foto supera los 8 MB.' });
  const actual = listarMedia(lead.id);
  if (esVideo && actual.videos.length >= 2) return res.status(400).json({ error: 'Como máximo 2 videos por negocio.' });
  if (!esVideo && actual.fotos.length >= 9) return res.status(400).json({ error: 'Como máximo 9 fotos por negocio.' });
  const d = carpetaMedia(lead.id);
  fs.mkdirSync(d, { recursive: true });
  const numero = String((esVideo ? actual.videos.length : actual.fotos.length) + 1).padStart(2, '0');
  const archivo = `${esVideo ? 'video' : 'foto'}-${numero}-${Date.now()}.${e}`;
  fs.writeFileSync(path.join(d, archivo), buf);
  res.json({ archivo });
});

app.get('/api/media/:id/:archivo', (req, res) => {
  const d = carpetaMedia(req.params.id);
  const archivo = path.basename(req.params.archivo);
  const ruta = path.join(d, archivo);
  if (!fs.existsSync(ruta)) return res.status(404).end();
  res.sendFile(ruta);
});

app.delete('/api/media/:id/:archivo', (req, res) => {
  const archivo = path.basename(req.params.archivo);
  const ruta = path.join(carpetaMedia(req.params.id), archivo);
  if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'No existe ese archivo.' });
  fs.unlinkSync(ruta);
  res.json({ ok: true });
});

app.listen(PUERTO, () => {
  console.log(`Panel abierto en http://localhost:${PUERTO}`);
});
