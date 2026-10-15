# Precios y categorías

Cifras calculadas con `npm run precios` a partir de `src/data/precios.json`. Dólar de referencia: **$1.540** (blue, cierre del 11/10/2026). Para recalcular con otro dólar: `npm run precios -- 1700`.

Regla de precio: **cada categoría cuesta como máximo el 85 % del piso del mercado** y nunca menos de 1,5 veces su costo real.

## Lo que ve el cliente

| | **Presencia** | **Negocio** | **Destacado** |
|---|---|---|---|
| **Precio (pago único)** | **US$ 59** ≈ $91.000 | **US$ 99** ≈ $152.000 | **US$ 169** ≈ $260.000 |
| Para quién | Negocios que no tienen nada y necesitan aparecer en Google | Negocios con Instagram activo que quieren mostrar su trabajo | Negocios que quieren diferenciarse y vender más |
| Páginas y diseño | 1 página a medida del rubro, 3 estilos a elegir | Todo lo de Presencia | Todo lo de Negocio + diseño exclusivo con 2 propuestas distintas |
| WhatsApp, mapa, llamada | Sí | Sí | Sí |
| Adaptada a celular + SEO básico | Sí | Sí | Sí, con SEO local reforzado |
| Hosting y seguridad (SSL) | 12 meses | 12 meses | 12 meses |
| Fotos propias | Hasta 4 | Hasta 9 + 2 videos + galería | Hasta 9 + 2 videos + galería |
| Instagram y Facebook vinculados | — | Sí | Sí |
| Precios / equipo / preguntas frecuentes | — | 1 a elección | Las 3 |
| Dominio propio conectado | A costo | Sí (el dominio se paga aparte) | Sí (el dominio se paga aparte) |
| Cambios incluidos | 1 ronda | 2 rondas | 3 rondas |
| Soporte posterior | — | 30 días | 60 días |
| Código fuente | — | — | Entregado o alojado |
| Capacitación | — | — | 30 min |
| Entrega | 48 h | 72 h | a coordinar |

### Mantenimiento mensual (opcional)

| | **Cuidado** | **Cuidado Plus** |
|---|---|---|
| Precio | **US$ 5/mes** ≈ $8.000 | **US$ 9/mes** ≈ $14.000 |
| Hosting, seguridad y copias | Sí | Sí |
| Cambios por mes | 1 | 3 |
| Reporte mensual de visitas | — | Sí |
| Aviso si la web se cae | Sí | Sí, con respuesta prioritaria |

Pago anual de cualquier abono: **10 meses por el precio de 12**.

### Extras

Cambio adicional US$ 5 · Sección nueva a medida US$ 15 · Gestión de dominio US$ 5 (más el costo del dominio) · Entrega urgente en 24 h US$ 20.

No se ofrece tienda online con carrito: se deriva a una plataforma especializada.

## Cuánto cuesta realmente hacer cada web

Costos que entran en el cálculo (primer mes de un sitio):

| Concepto | Valor usado | De dónde sale |
|---|---|---|
| Tu tiempo | US$ 8 por hora | Supuesto tuyo: ajustalo en `precios.json`. Horas: 1,5 / 2,5 / 4 según categoría, más 15 min de soporte |
| Herramientas fijas | US$ 40/mes (Vercel Pro 20 + Claude Pro 20) | Repartidas entre 10 ventas por mes = US$ 4 por sitio |
| Mensajes de WhatsApp | US$ 1,22 por venta | 40 contactos por venta × US$ 0,0305 por plantilla de marketing |
| API de Claude | US$ 0,02 por sitio | Los textos salen de patrones; solo se redactan servicios nuevos |
| Comisión de cobro | 6 % del precio | Supuesto (Mercado Pago u otro medio) |

| Categoría | Precio | Costo | Margen | Tu pago por hora | Piso de mercado | Diferencia |
|---|---|---|---|---|---|---|
| Presencia | US$ 59 | US$ 23 | US$ 36 (61 %) | US$ 29 | US$ 97 | **−39 %** |
| Negocio | US$ 99 | US$ 33 | US$ 66 (66 %) | US$ 32 | US$ 150 | **−34 %** |
| Destacado | US$ 169 | US$ 49 | US$ 120 (71 %) | US$ 36 | US$ 400 | **−58 %** |
| Abono Cuidado | US$ 5/mes | US$ 3 | US$ 1,7 | — | US$ 12,98/mes | **−61 %** |
| Abono Cuidado Plus | US$ 9/mes | US$ 5 | US$ 3,5 | — | US$ 12,98/mes | **−31 %** |

**Punto de equilibrio de las herramientas fijas: medio sitio por mes.** Con una mezcla de 50 % Presencia, 35 % Negocio y 15 % Destacado:

| Sitios por mes | Horas de trabajo | Ingresos | Neto antes de tu sueldo |
|---|---|---|---|
| 4 | 10 | US$ 358 | US$ 301 (≈ $464.000) |
| 8 | 20 | US$ 716 | US$ 643 (≈ $990.000) |
| 15 | 37 | US$ 1.343 | US$ 1.241 (≈ $1.910.000) |
| 25 | 62 | US$ 2.238 | US$ 2.094 (≈ $3.225.000) |

Los abonos suman encima y se acumulan mes a mes: con 20 clientes en Cuidado, son ≈ US$ 94 de ingreso mensual recurrente por unas 5 horas de trabajo al mes.

## Cómo se garantiza "siempre más barato"

1. Las referencias de mercado están en `precios.json` (sección `mercado`). Cada categoría se compara contra su piso y `npm run precios` marca **NO CUMPLE** si superás el 85 %.
2. Antes de cotizar a un cliente concreto, **buscá 3 precios locales del mismo rubro** (agencias, freelancers, Wix o similares) y restá al menos 15 % al más bajo. Si el resultado queda por debajo de tu costo × 1,5, no vendas por ese precio: bajá el alcance, no el valor.
3. Primeros 5 clientes: **−20 %** a cambio de un testimonio y permiso para mostrar el sitio como portafolio. Con ese descuento Presencia (US$ 47) sigue sobre el piso de rentabilidad.

## Qué tan firmes son los datos (leer antes de confiar en las cifras)

- **Piso del mercado, la referencia más débil:** es un solo aviso de un freelancer (desde $150.000, octubre 2026) y no dice qué incluye ni si el hosting está incluido. Las agencias casi no publican precios.
- Los rangos en dólares son de [GoDaddy Argentina](https://www.godaddy.com/resources/latam/crearweb/cuanto-cuesta-crear-pagina-en-argentina) (13/11/2025): landing 150–250, institucional básico 150–400, corporativa 1.500–5.000, hosting desde 5,99/mes y Website Security desde 6,99/mes. Son de hace casi un año.
- El aviso del freelancer: [Servidos.ar](https://servidos.ar/clasificados/diseno-web-para-pymes-y-comercios-tu-sitio-en-5-dias-desde-1-19f890).
- Dólar: [Infocampo](https://www.infocampo.com.ar/?p=618768) (blue $1.540 al 11/10/2026). Cambia a diario: recalculá antes de pasar precios.
- **WhatsApp:** Meta cobra por mensaje de plantilla y el valor para Argentina de marketing (≈ US$ 0,0305) sale de un blog, **no está verificado** en la tarifa oficial de [Meta](https://developers.facebook.com/docs/whatsapp/pricing). Los mensajes de respuesta dentro de las 24 h son gratis. El impacto es mínimo, pero confirmalo en tu cuenta.
- **Vercel:** según fuentes de terceros, el plan gratuito (Hobby) no permite uso comercial y el plan Pro cuesta US$ 20 por usuario por mes. Verificá en [vercel.com/pricing](https://vercel.com/pricing).
- **Claude:** el plan Pro cuesta US$ 20/mes según guías de terceros. Con tu uso actual alcanza porque el sistema casi no consume tokens por sitio; si usás Claude Code muchas horas, evaluá un plan mayor (US$ 100–200) y sumalo a los costos fijos.
- No contemplé impuestos (monotributo, IIBB), ni inflación entre cotizaciones, ni el costo de captación fuera de WhatsApp.
- Las conversiones (1 venta cada 40 contactos) son un supuesto prudente, no un dato medido: reemplazalo con tus números reales después de la primera semana.

## Decisiones que te quedan a vos

- **Tu hora:** US$ 8 es un supuesto. Si querés ganar más por hora, subí el valor en `precios.json`; ojo con la regla del 85 %.
- **Moneda:** conviene cotizar en dólares y cobrar en pesos al blue del día, o actualizar la lista cada semana.
- **Hosting de clientes:** si preferís no pagar Vercel Pro, hay alternativas gratuitas para uso comercial, pero requeriría cambiar el deploy. Es una decisión de infraestructura que no tomé por vos.
