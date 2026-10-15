const fs = require('fs');
const path = require('path');

// Función para generar un enlace directo seguro de WhatsApp (100% legal, sin baneos)
function generarEnlaceWhatsApp(telefono, nombreNegocio) {
    const telLimpio = telefono.replace(/\D/g, '');
    const mensaje = `Hola ${nombreNegocio}! Estuve viendo su negocio y noté que no cuenta con una página web optimizada o moderna. ¿Les interesaría ver un prototipo gratuito de cómo se vería?`;
    const encodedMessage = encodeURIComponent(mensaje);
    
    return `https://wa.me/${telLimpio}?text=${encodedMessage}`;
}

// Ejemplo de uso leyendo prospectos.json
function procesarProspectosParaContacto() {
    const rutaArchivo = path.join(__dirname, 'prospectos.json');
    if (!fs.existsSync(rutaArchivo)) {
        console.log("❌ No se encontró el archivo prospectos.json. Ejecuta primero el scraper.");
        return;
    }

    const prospectos = JSON.parse(fs.readFileSync(rutaArchivo, 'utf-8'));
    const sinWeb = prospectos.filter(p => !p.tieneWeb);

    console.log(`\n📱 Total de prospectos sin web listos para estrategia de contacto: ${sinWeb.length}`);
    sinWeb.slice(0, 5).forEach((p, index) => {
        console.log(`${index + 1}. ${p.nombre} - Estado: ${p.estado}`);
    });
}

procesarProspectosParaContacto();