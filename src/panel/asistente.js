// Asistente de "Crear DEMO": plantilla de referencia del rubro (solo colores y tipografía), modo,
// tipografía, secciones (arrastrables o con botones) y datos de redes. Se carga después del panel principal.
// La distribución de la página no se elige acá: la compone Lovable para cada negocio.

let cfgActual = null;
let cfgId = null;

const ordenPorConfig = (lista, orden) => {
  if (!orden) return lista;
  const pos = (s) => (orden.indexOf(s.key) < 0 ? 999 : orden.indexOf(s.key));
  return [...lista].sort((a, b) => pos(a) - pos(b));
};

const filaSeccion = (s, marcada) => `
  <div class="op seccion" draggable="${s.fija ? 'false' : 'true'}" data-sec="${s.key}">
    <input type="checkbox" name="cfg-seccion" value="${s.key}" ${marcada ? 'checked' : ''} ${s.fija ? 'disabled' : ''}>
    <span style="flex:1">${s.titulo}${s.sugerida && !s.fija ? ' <span class="chip">la competencia la suele tener</span>' : ''}${s.fija ? ' <span class="chip">siempre</span>' : ''}</span>
    ${s.fija ? '' : `<button type="button" class="sec" data-mover="-1" aria-label="Subir ${s.titulo}">▲</button><button type="button" class="sec" data-mover="1" aria-label="Bajar ${s.titulo}">▼</button>`}
  </div>`;

const muestras = (p) => ['bg', 'surface', 'accent', 'fg'].map((k) => `<span class="muestra" style="background:${p[k]}" title="${k}"></span>`).join('');

async function abrirConfig(id) {
  cfgId = id;
  const d = await api('/api/config/' + id);
  cfgActual = d;
  const c = d.lead.config ?? {};
  const elegida = d.plantillas.find((p) => p.clave === c.plantilla)?.clave ?? d.plantillas[0].clave;

  $('modal-titulo').textContent = 'Crear DEMO de ' + d.lead.nombre;
  $('modal-sub').textContent = 'Las plantillas del rubro definen solo los colores y la tipografía. La distribución de la página la compone Lovable de cero para este negocio.';

  const plantillas = d.plantillas.map((p) => `
    <label class="op">
      <input type="radio" name="cfg-plantilla" value="${p.clave}" ${p.clave === elegida ? 'checked' : ''}>
      <span><strong>${p.nombre}</strong><br>
        <span class="aviso">Claro</span> ${muestras(p.paleta.claro)} <span class="aviso">Oscuro</span> ${muestras(p.paleta.oscuro)}<br>
        <span class="aviso">Titulares: ${p.titulo} · Texto: ${p.texto}</span>
      </span>
    </label>`).join('');

  const seccionesOrdenadas = ordenPorConfig(d.secciones, c.secciones);
  const secciones = seccionesOrdenadas.map((s) => filaSeccion(s, s.fija || (c.secciones ? c.secciones.includes(s.key) : s.sugerida))).join('');

  const r = d.lead.redes;
  const datos = r ? [r.telefono && 'Teléfono: ' + r.telefono, r.horarios && 'Horarios: ' + r.horarios, r.direccion && 'Dirección: ' + r.direccion, r.bio && 'Biografía: ' + r.bio].filter(Boolean) : [];
  const redes = datos.length
    ? `<label class="op"><input type="checkbox" id="cfg-redes" ${c.usarRedes ? 'checked' : ''}>
        <span>Usar estos datos públicos en la página (confirmé con el cliente):<br>
        <span class="aviso">${datos.join(' · ')}</span></span></label>`
    : '<p class="aviso">No encontré datos públicos útiles en Instagram o Facebook.</p>';

  const estado = d.demo
    ? `<p class="aviso">Estado de la demo: <strong>${d.demo.mensaje ?? d.demo.estado}</strong>${d.demo.estado === 'lista' ? ' Si la creás de nuevo, la anterior se reemplaza solo cuando la nueva compile bien.' : ''}</p>`
    : '';

  $('modal-cuerpo').innerHTML = `${estado}
    <div class="paso"><h3>1. Plantilla de referencia (${d.lead.rubroNombre})</h3>${plantillas}</div>
    <div class="paso"><h3>2. Modo</h3>
      <label class="op"><input type="radio" name="cfg-modo" value="claro" ${c.modo !== 'oscuro' ? 'checked' : ''}> Claro</label>
      <label class="op"><input type="radio" name="cfg-modo" value="oscuro" ${c.modo === 'oscuro' ? 'checked' : ''}> Oscuro</label></div>
    <div class="paso"><h3>3. Tipografía</h3>
      <select id="cfg-par">
        <option value="auto">La de la plantilla elegida</option>
        ${d.pares.map((p) => `<option value="${p.key}" ${c.par === p.key ? 'selected' : ''}>${p.titulo} + ${p.texto}</option>`).join('')}
      </select>
      <p class="aviso">Solo se ofrecen tipografías pensadas para este rubro.</p></div>
    <div class="paso"><h3>4. Secciones (arrastrá, o usá ▲ ▼ para cambiar el orden)</h3><div id="cfg-secciones">${secciones}</div></div>
    <div class="paso"><h3>5. Datos de Instagram / Facebook</h3>${redes}</div>`;

  $('modal-error').textContent = '';
  $('modal').classList.add('abierto');
}

// Mover una sección con los botones (accesible con teclado).
function moverSeccion(fila, dir) {
  const lista = fila.parentElement;
  const hermanos = [...lista.children];
  const i = hermanos.indexOf(fila);
  const j = i + dir;
  if (fila.dataset.sec === 'contacto' || j < 0 || j >= hermanos.length || hermanos[j].dataset.sec === 'contacto') return;
  if (dir < 0) lista.insertBefore(fila, hermanos[j]);
  else lista.insertBefore(hermanos[j], fila);
  fila.querySelector(dir < 0 ? '[data-mover="-1"]' : '[data-mover="1"]')?.focus();
}

// Arrastrar y soltar.
let arrastrado = null;
$('modal-cuerpo').addEventListener('click', (e) => {
  const mover = e.target.closest('button[data-mover]');
  if (mover) moverSeccion(mover.closest('.seccion'), Number(mover.dataset.mover));
});
$('modal-cuerpo').addEventListener('dragstart', (e) => {
  const f = e.target.closest('.seccion');
  if (!f || f.getAttribute('draggable') !== 'true') return;
  arrastrado = f;
  e.dataTransfer.effectAllowed = 'move';
});
$('modal-cuerpo').addEventListener('dragover', (e) => { if (arrastrado) e.preventDefault(); });
$('modal-cuerpo').addEventListener('drop', (e) => {
  const destino = e.target.closest('.seccion');
  if (!arrastrado || !destino || destino === arrastrado || destino.dataset.sec === 'contacto') return;
  e.preventDefault();
  const r = destino.getBoundingClientRect();
  const despues = e.clientY > r.top + r.height / 2;
  destino.parentElement.insertBefore(arrastrado, despues ? destino.nextSibling : destino);
  arrastrado = null;
});

function leerConfig() {
  return {
    plantilla: document.querySelector('input[name="cfg-plantilla"]:checked')?.value,
    modo: document.querySelector('input[name="cfg-modo"]:checked')?.value ?? 'claro',
    par: $('cfg-par').value,
    secciones: [...document.querySelectorAll('#cfg-secciones .seccion input[name="cfg-seccion"]:checked')].map((i) => i.value),
    usarRedes: !!$('cfg-redes')?.checked,
  };
}

async function guardarConfig() {
  $('modal-error').textContent = '';
  try {
    await api('/api/config/' + cfgId, { method: 'POST', body: leerConfig() });
    $('modal-error').innerHTML = '<span class="ok">Elecciones guardadas.</span>';
    return true;
  } catch (err) { $('modal-error').textContent = err.message; return false; }
}

$('btn-guardar-cfg').addEventListener('click', guardarConfig);
$('btn-cerrar-cfg').addEventListener('click', () => $('modal').classList.remove('abierto'));
$('btn-generar-cfg').addEventListener('click', async () => {
  if (!(await guardarConfig())) return;
  $('modal').classList.remove('abierto');
  await lanzarDemo(cfgId, 'crear');
  await cargar();
});
