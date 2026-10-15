import { spawnSync } from 'node:child_process';

/** Sube la carpeta a Vercel como producción (Vercel instala y compila en sus servidores). */
export async function desplegar(dir, nombre) {
  if (process.env.DRY_RUN) return `https://${nombre}.vercel.app`; // simulación: no publica nada
  const args = ['vercel@latest', 'deploy', '--prod', '--yes', '--name', nombre];
  if (process.env.VERCEL_TOKEN) args.push('--token', process.env.VERCEL_TOKEN);
  const r = spawnSync('npx', args, { cwd: dir, encoding: 'utf8', shell: true, timeout: 10 * 60_000 });
  if (r.status !== 0) throw new Error(`Vercel falló:\n${(r.stderr || r.stdout).slice(-800)}`);

  // El CLI imprime JSON o texto según el entorno. Priorizo la URL de producción (pública);
  // la URL por deploy queda protegida por login de Vercel.
  const todo = `${r.stdout}\n${r.stderr}`;
  const produccion = todo.match(/Production URL:\s*(https:\/\/[\w.-]+\.vercel\.app)/i)?.[1];
  const alias = produccion ?? `https://${nombre}.vercel.app`;
  const ok = await fetch(alias, { method: 'HEAD', signal: AbortSignal.timeout(15000) }).then((x) => x.ok).catch(() => false);
  if (!ok) throw new Error(`Se publicó pero ${alias} no responde público. Revisá el proyecto en vercel.com.`);
  return alias;
}

export const urlPrevista = (nombre) => `https://${nombre}.vercel.app`;
