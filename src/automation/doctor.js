import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './util.js';

const filas = [];
const ok = (nombre, bien, nota = '') => filas.push({ nombre, estado: bien ? 'OK' : 'FALTA', nota });

ok('Node 20+', Number(process.versions.node.split('.')[0]) >= 20, process.version);
ok('Archivo .env', fs.existsSync(path.join(ROOT, '.env')), 'copiá .env.example a .env');
ok('ANTHROPIC_API_KEY (textos con IA)', !!process.env.ANTHROPIC_API_KEY, 'opcional: sin ella los textos salen de patrones por rubro');
ok('TU_NOMBRE (firma del mensaje)', !!process.env.TU_NOMBRE, 'se usa en el primer mensaje manual');

const v = spawnSync('npx', ['--yes', 'vercel@latest', 'whoami', ...(process.env.VERCEL_TOKEN ? ['--token', process.env.VERCEL_TOKEN] : [])], { encoding: 'utf8', shell: true });
ok('Sesión de Vercel', v.status === 0, v.status === 0 ? v.stdout.trim().split('\n').pop() : 'corré: npx vercel login');

try { const b = await chromium.launch(); await b.close(); ok('Navegador de Playwright', true); }
catch { ok('Navegador de Playwright', false, 'corré: npx playwright install chromium'); }

const api = ['WA_TOKEN', 'WA_PHONE_ID', 'WA_VERIFY_TOKEN', 'WA_TEMPLATE_NAME'].every((k) => process.env[k]);
filas.push({ nombre: 'WhatsApp API (opcional)', estado: api ? 'OK' : 'pendiente', nota: 'sin ella usá el MODO MANUAL (menú 6)' });

console.table(filas);
process.exitCode = filas.some((f) => f.estado === 'FALTA' && !/opcional/.test(f.nombre)) ? 1 : 0;
