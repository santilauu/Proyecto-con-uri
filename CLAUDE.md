# CLAUDE.md

## Contexto del negocio
- Vendemos páginas web únicas a negocios físicos de pequeño y mediano tamaño.
- Cada página se diseña para un cliente específico y debe sentirse hecha a medida.
- No tomamos proyectos de empresas grandes (cines, teatros, colegios, etc.).
- Entrega final en Vercel, con el código entregado o alojado según el acuerdo comercial.

## Cliente (completar en cada proyecto)
- Nombre del negocio:
- Rubro:
- Paleta elegida:
- Pareja tipográfica elegida:
- Modo: claro / oscuro / ambos
- Idioma: español (inglés solo si el cliente lo pide)
- Secciones: 

## Stack obligatorio
- Astro (última versión estable) + Tailwind CSS v4.
- TypeScript opcional, solo si el proyecto lo requiere.
- Sin base de datos propia. Formularios mediante servicio externo (Formspree, Web3Forms u otro que indiquemos).
- Deploy en Vercel.
- Sin frameworks adicionales salvo que se justifique en este archivo.

## Idioma y tono
- Textos siempre en español rioplatense neutro, salvo indicación contraria.
- El tono depende del rubro:
  - Iglesias: cálido, sereno, respetuoso.
  - Gimnasios: motivador, directo, energético.
  - Salones de estética: cercano, sensorial, elegante.
  - Consultorios médicos: claro, profesional, tranquilizador, sin jerga.
  - Sindicatos: institucional, solidario, claro.
  - Inmobiliarias: confiable, aspiracional, concreto.
  - Locales varios: simple, amable, directo.
- No uses frases genéricas de IA: "En el mundo actual", "Descubre la magia", "Potencia tu negocio", "Revoluciona", "Sumérgete", "Eleva tu experiencia".
- No inventes datos, precios, testimonios, certificaciones, cifras ni direcciones. Si falta un dato, usá un marcador visible `[COMPLETAR: ...]` y avisalo.
- Textos descriptivos y concretos: mencioná servicios reales que el cliente haya dado.

## Diseño visual
- Usar solo la paleta y la tipografía elegidas en el bloque "Cliente". Si no están definidas, preguntar antes de decidir.
- Las paletas de referencia por rubro están en el documento de plantillas. Respetar contraste WCAG AA (mínimo 4,5:1 en texto).
- Modo oscuro y claro definidos como variables CSS en `:root` y `[data-theme="dark"]`. Nunca colores hardcodeados en componentes.
- Espaciado con escala de 4 px o 8 px (clases de Tailwind).
- Evitar:
  - Gradientes morados o azul-violeta por defecto.
  - Tarjetas idénticas en serie sin jerarquía visual.
  - Emojis como iconos o en títulos.
  - Iconos genéricos de librerías sin criterio. Usar un solo set de iconos por proyecto.
  - Sombras exageradas y bordes redondeados excesivos en todo.
  - Texto centrado en párrafos largos.
- Dar identidad: una idea visual propia por sitio (textura sutil, forma de sección, tipografía de titular grande, división asimétrica), sin recargar.

## Animación
- Animación moderada y con propósito. Priorizar entradas suaves al hacer scroll y microinteracciones en hover y foco.
- Usar CSS puro y transiciones de Astro para lo simple. Librerías (Motion, GSAP, Lenis, Swiper) solo cuando aporten algo concreto.
- Cargar librerías solo donde se usan (`client:visible` o `client:idle`).
- Respetar `prefers-reduced-motion`: desactivar animaciones no esenciales.
- Probar siempre que el contenido sea visible sin JavaScript.

## Rendimiento y peso
- Peso total de carga inicial menor a 1 MB (ideal menos de 500 KB).
- JavaScript cliente menor a 150 KB comprimido.
- Imágenes en WebP o AVIF usando `<Image />` de Astro. Ninguna imagen mayor a 200 KB.
- Máximo dos familias tipográficas, con solo los pesos usados y `font-display: swap`.
- Objetivos: Lighthouse 90+ en móvil (rendimiento, accesibilidad, SEO y buenas prácticas), LCP menor a 2,5 s, CLS menor a 0,1.
- No agregar dependencias sin motivo. Antes de instalar algo nuevo, indicar qué aporta y cuánto pesa.

## Multidispositivo y accesibilidad
- Diseño mobile-first. Probar en 360 px, 768 px, 1024 px y 1440 px.
- Sin scroll horizontal en ningún ancho.
- Targets táctiles de al menos 44 px.
- Accesibilidad WCAG AA: alt en imágenes, jerarquía de encabezados, foco visible, contraste suficiente, formularios con etiquetas.
- SEO básico en cada página: `<title>`, meta description, Open Graph, `lang="es"`, sitemap y robots.txt.

## Estructura de archivos
- `src/pages/`: rutas. `index.astro` es la home.
- `src/components/`: componentes reutilizables.
- `src/layouts/`: layout base con `<head>`, SEO y tema.
- `src/styles/global.css`: tokens de color, tipografía y estilos globales.
- `src/content/`: textos y datos del cliente, separados del código cuando sea posible.
- `public/`: imágenes estáticas, favicon, fuentes locales si aplica.

## Reglas de trabajo para Claude Code
- Hacer cambios directos y completos sin pedir confirmación en tareas de bajo riesgo: editar componentes, textos, estilos, agregar secciones y corregir errores.
- Pedir confirmación solo antes de: borrar archivos o carpetas, cambiar el stack, instalar dependencias pesadas, cambiar la paleta o tipografía ya aprobadas por el cliente, o modificar configuración de deploy.
- Economizar tokens:
  - No releer archivos que ya están en contexto.
  - Usar ediciones puntuales en lugar de reescribir archivos completos.
  - No repetir código en la respuesta salvo que se pida.
  - Respuestas breves: qué se cambió, dónde y qué falta.
  - No generar documentación extra que no se pidió.
- Antes de dar algo por terminado: ejecutar `npm run build` y corregir errores. Si hay tiempo, correr `npm run dev` y revisar móvil y escritorio.

## Comandos
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Preview del build: `npm run preview`
- Verificación de tipos (si aplica): `npx astro check`

## Flujo de trabajo actual (manual, sin API de WhatsApp)
- El contacto con los clientes es manual: nadie envía mensajes automáticos. No hace falta ninguna API de WhatsApp.
- El panel (`iniciar.bat`) es SOLO para prospección: buscar negocios en Google Maps con sus filtros y guardarlos agrupados por rubro (quedan en `data/leads.json`), o cargar uno a mano. Desde ahí también se completan los datos del negocio, sus fotos/videos y su **prompt visual** (`lead.promptVisual`, hasta 1500 caracteres: cómo quiere verse la página, en palabras del cliente).
- El panel no genera, previsualiza, compila ni publica páginas. Eso se pide en el chat con Claude: ver la sección siguiente.

## Generar la página de un negocio (con Claude, no con el panel)
- El usuario pide en el chat, por ejemplo: "armá la página de <negocio>" o "actualizá la página de <negocio> con los datos nuevos".
- Claude lee el negocio de `data/leads.json` (incluido `promptVisual`), sus fotos y videos de `data/media/<id>`, y arma el sitio con `templates/base`, reutilizando `construirSitio` de `src/automation/builder.js`.
- El diseño (paleta, tipografía, distribución de secciones) lo decide Claude leyendo `promptVisual` y las reglas de este archivo (contraste AA, sin frases genéricas de IA, mobile-first, etc.), no un generador automático ni un servicio externo. Si el negocio no cargó `promptVisual`, Claude elige una dirección razonable para el rubro y lo dice explícitamente en su respuesta.
- La firma única por sitio (`src/automation/variantes.js`, `data/biblioteca.json`) se sigue usando para que dos negocios no compartan exactamente el mismo diseño; el criterio estético final es del prompt del cliente y el juicio de Claude, no de un catálogo cerrado de plantillas.
- Antes de entregar: `compilarLocal` (build de Astro, en `builder.js`) para verificar que compila, y revisión en 360/768/1024/1440 px.
- Las automatizaciones de WhatsApp (`src/automation/whatsapp.js`, `webhook.js`, menús 3 y 4 de `cli.js`) quedan sin uso. No se borran, pero no son parte del flujo.
- El motor de composición con Lovable (`lovable-*.js`, `composicion.js`, `auditoria.js`, `plantillas-rubro.js`, `miniaturas.js`, `src/panel/asistente.js`) quedó sin uso tras este cambio: no lo llama nada desde el panel ni desde `cli.js`. Se conserva el código por si se reutiliza algo (el motor de validación/auditoría, por ejemplo), pero no se borra sin que el usuario lo confirme.

## Sistema de generación (reutilizar, no reescribir)
- Catálogo en `src/data/`: `rubros.json` (19 rubros), `estilos.json` (10 estilos), `fuentes.json` (pares tipográficos).
- Cada sitio recibe un ADN único (`src/automation/variantes.js`): estilo, tipografía, acento calculado con contraste AA, portada, layout de servicios, decoración. Las firmas se registran en `data/biblioteca.json` para no repetir diseños.
- Textos: patrones por rubro sin IA; Claude (haiku) solo redacta servicios nuevos y los cachea en `data/cache-servicios.json`.
- Fotos y videos: solo con permiso del cliente; se optimizan en `src/automation/media.js` (WebP <= 200 KB).
- Flujo del lead: `src/automation/conversation.js` (estados) y `cli.js` (menú, incluye modo manual sin API).
- Antes de diseñar (`benchmark.js`): se confirma el rubro, se descartan empresas grandes y se analiza la estructura de sitios del mismo rubro (caché 90 días en `data/benchmark/`). Suma preguntas y secciones opcionales (precios, equipo, preguntas frecuentes).
- Precios: `src/data/precios.json` + `npm run precios`; documento en `ventas/PRECIOS.md`. Regla: cada categoría <= 85 % del piso de mercado y >= 1,5x el costo.
- `npm run verificar` valida el catálogo; `npm run doctor` valida el entorno; `DRY_RUN=1` simula WhatsApp y deploy.
- Los `[COMPLETAR: ...]` que genera el sistema cuentan como "avisalo" de este archivo: revisarlos antes de entregar.

## Entrega
- Antes de entregar: checklist de rendimiento, accesibilidad, SEO y multidispositivo.
- Documentar en el README del proyecto: cómo editar textos, cómo cambiar colores y cómo hacer deploy.
- Variables de entorno (por ejemplo, la clave del formulario) solo en Vercel, nunca en el repositorio.