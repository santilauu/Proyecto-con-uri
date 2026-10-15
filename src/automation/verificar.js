import { estilos, rubros, fuentes } from './util.js';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.js';
import { generarADN, contraste } from './variantes.js';
import { verificarPlantillas, MINIMO_POR_RUBRO } from './plantillas-rubro.js';

// Chequeo del catálogo: contraste AA en todos los estilos, referencias válidas y variedad real.
const errores = [];
const aa = (nombre, a, b, min = 4.5) => { const c = contraste(a, b); if (c < min) errores.push(`${nombre}: contraste ${c.toFixed(2)} < ${min}`); };

for (const [k, e] of Object.entries(estilos)) {
  const t = e.tokens;
  aa(`${k} fg/bg`, t.fg, t.bg); aa(`${k} muted/bg`, t.muted, t.bg); aa(`${k} muted/surface`, t.muted, t.surface);
  aa(`${k} accentInk/accent`, t.accentInk, t.accent); aa(`${k} accent/bg`, t.accent, t.bg);
  for (const p of e.pares) if (!fuentes[p]) errores.push(`${k}: par tipográfico inexistente "${p}"`);
}
for (const [k, r] of Object.entries(rubros)) {
  for (const s of r.estilosSugeridos) if (!estilos[s]) errores.push(`rubro ${k}: estilo inexistente "${s}"`);
  if (r.estilosSugeridos.length < 3) errores.push(`rubro ${k}: necesita al menos 3 estilos sugeridos`);
  if (!r.preguntas.some((p) => p.campo === 'servicios')) errores.push(`rubro ${k}: falta la pregunta "servicios"`);
}

// Plantillas de referencia por rubro (src/data/plantillas-rubro.json): cobertura mínima y contraste AA.
const plantillas = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'plantillas-rubro.json'), 'utf8'));
errores.push(...verificarPlantillas(plantillas));
const totalPlantillas = Object.values(plantillas).reduce((n, l) => n + l.length, 0);

const firmas = new Set();
let minimo = 99;
for (const k of Object.keys(estilos)) for (let i = 0; i < 200; i++) {
  const adn = generarADN({ leadId: `v${i}`, estiloKey: k });
  firmas.add(adn.firma);
  const v = adn.vars;
  minimo = Math.min(minimo, contraste(v['--fg'], v['--bg']), contraste(v['--muted'], v['--surface']), contraste(v['--accent-ink'], v['--accent']), contraste(v['--accent'], v['--bg']));
}
if (minimo < 4.5) errores.push(`ADN generado con contraste ${minimo.toFixed(2)} < 4.5`);

console.log(`${Object.keys(estilos).length} estilos, ${Object.keys(rubros).length} rubros, ${Object.keys(fuentes).length} pares tipográficos.`);
console.log(`${totalPlantillas} plantillas de referencia (mínimo ${MINIMO_POR_RUBRO} por rubro).`);
console.log(`Variedad: ${firmas.size} diseños distintos en ${Object.keys(estilos).length * 200} pruebas. Contraste mínimo: ${minimo.toFixed(2)}.`);
if (errores.length) { console.error(`\nPROBLEMAS:\n- ${errores.join('\n- ')}`); process.exit(1); }
console.log('Catálogo correcto.');
