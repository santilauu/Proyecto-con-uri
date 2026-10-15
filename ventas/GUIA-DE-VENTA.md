# Guía de venta

## Plan para mañana (orden sugerido)

1. `npm run doctor` y completar lo que marque FALTA (`.env` con `TU_NOMBRE`, y `ANTHROPIC_API_KEY` si la tenés).
2. Antes de cotizar, buscá 3 precios locales del rubro y confirmá que tu precio sea al menos 15 % menor (ver PRECIOS.md).
2. `npm start` -> **1. Buscar negocios**. Empezá con **un solo rubro y una sola zona**, 15 prospectos. Mejor calidad que cantidad.
3. **2. Ver prospectos** y descartá a mano los que no encajen (cadenas, negocios grandes: no tomamos proyectos de empresas grandes).
4. **6. MODO MANUAL** -> *Abrir WhatsApp con el primer mensaje*. Se abre WhatsApp Web con el texto cargado: revisalo y mandalo vos. Máximo 15 a 20 por día mientras la cuenta es nueva.
5. Cuando alguien responde que sí: **6 -> Generar y publicar la demo**. Tarda 1 a 3 minutos y abre WhatsApp con los 3 links listos para enviar.
6. Cuando elige estilo: **6 -> Cargar datos y publicar el sitio final**. Hacele las preguntas por chat, cargá las respuestas, revisá los `[COMPLETAR]` y publicá.
7. Revisá el sitio en el celular **antes** de mandar la URL.

## Primer mensaje (el sistema lo genera; esta es la base)

> Hola, ¿cómo están en {negocio}? Soy {tu nombre}, diseño páginas web para {rubro}. Los busqué en Google y vi que todavía no tienen una página web propia. Les armo una demostración gratis con el nombre de su negocio, sin compromiso, para que vean cómo quedaría. ¿Les interesa verla? Si no, me avisan y no los molesto más.

Reglas: un solo mensaje, sin links, sin adjuntos y sin presión. Si no contestan, **no insistas más de una vez** (a los 3 o 4 días, un "¿pudieron ver el mensaje?").

## Respuestas a objeciones

| Dicen | Respondé |
|---|---|
| "Ya tengo Instagram" | "Instagram sirve para mostrar, pero Google no lo muestra tan bien. Con una página te encuentran cuando buscan {rubro} en {zona}, y tenés horarios, dirección y WhatsApp en un solo lugar." |
| "¿Cuánto sale?" | Pasá el precio recién después de que vieron la demo. Valores y categorías en [PRECIOS.md](PRECIOS.md): Presencia, Negocio y Destacado, siempre por debajo del mercado. |
| "No tengo tiempo" | "Yo me encargo de todo. Solo necesito 5 respuestas por mensaje, en 5 minutos." |
| "Lo tengo que pensar / hablar con mi socio" | "Claro. La demo queda online para que la vean juntos. Te escribo en unos días." |
| "Ya tengo página" (y está vieja) | "Vi que no se ve bien en celulares, que es desde donde entra la mayoría. Te muestro cómo quedaría." |
| "Me parece caro" | Mostrá qué incluye. Nunca regales el trabajo: bajá el alcance, no el precio. |

## Qué incluye la oferta (completá con tus condiciones)

- Página única hecha a medida del rubro, adaptada a celular. **Incluido.**
- Textos redactados con los datos reales del negocio. **Incluido.**
- Publicación en Vercel con dirección `.vercel.app`. **Incluido.**
- Dominio propio (`.com.ar`, etc.): `[COMPLETAR: lo cobrás aparte o lo incluís]`.
- Cambios posteriores: `[COMPLETAR: cuántas rondas de ajustes incluye]`.
- Código entregado o alojado según el acuerdo comercial: `[COMPLETAR: modalidad y mantenimiento mensual si aplica]`.

## Precio y cobro (dejalo definido antes de salir)

- Precio de la página: según categoría en [PRECIOS.md](PRECIOS.md) (Presencia US$ 59, Negocio US$ 99, Destacado US$ 169).
- Anticipo: `[COMPLETAR: % antes de publicar el sitio final]` (sugerencia: 50 %).
- Mantenimiento mensual (opcional): Cuidado US$ 5 o Cuidado Plus US$ 9.
- Medios de pago: `[COMPLETAR]`

Sugerencia: la demo es gratis, pero el **sitio final con datos reales se publica después del anticipo**.

## Checklist antes de entregar un sitio

- [ ] No quedan `[COMPLETAR: ...]` visibles (el sistema avisa cuántos).
- [ ] Teléfono, WhatsApp, dirección y horarios confirmados por el cliente.
- [ ] Abrí la URL en el celular: se lee bien, sin scroll horizontal, los botones andan.
- [ ] El botón de WhatsApp abre el chat con el número correcto.
- [ ] No hay textos de ejemplo ni la franja "Demostración" (esa franja solo existe en la demo).
- [ ] Probé la página sin conexión rápida: carga en pocos segundos.
- [ ] El cliente aprobó por escrito (un "ok, publicala" por WhatsApp alcanza).

## Qué mejora más la conversión (para las próximas semanas)

1. **Fotos reales del negocio.** Es lo que más sube el nivel visual. Pedíselas por WhatsApp y agregalas en `cliente.json` (`fotos: [{ "src": "/fotos/local1.webp", "alt": "..." }]`), guardadas en `public/fotos/`, en WebP y de menos de 200 KB.
2. **Dominio propio** del cliente.
3. **Google Business Profile**: sumá la URL del sitio a su ficha de Google Maps.
4. **Portafolio propio:** cuando tengas 2 o 3 clientes, mostralos en los mensajes siguientes.
