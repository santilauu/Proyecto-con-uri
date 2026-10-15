const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { generarPrototipoPorDemanda } = require('./generador_claude');

/**
 * Simulación de envío de Outreach inicial
 */
function enviarPropuestasIniciales() {
    const rutaProspectos = path.join(__dirname, 'prospectos.json');
    if (!fs.existsSync(rutaProspectos)) {
        console.log("❌ Primero ejecuta 'node scraper.js'.");
        return;
    }

    const prospectos = JSON.parse(fs.readFileSync(rutaProspectos, 'utf-8')).filter(p => !p.tieneWeb);

    console.log(`\n📲 --- INICIANDO OUTREACH INTERACTIVO DE WHATSAPP ---`);
    console.log(`Se enviará el mensaje inicial a ${prospectos.length} prospectos (SIN generar la web aún):\n`);

    prospectos.forEach((p, idx) => {
        const mensaje = `Hola *${p.nombre}* 👋! Vimos su ficha en Google Maps y nos pareció excelente. Notamos que no tienen sitio web oficial y diseñamos una propuesta interactiva con cartelera/servicios para ustedes. ¿Les gustaría que se las activemos para verla sin compromiso?`;
        console.log(`[${idx + 1}] Para ${p.nombre}: "${mensaje}"\n`);
    });
}

/**
 * Función que se activa CUANDO EL CLIENTE CONFIRMA por WhatsApp
 */
async function clienteConfirmado(nombreNegocio, rubro = "") {
    console.log(`\n🎉 ¡El cliente "${nombreNegocio}" respondió SÍ! Generando demo bajo demanda...`);

    // 1. Genera la web hiper-personalizada según su contexto (Cine, Gastronomía, etc.)
    const rutaCarpeta = await generarPrototipoPorDemanda(nombreNegocio, rubro);

    // 2. Sube a Vercel automáticamente
    console.log(`🚀 Desplegando en Vercel en tiempo real...`);
    let urlEnVivo = "";
    try {
        urlEnVivo = execSync(`npx vercel --prod --yes --cwd "${rutaCarpeta}"`, { encoding: 'utf-8' }).trim();
        console.log(`  ✅ Demo subida con éxito: ${urlEnVivo}`);
    } catch (err) {
        console.log(`  ❌ Error subiendo a Vercel.`);
        return;
    }

    // 3. Respuesta automática con la demo lista
    const mensajeRespuesta = `¡Excelente *${nombreNegocio}*! Ya activamos su demo interactiva. Pueden verla en vivo desde el celular aquí: ${urlEnVivo}\n\n¿Qué les parece la presentación?`;

    console.log(`\n📲 MENSAJE DE ENVIAR AL CLIENTE:\n"${mensajeRespuesta}"\n`);
}

// Ejemplo de prueba ejecutando una confirmación en vivo
enviarPropuestasIniciales();

// Simulamos que "Cine Atlas" confirmó por chat:
clienteConfirmado("Cine Atlas Caballito", "cine");