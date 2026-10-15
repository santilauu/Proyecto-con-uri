import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.js';
import { obtener } from './store.js';
import { llamar } from './lovable-mcp.js';
import {
  armarPedidoCreacion, armarPedidoEdicion, recibir, leerEstado, escribirEstado, carpetaLovable, MAX_INTENTOS,
} from './lovable-trabajo.js';

/*
 * Trabajo automático con Lovable: lo que antes se hacía a mano en el chat, ahora lo hace el panel.
 * Crear o editar la composición, esperar a que Lovable termine, bajar Home.tsx, validarlo (recibir) y, si el
 * sistema lo rechaza, devolverle a Lovable el diagnóstico exacto. Máximo MAX_INTENTOS rondas.
 * Cuida los créditos: tope diario, un solo trabajo a la vez y nunca vuelve a crear un proyecto que ya existe.
 */

const DIR_LOVABLE = path.join(ROOT, 'data', 'lovable');
const ARCHIVO_CREDITOS = path.join(DIR_LOVABLE, 'creditos.json');
const BLOQUEO = path.join(DIR_LOVABLE, '.trabajo.lock');
const ESPERA_MAXIMA_MS = 15 * 60 * 1000;
const BLOQUEO_VENCIDO_MS = 30 * 60 * 1000;
export const ESTIMADO_POR_PEDIDO = 1.5;
export const topeDiario = () => {
  const v = process.env.LOVABLE_TOPE_DIARIO;
  return v !== undefined && v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 5; // 5 = lo que da por día el plan gratuito de Lovable
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const intervalo = () => Number(process.env.LOVABLE_INTERVALO_MS) || 6000;
// Lovable reinicia los créditos diarios a las 00:00 UTC (21:00 en Argentina): el contador usa el mismo día.
const fechaHoy = () => new Date().toISOString().slice(0, 10);

// ---------- créditos ----------
const leerCreditos = () => { try { return JSON.parse(fs.readFileSync(ARCHIVO_CREDITOS, 'utf8')); } catch { return {}; } };
export const creditosHoy = () => leerCreditos()[fechaHoy()] ?? 0;
function sumarCreditos(n) {
  const todo = leerCreditos();
  todo[fechaHoy()] = Math.round(((todo[fechaHoy()] ?? 0) + n) * 100) / 100;
  fs.mkdirSync(DIR_LOVABLE, { recursive: true });
  fs.writeFileSync(ARCHIVO_CREDITOS, JSON.stringify(todo, null, 2));
}
function verificarTope() {
  if (creditosHoy() + ESTIMADO_POR_PEDIDO > topeDiario()) {
    throw new Error(`Tope diario de créditos de Lovable alcanzado (${creditosHoy()} de ${topeDiario()}). Se puede subir con LOVABLE_TOPE_DIARIO.`);
  }
}
export const resumenCreditos = () => ({ hoy: creditosHoy(), tope: topeDiario() });

// ---------- un solo trabajo a la vez ----------
function tomarBloqueo(id) {
  fs.mkdirSync(DIR_LOVABLE, { recursive: true });
  try {
    const actual = JSON.parse(fs.readFileSync(BLOQUEO, 'utf8'));
    if (Date.now() - actual.desde < BLOQUEO_VENCIDO_MS) throw new Error(`Ya hay una demo en proceso (${actual.id}). Esperá a que termine.`);
  } catch (e) {
    if (/Ya hay una demo/.test(e.message)) throw e;
  }
  fs.writeFileSync(BLOQUEO, JSON.stringify({ id, desde: Date.now() }));
}
const soltarBloqueo = () => fs.rmSync(BLOQUEO, { force: true });

// ---------- cancelación ----------
const cancelados = new Set();
export const cancelar = (id) => cancelados.add(String(id));
export const enCurso = () => { try { return JSON.parse(fs.readFileSync(BLOQUEO, 'utf8')).id ?? null; } catch { return null; } };

// ---------- piezas ----------
async function workspaceId() {
  if (process.env.LOVABLE_WORKSPACE_ID) return process.env.LOVABLE_WORKSPACE_ID;
  const { json } = await llamar('get_me');
  const lista = json?.workspaces ?? [];
  if (lista.length === 1) return lista[0].id;
  if (!lista.length) throw new Error('Tu cuenta de Lovable no tiene workspaces disponibles.');
  throw new Error(`Hay varios workspaces en Lovable (${lista.map((w) => w.name).join(', ')}). Definí LOVABLE_WORKSPACE_ID en .env.`);
}

/** Espera a que el agente de Lovable termine el mensaje. Devuelve el costo informado (si lo hay). */
async function esperarMensaje(projectId, messageId, { paso, abortado }) {
  const t0 = Date.now();
  while (Date.now() - t0 < ESPERA_MAXIMA_MS) {
    if (abortado()) throw new Error('Cancelado.');
    const { json } = await llamar('get_message', { project_id: projectId, message_id: messageId });
    const r = json?.response;
    if (r?.status === 'completed') return json?.cost_credits ?? r.cost_credits ?? null;
    if (r?.status === 'stopped' || r?.status === 'error') throw new Error(`Lovable terminó el trabajo con estado "${r.status}".`);
    if (r?.awaiting_input) throw new Error('Lovable pausó el trabajo y pide una decisión humana. Abrí el proyecto en su editor para resolverlo.');
    paso(`Lovable está trabajando (${Math.round((Date.now() - t0) / 1000)} s)`);
    await esperar(intervalo());
  }
  throw new Error('Lovable tardó más de 15 minutos. Se corta la espera; el proyecto queda en su editor.');
}

async function bajarComposicion(projectId, leadId, nombre) {
  const { json: proyecto } = await llamar('get_project', { project_id: projectId });
  const commit = proyecto?.latest_commit_sha;
  const { texto } = await llamar('read_file', { project_id: projectId, path: 'src/composicion/Home.tsx', ...(commit ? { ref: commit } : {}) });
  if (!/export\s+default\s+function\s+Home/.test(texto)) throw new Error('Lovable no dejó src/composicion/Home.tsx con el formato pedido.');
  const dir = path.join(carpetaLovable(leadId), 'entrada');
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, nombre);
  fs.writeFileSync(archivo, texto);
  return { archivo, commit };
}

const EJEMPLO_PAGINAS = '[{"ruta":"/servicios","titulo":"Servicios"},{"ruta":"/galeria","titulo":"Galería"},{"ruta":"/preguntas-frecuentes","titulo":"Preguntas"},{"ruta":"/contacto","titulo":"Contacto"}]';

function mensajeCorreccion(problemas, ronda, edicion) {
  const lista = problemas.map((p) => `- ${p}`).join('\n');
  if (edicion) {
    return `Corrección de la edición de contenido (intento ${ronda + 1} de ${MAX_INTENTOS}). El sistema comparó la versión nueva con la anterior y la rechazó:\n\n${lista}\n\nQué hacer: dejá \`src/composicion/Home.tsx\` exactamente como estaba (mismas clases, etiquetas y marcas data-*). Solo cambian los contenidos, que se leen de \`cliente.json\`. No agregues secciones. Respondé en una línea qué cambiaste.`;
  }
  return `Corrección de la composición (intento ${ronda + 1} de ${MAX_INTENTOS}). El sistema validó y midió la página compilada con enlaces reales en \`paginas\` y encontró esto:\n\n${lista}\n\nQué hacer:\n1. Si querés reproducir los problemas de ancho, en \`src/composicion/cliente.json\` poné \`"paginas": ${EJEMPLO_PAGINAS}\` y probá a 360 px.\n2. Corregí solo lo señalado, sin cambiar las secciones pedidas, sus \`data-seccion\` / \`data-composicion\`, el orden ni la idea visual.\n3. Respetá el contrato técnico del primer mensaje (sin imports ajenos, sin hooks, sin \`style\`, sin colores fijos).\n\nCuando termines, respondé en una línea qué cambiaste.`;
}

async function enviar(projectId, mensaje, ctx) {
  verificarTope();
  ctx.paso('Enviando el mensaje a Lovable');
  const { json } = await llamar('send_message', { project_id: projectId, message: mensaje, wait: false });
  const id = json?.message_id;
  if (!id) throw new Error('Lovable no devolvió el identificador del mensaje.');
  return id;
}

/** Procesa lo que devolvió Lovable; si el sistema lo rechaza, le manda el diagnóstico y repite (máx. MAX_INTENTOS rondas). */
async function ciclo(lead0, proyecto, messageId, ctx, { edicion, etapaInicial }) {
  let mensaje = messageId;
  for (let ronda = 1; ronda <= MAX_INTENTOS; ronda++) {
    // Cada mensaje cuenta una sola vez; si se corta la espera igual se cuenta (los créditos ya se gastaron).
    let costo = null;
    try { costo = await esperarMensaje(proyecto.id, mensaje, ctx); } finally { ctx.registrarCosto(costo, ronda === 1 ? etapaInicial : 'corrección'); }
    ctx.paso(`Bajando el código (ronda ${ronda})`);
    const { archivo, commit } = await bajarComposicion(proyecto.id, lead0.id, `Home-${Date.now()}.tsx`);
    ctx.log(`Código bajado (commit ${String(commit).slice(0, 7)}).`);
    ctx.paso('Validando, compilando y auditando');
    const r = await recibir(obtener(lead0.id), archivo, { proyecto });
    if (r.ok) {
      ctx.log(`Aceptada: ${r.firma.replace('lovable|', '')}`);
      if (r.sinEspacio?.length) ctx.log(`Datos sin espacio en la página: ${r.sinEspacio.join(', ')}.`);
      return r;
    }
    ctx.log(`Rechazada (ronda ${ronda}):\n  - ${r.problemas.join('\n  - ')}`);
    if (r.agotado || ronda === MAX_INTENTOS) throw new Error(leerEstado(lead0.id)?.mensaje || 'No se logró una composición válida.');
    mensaje = await enviar(proyecto.id, mensajeCorreccion(r.problemas, ronda, edicion), ctx);
  }
  throw new Error('No se logró una composición válida.');
}

async function creacion(lead, ctx) {
  ctx.paso('Armando el pedido');
  await armarPedidoCreacion(lead);
  const pedido = fs.readFileSync(path.join(carpetaLovable(lead.id), 'pedido.md'), 'utf8');
  const est = leerEstado(lead.id);

  let proyecto = est.proyecto?.id ? est.proyecto : null;
  const reutilizado = !!proyecto;
  let messageId;
  if (proyecto) {
    // El negocio ya tiene proyecto: no se crea otro, se le pide a Lovable que lo rehaga.
    ctx.log(`Reutilizo el proyecto de Lovable ${proyecto.id}.`);
    messageId = await enviar(proyecto.id, `Rehacé la página de inicio desde cero con este nuevo pedido. Reemplazá \`src/composicion/Home.tsx\` y \`src/composicion/cliente.json\`.\n\n${pedido}`, ctx);
  } else {
    verificarTope();
    const workspace = await workspaceId();
    ctx.paso('Creando el proyecto en Lovable');
    const desde = Date.now() - 60000;
    let creado;
    try {
      ({ json: creado } = await llamar('create_project', { workspace_id: workspace, initial_message: pedido, wait: false }));
    } catch (e) {
      // Si la llamada expiró, el proyecto pudo haberse creado igual: se busca antes de reintentar.
      ctx.log(`create_project falló (${e.message}). Reviso si se creó igual...`);
      const { json } = await llamar('list_projects', { workspace_id: workspace, limit: 5 });
      const hallado = (json?.projects ?? []).find((p) => Date.parse(p.created_at) >= desde);
      if (!hallado) throw e;
      creado = { projectId: hallado.id, editor_url: hallado.editor_url, preview_url: hallado.preview_url, message_id: null };
    }
    const id = creado?.projectId ?? creado?.id;
    if (!id) throw new Error('Lovable no devolvió el identificador del proyecto.');
    proyecto = { id, editor: creado.editor_url ?? `https://lovable.dev/projects/${id}`, preview: creado.preview_url ?? null };
    escribirEstado(lead.id, { proyecto });
    ctx.log(`Proyecto creado: ${proyecto.editor}`);
    messageId = creado.message_id ?? creado.agent_response?.message_id;
    if (!messageId) {
      const { json } = await llamar('list_messages', { project_id: id, limit: 1 });
      messageId = json?.messages?.[0]?.id ?? json?.data?.[0]?.id;
    }
    if (!messageId) throw new Error('No pude identificar el mensaje inicial del proyecto de Lovable.');
  }
  return ciclo(lead, proyecto, messageId, ctx, { edicion: false, etapaInicial: reutilizado ? 'mensaje' : 'creación' });
}

async function edicion(lead, ctx) {
  ctx.paso('Armando el pedido de edición');
  await armarPedidoEdicion(lead);
  const texto = fs.readFileSync(path.join(carpetaLovable(lead.id), 'edicion.md'), 'utf8');
  const proyecto = leerEstado(lead.id)?.proyecto;
  if (!proyecto?.id) throw new Error('Este negocio no tiene proyecto de Lovable guardado: creá primero la demo con "Crear DEMO".');
  const messageId = await enviar(proyecto.id, texto, ctx);
  return ciclo(lead, proyecto, messageId, ctx, { edicion: true, etapaInicial: 'mensaje' });
}

/**
 * Lanza el trabajo de un negocio. tipo: "crear" o "editar".
 * Si algo falla, el estado queda en "error" con el motivo exacto (la demo anterior, si la había, se conserva).
 */
export async function lanzar(leadId, tipo, { log = console.log } = {}) {
  const lead = obtener(leadId);
  if (!lead) throw new Error('No existe ese negocio.');
  const id = String(leadId);
  cancelados.delete(id);
  tomarBloqueo(id);
  const archivoLog = path.join(carpetaLovable(id), 'log.txt');
  fs.mkdirSync(path.dirname(archivoLog), { recursive: true });
  const escribirLog = (m) => { fs.appendFileSync(archivoLog, `${new Date().toLocaleTimeString('es-AR')} ${m}\n`); log(m); };
  let ultimoPaso = '';
  const ctx = {
    log: escribirLog,
    abortado: () => cancelados.has(id),
    paso: (p) => {
      if (p === ultimoPaso) return;
      ultimoPaso = p;
      escribirEstado(id, { estado: 'en_lovable', paso: p, mensaje: p });
      escribirLog(p);
    },
    registrarCosto: (costo, etapa) => {
      const n = costo ?? (etapa === 'creación' ? 1.3 : 0.8);
      sumarCreditos(n);
      escribirEstado(id, { creditos: Math.round(((leerEstado(id)?.creditos ?? 0) + n) * 100) / 100 });
      escribirLog(`Créditos de Lovable: ${n}${costo == null ? ' (estimado)' : ''} en ${etapa}. Hoy: ${creditosHoy()} de ${topeDiario()}.`);
    },
  };
  escribirLog(`--- ${tipo === 'editar' ? 'Edición de contenido' : 'Creación de la demo'} ---`);
  try {
    const r = tipo === 'editar' ? await edicion(lead, ctx) : await creacion(lead, ctx);
    escribirEstado(id, { paso: null });
    return { ok: true, firma: r.firma, version: r.version, sinEspacio: r.sinEspacio };
  } catch (e) {
    const previo = leerEstado(id) ?? {};
    // "fallida" y "rechazada" ya los dejó escritos recibir(); el resto se informa como error con su motivo.
    if (!['fallida', 'rechazada'].includes(previo.estado)) escribirEstado(id, { estado: 'error', mensaje: e.message, paso: null });
    else escribirEstado(id, { paso: null });
    // El ejecutor de tareas del panel ya imprime "ERROR: ..." en su registro; acá solo se guarda en el archivo.
    fs.appendFileSync(archivoLog, `${new Date().toLocaleTimeString('es-AR')} ERROR: ${e.message}\n`);
    throw e;
  } finally {
    soltarBloqueo();
    cancelados.delete(id);
  }
}
