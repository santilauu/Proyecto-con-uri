import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, fuentes, slugify } from './util.js';
import { armarContenido } from './copy.js';
import { adnsParaLead, registrarADN } from './variantes.js';
import { prepararMedia } from './media.js';
import { guardar } from './store.js';
import { traerFotosLibres } from './fotos-libres.js';
import { planSubpaginas } from './subpaginas.js';
import { rubros } from './util.js';
import { escribirComposicion, composicionDe } from './composicion.js';

const BASE = path.join(ROOT, 'templates', 'base');

/** Borra la carpeta de un sitio. En Windows falla si hay una vista previa abierta: reintenta y avisa. */
export function borrarCarpeta(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'EBUSY') {
      throw new Error('El sitio está abierto en una vista previa. Cerrá la ventana o el servidor de ese sitio (npm run dev) y volvé a intentar.');
    }
    throw e;
  }
}

export const nombreProyecto = (lead, demo) => `${slugify(lead.nombre)}-${lead.id.slice(0, 4)}${demo ? '-demo' : ''}`;

/** Escribe fonts.css solo con las familias y pesos que usan los ADN del sitio. */
function escribirFuentes(dir, adns) {
  const paquetes = new Map();
  for (const adn of adns) {
    const par = fuentes[adn.par];
    for (const rol of ['titulo', 'texto']) {
      const { pkg, pesos } = par[rol];
      paquetes.set(pkg, new Set([...(paquetes.get(pkg) ?? []), ...pesos]));
    }
  }
  const imports = [...paquetes].flatMap(([p, pesos]) => [...pesos].sort().map((w) => `@import "@fontsource/${p}/${w}.css";`));
  fs.writeFileSync(path.join(dir, 'src/styles/fonts.css'), `${imports.join('\n')}\n`);
  return Object.fromEntries([...paquetes.keys()].map((p) => [`@fontsource/${p}`, '^5.3.0']));
}

/**
 * Genera el proyecto Astro de un lead a partir de templates/base (no se reescribe código por cliente).
 * demo: true  -> /demo/<estilo> para cada estilo de `estiloKeys`, con textos de ejemplo y sin fotos.
 * demo: false -> un único sitio con el estilo elegido, los datos reales y las fotos/videos autorizados.
 * El ADN de diseño elegido en la demo se conserva en el sitio final.
 * composicion: { tsx, adn } -> la distribución la define el Home.tsx de Lovable; el ADN solo trae colores y tipografías.
 */
export async function construirSitio(lead, { demo, estiloKeys, siteUrl, composicion: pedida }) {
  // Sin composición explícita, un negocio con composición aceptada la conserva (demo, vista previa final y publicación).
  const composicion = pedida === undefined ? composicionDe(lead) : pedida;
  const nombre = nombreProyecto(lead, demo);
  const dir = path.join(ROOT, 'sites', nombre);
  borrarCarpeta(dir);
  fs.cpSync(BASE, dir, { recursive: true, filter: (s) => !/node_modules|[\\/]dist$/.test(s) });

  const keys = composicion ? [composicion.adn.plantilla] : demo ? estiloKeys : [lead.estilo];
  const adns = composicion ? { [keys[0]]: composicion.adn } : adnsParaLead(lead, keys);
  registrarADN(lead, adns);
  guardar({ id: lead.id, adn: { ...lead.adn, ...adns } });

  // Con composición, el contenido es de ejemplo solo mientras el negocio no cargó sus datos.
  const conDatos = !!(lead.datos?.servicios?.length || lead.respuestas?.servicios);
  const contenidoDemo = composicion ? !conDatos : demo;
  const contenido = await armarContenido(lead, { demo: contenidoDemo });
  contenido.servicios = contenido.servicios.map((s) => ({ ...s, slug: slugify(s.titulo) }));

  // Fotos: las del cliente primero (solo si no es demo); completamos con fotos libres hasta 4, rotuladas como ilustrativas.
  const propias = demo && !composicion ? { fotos: [], videos: [], avisos: [] } : await prepararMedia(lead, dir);
  const faltan = Math.max(0, 4 - propias.fotos.length);
  // Si el negocio tiene sus propias palabras de búsqueda, solo se usan esas; las del rubro son genéricas y pueden traer fotos de otro tipo de local.
  const busquedas = lead.terminosFotos ? [lead.terminosFotos] : rubros[lead.rubro].fotos;
  const libres = faltan > 0 ? await traerFotosLibres(dir, busquedas, { cantidad: faltan, nombre: lead.nombre }) : [];
  const { avisos, ...mediaPropia } = propias;
  const mediaSitio = {
    fotos: [...mediaPropia.fotos, ...libres],
    videos: mediaPropia.videos,
    creditos: libres.map(({ creador, origen, licencia }) => ({ creador, origen, licencia })),
  };

  // Subpáginas: solo las que tengan contenido real para llenarlas.
  const plan = planSubpaginas(lead, contenido, mediaSitio.fotos);
  const cliente = {
    ...contenido, siteUrl, media: mediaSitio, demo: composicion ? contenidoDemo : demo,
    paginas: plan.paginas, detalleServicios: plan.detalles.length > 0,
    ...(composicion ? { adn: adns[keys[0]], composicion: true } : demo ? { adns, adn: adns[keys[0]] } : { adn: adns[lead.estilo] }),
  };
  fs.writeFileSync(path.join(dir, 'src/content/cliente.json'), JSON.stringify(cliente, null, 2));
  copiarSubpaginas(dir, plan);

  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = nombre;
  Object.assign(pkg.dependencies, escribirFuentes(dir, Object.values(adns)));
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  if (composicion) {
    escribirComposicion(dir, composicion.tsx);
  } else if (demo) {
    fs.rmSync(path.join(dir, 'src/pages/index.astro'));
    fs.writeFileSync(path.join(dir, 'src/pages/index.astro'), `---\nreturn Astro.redirect('/demo/${keys[0]}/');\n---\n`);
  } else {
    fs.rmSync(path.join(dir, 'src/pages/demo'), { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'public/robots.txt'), `User-agent: *\n${demo ? 'Disallow: /' : `Allow: /\nSitemap: ${siteUrl}/sitemap-index.xml`}\n`);
  return { dir, nombre, adns, avisos };
}

/** Copia desde templates/base/subpaginas solo las páginas que el plan del sitio necesita. */
function copiarSubpaginas(dir, plan) {
  const origen = path.join(BASE, 'subpaginas');
  const copiar = (rel) => {
    const destino = path.join(dir, 'src/pages', rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(path.join(origen, rel), destino);
  };
  for (const p of plan.paginas) {
    if (p.tipo === 'servicios') {
      copiar(path.join('servicios', 'index.astro'));
      if (plan.detalles.length) copiar(path.join('servicios', '[slug].astro'));
    } else if (p.tipo === 'faq') copiar('preguntas-frecuentes.astro');
    else copiar(`${p.tipo === 'nosotros' ? 'nosotros' : p.tipo}.astro`);
  }
}

/** Solo para verificación local: instala y compila. */
export function compilarLocal(dir) {
  execSync('npm install --no-audit --no-fund', { cwd: dir, stdio: 'inherit' });
  execSync('npm run build', { cwd: dir, stdio: 'inherit' });
}

/** Marcadores [COMPLETAR: ...] que quedaron en el contenido de un sitio generado. */
export function faltantes(dir) {
  const txt = fs.readFileSync(path.join(dir, 'src/content/cliente.json'), 'utf8');
  return [...txt.matchAll(/\[COMPLETAR: ([^\]]+)\]/g)].map((m) => m[1]);
}
