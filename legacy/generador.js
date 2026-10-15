const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generarSitiosAwwwards() {
    const rutaProspectos = path.join(__dirname, 'prospectos.json');
    if (!fs.existsSync(rutaProspectos)) {
        console.log("❌ Primero debes ejecutar el scraper para obtener prospectos.json.");
        return;
    }

    const prospectos = JSON.parse(fs.readFileSync(rutaProspectos, 'utf-8'));
    const sinWeb = prospectos.filter(p => !p.tieneWeb);

    console.log(`🚀 Generando sitios nivel Awwwards para ${sinWeb.length} prospectos...\n`);

    const rutaTemplateApp = path.join(__dirname, 'template-app');
    const rutaPageTsx = path.join(rutaTemplateApp, 'src', 'app', 'page.tsx');
    const codigoOriginal = fs.readFileSync(rutaPageTsx, 'utf-8');
    const carpetaSalida = path.join(__dirname, 'sitios_generados');

    if (!fs.existsSync(carpetaSalida)) {
        fs.mkdirSync(carpetaSalida);
    }

    sinWeb.forEach((prospecto, index) => {
        const nombreLimpio = prospecto.nombre.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const carpetaProspecto = path.join(carpetaSalida, nombreLimpio);

        console.log(`[${index + 1}/${sinWeb.length}] Compilando prototipo para: ${prospecto.nombre}...`);

        // 1. Inyectar el nombre del negocio en la plantilla de Next.js
        const codigoPersonalizado = codigoOriginal.replace(/\{\{NOMBRE_NEGOCIO\}\}/g, prospecto.nombre);
        fs.writeFileSync(rutaPageTsx, codigoPersonalizado, 'utf-8');

        // 2. Compilar con Next.js (Export estático)
        try {
            execSync('npx next build', { cwd: rutaTemplateApp, stdio: 'ignore' });

            const rutaOut = path.join(rutaTemplateApp, 'out');
            if (fs.existsSync(rutaOut)) {
                if (fs.existsSync(carpetaProspecto)) {
                    fs.rmSync(carpetaProspecto, { recursive: true, force: true });
                }
                fs.cpSync(rutaOut, carpetaProspecto, { recursive: true });
                console.log(`   ✅ Sitio generado con éxito en: /sitios_generados/${nombreLimpio}/`);
            }
        } catch (error) {
            console.log(`   ❌ Error al compilar para ${prospecto.nombre}`);
        }
    });

    // Restaurar plantilla original
    fs.writeFileSync(rutaPageTsx, codigoOriginal, 'utf-8');

    console.log(`\n🎉 ¡Proceso finalizado! Todos los sitios Awwwards se guardaron en 'sitios_generados/'.`);
}

generarSitiosAwwwards();