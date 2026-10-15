import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { ROOT } from './util.js';

/*
 * Cliente del servidor MCP oficial de Lovable (https://mcp.lovable.dev). Es el mismo servidor que usan Claude, Cursor
 * o ChatGPT: el panel se conecta como un cliente más, con login OAuth hecho una sola vez en el navegador.
 * Los tokens quedan en data/lovable/.oauth.json (solo en esta PC, fuera del control de versiones).
 * Los créditos de Lovable se gastan en create_project y send_message; el resto de las herramientas es gratis.
 */

const URL_MCP = process.env.LOVABLE_MCP_URL || 'https://mcp.lovable.dev';
const ARCHIVO = path.join(ROOT, 'data', 'lovable', '.oauth.json');
const MENSAJE_SIN_AUTORIZAR = 'LOVABLE_SIN_AUTORIZAR';

const leer = () => { try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { return {}; } };
const escribir = (parche) => {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify({ ...leer(), ...parche }, null, 2), { mode: 0o600 });
};

class Proveedor {
  constructor(redirect) {
    this.redirect = redirect;
    this.urlAutorizar = null;
    // Si el panel cambió de puerto, el registro anterior ya no sirve: se vuelve a registrar el cliente.
    const guardado = leer();
    if (guardado.redirect && guardado.redirect !== redirect) escribir({ cliente: null, tokens: null, redirect });
    else if (!guardado.redirect) escribir({ redirect });
  }
  get redirectUrl() { return this.redirect; }
  get clientMetadata() {
    return {
      client_name: 'mi-automatizador (panel local)',
      redirect_uris: [this.redirect],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }
  state() { return crypto.randomBytes(16).toString('hex'); }
  clientInformation() { return leer().cliente ?? undefined; }
  saveClientInformation(info) { escribir({ cliente: info }); }
  tokens() { return leer().tokens ?? undefined; }
  saveTokens(t) { escribir({ tokens: t }); }
  saveCodeVerifier(v) { escribir({ verificador: v }); }
  codeVerifier() { return leer().verificador; }
  redirectToAuthorization(url) { this.urlAutorizar = url.toString(); }
  invalidateCredentials(alcance) {
    if (alcance === 'all') escribir({ cliente: null, tokens: null, verificador: null });
    else if (alcance === 'client') escribir({ cliente: null });
    else if (alcance === 'tokens') escribir({ tokens: null });
    else if (alcance === 'verifier') escribir({ verificador: null });
  }
}

let conexion = null;   // { client, transport }
let pendiente = null;  // { proveedor, transport } mientras se espera la autorización del usuario
let ultimoError = null;

const puertoPanel = () => Number(process.env.PANEL_PORT) || 3300;
export const urlCallback = () => `http://localhost:${puertoPanel()}/oauth/lovable`;

async function abrir() {
  const proveedor = new Proveedor(urlCallback());
  const transport = new StreamableHTTPClientTransport(new URL(URL_MCP), { authProvider: proveedor });
  const client = new Client({ name: 'mi-automatizador', version: '1.0.0' }, { capabilities: {} });
  try {
    await client.connect(transport);
  } catch (e) {
    if (e instanceof UnauthorizedError || /unauthorized|401/i.test(String(e.message))) {
      pendiente = { proveedor, transport };
      throw new Error(MENSAJE_SIN_AUTORIZAR);
    }
    throw e;
  }
  pendiente = null;
  return { client, transport };
}

/** Conecta (o reutiliza la conexión). Si falta el login, lanza LOVABLE_SIN_AUTORIZAR y deja lista la URL para autorizar. */
export async function conectar() {
  if (conexion) return conexion;
  try {
    conexion = await abrir();
    ultimoError = null;
  } catch (e) {
    ultimoError = e.message === MENSAJE_SIN_AUTORIZAR ? null : e.message;
    throw e;
  }
  return conexion;
}

export const sinAutorizar = (e) => e?.message === MENSAJE_SIN_AUTORIZAR;

/** Estado para mostrar en el panel. */
export function estadoConexion() {
  return {
    conectado: !!conexion,
    hayTokens: !!leer().tokens,
    urlAutorizar: pendiente?.proveedor.urlAutorizar ?? null,
    error: ultimoError,
    servidor: URL_MCP,
  };
}

/** Prepara el login: devuelve la URL que hay que abrir en el navegador. */
export async function iniciarAutorizacion() {
  if (conexion) return { conectado: true };
  try {
    await conectar();
    return { conectado: true };
  } catch (e) {
    if (!sinAutorizar(e)) throw e;
    return { conectado: false, url: pendiente?.proveedor.urlAutorizar ?? null };
  }
}

/** Lo llama el panel cuando Lovable redirige con el código de autorización. */
export async function terminarAutorizacion(codigo) {
  if (!pendiente) throw new Error('No hay una autorización en curso. Tocá "Conectar con Lovable" de nuevo.');
  await pendiente.transport.finishAuth(codigo);
  pendiente = null;
  conexion = null;
  await conectar();
  return true;
}

export async function desconectar({ olvidar = false } = {}) {
  try { await conexion?.client.close(); } catch { /* ya estaba cerrada */ }
  conexion = null;
  pendiente = null;
  if (olvidar) escribir({ cliente: null, tokens: null, verificador: null });
}

const intentarJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

/**
 * Llama a una herramienta de Lovable. Devuelve { texto, json }: el texto crudo y, si es JSON, su contenido.
 * Si la conexión se cayó, reconecta una vez.
 */
export async function llamar(nombre, args = {}, { timeoutMs = 120000 } = {}) {
  for (let intento = 0; intento < 2; intento++) {
    const { client } = await conectar();
    try {
      const r = await client.callTool({ name: nombre, arguments: args }, undefined, { timeout: timeoutMs });
      const texto = (r.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      if (r.isError) throw new Error(`Lovable (${nombre}): ${texto.slice(0, 300) || 'error sin detalle'}`);
      return { texto, json: intentarJson(texto) };
    } catch (e) {
      const caida = /closed|ECONN|fetch failed|401|unauthorized|terminated/i.test(String(e.message));
      if (intento === 0 && caida && !/^Lovable \(/.test(e.message)) { await desconectar(); continue; }
      throw e;
    }
  }
  throw new Error(`No se pudo llamar a ${nombre}.`);
}
