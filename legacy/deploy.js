const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function desplegarPrototipos() {
    const carpetaSalida = path.join(__dirname, 'sitios_generados');

    if (!fs.existsSync(carpetaSalida)) {
        console.log("❌ No existe la carpeta 'sitios_generados'. Ejecuta primero 'node generador_claude.js'.");
        return;
    }

    const carpetas = fs.readdirSync(carpetaSalida).filter(file => {
        return fs.statSync(path.join(carpetaSalida, file)).isDirectory();
    });

    if (carpetas.length === 0) {
        console.log("⚠️ No hay subcarpetas dentro de 'sitios_generados'.");
        return;
    }

    console.log(`🚀 Iniciando despliegue automático de ${carpetas.length} sitios en Vercel...\n`);

    const resultados = [];

    carpetas.forEach((dir, index) => {
        const rutaAbsoluta = path.join(carpetaSalida, dir);
        console.log(`[${index + 1}/${carpetas.length}] Subiendo ${dir}...`);

        try {
            // Despliega automáticamente en producción usando Vercel CLI
            const url = execSync(`npx vercel --prod --yes --cwd "${rutaAbsoluta}"`, { encoding: 'utf-8' }).trim();
            
            console.log(`  ✅ Online en: ${url}\n`);
            resultados.push({ negocio: dir, url });
        } catch (error) {
            console.log(`  ❌ Error al subir ${dir}. Verifica tener sesión iniciada en Vercel CLI.\n`);
        }
    });

    fs.writeFileSync(path.join(__dirname, 'urls_desplegadas.json'), JSON.stringify(resultados, null, 2), 'utf-8');
    console.log(`🎉 ¡Despliegue finalizado! Todos los links en vivo se guardaron en 'urls_desplegadas.json'.`);
}

desplegarPrototipos();