const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'no_key',
});

const RUTA_MEMORIA = path.join(__dirname, 'rubros_ux.json');

function cargarMemoriaRubros() {
    if (!fs.existsSync(RUTA_MEMORIA)) return {};
    try {
        return JSON.parse(fs.readFileSync(RUTA_MEMORIA, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function guardarRubroEnMemoria(claveRubro, estructuraUX) {
    const memoriaActual = cargarMemoriaRubros();
    memoriaActual[claveRubro] = {
        ...estructuraUX,
        fechaActualizacion: new Date().toISOString()
    };
    fs.writeFileSync(RUTA_MEMORIA, JSON.stringify(memoriaActual, null, 2), 'utf-8');
    console.log(`💾 [Memoria Local] Guardado correctamente "${claveRubro}" en rubros_ux.json`);
}

function obtenerArquitecturaDefault(rubro) {
    const rubroLower = rubro.toLowerCase();
    if (rubroLower.includes('pizz') || rubroLower.includes('gastro') || rubroLower.includes('restaurante')) {
        return {
            rubro: rubro,
            paginasHijasYModales: [
                { id: "menu", nombre: "Menú / Carta Interactiva", tipo: "seccion_o_modal", descripcion: "Filtros por categoría (Pizzas, Empanadas, Bebidas) y selector de sabores" },
                { id: "combos", nombre: "Promociones & Combos", tipo: "banner_dinamico", descripcion: "Ofertas especiales con precio promocional" },
                { id: "delivery", nombre: "Cobertura & Pedidos", tipo: "modal_interactivo", descripcion: "Zona de entregas y cálculo de tiempo estimado" }
            ],
            componentesUX: [
                { nombre: "Barra de navegación persistente", funcion: "Filtro rápido y resumen de orden" },
                { nombre: "Floating CTA WhatsApp", funcion: "Envío directo del pedido precargado" }
            ],
            microInteracciones: [
                "Filtro de categorías instantáneo con Alpine.js",
                "Selector modal de gustos mitad y mitad"
            ]
        };
    }

    return {
        rubro: rubro,
        paginasHijasYModales: [
            { id: "servicios", nombre: "Catálogo de Servicios", tipo: "seccion_o_modal", descripcion: "Detalles y precios de los servicios principales" },
            { id: "turnos", nombre: "Reserva / Turnos", tipo: "modal_interactivo", descripcion: "Formulario ágil para coordinar fecha y hora" }
        ],
        componentesUX: [
            { nombre: "Header con llamado a la acción", funcion: "Botón a WhatsApp" },
            { nombre: "Floating CTA WhatsApp", funcion: "Contacto directo" }
        ],
        microInteracciones: [
            "Despliegue suave de acordeón en preguntas frecuentes",
            "Transiciones fluidas al hacer hover en tarjetas"
        ]
    };
}

async function obtenerOAnalizarRubro(rubro) {
    const claveRubro = rubro.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const memoria = cargarMemoriaRubros();

    if (memoria[claveRubro]) {
        console.log(`⚡ [Cache Hit] Reutilizando estructura UX guardada para: "${rubro}"`);
        return memoria[claveRubro];
    }

    console.log(`🔍 [Cache Miss] Investigando nueva arquitectura funcional para el rubro: "${rubro}"...`);

    const prompt = `
Eres un Arquitecto de Información y UX Lead.
Analiza qué componentes funcionales, secciones, sub-páginas/modales y flujos de usuario debe tener un sitio web competitivo del rubro "${rubro}".

Responde ÚNICAMENTE con un JSON válido estricto:
{
  "rubro": "${rubro}",
  "paginasHijasYModales": [
    { "id": "menu", "nombre": "Nombre de sección o modal", "tipo": "seccion_o_modal", "descripcion": "Detalle funcional" }
  ],
  "componentesUX": [
    { "nombre": "Nombre del componente", "funcion": "Detalle de uso" }
  ],
  "microInteracciones": [
    "Descripción de animación o interacción clave"
  ]
}`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }]
        });

        const texto = response.content[0].text.trim();
        const jsonLimpio = texto.replace(/^```json/, '').replace(/```$/, '').trim();
        const resultado = JSON.parse(jsonLimpio);

        guardarRubroEnMemoria(claveRubro, resultado);
        return resultado;
    } catch (err) {
        console.log(`⚠️ Aviso API (${err.message.slice(0, 50)}...). Generando arquitectura por patrón de industria.`);
        const estructuraDefault = obtenerArquitecturaDefault(rubro);
        guardarRubroEnMemoria(claveRubro, estructuraDefault);
        return estructuraDefault;
    }
}

module.exports = { obtenerOAnalizarRubro };