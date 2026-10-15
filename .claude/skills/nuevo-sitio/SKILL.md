---
name: nuevo-sitio
description: Crear o ajustar la página web de un cliente nuevo reutilizando el sistema existente (plantilla base, estilos, ADN de diseño, textos por rubro). Usar cuando se pida "armar la página de X", "nuevo cliente", "otra página parecida a la de Y" o retocar un sitio ya generado.
---

# Nuevo sitio para un cliente

El código del sitio NO se reescribe por cliente. Todo sale de `templates/base` más datos. Gastá tokens solo en lo que sea realmente nuevo.

## Camino normal (cero código)
1. `npm start` -> menú 6 (modo manual) o menú 4 (webhook con la API).
2. El sistema ya hace: detectar Instagram/Facebook -> demo de 3 estilos -> permiso de fotos/videos -> preguntas del rubro -> sitio final -> deploy.
3. Revisá el resultado (`[COMPLETAR]`, celular) antes de dar la URL.

## Si el cliente pide algo distinto
| Necesidad | Dónde tocar (editar, no reescribir) |
|---|---|
| Cambiar un texto, dato o foto | `sites/<proyecto>/src/content/cliente.json` y `npx vercel --prod` en esa carpeta |
| Otro estilo o diseño del mismo cliente | borrar `adn` del lead en `data/leads.json` o cambiar `lead.estilo`; regenerar con el menú |
| "Parecido al de otro cliente" | menú 6 -> opción 5 (toma de base un sitio anterior: mismo estilo y tipografía, otra composición) |
| Rubro que no existe | agregar un bloque en `src/data/rubros.json` (copiar uno parecido). Ver skill `nueva-plantilla` |
| Sección nueva para todos | editar `templates/base/src/components/Sitio.astro` una sola vez; vale para todos los clientes futuros |

## Reglas que ya están resueltas (no las repitas)
- Textos: salen de patrones por rubro con semilla del lead, sin IA. Claude (haiku) solo redacta servicios nuevos y los guarda en `data/cache-servicios.json`.
- Unicidad: cada sitio recibe un ADN con firma única registrada en `data/biblioteca.json`.
- Contraste AA: el motor lo garantiza; `npm run verificar` lo comprueba.
- Fotos: se optimizan a WebP <= 200 KB; videos hasta 25 MB. Solo con permiso del cliente.
- Nunca inventes datos: lo que falta queda como `[COMPLETAR: ...]` y se avisa.

## Antes de entregar
`npm run verificar`, abrir la URL en el celular, confirmar datos con el cliente. Para el resto, ver `ventas/GUIA-DE-VENTA.md`.
