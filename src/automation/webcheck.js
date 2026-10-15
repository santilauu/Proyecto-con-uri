// Decide si la web de un negocio está "desactualizada" mirando señales objetivas del HTML.
const REDES = ['facebook.com', 'instagram.com', 'wa.me', 'whatsapp.com', 'linktr.ee', 'tiktok.com', 'twitter.com', 'x.com',
  'google.com', 'goo.gl', 'youtube.com', 'tripadvisor', 'mercadolibre', 'pedidosya', 'rappi', 'linkedin.com'];

export const esSoloRed = (url) => REDES.some((d) => url.toLowerCase().includes(d));

export async function evaluarWeb(url) {
  if (!url || esSoloRed(url)) return { webEstado: 'sin_web', motivos: [] };
  const motivos = [];
  let html = '';
  let res;
  try {
    res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'Mozilla/5.0' } });
    html = (await res.text()).slice(0, 400_000);
  } catch {
    return { webEstado: 'desactualizada', motivos: ['el sitio no responde'] };
  }
  if (res.status >= 400) motivos.push(`responde ${res.status}`);
  if (!res.url.startsWith('https://')) motivos.push('sin HTTPS');
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) motivos.push('no adaptada a celulares');
  if (/<marquee|<font\b|<frameset|\.swf\b/i.test(html)) motivos.push('código HTML antiguo');
  const anios = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,20}(?:\d{4}\s*[-–]\s*)?(20\d{2}|19\d{2})/gi)].map((m) => +m[1]);
  if (anios.length && Math.max(...anios) <= new Date().getFullYear() - 3) motivos.push(`copyright ${Math.max(...anios)}`);
  const mod = res.headers.get('last-modified');
  if (mod && new Date(mod).getFullYear() <= new Date().getFullYear() - 3) motivos.push(`última modificación ${new Date(mod).getFullYear()}`);
  return { webEstado: motivos.length >= 2 || motivos.includes('responde 404') ? 'desactualizada' : 'ok', motivos };
}
