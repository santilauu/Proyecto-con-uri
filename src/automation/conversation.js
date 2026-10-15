import { rubros, estilos } from './util.js';
import { guardar, porTelefono, obtener } from './store.js';
import { enviarTexto, descargarMedia } from './whatsapp.js';
import { construirSitio, nombreProyecto, faltantes } from './builder.js';
import { desplegar, urlPrevista } from './deploy.js';
import { detectarRedes, tieneContenido, traerFotosDePerfil } from './redes.js';
import { guardarMedia, cantidadMedia } from './media.js';
import { clasificarRubro, analizarRubro, preguntasDe } from './benchmark.js';

// Límites de palabra compatibles con acentos:  de JavaScript no reconoce "sí" ni "mío".
const palabras = (...alts) => new RegExp(String.raw`(?<![\p{L}])(?:${alts.join('|')})(?![\p{L}])`, 'iu');
const BAJA = palabras('stop', 'baja', 'dar de baja', 'no me (?:escriban|escribas|molesten|contacten)', 'spam');
const NO = /^\s*(?:no|nop|no gracias|no me interesa|no quiero)(?![\p{L}])|no me interesa/iu;
const SI = palabras('si', 'sí', 'dale', 'ok', 'okey', 'bueno', 'claro', 'me interesa', 'mandame', 'mandá', 'mandalo', 'quiero', 'por favor', 'adelante', 'genial', 'perfecto', 'acepto', 'autorizo', 'pueden', 'usalas', 'usalos', 'usarlas', 'usarlos');
const NO_ES_NUESTRO = palabras('no es (?:nuestro|ese|el nuestro|de nosotros|mio|mío)');
const LISTO = palabras('listo', 'ya está', 'ya esta', 'eso es todo', 'nada más', 'nada mas', 'terminé', 'termine');
const DE_PERFIL = palabras('tomalas', 'tomalos', 'sacalas', 'sacalos', 'de instagram', 'de facebook', 'de la red', 'de ahí', 'de ahi');

const enProceso = new Set();

async function decir(lead, texto) {
  await enviarTexto(lead.telefono, texto);
  guardar({ id: lead.id, ultimoMensaje: texto });
}

// ---------- operaciones reutilizables (las usa también el modo manual del CLI) ----------

/**
 * Antes de diseñar: confirma que el rubro sea el correcto y mira cómo son los sitios del mismo rubro.
 * `preguntar(clasificacion)` (opcional) decide si se cambia el rubro; sin ella, se cambia solo con evidencia fuerte.
 */
export async function prepararRubro(lead, { preguntar, log = console.log } = {}) {
  const clasificacion = clasificarRubro(lead);
  if (clasificacion.dudoso && (!preguntar || (await preguntar(clasificacion)))) {
    log(`Rubro corregido: ${lead.rubro} -> ${clasificacion.detectado} (${lead.nombre}, categoría "${lead.categoria ?? 'sin dato'}")`);
    lead = guardar({ id: lead.id, rubro: clasificacion.detectado, rubroOriginal: lead.rubro });
  }
  const benchmark = await analizarRubro(lead.rubro, lead.zona, { log });
  guardar({ id: lead.id, benchmark: { fecha: benchmark.fecha, cantidad: benchmark.cantidad, sugerencias: benchmark.sugerencias } });
  return { lead: obtener(lead.id), clasificacion, benchmark };
}

/** Detecta redes (si falta), construye y publica la demo de 3 estilos. */
export async function crearDemo(lead) {
  lead = (await prepararRubro(lead)).lead;
  if (!lead.redes) {
    const redes = await detectarRedes(lead);
    lead = guardar({ id: lead.id, redes });
  }
  const sugeridos = rubros[lead.rubro].estilosSugeridos.slice(0, 3);
  const { dir, nombre } = await construirSitio(lead, { demo: true, estiloKeys: sugeridos, siteUrl: urlPrevista(nombreProyecto(lead, true)) });
  const base = await desplegar(dir, nombre);
  guardar({ id: lead.id, estado: 'eligiendo_estilo', demoUrl: base, estilosOfrecidos: sugeridos });
  return { base, sugeridos };
}

export const textoDemos = ({ base, sugeridos }) => {
  const lineas = sugeridos.map((k, i) => `${i + 1}) ${estilos[k].nombre}: ${estilos[k].descripcion}\n${base}/demo/${k}/`);
  return `Listo, te armé tres propuestas con el nombre de tu negocio (los textos son de ejemplo, después los completamos con tus datos):\n\n${lineas.join('\n\n')}\n\nRespondeme con el número del estilo que más te guste.`;
};

/** Pregunta que se le hace al cliente para pedir permiso de usar fotos y videos de sus redes. */
export function textoPermisoMedia(lead) {
  const lista = Object.entries(lead.redes ?? {})
    .filter(([, r]) => r.publicaciones == null || r.publicaciones > 0)
    .map(([red, r]) => `${red === 'instagram' ? 'Instagram' : 'Facebook'} (@${r.usuario}${r.publicaciones ? `, ${r.publicaciones} publicaciones` : ''})`);
  return `Vi que tienen ${lista.join(' y ')}. ¿Es el de ustedes? Si te parece bien, puedo sumar fotos y videos a la página para que quede más personal. Solo uso lo que vos autorices.\n\nRespondé "sí" para usarlos o "no" para seguir sin fotos.`;
}

/** Siguiente pregunta pendiente según lo que ya sabemos (no repite lo respondido ni lo detectado). */
export function proximaPregunta(lead) {
  const resp = lead.respuestas ?? {};
  const redConfirmada = Object.values(lead.redes ?? {}).some((r) => r.confirmado);
  return preguntasDe(lead.rubro).find((p) => !(p.campo in resp) && !(p.campo === 'instagram' && redConfirmada));
}

/** Construye y publica el sitio final con los datos reales y las fotos/videos autorizados. */
export async function crearFinal(lead, { confirmar } = {}) {
  const { dir, nombre, avisos } = await construirSitio(lead, { demo: false, siteUrl: urlPrevista(nombreProyecto(lead, false)) });
  const pendientes = faltantes(dir);
  if (confirmar && !(await confirmar(pendientes, avisos))) return null;
  const url = await desplegar(dir, nombre);
  guardar({ id: lead.id, estado: 'entregado', urlFinal: url, pendientes });
  return { url, pendientes, avisos };
}

async function publicarFinal(lead) {
  const { url, pendientes, avisos } = await crearFinal(lead);
  if (pendientes.length) console.warn(`[${lead.nombre}] publicado con ${pendientes.length} datos sin completar`);
  if (avisos.length) console.warn(`[${lead.nombre}] ${avisos.join(' | ')}`);
  await decir(lead, `Tu página está online: ${url}\nRevisala tranquilo. Si querés cambiar algo, escribime por acá y lo ajustamos.`);
}

async function seguirConPreguntas(lead) {
  const sig = proximaPregunta(lead);
  if (sig) {
    guardar({ id: lead.id, estado: 'recopilando', preguntaActual: sig.campo });
    return decir(lead, sig.texto);
  }
  guardar({ id: lead.id, estado: 'construyendo' });
  await decir(lead, 'Gracias, ya tengo todo. Estoy armando tu página, te aviso en unos minutos.');
  return publicarFinal(obtener(lead.id));
}

const confirmarRedes = (lead, valor) => {
  const redes = Object.fromEntries(Object.entries(lead.redes ?? {}).map(([k, r]) => [k, { ...r, confirmado: valor }]));
  return guardar({ id: lead.id, redes });
};

// ---------- mensajes entrantes ----------

export async function manejarMensaje(desde, texto) {
  const lead = porTelefono(desde);
  if (!lead || enProceso.has(lead.id)) return;
  enProceso.add(lead.id);
  try {
    if (BAJA.test(texto)) {
      guardar({ id: lead.id, estado: 'opt_out' });
      return await decir(lead, 'Listo, no te escribimos más. Disculpá la molestia.');
    }
    switch (lead.estado) {
      case 'contactado': {
        if (NO.test(texto)) { guardar({ id: lead.id, estado: 'rechazado' }); return await decir(lead, 'Sin problema, gracias por responder. Que tengas un buen día.'); }
        if (!SI.test(texto)) return await decir(lead, '¿Querés que te muestre la demostración? Respondé "sí" y te la preparo, o "no" si no te interesa.');
        guardar({ id: lead.id, estado: 'armando_demo' });
        await decir(lead, 'Genial. Estoy preparando las propuestas, te las mando en unos minutos.');
        return await decir(lead, textoDemos(await crearDemo(lead)));
      }
      case 'eligiendo_estilo': {
        const ofrecidos = lead.estilosOfrecidos;
        const n = parseInt(texto.match(/\d/)?.[0], 10);
        const porNombre = ofrecidos.find((k) => texto.toLowerCase().includes(estilos[k].nombre.toLowerCase()));
        const estilo = ofrecidos[n - 1] ?? porNombre;
        if (!estilo) return await decir(lead, `Respondeme con un número del 1 al ${ofrecidos.length}.`);
        const actual = guardar({ id: lead.id, estilo });
        if (tieneContenido(actual.redes)) {
          guardar({ id: lead.id, estado: 'permiso_media' });
          return await decir(actual, `Perfecto, estilo ${estilos[estilo].nombre}.\n\n${textoPermisoMedia(actual)}`);
        }
        await decir(actual, `Perfecto, estilo ${estilos[estilo].nombre}. Necesito unos datos para completar la página.`);
        return await seguirConPreguntas(actual);
      }
      case 'permiso_media': {
        if (NO_ES_NUESTRO.test(texto)) { guardar({ id: lead.id, redes: {} }); await decir(lead, 'Gracias por avisar, no los uso. Sigo con los datos.'); return await seguirConPreguntas(obtener(lead.id)); }
        if (NO.test(texto)) { confirmarRedes(lead, false); await decir(lead, 'Sin problema, la página va sin fotos por ahora. Se pueden sumar después.'); return await seguirConPreguntas(obtener(lead.id)); }
        if (!SI.test(texto) && !DE_PERFIL.test(texto)) return await decir(lead, 'Respondé "sí" para que use fotos y videos, o "no" para seguir sin ellos.');
        confirmarRedes(lead, true);
        guardar({ id: lead.id, estado: 'recibiendo_media', mediaAvisada: false });
        return await decir(lead, 'Gracias. Mandame por acá las fotos y videos que quieras usar (hasta 9 fotos y 2 videos). Cuando termines escribí "listo". Si preferís que las tome de tu perfil público, escribí "tomalas de Instagram".');
      }
      case 'recibiendo_media': {
        if (DE_PERFIL.test(texto)) {
          const red = /facebook/i.test(texto) ? 'facebook' : 'instagram';
          const n = await traerFotosDePerfil(obtener(lead.id), red);
          return await decir(lead, n ? `Listo, tomé ${n} fotos de tu perfil público. ¿Querés sumar más o escribimos "listo"?` : 'No pude tomarlas desde el perfil (suele pedir inicio de sesión). ¿Me las mandás por acá?');
        }
        if (LISTO.test(texto) || NO.test(texto)) {
          const n = cantidadMedia(lead);
          await decir(lead, n ? `Perfecto, ya tengo ${n} archivo${n > 1 ? 's' : ''}. Ahora unos datos para completar la página.` : 'Dale, seguimos sin fotos. Ahora unos datos para completar la página.');
          return await seguirConPreguntas(obtener(lead.id));
        }
        return await decir(lead, 'Mandame las fotos o videos, o escribí "listo" si ya terminaste.');
      }
      case 'recopilando': {
        const campo = lead.preguntaActual ?? proximaPregunta(lead)?.campo;
        const actual = guardar({ id: lead.id, respuestas: { ...lead.respuestas, [campo]: texto.trim() } });
        return await seguirConPreguntas(actual);
      }
      case 'entregado':
        console.log(`[${lead.nombre}] pidió algo tras la entrega: "${texto}"`);
        return await decir(lead, 'Anotado, lo reviso y te respondo personalmente.');
      default:
        return;
    }
  } catch (e) {
    console.error(`[${lead.nombre}]`, e.message);
    guardar({ id: lead.id, estado: 'error', error: e.message, estadoPrevio: lead.estado });
  } finally {
    enProceso.delete(lead.id);
  }
}

/** Foto o video enviado por el cliente. Solo se guarda si autorizó el uso de material. */
export async function manejarMedia(desde, { tipo, id, mime }) {
  const lead = porTelefono(desde);
  if (!lead || lead.estado !== 'recibiendo_media') return;
  try {
    const { buffer, mime: real } = await descargarMedia(id);
    const ext = (real ?? mime ?? '').split('/')[1]?.split(';')[0] ?? (tipo === 'video' ? 'mp4' : 'jpg');
    guardarMedia(lead, buffer, ext);
    if (!lead.mediaAvisada) { // un solo acuse por tanda para no llenar el chat
      guardar({ id: lead.id, mediaAvisada: true });
      await decir(lead, 'Recibido. Seguí mandando y escribí "listo" cuando termines.');
    }
  } catch (e) { console.error(`[${lead.nombre}] media: ${e.message}`); }
}
