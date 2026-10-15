import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.js';

/*
 * Modelo de precios. Uso: `npm run precios` o `npm run precios -- 1700` (cotización del dólar).
 * Calcula costo real por sitio (tiempo, mensajes de WhatsApp, API, comisión de cobro, herramientas
 * fijas), margen, y verifica la regla "siempre más barato que el mercado".
 */

const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/precios.json'), 'utf8'));
const dolar = Number(process.argv[2]) || P.fx.usdArs;
const { costos: C, mercado: M, reglaPrecio: R } = P;
const fijoMes = Object.values(C.fijosMensualesUsd).reduce((a, b) => a + b, 0);
const ars = (usd) => `$${Math.round(usd * dolar / 1000) * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const usd = (n) => `US$${n.toFixed(0)}`;

/** Precio de referencia del mercado (USD) contra el que se compara cada categoría. */
function referencia(clave) {
  if (clave === 'freelancerPisoArs') return M.freelancerPisoArs.ars / dolar;
  if (clave === 'hosting+seguridad') return M.hostingUsdMes.valor + M.seguridadUsdMes.valor;
  const [k, campo] = clave.split('.');
  return M[k][campo];
}

export function costoSitio(cat) {
  const mensajes = C.contactosPorVenta * C.usdPorMensajeMarketing;
  const tiempo = cat.horas * C.horaUsd;
  const comision = cat.usd * C.comisionCobro;
  const herramientas = fijoMes / C.ventasPorMes;
  const soporte = 0.25 * C.horaUsd; // primer mes de consultas
  return { tiempo, mensajes, api: C.claudeApiPorSitioUsd, comision, herramientas, soporte, total: tiempo + mensajes + C.claudeApiPorSitioUsd + comision + herramientas + soporte };
}

const filas = P.categorias.map((cat) => {
  const c = costoSitio(cat);
  const ref = referencia(cat.referencia);
  const margen = cat.usd - c.total;
  const sinTiempo = c.total - c.tiempo - c.soporte;
  return {
    categoría: cat.nombre, 'precio USD': usd(cat.usd), 'precio ARS': ars(cat.usd),
    'costo total': usd(c.total), margen: usd(margen), 'margen %': `${Math.round((margen / cat.usd) * 100)}%`,
    'tu pago/hora': usd((cat.usd - sinTiempo) / (cat.horas + 0.25)),
    'ref. mercado': usd(ref), 'vs mercado': `-${Math.round((1 - cat.usd / ref) * 100)}%`,
    'regla ≤85%': cat.usd <= ref * R.maximoSobrePisoMercado ? 'cumple' : 'NO CUMPLE',
    'regla ≥1,5x costo': cat.usd >= c.total * R.minimoSobreCosto ? 'cumple' : 'NO CUMPLE',
  };
});

console.log(`Dólar de referencia: $${dolar} (${P.fx.fuente}). Costos fijos: ${usd(fijoMes)}/mes (Vercel Pro + Claude Pro).\n`);
console.table(filas);

const abonos = P.abonos.map((a) => {
  const costo = (C.fijosMensualesUsd.vercelPro / C.clientesActivosParaAmortizar) + a.horasMes * C.horaUsd;
  const ref = referencia(a.referencia);
  return { abono: a.nombre, 'USD/mes': usd(a.usdMes), 'ARS/mes': ars(a.usdMes), costo: `US$${costo.toFixed(1)}`, margen: `US$${(a.usdMes * (1 - C.comisionCobro) - costo).toFixed(1)}`, 'ref. mercado': `US$${ref.toFixed(2)}`, 'vs mercado': `-${Math.round((1 - a.usdMes / ref) * 100)}%`, 'regla ≤85%': a.usdMes <= ref * R.maximoSobrePisoMercado ? 'cumple' : 'NO CUMPLE' };
});
console.table(abonos);

// Escenarios mensuales: mezcla 50% Presencia, 35% Negocio, 15% Destacado y 40% de clientes con abono.
const mezcla = { presencia: 0.5, negocio: 0.35, destacado: 0.15 };
const esc = [4, 8, 15, 25].map((n) => {
  let ingreso = 0, costoVar = 0, horas = 0;
  for (const cat of P.categorias) {
    const q = n * mezcla[cat.id], c = costoSitio(cat);
    ingreso += q * cat.usd; horas += q * (cat.horas + 0.25);
    costoVar += q * (c.mensajes + c.api + c.comision);
  }
  const abonosActivos = n * 0.4;
  const ingresoAbono = abonosActivos * (P.abonos[0].usdMes * 0.6 + P.abonos[1].usdMes * 0.4) * (1 - C.comisionCobro);
  const neto = ingreso - costoVar - fijoMes + ingresoAbono;
  return { 'sitios/mes': n, 'horas de trabajo': horas.toFixed(1), 'ingresos': usd(ingreso), 'neto (antes de tu sueldo)': usd(neto), 'neto ARS': ars(neto), 'USD por hora trabajada': usd(neto / horas) };
});
console.log('Escenarios del primer mes (los abonos se acumulan mes a mes):');
console.table(esc);
const unPrecioMedio = P.categorias.reduce((s, c) => s + mezcla[c.id] * c.usd, 0);
console.log(`Punto de equilibrio de herramientas fijas: ${(fijoMes / (unPrecioMedio * (1 - C.comisionCobro))).toFixed(1)} sitio(s) por mes (precio medio ${usd(unPrecioMedio)}).`);
