import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { ROOT, estilos } from './util.js';
import { construirSitio } from './builder.js';
import { guardar } from './store.js';

/*
 * Miniaturas reales de cada plantilla: se arma un sitio de muestra con todas las plantillas,
 * se compila y se saca una captura de la parte superior de cada una. Se hace una sola vez
 * y queda guardada en data/miniaturas/<plantilla>.png.
 */

export const CARPETA_MINIATURAS = path.join(ROOT, 'data', 'miniaturas');
const ID_MUESTRA = 'muestra-plantillas';
const ANCHO = 1000;
const ALTO = 620;

export const miniaturaPath = (estilo) => path.join(CARPETA_MINIATURAS, `${estilo}.png`);
export const miniaturasListas = () => Object.keys(estilos).every((k) => fs.existsSync(miniaturaPath(k)));

export async function generarMiniaturas({ log = () => {} } = {}) {
  fs.mkdirSync(CARPETA_MINIATURAS, { recursive: true });
  const claves = Object.keys(estilos);
  const muestra = {
    id: ID_MUESTRA,
    nombre: 'Muestra de plantillas',
    rubro: 'local',
    zona: 'Palermo, Buenos Aires',
    direccion: 'Av. Ejemplo 1234',
    telefono: '',
    estado: 'muestra',
    estilo: claves[0],
    respuestas: {},
  };
  log('Armando el sitio de muestra con las 10 plantillas...');
  const { dir } = await construirSitio(muestra, { demo: true, estiloKeys: claves, siteUrl: 'https://muestra.vercel.app' });
  try {
    log('Instalando dependencias y compilando...');
    execSync('npm.cmd install --no-audit --no-fund', { cwd: dir, stdio: 'ignore', shell: true });
    execSync('npx.cmd astro build', { cwd: dir, stdio: 'ignore', shell: true });

    const dist = path.join(dir, 'dist');
    const servidor = createServer((q, s) => {
      let p = path.join(dist, decodeURIComponent(q.url.split('?')[0]));
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); }
      const tipo = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml' }[path.extname(p)] || 'application/octet-stream';
      s.writeHead(200, { 'content-type': tipo });
      fs.createReadStream(p).pipe(s);
    });
    await new Promise((r) => servidor.listen(0, 'localhost', r));
    const puerto = servidor.address().port;
    const navegador = await chromium.launch({ headless: true });
    try {
      for (const k of claves) {
        log(`Captura de ${estilos[k].nombre}...`);
        const pg = await (await navegador.newContext({ viewport: { width: ANCHO, height: ALTO } })).newPage();
        await pg.goto(`http://localhost:${puerto}/demo/${k}/`, { waitUntil: 'load' });
        await pg.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')));
        await pg.waitForTimeout(900);
        await pg.screenshot({ path: miniaturaPath(k), clip: { x: 0, y: 0, width: ANCHO, height: ALTO } });
        await pg.context().close();
      }
    } finally {
      await navegador.close();
      servidor.close();
    }
  } finally {
    // La muestra no es un negocio: se quita de la lista y de la biblioteca de diseños.
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'leads.json'), 'utf8'));
    delete db[ID_MUESTRA];
    fs.writeFileSync(path.join(ROOT, 'data', 'leads.json'), JSON.stringify(db, null, 2));
    const bibPath = path.join(ROOT, 'data', 'biblioteca.json');
    const bib = JSON.parse(fs.readFileSync(bibPath, 'utf8'));
    for (const k of Object.keys(bib.firmas)) if (bib.firmas[k] === ID_MUESTRA) delete bib.firmas[k];
    bib.sitios = bib.sitios.filter((x) => x.lead !== ID_MUESTRA);
    fs.writeFileSync(bibPath, JSON.stringify(bib, null, 2));
  }
  log(`Listo: ${claves.length} miniaturas en data/miniaturas/.`);
}
