const fs = require('fs');
const path = require('path');
const { obtenerOAnalizarRubro } = require('./analizador_rubro');

async function generarSitioAwwwards(nombreNegocio, rubro) {
    console.log(`\n--- Iniciando proceso para: ${nombreNegocio} (${rubro}) ---`);
    
    // 1. Obtener estructura UX (Cache Hit o Fallback)
    const estructuraUX = await obtenerOAnalizarRubro(rubro);
    console.log(`📦 Estructura UX obtenida correctamente.`);

    console.log(`🎨 [Claude UI Engine] Compilando diseño Awwwards...`);
    const html = generarHTMLLocalAwwwards(nombreNegocio, rubro, estructuraUX);

    const nombreLimpio = nombreNegocio.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const carpetaOutput = path.join(__dirname, 'sitios_generados', nombreLimpio);
    
    if (!fs.existsSync(carpetaOutput)) {
        fs.mkdirSync(carpetaOutput, { recursive: true });
    }

    fs.writeFileSync(path.join(carpetaOutput, 'index.html'), html, 'utf-8');
    fs.writeFileSync(path.join(carpetaOutput, 'vercel.json'), JSON.stringify({ cleanUrls: true }, null, 2));

    console.log(`✅ Archivos escritos en: sitios_generados/${nombreLimpio}/`);
    return carpetaOutput;
}

function generarHTMLLocalAwwwards(nombre, rubro, ux) {
    return `<!DOCTYPE html>
<html lang="es" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nombre} — Experiencia Oficial</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;700;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #030712; color: #f9fafb; }
        .glass { background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
    </style>
</head>
<body x-data="{ categoria: 'todos', modalOpen: false, productoSel: '' }" class="antialiased">
    <nav class="max-w-7xl mx-auto p-6 flex justify-between items-center relative z-10">
        <span class="font-black text-amber-400 tracking-widest uppercase text-sm">${nombre}</span>
        <a href="https://wa.me/?text=Hola!%20Consulta%20para%20${encodeURIComponent(nombre)}" class="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-full transition-all">Pedir por WhatsApp</a>
    </nav>
    <main class="max-w-5xl mx-auto px-6 py-12 text-center relative z-10">
        <h1 class="text-5xl font-black mb-6 text-white">${nombre}</h1>
        <p class="text-slate-400 mb-6">Rubro: ${rubro} | Creado con arquitectura de industria (${ux.rubro})</p>
    </main>
</body>
</html>`;
}

async function probarPruebaLocal() {
    console.log("🚀 [INICIO] Probando lectura de memoria local (Cache Hit)...");
    
    try {
        await generarSitioAwwwards("Pizzería Don Bosco", "Pizzeria");
        console.log("\n🎉 ¡Proceso finalizado con éxito total!");
    } catch (error) {
        console.error("❌ Ocurrió un error en la ejecución:", error);
    }
}

probarPruebaLocal();