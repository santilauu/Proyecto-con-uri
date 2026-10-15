# Generador de páginas web a medida

Armamos páginas únicas para negocios físicos. El contacto con el cliente es manual; no hay envíos automáticos ni API de WhatsApp. El cliente define lo que quiere (secciones, textos, colores, tipografías, fotos) y se lo pasás a Claude, que arma la página y la publica en Vercel.

## Para arrancar ya

`npm run doctor` revisa el entorno. Para crear una página, usá el menú de `npm start` (opción 5 para generar y revisar sin publicar, opción 6 para el flujo con publicación). La guía de venta, objeciones y checklist de entrega está en [ventas/GUIA-DE-VENTA.md](ventas/GUIA-DE-VENTA.md).

## Flujo automático (sin uso)

Lo que sigue (búsqueda automática, envío por WhatsApp y webhook) quedó sin uso con el flujo manual. No se borró, pero no hace falta configurarlo.

## Flujo automático (con la API de WhatsApp)

1. **Buscar** (menú 1): elegís zona y rubro. Playwright recorre Google Maps, y guarda solo los negocios sin web, con solo redes sociales, o con web desactualizada (sin HTTPS, no adaptada a celular, HTML antiguo, copyright viejo, caída).
2. **Enviar** (menú 3): manda la plantilla aprobada de Meta a los que tienen celular. Máximo 30 por día, con pausa de 20 a 45 s entre mensajes.
3. **Escuchar respuestas** (menú 4, o `npm run webhook`): máquina de estados por negocio.
   - "sí" -> genera una demo con 3 estilos sugeridos para su rubro y le manda los links.
   - Elige un número -> le hace 5 preguntas propias de su rubro.
   - Termina -> redacta los textos con Claude (solo con datos reales), compila y publica en Vercel, y le manda la URL.
   - "no" o "baja" -> se corta y no se le vuelve a escribir.
4. Los datos quedan en `data/leads.json`; los sitios generados, en `sites/`.

## Puesta en marcha

```bash
npm install
cp .env.example .env     # completar claves
npx vercel login         # o usar VERCEL_TOKEN
npm start
```

### WhatsApp Cloud API

- Creá una app en Meta for Developers con el producto WhatsApp y un número de empresa.
- Registrá el webhook `https://<tu-url-publica>/webhook` con tu `WA_VERIFY_TOKEN` y suscribite a `messages`. En local, exponé el puerto con `ngrok http 3000` o `cloudflared tunnel`.
- Meta solo deja iniciar una conversación en frío con una **plantilla aprobada**. Creá una de categoría *Marketing*, idioma `es_AR`, con una variable. Texto sugerido:

  > Hola, ¿cómo están en {{1}}? Les escribo porque vimos que todavía no tienen una página web propia. Armamos una demostración gratis, sin compromiso, con el nombre de su negocio. ¿Les interesa verla? Si no, respondan BAJA y no los molestamos más.

- Poné el nombre de esa plantilla en `WA_TEMPLATE_NAME`.
- Los mensajes siguientes (links, preguntas) son texto libre y solo salen dentro de las 24 h posteriores a la respuesta del cliente.

## Verificación de rubro y análisis de competencia

Antes de diseñar, el sistema:
1. **Confirma el rubro** del negocio con su nombre y la categoría de Google Maps. Si hay evidencia clara de otro rubro (ej. figura como gimnasio pero es una peluquería) lo corrige (en modo manual te pregunta).
2. **Descarta empresas grandes** (cines, colegios, shoppings, cadenas), según CLAUDE.md.
3. **Analiza hasta 8 sitios reales del mismo rubro y zona** y mide qué secciones y funciones tienen (servicios, precios, equipo, preguntas frecuentes, WhatsApp, mapa, video…). Solo se mide estructura: no se copia texto ni imágenes.
4. Si una sección es común en la competencia, **suma esa pregunta** al cliente y la sección aparece en el sitio (precios, equipo, preguntas frecuentes). Solo se muestra lo que el cliente da.
5. El análisis se guarda en `data/benchmark/<rubro>.json` y se reutiliza 90 días: no se repite por cada cliente.

## Precios

Categorías, costos reales, márgenes y comparación con el mercado en [ventas/PRECIOS.md](ventas/PRECIOS.md). `npm run precios` recalcula con el dólar del día (`npm run precios -- 1700`).

## Variaciones: cada página es única

Cada sitio recibe un **ADN de diseño** determinístico (`src/automation/variantes.js`): estilo (10), par tipográfico (15), color de acento calculado con contraste AA, portada (5 tipos), layout de servicios (4), decoración (5), animación y textos de sección. Las firmas se guardan en `data/biblioteca.json` para no repetir. `npm run verificar` comprueba que sobran combinaciones y que todo cumple AA.

El diseño que el cliente eligió en la demo es el mismo del sitio final.

## Reutilización (ahorro de tokens)

- Los sitios salen de `templates/base` + datos. No se programa un sitio por cliente.
- Titulares, bajadas y descripciones salen de patrones por rubro, sin IA. Con `ANTHROPIC_API_KEY`, Claude (haiku) solo redacta servicios que no estén en `data/cache-servicios.json`, y lo escrito queda para los próximos clientes.
- "Tomar de base un sitio anterior" (modo manual, opción 5) conserva estilo y tipografía y cambia la composición.
- Skills del proyecto: `.claude/skills/nuevo-sitio` y `.claude/skills/nueva-plantilla`.

## Instagram, Facebook, fotos y videos

Antes de crear el sitio, el sistema busca el Instagram y el Facebook del negocio (desde el link de Google Maps o buscando en DuckDuckGo) y mira si el perfil es público y cuántas publicaciones muestra. Es una **hipótesis**: se la confirma el cliente.
1. Le pregunta si el perfil es suyo y si autoriza usar fotos y videos.
2. Si dice que sí, las manda por WhatsApp (hasta 9 fotos y 2 videos) y escribe "listo". También puede decir "tomalas de Instagram" (mejor esfuerzo: Instagram suele pedir login).
3. Las fotos se convierten a WebP de 200 KB o menos y se suman a la portada y a una galería; los videos van lazy.
4. Si no autoriza, el sitio sale sin fotos. Nunca se usa material sin permiso.

En modo manual (menú 6) podés importar las fotos desde una carpeta.

## Probar sin gastar nada

`DRY_RUN=1 npm start` simula: imprime los mensajes de WhatsApp en la consola y no publica en Vercel.

## Estilos (plantillas)

Diez estilos base en `src/data/estilos.json`, cada uno con paleta, tipografías posibles, portadas, animaciones y decoraciones permitidas. Cada rubro sugiere 3 o más en `src/data/rubros.json` (19 rubros: gimnasios, estética, médicos, gastronomía, panaderías, inmobiliarias, estudios, veterinarias, talleres, psicología, florerías, ópticas, iglesias, sindicatos, hoteles, academias, oficios, ferreterías y otros).

Estilos de partida (el acento y las tipografías varían por cliente):

| Estilo | Modo | Carácter | Pares tipográficos posibles |
|---|---|---|---|
| Noir | oscuro | Oscuro, titulares enormes, acento cálido. Revelado con máscara. | Syne + Inter; Unbounded + Inter; Sora + Inter |
| Editorial | claro | Claro, papel crema, serif elegante. Entradas suaves. | Instrument Serif + Inter; Cormorant Garamond + Figtree; DM Serif Display + Plus Jakarta Sans |
| Brutal | claro | Alto contraste, bordes duros, sombras planas. Movimiento seco. | Archivo + Space Grotesk; Unbounded + Inter |
| Cálido | claro | Terracota y crema, formas orgánicas, esquinas amplias. | Fraunces + Manrope; Young Serif + Nunito; DM Serif Display + Plus Jakarta Sans |
| Fresco | claro | Verde y blanco, aire y claridad. Entradas limpias. | Bricolage Grotesque + DM Sans; Outfit + Public Sans; Sora + Inter |
| Elegante | oscuro | Verde profundo y champagne, serif clásica. Revelado lento. | Playfair Display + Manrope; Cormorant Garamond + Figtree; Libre Baskerville + Source Sans 3 |
| Industrial | oscuro | Grafito y naranja, tipografía condensada, líneas rectas. | Barlow Condensed + Barlow; Archivo + Space Grotesk; Outfit + Public Sans |
| Pastel | claro | Rosados y salvia suaves, formas redondeadas, trato cercano. | Young Serif + Nunito; DM Serif Display + Plus Jakarta Sans; Cormorant Garamond + Figtree |
| Tinta | oscuro | Azul noche y dorado, sobrio y confiable. | Lora + Work Sans; Playfair Display + Manrope; Libre Baskerville + Source Sans 3 |
| Sereno | claro | Salvia y azul profundo, calma y claridad. | Libre Baskerville + Source Sans 3; Fraunces + Manrope; Bricolage Grotesque + DM Sans |

Todas las combinaciones de texto cumplen contraste WCAG AA (verificado). Las animaciones son CSS y un script de 12 líneas; con `prefers-reduced-motion` o sin JavaScript el contenido se ve igual.

## Cómo editar

- **Textos de un sitio ya generado:** `sites/<proyecto>/src/content/cliente.json`, luego `npx vercel --prod` dentro de esa carpeta.
- **Colores:** variables por estilo al principio de `templates/base/src/styles/global.css`.
- **Preguntas por rubro, tono y estilos sugeridos:** `src/data/rubros.json`.
- **Nueva plantilla:** agregá un bloque en `estilos.json` (con paquetes de `@fontsource`) y un `[data-estilo="..."]` en `global.css`.

## Límites a tener presentes

- Google Maps cambia su HTML: si el scraper deja de encontrar fichas, hay que ajustar los selectores en `scraper.js`. Scrapear Maps va contra sus términos de uso; el ritmo es lento a propósito. La alternativa estable es la API oficial de Places.
- Los fijos casi nunca tienen WhatsApp: en el envío por API aparecen desmarcados; en modo manual podés probarlos igual.
- Fotos: se pueden sumar con `fotos` en `cliente.json` (ver la guía de venta).
- Contactar en frío tiene riesgo de reportes de spam y baja de calidad del número. Incluí siempre la opción de baja (ya está en la plantilla sugerida).
- Todo texto sin dato real queda como `[COMPLETAR: ...]` visible en el sitio. Revisá cada sitio antes de dar la URL por definitiva.
- El prototipo anterior quedó intacto en `legacy/`.
