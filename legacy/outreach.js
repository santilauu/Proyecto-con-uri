const fs = require('fs');
const path = require('path');

function generarMensajes() {
    const rutaProspectos = path.join(__dirname, 'prospectos.json');
    if (!fs.existsSync(rutaProspectos)) {
        console.log("❌ Primero debes ejecutar el scraper.");
        return;
    }

    const prospectos = JSON.parse(fs.readFileSync(rutaProspectos, 'utf-8'));
    const sinWeb = prospectos.filter(p => !p.tieneWeb);

    console.log(`💬 Generando mensajes de contacto para ${sinWeb.length} prospectos...\n`);

    const mensajesSalida = [];

    sinWeb.forEach((prospecto, index) => {
        const nombreLimpio = prospecto.nombre.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        // Mensaje personalizado enfocado en valor y regalo de prototipo
        const mensaje = `¡Hola! ¿Cómo están? Estuve viendo su negocio *${prospecto.nombre}* en Google Maps y noté que todavía no tienen una página web propia (solo redes). 

Me tomé la libertad de armarles un prototipo web de prueba gratuito y adaptado a su marca para que puedan verlo:
📁 Carpeta local: sitios_generados/${nombreLimpio}/index.html

¿Les interesaría que charlemos sobre cómo dejarlo online con dominio propio para sumar más clientes? ¡Sin compromiso!`;

        mensajesSalida.push({
            negocio: prospecto.nombre,
            mensajeWhatsApp: mensaje
        });

        console.log(`--------------------------------------------------`);
        console.log(`[Prospecto ${index + 1}]: ${prospecto.nombre}`);
        console.log(mensaje);
    });

    // Guardar los mensajes en un archivo de texto o JSON para lectura cómoda
    const archivoSalida = path.join(__dirname, 'mensajes_prospectos.json');
    fs.writeFileSync(archivoSalida, JSON.stringify(mensajesSalida, null, 2), 'utf-8');

    console.log(`\n--------------------------------------------------`);
    console.log(`✅ ¡Listo! Todos los mensajes se guardaron ordenados en 'mensajes_prospectos.json'.`);
}

generarMensajes();