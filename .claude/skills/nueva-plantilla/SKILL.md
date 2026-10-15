---
name: nueva-plantilla
description: Agregar un estilo, un rubro, un par tipográfico o una variante de layout al catálogo del automatizador. Usar cuando se pida "más plantillas", "un rubro nuevo", "otro estilo" o más variaciones de diseño.
---

# Ampliar el catálogo

Todo el catálogo es datos en `src/data/`. Se amplía editando JSON y, solo para layouts nuevos, un bloque en `Sitio.astro`.

## Rubro nuevo (`src/data/rubros.json`)
Copiá un rubro parecido y cambiá: `nombre`, `singular`, `busqueda` (texto para Google Maps), `tono` (ver CLAUDE.md), `estilosSugeridos` (mínimo 3, ids de `estilos.json`), `etiquetaServicios`, `ejemploServicios` (3), `titulares`, `bajadas`, `descGenericas`, `ctas` y `preguntas`.
- Placeholders: `{nombre} {zona} {barrio} {singular} {Singular} {s1} {s2} {lista}`; en descripciones `{S}` (inicio de frase) y `{s}` (en minúscula).
- Textos sin afirmaciones: no prometas calidad, precios, años ni cifras.
- Debe existir una pregunta con `campo: "servicios"`.

## Estilo nuevo (`src/data/estilos.json`)
Definí `tokens` (bg, fg, muted, accent, accentInk, surface, line), `modo`, `radio`, `sombra`, `hCase/hTrack/hWeight`, `pares`, `animaciones`, `tinte` (true deja que el motor tiña fondos con el acento) y `acentoFijo` (true si el color no debe variar). Evitá violetas y degradados azul-violeta.

## Par tipográfico (`src/data/fuentes.json`)
Máximo 2 familias, solo los pesos usados. Confirmá que exista `@fontsource/<paquete>` con `npm view @fontsource/<paquete> version`.

## Layout nuevo
Portadas, listas de servicios y decoraciones viven en `templates/base/src/components/Sitio.astro` (`adn.hero`, `adn.servicios`, `adn.decor`) y `styles/global.css`. Agregá el valor a `heroes`/`servicios`/`decor` en `estilos.json` y su bloque en el componente.

## Verificar siempre
`npm run verificar` comprueba contraste AA, referencias y variedad. Después generá un sitio de prueba (menú 5) y miralo en 360 y 1440 px.
