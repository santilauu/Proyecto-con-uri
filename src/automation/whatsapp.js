import { jitter } from './util.js';

const API = 'https://graph.facebook.com/v21.0';

async function post(body) {
  if (process.env.DRY_RUN) { console.log(`[SIMULACIÓN -> ${body.to}]
${body.text?.body ?? JSON.stringify(body.template)}
`); return {}; }
  const { WA_TOKEN, WA_PHONE_ID } = process.env;
  if (!WA_TOKEN || !WA_PHONE_ID) throw new Error('Faltan WA_TOKEN / WA_PHONE_ID en .env');
  const res = await fetch(`${API}/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`);
  return json;
}

/** Primer contacto: Meta exige una plantilla aprobada para escribirle a alguien en frío. */
export const enviarPlantilla = (to, nombreNegocio) =>
  post({
    to,
    type: 'template',
    template: {
      name: process.env.WA_TEMPLATE_NAME || 'propuesta_web_demo',
      language: { code: process.env.WA_TEMPLATE_LANG || 'es_AR' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: nombreNegocio }] }],
    },
  });

/** Texto libre: solo válido dentro de las 24 h posteriores a que el cliente te escribió. */
export const enviarTexto = (to, body) => post({ to, type: 'text', text: { body, preview_url: true } });

export { jitter };

/** Descarga una foto o video que el cliente mandó por WhatsApp (el id viene en el webhook). */
export async function descargarMedia(mediaId) {
  const { WA_TOKEN } = process.env;
  const meta = await (await fetch(`${API}/${mediaId}`, { headers: { Authorization: `Bearer ${WA_TOKEN}` } })).json();
  if (!meta.url) throw new Error(`No pude obtener el archivo: ${meta.error?.message ?? 'sin url'}`);
  const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
  if (!res.ok) throw new Error(`Descarga falló (${res.status})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: meta.mime_type };
}
