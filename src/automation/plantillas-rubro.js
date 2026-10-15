import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, rubros } from './util.js';

/*
 * Plantillas de referencia por rubro: solo colorimetría y tipografía. No traen layout.
 * Cada una tiene paleta en claro y oscuro, y una pareja tipográfica de fuentes.json.
 * Los colores de origen se corrigen (acento más oscuro o más claro) hasta cumplir WCAG AA.
 *
 * Uso: `node src/automation/plantillas-rubro.js` regenera src/data/plantillas-rubro.json y verifica.
 */

const FUENTES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'fuentes.json'), 'utf8'));
const SALIDA = path.join(ROOT, 'src', 'data', 'plantillas-rubro.json');
const AA = 4.5;
export const MINIMO_POR_RUBRO = 5;

// [clave, nombre, pareja, [fondo, texto, acento, superficie] claro, [..] oscuro]
const SEMILLAS = {
  gimnasio: [
    ['pista', 'Pista', 'archivo-grotesk', ['#f4f4f0', '#111111', '#e4002b', '#e6e6e0'], ['#0d0d0d', '#f5f5f5', '#ff3b3b', '#1a1a1a']],
    ['cancha', 'Cancha', 'unbounded-inter', ['#ffffff', '#0b0b12', '#0057ff', '#eef2ff'], ['#0b0b12', '#f2f4ff', '#4d8dff', '#161a2b']],
    ['pesas', 'Pesas', 'bricolage-dmsans', ['#fff6ea', '#1f1408', '#e8590c', '#fde9d6'], ['#17110a', '#fff3e4', '#ff8a3d', '#241a10']],
    ['cardio', 'Cardio', 'barlow-cond', ['#f0fff7', '#0c2118', '#00a86b', '#dff5ea'], ['#0a1a14', '#e9fff5', '#2ee59d', '#12281f']],
    ['podio', 'Podio', 'sora-inter', ['#fbf9f2', '#161616', '#d4a017', '#efeadb'], ['#111111', '#f7f3e3', '#f0c040', '#1c1c1c']],
  ],
  estetica: [
    ['rosa-te', 'Rosa té', 'cormorant-figtree', ['#fbf4f2', '#3b2a2e', '#9c4a5e', '#f3e4e1'], ['#1f1518', '#f6ebe9', '#e0a0b0', '#2c1f23']],
    ['marmol', 'Mármol', 'playfair-manrope', ['#f7f5f2', '#222124', '#7a6a58', '#ece8e2'], ['#141316', '#efeae2', '#c9b08c', '#1f1d21']],
    ['lino', 'Lino', 'instrument-inter', ['#f3efe7', '#2a2620', '#8c6d3f', '#e6dfd0'], ['#181612', '#f1ece2', '#d0ab6f', '#242019']],
    ['orquidea', 'Orquídea', 'dmserif-jakarta', ['#f9f1f8', '#2e1f2c', '#7d3c7a', '#eedcec'], ['#1a121a', '#f5ecf3', '#d595cf', '#26192a']],
    ['ceniza', 'Ceniza', 'cormorant-figtree', ['#f2f2f0', '#1e1e1e', '#5b6b62', '#e3e5e2'], ['#111413', '#eef1ef', '#9fb5a8', '#1b201e']],
  ],
  medico: [
    ['clinica', 'Clínica', 'sora-inter', ['#ffffff', '#14233a', '#0a6e8a', '#eaf4f7'], ['#0c1a2b', '#eaf3fb', '#5ccde6', '#15263a']],
    ['consultorio', 'Consultorio', 'outfit-public', ['#f8fbfc', '#1a2b33', '#1f7a6d', '#e4f1ee'], ['#0f1c22', '#e8f4f3', '#54c4b2', '#173038']],
    ['calma', 'Calma', 'baskerville-source', ['#f5f8f5', '#1d2f2a', '#2d6a4f', '#e3ece6'], ['#0f1c18', '#e9f2ec', '#7fc2a0', '#18291f']],
    ['azul-sereno', 'Azul sereno', 'bricolage-dmsans', ['#f2f7fb', '#102a43', '#245d91', '#dfeaf4'], ['#0b1d2d', '#e6f0f9', '#7fb3e6', '#14293c']],
    ['blanco-limpio', 'Blanco limpio', 'sora-inter', ['#fafafa', '#1c1c1c', '#0d7a5f', '#ececec'], ['#121212', '#f3f3f3', '#3dd6a8', '#1e1e1e']],
  ],
  gastronomia: [
    ['brasa', 'Brasa', 'fraunces-manrope', ['#fff4ea', '#2a1409', '#b3361b', '#fbe5d2'], ['#1d0f08', '#fff1e4', '#ff7a4d', '#2b1810']],
    ['horno', 'Horno', 'young-nunito', ['#fff8ef', '#2d1c10', '#c2410c', '#f9e6cf'], ['#1f140d', '#fdf0e0', '#ff9a5c', '#2c1d13']],
    ['mantel', 'Mantel', 'dmserif-jakarta', ['#f7f3ec', '#1f2a1a', '#4d6b2f', '#e7ebdc'], ['#121a0f', '#eef3e5', '#9cc26d', '#1d2a17']],
    ['vino', 'Vino', 'playfair-manrope', ['#faf5f4', '#2b1116', '#7a1f33', '#f0e2e4'], ['#170b0e', '#f6eced', '#e0808f', '#251319']],
    ['carbon', 'Carbón', 'fraunces-manrope', ['#f4f1ec', '#221f1b', '#a8561d', '#e7e1d8'], ['#161411', '#f1ede6', '#e39a55', '#211e1a']],
  ],
  panaderia: [
    ['trigo', 'Trigo', 'young-nunito', ['#fdf6e3', '#3a2a14', '#b7791f', '#f5e9c8'], ['#1f1809', '#fbf1d8', '#f0b84a', '#2c210f']],
    ['masa', 'Masa', 'fraunces-manrope', ['#fff8f1', '#3b2418', '#a14d2a', '#f7e6d6'], ['#1e120c', '#fbefe4', '#e8906a', '#2a1a12']],
    ['miel', 'Miel', 'dmserif-jakarta', ['#fffaf0', '#2b2112', '#9a6700', '#f7edd3'], ['#171108', '#fdf5e2', '#ffc857', '#241c0f']],
    ['harina', 'Harina', 'young-nunito', ['#f7f4ee', '#2e2a24', '#5f7a4a', '#e8e8dc'], ['#14130f', '#f1ede3', '#a4c384', '#1e1c17']],
    ['cacao', 'Cacao', 'fraunces-manrope', ['#f6efe9', '#33221a', '#6f4a32', '#e9ddd2'], ['#181210', '#f3ebe4', '#c99a72', '#241b16']],
  ],
  inmobiliaria: [
    ['llave', 'Llave', 'playfair-manrope', ['#f8f7f4', '#14213d', '#b08d57', '#ebe9e2'], ['#0e1626', '#f1efe8', '#d8b77e', '#18243a']],
    ['horizonte', 'Horizonte', 'sora-inter', ['#ffffff', '#0f172a', '#1d4ed8', '#eef2fb'], ['#0b1120', '#eef2ff', '#7aa2ff', '#141d33']],
    ['piedra', 'Piedra', 'cormorant-figtree', ['#f4f2ee', '#26241f', '#6b5b3e', '#e6e2da'], ['#151411', '#efebe3', '#cfb88f', '#211f1a']],
    ['ladrillo', 'Ladrillo', 'syne-inter', ['#fbf4ef', '#2e1c14', '#a4462a', '#f1e2d7'], ['#190f0b', '#f8ece6', '#e98d6b', '#271a14']],
    ['pizarra', 'Pizarra', 'sora-inter', ['#f3f5f7', '#1f2933', '#2f6f73', '#e1e8eb'], ['#10161c', '#e9eef2', '#6fbcc0', '#1a242c']],
  ],
  estudio: [
    ['notaria', 'Notaría', 'playfair-manrope', ['#f7f4ec', '#1c2431', '#7a5c2e', '#ebe5d6'], ['#0f141d', '#f2efe6', '#d3b27a', '#1a2130']],
    ['contaduria', 'Contaduría', 'baskerville-source', ['#ffffff', '#1b2a3a', '#1f4e79', '#eef2f6'], ['#0c1521', '#eef3f8', '#8cb8e6', '#14202e']],
    ['estudio-verde', 'Estudio verde', 'lora-worksans', ['#f4f7f5', '#1d302a', '#2c6b4f', '#e2ebe6'], ['#0e1814', '#e8f1ec', '#7dc0a0', '#17271f']],
    ['bordo', 'Bordó', 'instrument-inter', ['#faf6f5', '#2b1b1f', '#7e2c3a', '#efe3e4'], ['#170d10', '#f5eded', '#d98b98', '#24161a']],
    ['gris-acero', 'Gris acero', 'playfair-manrope', ['#f2f3f5', '#1a1f26', '#4b5f77', '#e3e6eb'], ['#0f1218', '#eceef2', '#a6b8cf', '#1a1f28']],
  ],
  veterinaria: [
    ['patitas', 'Patitas', 'young-nunito', ['#fff9f0', '#2b2a26', '#d9730d', '#fcebd6'], ['#1a1713', '#fbf3e6', '#ffb066', '#26221b']],
    ['pradera', 'Pradera', 'outfit-public', ['#f6fbf4', '#1d3322', '#2f7d4a', '#e1f0e5'], ['#0e1a12', '#e8f4ec', '#6cd08c', '#172a1e']],
    ['celeste', 'Celeste', 'bricolage-dmsans', ['#f2f9fd', '#173247', '#1f6fa8', '#e0eef8'], ['#0b1c28', '#e6f2fb', '#7cc0f0', '#14293a']],
    ['arena', 'Arena', 'outfit-public', ['#faf6ef', '#2e2a22', '#8a6a2e', '#efe7d8'], ['#17130c', '#f5efe3', '#d6ae62', '#231e15']],
    ['menta', 'Menta', 'young-nunito', ['#f3faf8', '#1e3430', '#2a8577', '#e0f0ec'], ['#0d1b19', '#e6f4f1', '#6cd0bf', '#163029']],
  ],
  taller: [
    ['grafito', 'Grafito', 'barlow-cond', ['#f0f0ee', '#1c1f22', '#e05d14', '#e2e2df'], ['#1c1f22', '#f2f2f0', '#ff7a1a', '#26292d']],
    ['acero', 'Acero', 'archivo-grotesk', ['#ffffff', '#111827', '#1d4ed8', '#eceef2'], ['#0f1319', '#f1f3f6', '#6b93ff', '#1b2029']],
    ['aceite', 'Aceite', 'outfit-public', ['#fbf8ef', '#22201a', '#b8860b', '#efe9d6'], ['#151410', '#f6f2e4', '#e6bd4a', '#22211a']],
    ['oxido', 'Óxido', 'barlow-cond', ['#faf1ec', '#2d1d16', '#a0431b', '#f0e0d6'], ['#1a110d', '#f8ece6', '#ee8a5c', '#261a14']],
    ['taller-verde', 'Taller verde', 'archivo-grotesk', ['#f1f5f2', '#1b2a22', '#2f6b43', '#e0e9e3'], ['#0d1511', '#e8f0ea', '#7dbd8f', '#172219']],
  ],
  psicologia: [
    ['refugio', 'Refugio', 'baskerville-source', ['#f6f3ee', '#2b2d33', '#5b6f88', '#e8e5df'], ['#121317', '#eeece7', '#9db0c8', '#1c1e24']],
    ['brisa', 'Brisa', 'fraunces-manrope', ['#f3f7f7', '#1e3335', '#3c7c7c', '#e0ecec'], ['#0c1819', '#e6f1f1', '#7fc4c4', '#15272a']],
    ['lavanda', 'Lavanda', 'cormorant-figtree', ['#f7f4fa', '#2e2839', '#6d5a8a', '#ebe5f1'], ['#120f17', '#eee9f4', '#b7a3d6', '#1d1826']],
    ['arcilla', 'Arcilla', 'fraunces-manrope', ['#f8f2ec', '#352a24', '#8a5a44', '#eee2d8'], ['#17110d', '#f3ebe4', '#d09a7e', '#221a15']],
    ['musgo', 'Musgo', 'baskerville-source', ['#f2f4ef', '#25301f', '#5d7142', '#e3e9da'], ['#10140c', '#eaf0e3', '#a9c489', '#1a2215']],
  ],
  floreria: [
    ['petalo', 'Pétalo', 'cormorant-figtree', ['#fdf7f8', '#3a2630', '#b5526e', '#f5e6ea'], ['#1c1217', '#f8eef1', '#f29bb2', '#281b22']],
    ['hoja', 'Hoja', 'dmserif-jakarta', ['#f5f8f2', '#213422', '#4e7d3b', '#e5eedf'], ['#0f170d', '#e9f2e6', '#97c97e', '#172616']],
    ['lila', 'Lila', 'instrument-inter', ['#f8f6fb', '#2b2536', '#6a4d9a', '#ece7f4'], ['#14101b', '#efeaf6', '#b89ae0', '#1e1828']],
    ['durazno', 'Durazno', 'dmserif-jakarta', ['#fff7f2', '#3a2419', '#c0603a', '#f8e8dd'], ['#1c120d', '#fbf0e8', '#f29a74', '#2a1b13']],
    ['verde-blanco', 'Blanco y verde', 'cormorant-figtree', ['#fafcf9', '#1f2e25', '#3f7258', '#e6efe9'], ['#0e1612', '#e9f2ec', '#86c2a2', '#18261e']],
  ],
  optica: [
    ['lente', 'Lente', 'syne-inter', ['#f5f7fb', '#141a2b', '#3654d6', '#e6eaf6'], ['#0c1020', '#eef1fb', '#8ea3ff', '#161c31']],
    ['cristal', 'Cristal', 'sora-inter', ['#ffffff', '#1b1f24', '#0e7490', '#e8f3f6'], ['#0a1418', '#e9f5f8', '#5ccde0', '#132129']],
    ['carey', 'Carey', 'outfit-public', ['#faf5ea', '#2c2116', '#8b5a2b', '#f1e6d3'], ['#171109', '#f7efe0', '#d69a5e', '#241b11']],
    ['grafito-verde', 'Grafito verde', 'sora-inter', ['#f2f5f3', '#1a2621', '#1e6b52', '#e0e9e4'], ['#0c1512', '#e6eee9', '#66c4a0', '#16231d']],
    ['negro-mate', 'Negro mate', 'syne-inter', ['#fafafa', '#111111', '#b4236b', '#ececec'], ['#0b0b0b', '#f2f2f2', '#ff7eb3', '#1a1a1a']],
  ],
  iglesia: [
    ['vitral', 'Vitral', 'lora-worksans', ['#fbf8f2', '#2a2118', '#7b4f1d', '#f1eadb'], ['#15110b', '#f4eee2', '#d9a85c', '#211a12']],
    ['cruz', 'Cruz', 'baskerville-source', ['#ffffff', '#1e2a3a', '#7a1e2c', '#f2eef0'], ['#0e1520', '#f1f0ec', '#e08c98', '#18222f']],
    ['olivo', 'Olivo', 'cormorant-figtree', ['#f5f6f0', '#26301f', '#5e6e2e', '#e6ebd9'], ['#11140c', '#eef1e5', '#b3c673', '#1a2114']],
    ['azul-liturgico', 'Azul litúrgico', 'lora-worksans', ['#f3f6fa', '#1b2a44', '#2c5b94', '#e3eaf3'], ['#0c1526', '#ebf1f9', '#86b0e6', '#15223a']],
    ['sol-de-tarde', 'Sol de tarde', 'baskerville-source', ['#fdf7ee', '#2f2416', '#a86a16', '#f5ead8'], ['#17120a', '#f8efe0', '#e8b565', '#241c10']],
  ],
  sindicato: [
    ['bandera', 'Bandera', 'sora-inter', ['#ffffff', '#14213d', '#1d4f91', '#eef3fa'], ['#0b1424', '#eef3fb', '#6ea3ec', '#13203a']],
    ['union', 'Unión', 'lora-worksans', ['#f7f8fa', '#1f2937', '#b91c1c', '#ebedf2'], ['#0f1419', '#eef1f5', '#f08080', '#1a1f27']],
    ['obrero', 'Obrero', 'bricolage-dmsans', ['#fdf8f0', '#2a2118', '#9a5b13', '#f4eadb'], ['#17110a', '#f7f0e4', '#e5a55a', '#221a10']],
    ['verde-trabajo', 'Verde trabajo', 'baskerville-source', ['#f4f8f5', '#17301f', '#1f6b3a', '#e1ece4'], ['#0b1810', '#e6f1e9', '#74c28f', '#15271b']],
    ['gris-institucional', 'Gris institucional', 'sora-inter', ['#f5f5f5', '#1c1c1c', '#374151', '#e6e6e6'], ['#101010', '#f0f0f0', '#b7c0cc', '#1c1c1c']],
  ],
  hotel: [
    ['bahia', 'Bahía', 'playfair-manrope', ['#f6f8f7', '#14302b', '#1d6b5e', '#e3ece9'], ['#0b1a17', '#eef5f2', '#78c2b4', '#132a25']],
    ['marfil', 'Marfil', 'cormorant-figtree', ['#fbf8f1', '#2a2418', '#8c6b2a', '#f0e9d8'], ['#14120a', '#f5f0e3', '#d9bb76', '#201c12']],
    ['terraza', 'Terraza', 'dmserif-jakarta', ['#fbf4ef', '#2e1d17', '#a5532e', '#f2e4da'], ['#170f0b', '#f8efe9', '#eb9a72', '#221711']],
    ['noche', 'Noche', 'playfair-manrope', ['#f3f3f7', '#1b1d2a', '#41457a', '#e4e5ee'], ['#0d0e16', '#eeeef6', '#a9aee8', '#181a26']],
    ['playa', 'Playa', 'cormorant-figtree', ['#f4f9fb', '#123040', '#14668a', '#e0edf3'], ['#0a1820', '#e6f2f8', '#6cbce2', '#132735']],
  ],
  academia: [
    ['aula', 'Aula', 'sora-inter', ['#ffffff', '#1e293b', '#2563eb', '#eef3fd'], ['#0f172a', '#e2e8f0', '#7ea6ff', '#1a2540']],
    ['pizarron', 'Pizarrón', 'lora-worksans', ['#f5f7f4', '#1f2a24', '#2d6a4f', '#e3ebe5'], ['#0e1612', '#e7efe9', '#7bc39c', '#172219']],
    ['cuaderno', 'Cuaderno', 'bricolage-dmsans', ['#fdf9ef', '#2b2412', '#a16207', '#f5eedb'], ['#17130a', '#f7f0df', '#e9b45a', '#221b10']],
    ['tiza', 'Tiza', 'sora-inter', ['#f7f7f9', '#1a1a24', '#4338ca', '#e8e8f1'], ['#0e0e16', '#ececf4', '#a5a0ff', '#1a1a26']],
    ['mapa', 'Mapa', 'lora-worksans', ['#f3f7f9', '#17303a', '#17708a', '#e0ecf0'], ['#0a1a20', '#e5f1f6', '#6ac3dd', '#132830']],
  ],
  servicios: [
    ['oficio', 'Oficio', 'outfit-public', ['#f6f7f9', '#1e2a38', '#1e6091', '#e4eaf1'], ['#0d1520', '#e8eef5', '#71b6e3', '#162232']],
    ['pulso', 'Pulso', 'bricolage-dmsans', ['#fbfaf6', '#232017', '#b2430e', '#f1ebdf'], ['#15120c', '#f5f1e6', '#f09a63', '#211d15']],
    ['practico', 'Práctico', 'sora-inter', ['#ffffff', '#1a1d21', '#2b7a4b', '#ecf1ee'], ['#0c0f11', '#eef1f3', '#7fcf9d', '#181c20']],
    ['ladrillo-claro', 'Ladrillo claro', 'outfit-public', ['#f9f4f0', '#2b1f19', '#7d3f29', '#efe5dd'], ['#150f0c', '#f4ece7', '#d99a81', '#21170f']],
    ['pizarra-servicio', 'Pizarra servicio', 'bricolage-dmsans', ['#f2f4f5', '#1d2427', '#3d5a66', '#e1e7ea'], ['#0e1316', '#e8eef1', '#92b9c7', '#172024']],
  ],
  ferreteria: [
    ['tuerca', 'Tuerca', 'archivo-grotesk', ['#f4f3ef', '#1a1a1a', '#d9480f', '#e6e4de'], ['#121212', '#f2f2f0', '#ff8a4c', '#1e1e1e']],
    ['clavo', 'Clavo', 'barlow-cond', ['#fbfbf7', '#222222', '#2f5fa7', '#e7e7e1'], ['#111111', '#efefe9', '#7fa9e8', '#1d1d1d']],
    ['caja-herramientas', 'Caja de herramientas', 'outfit-public', ['#faf6ee', '#2c2a24', '#9b6b1b', '#efe8d9'], ['#15130e', '#f6f1e5', '#e0b467', '#221f18']],
    ['acero-frio', 'Acero frío', 'barlow-cond', ['#f0f3f5', '#1b2329', '#2c6a8e', '#dfe6eb'], ['#0c1216', '#e6edf2', '#78b3d4', '#162027']],
    ['verde-taller', 'Verde taller', 'archivo-grotesk', ['#f3f6f2', '#1e2a1f', '#3b7a2a', '#e2eadf'], ['#0e140d', '#e8f0e5', '#8fd17a', '#18221a']],
  ],
  local: [
    ['almacen', 'Almacén', 'bricolage-dmsans', ['#fbf8f1', '#2a2620', '#a2461f', '#f0eadf'], ['#15130f', '#f5f1e8', '#e88b5c', '#211d17']],
    ['barrio', 'Barrio', 'outfit-public', ['#f6f8f3', '#1f2b1d', '#3f7a2e', '#e3ecdd'], ['#0e140c', '#e9f1e4', '#8fcf78', '#17200f']],
    ['vereda', 'Vereda', 'young-nunito', ['#fff8f2', '#33241b', '#c25b2a', '#f8e8dc'], ['#1b130e', '#fbf0e7', '#f29a6c', '#251a13']],
    ['esquina', 'Esquina', 'outfit-public', ['#f4f6fa', '#1d2433', '#3157a6', '#e3e9f3'], ['#0c111c', '#e7edf6', '#87a8ea', '#161d2c']],
    ['mostrador', 'Mostrador', 'bricolage-dmsans', ['#ffffff', '#222222', '#0f766e', '#ecf4f3'], ['#0f0f0f', '#f1f1f1', '#5ed0c4', '#1b1b1b']],
  ],
};

const canal = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const hex = (rgb) => '#' + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
const lum = (h) => {
  const [r, g, b] = canal(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mezclar = (a, b, t) => {
  const A = canal(a);
  const B = canal(b);
  return hex(A.map((c, i) => c * (1 - t) + B[i] * t));
};

/** Paleta completa a partir de los colores de origen. Corrige el acento hasta cumplir AA. */
export function paleta([bg, fg, acc, sup], modo) {
  const hacia = lum(bg) < 0.18 ? '#ffffff' : '#000000';
  let accent = acc;
  for (let t = 0; t < 1 && (contraste(accent, bg) < AA || contraste(accent, sup) < AA); t += 0.05) {
    accent = mezclar(acc, hacia, t + 0.05);
  }
  let m = 0.3;
  while (m > 0 && (contraste(mezclar(fg, bg, m), bg) < AA || contraste(mezclar(fg, bg, m), sup) < AA)) m -= 0.05;
  const tinta = [bg, '#ffffff', '#000000'].reduce((mejor, c) => (contraste(c, accent) > contraste(mejor, accent) ? c : mejor));
  return { modo, bg, fg, muted: mezclar(fg, bg, Math.max(m, 0)), accent, accentInk: tinta, surface: sup, line: mezclar(fg, bg, 0.8) };
}

/** Problemas de contraste de una paleta (lista vacía = cumple AA). */
export function problemasDe(p) {
  const pares = {
    'texto/fondo': [p.fg, p.bg],
    'texto/superficie': [p.fg, p.surface],
    'secundario/fondo': [p.muted, p.bg],
    'secundario/superficie': [p.muted, p.surface],
    'acento/fondo': [p.accent, p.bg],
    'acento/superficie': [p.accent, p.surface],
    'tinta/acento': [p.accentInk, p.accent],
  };
  return Object.entries(pares)
    .filter(([, [a, b]]) => contraste(a, b) < AA)
    .map(([k, [a, b]]) => `${k} ${contraste(a, b).toFixed(2)}`);
}

export function construirPlantillas() {
  const salida = {};
  for (const [rubro, lista] of Object.entries(SEMILLAS)) {
    salida[rubro] = lista.map(([clave, nombre, pareja, claro, oscuro]) => {
      if (!FUENTES[pareja]) throw new Error(`Pareja tipográfica inexistente: ${pareja} (${rubro}/${clave})`);
      return { clave, nombre, rubro, pareja, paleta: { claro: paleta(claro, 'claro'), oscuro: paleta(oscuro, 'oscuro') } };
    });
  }
  return salida;
}

/** Revisa cobertura por rubro y contraste de todas las plantillas. Devuelve la lista de problemas. */
export function verificarPlantillas(plantillas = construirPlantillas()) {
  const problemas = [];
  for (const rubro of Object.keys(rubros)) {
    const lista = plantillas[rubro] ?? [];
    if (lista.length < MINIMO_POR_RUBRO) problemas.push(`${rubro}: ${lista.length} plantillas (mínimo ${MINIMO_POR_RUBRO})`);
    for (const p of lista) {
      for (const modo of ['claro', 'oscuro']) {
        for (const x of problemasDe(p.paleta[modo])) problemas.push(`${rubro}/${p.clave} ${modo}: ${x}`);
      }
    }
  }
  for (const rubro of Object.keys(plantillas)) if (!rubros[rubro]) problemas.push(`rubro desconocido: ${rubro}`);
  return problemas;
}

/** Plantillas de un rubro (con fallback a "local" si el rubro no existe). */
export function plantillasDe(rubro) {
  const todas = JSON.parse(fs.readFileSync(SALIDA, 'utf8'));
  return todas[rubro] ?? todas.local;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const plantillas = construirPlantillas();
  const problemas = verificarPlantillas(plantillas);
  fs.writeFileSync(SALIDA, JSON.stringify(plantillas, null, 2));
  const total = Object.values(plantillas).reduce((n, l) => n + l.length, 0);
  console.log(`Plantillas: ${total} en ${Object.keys(plantillas).length} rubros -> ${path.relative(ROOT, SALIDA)}`);
  if (problemas.length) {
    console.log(problemas.join('\n'));
    process.exit(1);
  }
  console.log('Todas cumplen contraste WCAG AA y tienen mínimo por rubro.');
}
