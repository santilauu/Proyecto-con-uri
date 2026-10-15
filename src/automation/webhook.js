import crypto from 'node:crypto';
import express from 'express';
import { manejarMensaje, manejarMedia } from './conversation.js';

export function iniciarWebhook(port = process.env.PORT || 3000) {
  const app = express();
  app.use(express.json({ verify: (req, _res, buf) => { req.raw = buf; } }));

  // Verificación inicial que pide Meta al registrar el webhook.
  app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === process.env.WA_VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
    res.sendStatus(403);
  });

  app.post('/webhook', (req, res) => {
    const secreto = process.env.WA_APP_SECRET;
    if (secreto) {
      const esperado = `sha256=${crypto.createHmac('sha256', secreto).update(req.raw).digest('hex')}`;
      const recibido = req.get('x-hub-signature-256') ?? '';
      if (recibido.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado))) return res.sendStatus(401);
    }
    res.sendStatus(200); // Meta reintenta si tardamos: respondemos ya y procesamos después.
    for (const entry of req.body.entry ?? []) {
      for (const cambio of entry.changes ?? []) {
        for (const m of cambio.value?.messages ?? []) {
          const texto = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? '';
          if (m.type === 'image' || m.type === 'video') manejarMedia(m.from, { tipo: m.type, id: m[m.type].id, mime: m[m.type].mime_type });
          else if (texto) manejarMensaje(m.from, texto);
        }
      }
    }
  });

  return app.listen(port, () => console.log(`Webhook escuchando en http://localhost:${port}/webhook`));
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('webhook.js')) iniciarWebhook();
