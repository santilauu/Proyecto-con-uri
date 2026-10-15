const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'no_key',
});

/**
 * 1. Analiza el contexto y consulta a Claude para la arquitectura visual
 */
async function generarContenidoUnico(nombreNegocio, rubro = "") {
    console.log(`  🤖 Generando arquitectura y copy dinámico para: "${nombreNegocio}"...`);

    const prompt = `Eres un diseñador web senior y copywriter estrella de Awwwards.
Diseña el contenido e identidad visual para el siguiente negocio local:
- Nombre: "${nombreNegocio}"
- Rubro/Categoría detectada: "${rubro}"

DETERMINA EL TIPO DE NEGOCIO:
- "cine": Si es un cine, teatro o entretenimiento.
- "gastronomia": Si es restaurante, café, bar, pizzeria, heladería.
- "fitness": Si es gimnasio, club deportivo, entrenamiento.
- "estetica": Si es peluquería, barbería, spa, estética.
- "servicio": Para cerrajerías, talleres, plomería, abogados, consultorías.

Responde ÚNICAMENTE con un JSON válido sin explicaciones ni markdown:

{
  "tipoLayout": "cine | gastronomia | fitness | estetica | servicio",
  "tagline": "Frase corta y exclusiva",
  "heroTitle": "Título de alto impacto visual",
  "heroSubtitle": "Subtítulo de 2 oraciones con propuesta de valor irresistible",
  "colorAccent": "red | amber | cyan | violet | emerald",
  "heroMediaUrl": "URL de imagenUnsplash relevante de alta resolución (1920x1080) sobre el rubro",
  "seccionEspecial": {
    "titulo": "Título de la sección clave (ej: Cartelera Destacada / Menú Recomendado / Clases / Servicios)",
    "items": [
      { "nombre": "Elemento 1", "badge": "Estreno / Destacado / Top", "descripcion": "Detalle llamativo o sinopsis corta", "precio": "$ Valor si aplica" },
      { "nombre": "Elemento 2", "badge": "Pop/Popular", "descripcion": "Detalle llamativo", "precio": "$ Valor si aplica" },
      { "nombre": "Elemento 3", "badge": "Recomendado", "descripcion": "Detalle llamativo", "precio": "$ Valor si aplica" }
    ]
  },
  "propuestaValor": [
    { "titulo": "Ventaja 1", "descripcion": "Detalle convincente", "icono": "film | star | zap | shield-check | spark" },
    { "titulo": "Ventaja 2", "descripcion": "Detalle convincente", "icono": "popcorn | award | clock | check-circle" },
    { "titulo": "Ventaja 3", "descripcion": "Detalle convincente", "icono": "map-pin | heart | thumbs-up" }
  ],
  "faq": [
    { "pregunta": "¿Consulta clave sobre este lugar?", "respuesta": "Respuesta clara y convincente." },
    { "pregunta": "¿Otra duda habitual del cliente?", "respuesta": "Respuesta clara y convincente." }
  ],
  "ctaTexto": "Llamado a la acción personalizado (ej: Reservar Entradas / Agendar Turno / Pedir Menú)"
}`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1800,
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }]
        });

        const texto = response.content[0].text.trim();
        const jsonLimpio = texto.replace(/^```json/, '').replace(/```$/, '').trim();
        return JSON.parse(jsonLimpio);
    } catch (err) {
        console.log(`  ⚠️ API Warning: Usando motor sintáctico local por contexto.`);
        return getFallbackPorContexto(nombreNegocio, rubro);
    }
}

/**
 * 2. Compilador de Layouts Visuales Dinámicos (Efectos Awwwards)
 */
function construirHTMLAwwwards(nombreNegocio, data) {
    const colorMap = {
        red: { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', btn: 'bg-red-600 hover:bg-red-500 text-white' },
        amber: { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)', btn: 'bg-amber-500 hover:bg-amber-400 text-slate-950' },
        cyan: { accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.2)', btn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' },
        violet: { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.2)', btn: 'bg-violet-600 hover:bg-violet-500 text-white' },
        emerald: { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.2)', btn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' }
    };

    const theme = colorMap[data.colorAccent] || colorMap.red;
    const bgImage = data.heroMediaUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=80";

    return `<!DOCTYPE html>
<html lang="es" class="scroll-smooth dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nombreNegocio} — Experiencia Oficial</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.19/bundled/lenis.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>

    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #030712; color: #f9fafb; overflow-x: hidden; }
        .hero-bg {
            background: linear-gradient(to bottom, rgba(3, 7, 18, 0.6), #030712), url('${bgImage}');
            background-size: cover;
            background-position: center;
        }
        .glass-card {
            background: rgba(17, 24, 39, 0.6);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-card:hover {
            border-color: ${theme.accent};
            box-shadow: 0 0 25px ${theme.glow};
        }
    </style>
</head>
<body class="antialiased">

    <!-- Ambient Glow -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full pointer-events-none blur-[160px] z-0" style="background: ${theme.glow};"></div>

    <!-- Header -->
    <header class="relative z-20 max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
        <span class="text-sm uppercase font-black tracking-[0.3em]" style="color: ${theme.accent};">${nombreNegocio}</span>
        <a href="https://wa.me/?text=Hola!%20Consulta%20sobre%20${encodeURIComponent(nombreNegocio)}" class="text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full border border-slate-800 bg-slate-900/80 hover:border-slate-600 transition-all">
            Atención Directa
        </a>
    </header>

    <!-- Hero temático dinámico -->
    <section class="hero-bg relative z-10 min-h-[85vh] flex items-center justify-center px-6 text-center pt-10 pb-20">
        <div class="max-w-4xl mx-auto">
            <div class="hero-elem inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-800 bg-slate-900/90 text-xs font-bold uppercase tracking-wider mb-8 backdrop-blur-md" style="color: ${theme.accent};">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
                <span>${data.tagline}</span>
            </div>

            <h1 class="hero-elem text-5xl md:text-8xl font-black tracking-tight mb-8 leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                ${data.heroTitle}
            </h1>

            <p class="hero-elem text-lg md:text-2xl text-slate-300 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
                ${data.heroSubtitle}
            </p>

            <div class="hero-elem flex flex-wrap justify-center gap-4">
                <a href="https://wa.me/?text=Hola!%20Quiero%20información%20de%20${encodeURIComponent(nombreNegocio)}" 
                   class="inline-flex items-center gap-3 font-extrabold px-10 py-5 rounded-2xl shadow-2xl transition-all transform hover:scale-105 ${theme.btn}">
                    <i data-lucide="message-circle" class="w-6 h-6"></i>
                    <span>${data.ctaTexto}</span>
                </a>
            </div>
        </div>
    </section>

    <!-- Sección Especial Dinámica (Cartelera / Menú / Servicios) -->
    ${data.seccionEspecial ? `
    <section class="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-slate-900">
        <h2 class="text-xs uppercase tracking-[0.4em] text-slate-500 text-center mb-4 font-extrabold">Especiales & Destacados</h2>
        <h3 class="text-3xl font-black text-center mb-16 text-white">${data.seccionEspecial.titulo}</h3>

        <div class="grid md:grid-cols-3 gap-8">
            ${data.seccionEspecial.items.map(item => `
                <div class="reveal-card glass-card p-8 rounded-3xl transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-6">
                            <span class="text-[10px] uppercase font-black px-3 py-1 rounded-full bg-slate-900 border border-slate-800" style="color: ${theme.accent};">${item.badge || 'Exclusivo'}</span>
                            ${item.precio ? `<span class="text-lg font-black text-white">${item.precio}</span>` : ''}
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-white">${item.nombre}</h4>
                        <p class="text-sm text-slate-400 leading-relaxed mb-6">${item.descripcion}</p>
                    </div>
                    <a href="https://wa.me/?text=Consulta%20por%20${encodeURIComponent(item.nombre)}" class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white">
                        <span>Consultar ahora</span>
                        <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </a>
                </div>
            `).join('')}
        </div>
    </section>
    ` : ''}

    <!-- Propuesta de Valor -->
    <section class="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-slate-900">
        <div class="grid md:grid-cols-3 gap-8">
            ${data.propuestaValor.map(item => `
                <div class="reveal-card glass-card p-8 rounded-3xl transition-all">
                    <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6" style="color: ${theme.accent};">
                        <i data-lucide="${item.icono || 'star'}" class="w-7 h-7"></i>
                    </div>
                    <h4 class="text-xl font-bold mb-3 text-white">${item.titulo}</h4>
                    <p class="text-sm text-slate-400 leading-relaxed">${item.descripcion}</p>
                </div>
            `).join('')}
        </div>
    </section>

    <!-- FAQ -->
    <section class="relative z-10 max-w-3xl mx-auto px-6 py-20 border-t border-slate-900">
        <h2 class="text-xs uppercase tracking-[0.4em] text-slate-500 text-center mb-12 font-extrabold">Información Frecuente</h2>
        <div class="space-y-4">
            ${data.faq.map((item, idx) => `
                <div class="glass-card rounded-2xl overflow-hidden">
                    <button onclick="toggleFaq(${idx})" class="w-full text-left p-6 font-bold flex justify-between items-center text-sm text-slate-200 hover:text-white">
                        <span>${item.pregunta}</span>
                        <i data-lucide="chevron-down" id="faq-icon-${idx}" class="w-5 h-5 transition-transform"></i>
                    </button>
                    <div id="faq-ans-${idx}" class="hidden px-6 pb-6 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 pt-4">
                        ${item.respuesta}
                    </div>
                </div>
            `).join('')}
        </div>
    </section>

    <footer class="relative z-10 py-12 text-center text-[10px] text-slate-600 uppercase tracking-widest border-t border-slate-900 font-bold">
        Sitio web de vanguardia diseñado para ${nombreNegocio}
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (window.Lenis) {
                const lenis = new Lenis({ duration: 1.2 });
                function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
                requestAnimationFrame(raf);
            }

            if (window.gsap) {
                gsap.registerPlugin(ScrollTrigger);
                gsap.from('.hero-elem', { opacity: 0, y: 40, duration: 1.2, stagger: 0.15, ease: 'power4.out' });
                gsap.utils.toArray('.reveal-card').forEach(card => {
                    gsap.from(card, {
                        scrollTrigger: { trigger: card, start: 'top 85%' },
                        opacity: 0, y: 40, duration: 0.8, ease: 'power3.out'
                    });
                });
            }
            if (window.lucide) lucide.createIcons();
        });

        function toggleFaq(idx) {
            const ans = document.getElementById('faq-ans-' + idx);
            const icon = document.getElementById('faq-icon-' + idx);
            if (ans && icon) {
                ans.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            }
        }
    </script>
</body>
</html>`;
}

function getFallbackPorContexto(nombre, rubro) {
    const isCine = nombre.toLowerCase().includes('cine') || rubro.toLowerCase().includes('cine');
    return {
        tipoLayout: isCine ? "cine" : "servicio",
        tagline: isCine ? "Cartelera & Entretenimiento de Primer Nivel" : "Propuesta Comercial Exclusiva",
        heroTitle: isCine ? `Viví el mejor cine en ${nombre}` : `El nuevo portal digital de ${nombre}`,
        heroSubtitle: isCine ? "Salas equipadas con la máxima tecnología de imagen y sonido, estrenos semanales y la mejor experiencia." : "Atención rápida, servicios garantizados y canales de comunicación directa.",
        colorAccent: isCine ? "red" : "emerald",
        heroMediaUrl: isCine ? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba" : "https://images.unsplash.com/photo-1497366216548-37526070297c",
        seccionEspecial: {
            titulo: isCine ? "Cartelera & Estrenos de la Semana" : "Nuestros Servicios Principales",
            items: [
                { nombre: isCine ? "Estreno Blockbuster 2D/3D" : "Atención Personalizada", badge: "Destacado", descripcion: isCine ? "Proyección de alta definición con sonido envolvente Dolby." : "Respuesta rápida por WhatsApp.", precio: isCine ? "$ Consultar" : "Gratis" },
                { nombre: isCine ? "Combo Candy Bar Familiar" : "Presupuesto & Cotización", badge: "Popular", descripcion: isCine ? "Pochoclos recién hechos y bebidas frías." : "Sin compromiso de compra.", precio: isCine ? "$ Promocional" : "A convenir" }
            ]
        },
        propuestaValor: [
            { titulo: "Calidad Garantizada", descripcion: "Estándares superiores en cada atención.", icono: "star" },
            { titulo: "Reservas Ágiles", descripcion: "Comunicación directa sin demoras.", icono: "clock" }
        ],
        faq: [{ pregunta: "¿Cómo comprar o reservar?", respuesta: "Escribinos directamente por WhatsApp." }],
        ctaTexto: isCine ? "Comprar Entradas / Consultar" : "Contactar por WhatsApp"
    };
}

/**
 * Función exportable para generar 1 solo prototipo por demanda (cuando el cliente confirma por WhatsApp)
 */
async function generarPrototipoPorDemanda(nombreNegocio, rubro = "") {
    const nombreLimpio = nombreNegocio.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const carpetaSalida = path.join(__dirname, 'sitios_generados', nombreLimpio);

    console.log(`⚡ Generando sitio web exclusivo por confirmación para: ${nombreNegocio}...`);

    const datosContenido = await generarContenidoUnico(nombreNegocio, rubro);
    const htmlFinal = construirHTMLAwwwards(nombreNegocio, datosContenido);

    if (!fs.existsSync(carpetaSalida)) fs.mkdirSync(carpetaSalida, { recursive: true });
    fs.writeFileSync(path.join(carpetaSalida, 'index.html'), htmlFinal, 'utf-8');
    fs.writeFileSync(path.join(carpetaSalida, 'vercel.json'), JSON.stringify({ cleanUrls: true }), 'utf-8');

    return carpetaSalida;
}

module.exports = { generarPrototipoPorDemanda };