import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

/*
 * Auditoría automática de un sitio ya compilado (carpeta dist): la ejecuta el sistema antes de aceptar
 * una composición. Mide en 360, 768, 1024 y 1440 px: desborde horizontal, un solo h1, imágenes con alt
 * y objetivos táctiles de al menos 44 px. También comprueba que el titular se vea sin JavaScript.
 * Devuelve la lista de problemas (vacía = cumple).
 */

const ANCHOS = [360, 768, 1024, 1440];
const TIPOS = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.mp4': 'video/mp4' };

function servir(dist) {
  return new Promise((resolver) => {
    const srv = createServer((q, s) => {
      let p = path.join(dist, decodeURIComponent(q.url.split('?')[0]));
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); }
      s.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(s);
    }).listen(0, 'localhost', () => resolver(srv));
  });
}

export async function auditarSitio(dir) {
  const dist = path.join(dir, 'dist');
  const srv = await servir(dist);
  const url = `http://localhost:${srv.address().port}/`;
  const navegador = await chromium.launch();
  const problemas = [];
  try {
    for (const ancho of ANCHOS) {
      const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
      const pg = await ctx.newPage();
      await pg.goto(url, { waitUntil: 'load' });
      await pg.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')));
      await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => {
        const afuera = [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 && getComputedStyle(e).position !== 'fixed')
          .slice(0, 3)
          .map((e) => `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 60)}">`);
        const chicos = [...document.querySelectorAll('a[href], button, summary')].filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && b.height < 43.5 && !e.closest('.skip') && getComputedStyle(e).position !== 'absolute';
        }).map((e) => `${(e.textContent || '').trim().slice(0, 24) || e.tagName.toLowerCase()} (${Math.round(e.getBoundingClientRect().height)} px)`);
        return {
          desborde: document.documentElement.scrollWidth - innerWidth, afuera,
          h1: document.querySelectorAll('h1').length,
          sinAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
          chicos,
        };
      });
      if (r.desborde > 0) problemas.push(`A ${ancho} px la página se desborda ${r.desborde} px hacia la derecha. Elementos que se salen: ${r.afuera.join(', ')}. Hacé que se acomoden (por ejemplo con flex-wrap) sin cambiar el diseño en pantallas grandes.`);
      if (r.h1 !== 1) problemas.push(`A ${ancho} px hay ${r.h1} títulos h1 (tiene que haber uno solo).`);
      if (r.sinAlt) problemas.push(`A ${ancho} px hay ${r.sinAlt} imágenes sin atributo alt.`);
      if (r.chicos.length) problemas.push(`A ${ancho} px hay objetivos táctiles de menos de 44 px: ${r.chicos.slice(0, 4).join(', ')}.`);
      await ctx.close();
    }
    const sinJs = await navegador.newContext({ viewport: { width: 390, height: 900 }, javaScriptEnabled: false });
    const pg = await sinJs.newPage();
    await pg.goto(url, { waitUntil: 'load' });
    const visible = await pg.evaluate(() => { const h = document.querySelector('h1'); return !!h && getComputedStyle(h).opacity !== '0' && h.getBoundingClientRect().height > 0; });
    if (!visible) problemas.push('Sin JavaScript el titular no se ve.');
    await sinJs.close();
  } finally {
    await navegador.close();
    srv.close();
  }
  // Mismo problema en varios anchos: se informa una sola vez por tipo.
  return [...new Map(problemas.map((p) => [p.replace(/^A \d+ px/, 'A X px').replace(/\d+ px hacia/, 'N px hacia'), p])).values()];
}
