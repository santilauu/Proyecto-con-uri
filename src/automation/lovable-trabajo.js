import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, rubros } from './util.js';
import { obtener, guardar } from './store.js';
import { armarContenido } from './copy.js';
import { construirSitio, nombreProyecto } from './builder.js';
import { urlPrevista } from './deploy.js';
import { auditarSitio } from './auditoria.js';
import {
  firmaDe, esqueletoDe, estructuraDe, seccionesDe, validarComposicion, datosSinEspacio,
  firmasUsadas, registrarEsqueleto, liberarComposicion, soltarFirma,
  carpetaLovable, tieneComposicion, leerComposicion, plantillaDeConfig,
} from './composicion.js';

/*
 * Trabajos de composición con Lovable. El panel y esta CLI preparan el pedido y procesan el resultado;
 * la llamada a Lovable la hace Claude con el conector (el conector vive en la sesión de Claude, no en Node).
 *
 *   crear <idNegocio>                   arma el pedido de creación (data/lovable/<id>/pedido.md)
 *   edicion <idNegocio>                 arma el pedido de edición de contenido (data/lovable/<id>/edicion.md)
 *   recibir <idNegocio> <Home.tsx> [--proyecto ID] [--editor URL] [--preview URL]
 *                                       valida, ensambla, compila y registra lo que devolvió Lovable
 *   estado <idNegocio>
 */

export const MAX_INTENTOS = 3;
export { carpetaLovable };
const archivoEstado = (id) => path.join(carpetaLovable(id), 'estado.json');

export function leerEstado(id) {
  try { return JSON.parse(fs.readFileSync(archivoEstado(id), 'utf8')); } catch { return null; }
}
export function escribirEstado(id, parche) {
  fs.mkdirSync(carpetaLovable(id), { recursive: true });
  const nuevo = { ...(leerEstado(id) ?? {}), ...parche, actualizado: new Date().toISOString() };
  fs.writeFileSync(archivoEstado(id), JSON.stringify(nuevo, null, 2));
  return nuevo;
}

const SECCIONES_BASE = ['servicios', 'galeria', 'precios', 'equipo', 'faq', 'contacto'];
const seccionesElegidas = (cfg) => (cfg.secciones?.length ? cfg.secciones : SECCIONES_BASE);

/** Contenido (cliente.json) que ve Lovable. Las fotos se describen sin rutas reales: en su vista previa no existen. */
async function clienteParaLovable(lead) {
  const conDatos = !!(lead.datos?.servicios?.length || lead.respuestas?.servicios);
  const contenido = await armarContenido(lead, { demo: !conDatos });
  const dir = path.join(ROOT, 'data', 'media', lead.id);
  const archivos = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const fotos = archivos.filter((a) => /\.(jpe?g|png|webp)$/i.test(a)).map((a, i) => ({ src: `/media/${a.replace(/\.\w+$/, '')}.webp`, alt: `${lead.nombre}, foto ${i + 1}`, w: 1280, h: 853 }));
  const videos = archivos.filter((a) => /\.(mp4|webm)$/i.test(a)).map((a) => ({ src: `/media/${a}`, type: a.endsWith('webm') ? 'video/webm' : 'video/mp4' }));
  const { seo, ...resto } = contenido;
  // Enlaces de ejemplo del menú: el sitio real los arma según sus datos. Con ellos Lovable diseña el encabezado con enlaces reales.
  const RUTAS = { servicios: ['/servicios', 'Servicios'], galeria: ['/galeria', 'Galería'], precios: ['/precios', 'Precios'], equipo: ['/nosotros', 'Nosotros'], faq: ['/preguntas-frecuentes', 'Preguntas'], contacto: ['/contacto', 'Contacto'] };
  const paginas = seccionesElegidas(lead.config ?? {}).filter((k) => RUTAS[k]).map((k) => ({ ruta: RUTAS[k][0], titulo: RUTAS[k][1] }));
  return { ...resto, demo: !conDatos, paginas, media: { fotos, videos, creditos: [] } };
}

const REGLAS_TECNICAS = `## Contrato técnico (obligatorio: el archivo se convierte a Astro de forma automática)

1. \`src/composicion/cliente.json\`: el contenido de abajo, tal cual.
2. \`src/composicion/Home.tsx\`: es el único archivo de composición. Tiene exactamente esta forma:

\`\`\`tsx
import cliente from "./cliente.json";

export default function Home() {
  const digitos = (cliente.whatsapp || cliente.telefono || "").replace(/\\D/g, "");
  const wa = digitos ? \`https://wa.me/\${digitos}?text=\${encodeURIComponent(\`Hola \${cliente.nombre}, vi su página y quería consultar.\`)}\` : "#contacto";
  return (
    <>
      <header>…</header>
      <main id="contenido">
        <section data-seccion="portada" data-composicion="nombre-corto-de-la-disposicion">…</section>
        …
        <section data-seccion="contacto" data-composicion="…">…</section>
      </main>
    </>
  );
}
\`\`\`

3. Solo marcado JSX y clases de Tailwind. Prohibido: otros imports (ni shadcn, ni lucide, ni framer-motion), hooks de React, manejadores de eventos (onClick…), \`style\` en línea, colores en hexadecimal/rgb/hsl dentro de las clases. Los íconos, si hacen falta, son SVG simples en línea con \`aria-hidden="true"\`.
4. Colores: configurá en \`tailwind.config.ts\` los colores \`bg\`, \`fg\`, \`muted\`, \`accent\`, \`accent-ink\`, \`surface\` y \`line\` como \`var(--bg)\`, \`var(--fg)\`, etc. Usá solo esas clases (\`bg-bg\`, \`text-fg\`, \`text-muted\`, \`bg-accent\`, \`text-accent-ink\`, \`bg-surface\`, \`border-line\`). Los valores de las variables van en \`:root\` de \`src/index.css\` (los de la sección "Paleta").
5. Tipografías: cargalas desde Google Fonts en \`index.html\`. En \`src/index.css\`: \`h1, h2, h3, .titulo { font-family: var(--f-titulo); }\` y \`body { font-family: var(--f-texto); }\`.
6. Marcas de sección: cada sección de primer nivel lleva \`data-seccion\` (valores permitidos: portada, datos, cinta, servicios, galeria, videos, precios, equipo, faq, contacto) y \`data-composicion\` (nombre corto en kebab-case que describe cómo está armada, por ejemplo "titular-recortado-sobre-foto"). La primera es "portada" y la última "contacto". Las demás respetan el orden pedido; podés sumar "datos" (horarios y dirección) y "cinta".
7. Cada sección pedida está siempre en el JSX y se muestra solo si hay datos (por ejemplo \`cliente.precios.length > 0 && …\`). La portada y el contacto se muestran siempre. No agregues secciones que no se pidieron.
8. Fotos: \`cliente.media.fotos\` puede venir vacío o con hasta 9. Los espacios de imagen existen siempre: si no hay foto, muestran un bloque \`bg-surface\` (nunca una imagen inventada ni de internet). Cada \`<img>\` lleva \`alt\`, \`width\`, \`height\`, \`loading="lazy"\` (menos la portada). Los videos usan \`<video controls preload="none">\`.
9. El encabezado muestra la marca (\`cliente.nombre\`), un enlace a "Inicio" y los de \`cliente.paginas\` (cada uno tiene \`ruta\` y \`titulo\`; puede estar vacío), y un botón a \`wa\` (WhatsApp). No incluyas el pie de página: lo agrega el sistema. El encabezado tiene que funcionar a 360 px de ancho con hasta 6 enlaces en \`paginas\` más el botón de WhatsApp, sin desbordar: permití que el menú pase a otra línea (\`flex-wrap\`). El ejemplo de abajo trae \`paginas\` con enlaces reales para que lo pruebes.
10. Accesibilidad: un solo \`h1\`, encabezados en orden, enlaces y botones de al menos 44 px (\`min-h-11\`), foco visible (\`focus-visible:\`), contraste solo con los tokens, diseño mobile-first sin scroll horizontal desde 360 px.
11. Animación: solo transiciones CSS con \`motion-safe:\`. El contenido tiene que verse sin JavaScript.
12. Forma exacta de los datos (las listas pueden venir vacías; leelas con esta forma aunque el ejemplo de abajo no las muestre):
    - \`servicios\`: \`[{ titulo, texto }]\`
    - \`precios\`: \`[{ item, monto }]\`
    - \`faq\`: \`[{ q, a }]\` (q = pregunta, a = respuesta)
    - \`extras\`: \`[{ etiqueta, valor }]\`
    - \`equipo\`: texto (puede ser vacío)
    - \`paginas\`: \`[{ ruta, titulo }]\`
    - \`media.fotos\`: \`[{ src, alt, w, h, ilustrativa? }]\` (objetos, no textos). Usá \`foto.src\`, \`foto.alt\`, \`foto.w\`, \`foto.h\`. Si \`ilustrativa\` es true, mostrá un rótulo "Imagen ilustrativa" junto a la foto.
    - \`media.videos\`: \`[{ src, type }]\`
    - \`instagram\`: nombre de usuario sin @ (por ejemplo "estudio.prueba"), o vacío. El enlace se arma así: \`https://instagram.com/\${cliente.instagram}\`.
    - \`facebook\`: dirección web completa, o vacío.
    - \`whatsapp\`: solo dígitos. \`telefono\`: texto para mostrar.
    - \`horarios\` y \`direccion\` pueden empezar con "[COMPLETAR": son marcadores de datos que faltan; mostralos tal cual en una demo, no los ocultes.
    - Los tipos de TypeScript no hace falta declararlos; no uses \`as\` ni anotaciones de tipos en el JSX.`;

function tablaPaleta(adn) {
  return Object.entries(adn.vars).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n');
}

/** Pedido de creación de la composición. */
export async function armarPedidoCreacion(lead) {
  const { plantilla, adn, cfg } = plantillaDeConfig(lead);
  const r = rubros[lead.rubro];
  const cliente = await clienteParaLovable(lead);
  const secciones = seccionesElegidas(cfg).filter((s) => s !== 'contacto');
  const usadas = firmasUsadas().slice(-60);
  const texto = `# Composición de la página de inicio de un negocio

Estoy armando el sitio web de un negocio físico pequeño de Argentina. Necesito que diseñes **desde cero la distribución** de su página de inicio. Que se sienta hecha a medida para este negocio y distinta de cualquier otra página.

## Negocio
- Nombre: ${lead.nombre}
- Rubro: ${r.nombre}
- Zona: ${lead.zona}
- Tono: ${r.tono}
- Idioma: español rioplatense neutro.

## Qué diseñar
- Inventá la composición: cómo se organiza la portada, cómo se presenta cada sección, qué jerarquía y qué ritmo tiene la página. Elegí una idea visual propia (textura sutil, forma de sección, titular grande, división asimétrica), sin recargar.
- Las plantillas son solo de referencia para color y tipografía (plantilla "${plantilla.nombre}"). No hay ninguna disposición previa que copiar.
- Evitá: gradientes violetas o azul-violeta, tarjetas idénticas en serie, emojis como íconos, sombras exageradas, bordes redondeados excesivos en todo, párrafos largos centrados, frases genéricas de IA ("En el mundo actual", "Descubre la magia", "Potencia tu negocio", "Revoluciona", "Sumérgete", "Eleva tu experiencia").
- No inventes datos, precios, testimonios, cifras ni direcciones. Los textos salen de \`cliente.json\`.

## Secciones (en este orden)
portada, ${secciones.join(', ')}, contacto

## Paleta y tipografía (modo ${adn.modo})
${tablaPaleta(adn)}
Familias: titulares ${adn.vars['--f-titulo']}; texto ${adn.vars['--f-texto']}.

${REGLAS_TECNICAS}

## Distribuciones ya usadas (no repetir)
${usadas.length ? usadas.map((f) => `- ${f}`).join('\n') : '- Todavía no hay ninguna.'}
Tu composición tiene que tener una secuencia de \`data-seccion:data-composicion\` distinta de todas estas y una estructura de etiquetas distinta.

## Contenido: \`src/composicion/cliente.json\`
\`\`\`json
${JSON.stringify(cliente, null, 2)}
\`\`\`
`;
  fs.mkdirSync(carpetaLovable(lead.id), { recursive: true });
  fs.writeFileSync(path.join(carpetaLovable(lead.id), 'pedido.md'), texto);
  escribirEstado(lead.id, { estado: 'pendiente_lovable', modo: 'crear', mensaje: 'Esperando que Claude arme la composición con Lovable.', intentos: 0, problemas: [] });
  return texto;
}

/** Pedido de edición: cambia solo contenidos, sin tocar la composición ni la paleta. */
export async function armarPedidoEdicion(lead) {
  const est = leerEstado(lead.id);
  if (!est?.aceptada || !tieneComposicion(lead.id)) throw new Error('Todavía no hay una demo creada: primero usá "Crear DEMO".');
  const cliente = await clienteParaLovable(lead);
  const actual = leerComposicion(lead.id);
  const texto = `# Edición de contenido de la página de ${lead.nombre}

Esta es una **edición de contenido** sobre la página que ya diseñaste. La página tiene que quedar **exactamente igual** en distribución, estructura, clases, colores, tipografías y orden de secciones. Solo cambia la información.

## Qué hacer
1. Reemplazá \`src/composicion/cliente.json\` por el contenido de abajo.
2. Si algún texto está escrito directamente en \`Home.tsx\` en vez de leerse de \`cliente\`, actualizalo ahí con la información nueva.

## Qué NO hacer
- No cambies clases, etiquetas, grillas, jerarquía, \`data-seccion\`, \`data-composicion\`, colores, tipografías ni el orden de las secciones.
- No agregues ni quites secciones ni componentes. Si la información nueva no tiene un espacio en la página (por ejemplo precios y no hay sección de precios), no lo crees: decímelo en tu respuesta.
- No inventes datos. Las fotos y los videos entran por los espacios de imagen que ya existen.

## Contenido nuevo: \`src/composicion/cliente.json\`
\`\`\`json
${JSON.stringify(cliente, null, 2)}
\`\`\`

## Código actual de \`src/composicion/Home.tsx\` (referencia)
\`\`\`tsx
${actual}
\`\`\`
`;
  fs.writeFileSync(path.join(carpetaLovable(lead.id), 'edicion.md'), texto);
  escribirEstado(lead.id, { estado: 'edicion_pendiente', modo: 'editar', mensaje: 'Esperando que Claude aplique la edición con Lovable.', intentos: 0, problemas: [] });
  return texto;
}

/** El panel avisa que se cargaron datos o archivos: si ya hay demo, queda una edición pendiente. */
export function marcarCambio(id, que) {
  const est = leerEstado(id);
  if (!est?.aceptada) return;
  const cambios = [...new Set([...(est.cambios ?? []), que])];
  escribirEstado(id, { estado: 'edicion_pendiente', modo: 'editar', cambios, mensaje: 'Hay cambios de contenido para aplicar con Lovable.' });
}

function compilar(dir) {
  for (const args of [['install', '--no-audit', '--no-fund'], ['run', 'build']]) {
    const r = spawnSync('npm', args, { cwd: dir, shell: true, encoding: 'utf8' });
    if (r.status !== 0) return { ok: false, error: `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim().split('\n').slice(-25).join('\n') };
  }
  return { ok: true };
}

/**
 * Procesa lo que devolvió Lovable: valida, ensambla el sitio, compila y recién ahí lo da por bueno.
 * En una edición exige que firma, esqueleto y estructura coincidan con la versión aceptada.
 */
export async function recibir(lead, rutaTsx, { proyecto = null } = {}) {
  const est = leerEstado(lead.id) ?? {};
  const edicion = est.modo === 'editar' && !!est.aceptada;
  const tsx = fs.readFileSync(rutaTsx, 'utf8');
  const { adn, cfg } = plantillaDeConfig(lead);
  const intentos = (est.intentos ?? 0) + 1;

  const rechazar = (lista) => {
    const agotado = intentos >= MAX_INTENTOS;
    escribirEstado(lead.id, {
      estado: agotado ? 'fallida' : 'rechazada', intentos, problemas: lista,
      mensaje: agotado
        ? `No se logró una composición válida en ${MAX_INTENTOS} intentos. ${est.aceptada ? 'Se conserva la versión anterior.' : 'No se publica.'}`
        : 'La composición no cumplió las reglas: hay que pedirle a Lovable que la corrija.',
    });
    return { ok: false, problemas: lista, intentos, agotado };
  };

  const problemas = validarComposicion(tsx, { secciones: seccionesElegidas(cfg), previa: edicion ? est.aceptada : null, excluirLead: lead.id });
  if (problemas.length) return rechazar(problemas);

  const firma = firmaDe(tsx);
  adn.firma = firma;
  const siteUrl = urlPrevista(nombreProyecto(lead, true));
  const { dir } = await construirSitio(lead, { demo: true, siteUrl, composicion: { tsx, adn } });

  // Si algo falla después de armar el sitio: se suelta la firma del intento y se vuelve a la versión anterior (o se libera si no había).
  const revertir = async () => {
    if (firma !== est.aceptada?.firma) soltarFirma(lead.id, firma);
    if (est.aceptada && tieneComposicion(lead.id)) {
      const anterior = plantillaDeConfig(lead).adn;
      anterior.firma = est.aceptada.firma;
      await construirSitio(lead, { demo: true, siteUrl, composicion: { tsx: leerComposicion(lead.id), adn: anterior } });
      compilar(dir);
    } else liberarComposicion(lead.id);
  };

  const compilado = compilar(dir);
  if (!compilado.ok) {
    await revertir();
    escribirEstado(lead.id, { estado: 'error', intentos, problemas: [], mensaje: 'La página no compila.', errorCompilacion: compilado.error });
    return { ok: false, problemas: ['No compila:\n' + compilado.error], intentos, agotado: false };
  }

  const auditoria = await auditarSitio(dir);
  if (auditoria.length) {
    await revertir();
    return rechazar(auditoria.map((p) => 'Auditoría: ' + p));
  }

  // Versión aceptada: se guarda la anterior para poder volver atrás.
  const base = carpetaLovable(lead.id);
  fs.mkdirSync(path.join(base, 'actual'), { recursive: true });
  const version = (est.version ?? 0) + 1;
  fs.mkdirSync(path.join(base, `v${version}`), { recursive: true });
  fs.copyFileSync(rutaTsx, path.join(base, `v${version}`, 'Home.tsx'));
  fs.copyFileSync(rutaTsx, path.join(base, 'actual', 'Home.tsx'));
  const esqueleto = esqueletoDe(tsx);
  registrarEsqueleto(lead.id, esqueleto);
  if (!edicion && est.aceptada?.firma && est.aceptada.firma !== firma) soltarFirma(lead.id, est.aceptada.firma);
  const cliente = JSON.parse(fs.readFileSync(path.join(dir, 'src/content/cliente.json'), 'utf8'));
  const sinEspacio = datosSinEspacio(tsx, cliente);
  guardar({ id: lead.id, lovable: { firma, plantilla: cfg.plantilla } });
  return {
    ok: true, dir, firma, version, sinEspacio,
    estado: escribirEstado(lead.id, {
      estado: 'lista', modo: 'editar', version, intentos: 0, problemas: [], cambios: [], errorCompilacion: null, firma, sinEspacio,
      mensaje: sinEspacio.length ? `Demo lista. Datos sin espacio en la página: ${sinEspacio.join(', ')}.` : 'Demo lista.',
      aceptada: { firma, esqueleto, estructura: estructuraDe(tsx), secciones: seccionesDe(tsx).map((s) => s.seccion) },
      ...(proyecto ? { proyecto } : {}),
    }),
  };
}

// ---------- CLI ----------
async function main() {
  const [orden, id, archivo, ...resto] = process.argv.slice(2);
  const lead = id ? obtener(id) : null;
  if (!orden || !lead) throw new Error('Uso: lovable-trabajo.js crear|edicion|recibir|estado <idNegocio> [Home.tsx]');
  if (orden === 'crear') { await armarPedidoCreacion(lead); console.log(path.join(carpetaLovable(lead.id), 'pedido.md')); }
  else if (orden === 'edicion') { await armarPedidoEdicion(lead); console.log(path.join(carpetaLovable(lead.id), 'edicion.md')); }
  else if (orden === 'estado') console.log(JSON.stringify(leerEstado(lead.id), null, 2));
  else if (orden === 'recibir') {
    const flag = (n) => { const i = resto.indexOf(`--${n}`); return i >= 0 ? resto[i + 1] : null; };
    const proyecto = flag('proyecto') ? { id: flag('proyecto'), editor: flag('editor'), preview: flag('preview') } : null;
    const r = await recibir(lead, archivo, { proyecto });
    console.log(JSON.stringify({ ok: r.ok, firma: r.firma, version: r.version, sinEspacio: r.sinEspacio, problemas: r.problemas, intentos: r.intentos, agotado: r.agotado }, null, 2));
    if (!r.ok) process.exitCode = 1;
  } else throw new Error(`Orden desconocida: ${orden}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
}
