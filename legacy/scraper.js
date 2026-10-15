const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function main() {
    const inquirerModule = await import('inquirer');
    const inquirer = inquirerModule.default;

    console.log("🤖 Iniciando Scraper con Filtro Estricto de Webs...\n");

    const respuestas = await inquirer.prompt([
        {
            type: 'input',
            name: 'rubro',
            message: '¿Qué rubro estás buscando? (ej. Cines, Gimnasios):',
            default: 'Gimnasios'
        },
        {
            type: 'input',
            name: 'zona',
            message: '¿En qué zona o localidad? (ej. Caballito, Buenos Aires):',
            default: 'Caballito'
        }
    ]);

    const query = `${respuestas.rubro} en ${respuestas.zona}`;
    console.log(`\n🔍 Buscando en Google Maps: "${query}"...`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
    
    const searchInput = await page.waitForSelector('input#searchboxinput, input[name="q"]', { timeout: 15000 });
    await searchInput.fill(query);
    await page.press('input#searchboxinput, input[name="q"]', 'Enter');

    console.log("⏳ Esperando resultados y haciendo scroll...");
    
    try {
        await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
    } catch (e) {
        console.log("⚠️ No se detectó el feed estándar, continuando...");
    }

    for (let i = 0; i < 6; i++) {
        try {
            const feed = await page.$('div[role="feed"]'); if (feed) { await feed.evaluate(node => node.scrollTo(0, node.scrollHeight)); } else { await page.evaluate(() => window.scrollBy(0, 2000)); } await page.waitForTimeout(2000); } catch (err) { break; } }      console.log("🔎 Extrayendo y aplicando filtro estricto (excluyendo Redes Sociales)...");      const negociosBrutos = await page.$$eval('div.Nv2PK', elements => {
        const results = [];
        for (const el of elements) {
            const nombreEl = el.querySelector('.fontHeadlineSmall');
            const nombre = nombreEl ? nombreEl.innerText : 'Sin nombre';
            
            // Capturar todos los enlaces de la tarjeta
            const links = Array.from(el.querySelectorAll('a')).map(a => a.href);
            
            const textoTarjeta = el.innerText.toLowerCase();
            const esAnuncio = textoTarjeta.includes('patrocinado') || textoTarjeta.includes('sponsored');

            results.push({
                nombre,
                links,
                esAnuncio
            });
        }
        return results;
    });

    // Dominios que NO deben considerarse una página web comercial propia
    const dominiosExcluidos = [
        'google.com', 'goo.gl', 
        'facebook.com', 'instagram.com', 
        'twitter.com', 'x.com', 
        'linkedin.com', 'tiktok.com', 
        'youtube.com', 'wa.me', 
        'whatsapp.com', 'tripadvisor', 
        'mercadolibre', 'pedidosya', 'rappi'
    ];

    const negociosValidos = [];
    const vistos = new Set();

    for (const item of negociosBrutos) {
        if (item.esAnuncio) continue;
        if (vistos.has(item.nombre)) continue;
        vistos.add(item.nombre);

        // Buscar un enlace que NO pertenezca a redes sociales ni a Google
        let webReal = null;
        for (const link of item.links) {
            if (!link) continue;
            const lowerLink = link.toLowerCase();
            
            // Verificar si el enlace contiene alguno de los dominios prohibidos
            const esRedSocialOInvalido = dominiosExcluidos.some(domain => lowerLink.includes(domain));

            if (!esRedSocialOInvalido) {
                webReal = link;
                break;
            }
        }

        let tieneWebReal = !!webReal;
        let estadoWeb = tieneWebReal ? 'Tiene web propia' : 'Sin web (Potencial cliente - Solo redes o sin nada)';

        negociosValidos.push({
            id: Math.random().toString(36).substring(2, 9),
            nombre: item.nombre,
            web: webReal,
            tieneWeb: tieneWebReal,
            estado: estadoWeb
        });
    }

    await browser.close();

    const archivoRuta = path.join(__dirname, 'prospectos.json');
    fs.writeFileSync(archivoRuta, JSON.stringify(negociosValidos, null, 2), 'utf-8');

    const sinWebCount = negociosValidos.filter(p => !p.tieneWeb).length;

    console.log(`\n✅ ¡Búsqueda finalizada con éxito!`);
    console.log(`📊 Total de negocios encontrados: ${negociosValidos.length}`);
    console.log(`🎯 Negocios SIN web real (tus prospectos ideales): ${sinWebCount}`);
    console.log(`📁 Guardado en 'prospectos.json'.`);
}

main().catch(console.error);