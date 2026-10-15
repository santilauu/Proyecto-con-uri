import { select, input, confirm, checkbox } from '@inquirer/prompts';
import { execSync } from 'node:child_process';
import { rubros, estilos, jitter } from './util.js';
import { todos, agregarSiNoExiste, guardar, obtener } from './store.js';
import { buscarNegocios } from './scraper.js';
import { enviarPlantilla } from './whatsapp.js';
import { iniciarWebhook } from './webhook.js';
import { construirSitio, nombreProyecto, compilarLocal } from './builder.js';
import { crearDemo, crearFinal, textoDemos, textoPermisoMedia, proximaPregunta, prepararRubro } from './conversation.js';
import { resumenBenchmark } from './benchmark.js';
import { mensajeInicial, enlaceWhatsApp } from './mensajes.js';
import { detectarRedes, resumenRedes, tieneContenido, traerFotosDePerfil } from './redes.js';
import { importarCarpeta, cantidadMedia } from './media.js';
import { sitiosPrevios } from './variantes.js';
import { normalizarTelefonoAR } from './util.js';

const ZONAS = ['Palermo', 'Belgrano', 'Caballito', 'Almagro', 'Flores', 'Villa Urquiza', 'Recoleta', 'Quilmes', 'La Plata', 'Rosario', 'Córdoba', 'Mendoza'];
const CABA = ['Palermo', 'Belgrano', 'Caballito', 'Almagro', 'Flores', 'Villa Urquiza', 'Recoleta'];
const LIMITE_DIARIO = 30;
const abrir = (url) => execSync(`start "" "${url}"`, { shell: 'cmd.exe', stdio: 'ignore' });

async function elegirZona() {
  const z = await select({ message: 'Zona:', choices: [...ZONAS.map((v) => ({ value: v })), { name: 'Otra...', value: '__otra' }] });
  if (z !== '__otra') return CABA.includes(z) ? `${z}, Buenos Aires` : z;
  return input({ message: 'Zona (barrio y ciudad):', required: true });
}

async function buscar() {
  const rubroKey = await select({ message: 'Rubro:', choices: Object.entries(rubros).map(([value, r]) => ({ name: r.nombre, value })) });
  const consulta = rubros[rubroKey].busqueda || await input({ message: '¿Qué buscás? (ej: ferretería):', required: true });
  const zona = await elegirZona();
  const maximo = Number(await input({ message: 'Máximo de prospectos a guardar:', default: '15' }));
  const nuevos = await buscarNegocios({ consulta, rubroKey, zona, maximo });
  const agregados = nuevos.filter(agregarSiNoExiste).length;
  const usables = nuevos.filter((n) => n.telefono && n.movil).length;
  console.log(`\n${nuevos.length} prospectos encontrados, ${agregados} nuevos guardados. ${usables} con celular (probable WhatsApp).`);
}

/** Carga un negocio a mano: sirve para probar con tu propio número o sumar un cliente que te llegó por otro lado. */
async function agregarManual() {
  const nombre = await input({ message: 'Nombre del negocio:', required: true });
  const rubro = await select({ message: 'Rubro:', choices: Object.entries(rubros).map(([value, r]) => ({ name: r.nombre, value })) });
  const zona = await elegirZona();
  const crudo = await input({ message: 'Teléfono / WhatsApp (ej: 11 5555 1234):', required: true });
  const { telefono, movil } = normalizarTelefonoAR(crudo);
  if (!telefono) return console.log('No pude interpretar ese teléfono. Probá con código de área y 8 dígitos.');
  const direccion = await input({ message: 'Dirección (opcional):', default: '' });
  const web = await input({ message: 'Link de su web, Instagram o Facebook (opcional):', default: '' });
  const ok = agregarSiNoExiste({ id: Math.random().toString(36).slice(2, 9), nombre, rubro, zona, telefono, telefonoCrudo: crudo, movil, direccion: direccion || null, web: web || null, webEstado: web ? 'desactualizada' : 'sin_web', motivos: [] });
  console.log(ok ? `Agregado: ${nombre}. Ya aparece en "Ver prospectos" y en el modo manual.` : 'Ya existía un negocio con ese teléfono o nombre.');
}

function listar() {
  const leads = todos();
  if (!leads.length) return console.log('Todavía no hay prospectos.');
  console.table(leads.map((l) => ({
    nombre: l.nombre, rubro: l.rubro, web: l.webEstado, tel: l.telefono ?? '-', celular: l.movil ? 'sí' : 'no',
    redes: l.redes ? (resumenRedes(l.redes) || 'ninguna') : '(sin revisar)', estado: l.estado,
  })));
}

async function enviar() {
  const hoy = new Date().toISOString().slice(0, 10);
  const enviadosHoy = todos().filter((l) => l.contactadoEl?.startsWith(hoy)).length;
  const candidatos = todos().filter((l) => l.estado === 'nuevo' && l.telefono);
  if (!candidatos.length) return console.log('No hay prospectos nuevos con teléfono.');
  const ids = await checkbox({
    message: `Elegí a quiénes enviar la propuesta (hoy van ${enviadosHoy}/${LIMITE_DIARIO}):`,
    choices: candidatos.map((l) => ({ name: `${l.nombre} (${l.webEstado}) ${l.telefono}${l.movil ? '' : ' [fijo: puede no tener WhatsApp]'}`, value: l.id, checked: l.movil })),
  });
  const cupo = Math.max(0, LIMITE_DIARIO - enviadosHoy);
  const elegidos = candidatos.filter((l) => ids.includes(l.id)).slice(0, cupo);
  if (!elegidos.length) return console.log('Nada para enviar (o llegaste al límite diario).');
  if (!(await confirm({ message: `Enviar la plantilla a ${elegidos.length} negocios?` }))) return;
  for (const l of elegidos) {
    try {
      await enviarPlantilla(l.telefono, l.nombre);
      guardar({ id: l.id, estado: 'contactado', contactadoEl: new Date().toISOString() });
      console.log(`enviado: ${l.nombre}`);
    } catch (e) { console.error(`falló ${l.nombre}: ${e.message}`); }
    await jitter(20000, 45000);
  }
}

async function probarSitio() {
  const leads = todos();
  if (!leads.length) return console.log('Primero buscá prospectos.');
  const id = await select({ message: 'Prospecto:', choices: leads.map((l) => ({ name: l.nombre, value: l.id })) });
  const lead = leads.find((l) => l.id === id);
  const estilo = await select({ message: 'Estilo:', choices: Object.entries(estilos).map(([value, e]) => ({ name: `${e.nombre} - ${e.descripcion}`, value })) });
  const { dir } = await construirSitio({ ...lead, estilo }, { demo: false, siteUrl: `https://${nombreProyecto(lead, false)}.vercel.app` });
  console.log(`Sitio generado en ${dir}`);
  if (await confirm({ message: 'Compilar localmente para verificar?', default: false })) compilarLocal(dir);
}

/** Confirma el rubro (corrige si el negocio es de otro) y muestra qué suele tener la competencia. */
async function verificarRubro(lead) {
  console.log('Verificando rubro y mirando sitios del mismo rubro (puede tardar un minuto)...');
  const r = await prepararRubro(lead, {
    log: (m) => console.log(m),
    preguntar: (cl) => confirm({ message: `Este negocio figura como "${rubros[lead.rubro].nombre}", pero por su nombre y categoría de Maps ("${lead.categoria ?? 'sin dato'}") parece "${rubros[cl.detectado].nombre}". ¿Cambiar el rubro?`, default: true }),
  });
  console.log(`Rubro: ${rubros[r.lead.rubro].nombre}
${resumenBenchmark(r.benchmark)}`);
  return r.lead;
}

/** Paso previo a la página final: ¿tienen Instagram/Facebook con fotos o videos? ¿lo autorizaron? */
async function gestionarMedia(lead) {
  if (!lead.redes) {
    console.log('Buscando Instagram y Facebook...');
    lead = guardar({ id: lead.id, redes: await detectarRedes(lead) });
  }
  const resumen = resumenRedes(lead.redes);
  console.log(resumen ? `Redes encontradas: ${resumen}` : 'No encontré redes públicas.');
  if (tieneContenido(lead.redes)) console.log(`\nMensaje sugerido para el cliente:\n${textoPermisoMedia(lead)}\n`);
  if (!(await confirm({ message: '¿El cliente autorizó usar fotos/videos?', default: false }))) return lead;

  const redes = Object.fromEntries(Object.entries(lead.redes).map(([k, r]) => [k, { ...r, confirmado: true }]));
  lead = guardar({ id: lead.id, redes });
  const via = await select({
    message: `Cómo cargamos el material (ya hay ${cantidadMedia(lead)} archivos):`,
    choices: [
      { name: 'Desde una carpeta (las fotos/videos que mandó por WhatsApp)', value: 'carpeta' },
      { name: 'Tomarlas del perfil público (mejor esfuerzo, suele pedir login)', value: 'perfil' },
      { name: 'Seguir sin fotos', value: 'nada' },
    ],
  });
  if (via === 'carpeta') {
    const carpeta = await input({ message: 'Ruta de la carpeta:', required: true });
    console.log(`${importarCarpeta(lead, carpeta.replace(/^"|"$/g, ''))} archivos importados.`);
  } else if (via === 'perfil') {
    const n = await traerFotosDePerfil(lead, lead.redes.instagram?.confirmado ? 'instagram' : 'facebook');
    console.log(n ? `${n} fotos tomadas.` : 'No pude tomarlas desde el perfil: pedíselas al cliente por WhatsApp.');
  }
  return lead;
}

/** Elegir un sitio ya entregado como punto de partida (mismo estilo y tipografía, distinta composición). */
async function basarEnAnterior(lead) {
  const previos = sitiosPrevios().filter((s) => s.lead !== lead.id && obtener(s.lead)?.adn);
  if (!previos.length) return console.log('Todavía no hay sitios previos para tomar de base.');
  const id = await select({ message: 'Basarse en:', choices: [...previos.map((s) => ({ name: `${s.nombre} (${s.rubro})`, value: s.lead })), { name: 'Ninguno', value: '' }] });
  if (!id) return;
  const prev = obtener(id);
  const adn = prev.adn[prev.estilo] ?? Object.values(prev.adn)[0];
  guardar({ id: lead.id, basarEn: adn, adn: undefined });
  console.log(`Se tomará el estilo ${estilos[adn.estilo].nombre} de ${prev.nombre} con otra composición.`);
}

/** Flujo completo sin API: vos mandás los mensajes desde tu WhatsApp; el sistema arma y publica. */
async function manual() {
  const leads = todos().filter((l) => l.telefono && !['opt_out', 'rechazado'].includes(l.estado));
  if (!leads.length) return console.log('No hay prospectos con teléfono.');
  const id = await select({ message: 'Prospecto:', choices: leads.map((l) => ({ name: `${l.nombre} [${l.estado}]`, value: l.id })) });
  let lead = leads.find((l) => l.id === id);
  const accion = await select({
    message: `${lead.nombre}: ¿qué hacemos?`,
    choices: [
      { name: '1. Abrir WhatsApp con el primer mensaje', value: 'msg' },
      { name: '2. Generar y publicar la demo (3 estilos)', value: 'demo' },
      { name: '3. Cargar datos del cliente, fotos y publicar el sitio final', value: 'final' },
      { name: '4. Solo revisar Instagram/Facebook y cargar fotos/videos', value: 'media' },
      { name: '5. Tomar de base un sitio anterior (reutilizar estilo)', value: 'base' },
      { name: '7. Verificar rubro y analizar competencia', value: 'rubro' },
      { name: '6. Marcar como rechazado', value: 'rechazo' },
    ],
  });
  if (accion === 'msg') {
    const url = enlaceWhatsApp(lead.telefono, mensajeInicial(lead));
    console.log(`\n${mensajeInicial(lead)}\n\n${url}`);
    abrir(url);
    guardar({ id: lead.id, estado: lead.estado === 'nuevo' ? 'contactado' : lead.estado, contactadoEl: new Date().toISOString() });
  } else if (accion === 'demo') {
    lead = await verificarRubro(lead);
    console.log('Revisando redes y generando la demo (1 a 3 minutos)...');
    const demo = await crearDemo(lead);
    const texto = textoDemos(demo);
    console.log(`\n${texto}\n`);
    abrir(enlaceWhatsApp(lead.telefono, texto));
  } else if (accion === 'rubro') {
    await verificarRubro(lead);
  } else if (accion === 'media') {
    await gestionarMedia(lead);
  } else if (accion === 'base') {
    await basarEnAnterior(lead);
  } else if (accion === 'final') {
    const ofrecidos = lead.estilosOfrecidos ?? rubros[lead.rubro].estilosSugeridos.slice(0, 3);
    const estilo = await select({ message: 'Estilo elegido:', choices: ofrecidos.map((k) => ({ name: estilos[k].nombre, value: k })) });
    lead = guardar({ id: lead.id, estilo });
    lead = await verificarRubro(lead);
    lead = await gestionarMedia(lead);
    const respuestas = { ...lead.respuestas };
    for (let p = proximaPregunta({ ...lead, respuestas }); p; p = proximaPregunta({ ...lead, respuestas })) {
      respuestas[p.campo] = await input({ message: p.texto, default: '' });
    }
    lead = guardar({ id: lead.id, respuestas });
    console.log('Generando y publicando...');
    const r = await crearFinal(lead, {
      confirmar: async (pend, avisos) => {
        if (avisos.length) console.log(`Avisos de fotos/videos:\n- ${avisos.join('\n- ')}`);
        if (pend.length) console.log(`Faltan datos (se verán como [COMPLETAR] en el sitio):\n- ${pend.join('\n- ')}`);
        return confirm({ message: 'Publicar igual?', default: !pend.length });
      },
    });
    if (r) console.log(`\nPublicado: ${r.url}`);
  } else {
    guardar({ id: lead.id, estado: 'rechazado' });
  }
}

const acciones = { agregar: agregarManual, manual, buscar, listar, enviar, webhook: async () => { iniciarWebhook(); await new Promise(() => {}); }, probar: probarSitio };

while (true) {
  const op = await select({
    message: 'Automatizador de páginas web',
    choices: [
      { name: '1. Buscar negocios (zona + rubro)', value: 'buscar' },
      { name: '2. Ver prospectos', value: 'listar' },
      { name: '3. Enviar propuesta por WhatsApp (API)', value: 'enviar' },
      { name: '4. Escuchar respuestas (webhook)', value: 'webhook' },
      { name: '5. Generar un sitio a mano (prueba, sin publicar)', value: 'probar' },
      { name: '6. MODO MANUAL sin API (WhatsApp propio + publicar)', value: 'manual' },
      { name: '7. Agregar un negocio a mano (también para probar con tu número)', value: 'agregar' },
      { name: 'Salir', value: 'salir' },
    ],
  });
  if (op === 'salir') break;
  await Promise.resolve().then(() => acciones[op]()).catch((e) => console.error(`Error: ${e.message}`));
}
