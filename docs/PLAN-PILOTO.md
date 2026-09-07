# Plan de la primera cohorte · Sport Events, 22 de octubre

Escrito el 8 de agosto de 2026. Reduce el `ROADMAP_2026_2027.md` a lo único que cabe en dos meses.
No lo sustituye: lo pone en orden de llegada.

> **Por qué el 22 y no el 8 de octubre, que es lo que decía el roadmap.** La grabación es el cuello
> de botella y cae justo encima del arranque del curso escolar del 7 de septiembre, que es la fecha
> irrecuperable de la plataforma de aula (ver su `docs/PLAN-PILOTO.md`). Dos semanas de margen
> resuelven el choque **sin tocar lo que importa**: doce semanas de cohorte desde el 22 de octubre
> llegan de sobra al cierre de la convocatoria, el 22 de enero. Desde el 5 de noviembre ya no.

---

## Por qué hay que reducir

El roadmap asignaba julio y agosto a producir el contenido grabado de las **doce** cohortes, y a
construir Stripe, el sistema de cohortes, el calendario público y el panel de gestión. En ese
periodo el proyecto ha recibido **1,3 horas de trabajo y cero commits desde el 27 de junio**.

Las doce cohortes de octubre a diciembre ya no existen. **Una sí.**

## Cuál, y por qué esa

**Sport Events.** Es la que el propio roadmap pone primera —8 de octubre— y es la más pequeña:
una sola familia, sin las once variantes regionales de CBHE ni los 29 SKU de KA2.

Su convocatoria cierra el **22 de enero de 2027**. Eso da la urgencia real que pide la venta: no
hay que inventar plazas limitadas ni cuentas atrás, porque hay una fecha de la Comisión Europea, y
esa fecha es de verdad.

⚠️ **Con una cautela que hay que decirle al alumno:** la fecha de 2027 es todavía **especulativa**
—así está marcada en `data/erasmus_plus_2027_calls_speculative.json`— y la guía oficial no sale
hasta el **15 de diciembre**. Se vende diciendo eso, no escondiéndolo, y se anuncia de antemano qué
pasa si la convocatoria cambia. Lo contrario es un problema, y de los caros.

---

## Lo que NO hace falta, y libera dos meses

**Stripe no hace falta.** El `BUSINESS_PLAN.md` pone el plan Básico en 2.000 €/año/call y el
Premium en 8.000 €, con un máximo de 20 y 10 plazas. A ese ticket **no se cobra con pasarela: se
factura y se cobra por transferencia**, que además es como paga una entidad que gestiona fondos
públicos. El alta es manual, y con veinte plazas eso son veinte altas.

Esto quita del camino crítico las cuatro quincenas de «software de venta» que la estimación del
panel daba por necesarias. **Es la diferencia entre llegar y no llegar a octubre.**

Tampoco hace falta ahora: el calendario público SEO, el panel de gestión de cohortes, la asignación
profesor→cohorte, el selector de tier, ni TASK-007 «Diagnose & Improve» —que por su propio plan son
10-12 semanas y no cabe—. Todo eso vale, y todo eso es para después de la primera cohorte.

---

## Las ocho semanas

Agosto va casi entero a la plataforma de aula, así que estas dos semanas EFS avanza **solo con lo
que no es programar ni grabar**: escribir. Cabe al lado, porque usa otro músculo.

### Semanas 1-2 (11-24 ago) · El temario y la oferta

- **El guion de las 15-25 mini-lecciones** de Sport Events: qué se cuenta en cada una, en qué orden
  y con qué ejercicio. Es lo que decide si el curso vale, y es trabajo tuyo, no de nadie más.
- **La oferta escrita**: qué se lleva el alumno, qué precio, cuántas plazas, qué pasa si la
  convocatoria de 2027 cambia. Con `MERCADO.md` de EFS al lado — o, si no existe todavía uno propio,
  con `eufundingschool_marketing`.
- **La columna vertebral**: el alumno termina el curso con **su propuesta empezada dentro del
  SaaS**. Eso es lo que separa esto de un curso grabado cualquiera y lo que sostiene la suscripción
  después.

> **Hecho cuando:** el guion está cerrado y el precio escrito.

### Semanas 3-5 (7-27 sep) · Grabar

El cuello de botella real de todo EFS, y el que ningún programador acelera. Ya sabes hacerlo: el
campus tiene tres cursos publicados y el de inglés llegó a 60 lecciones.

- Producción por lotes, no lección a lección.
- El curso montado en el campus según se graba, no al final.
- Revisión de calidad de Ana sobre lo que va saliendo.

> **Hecho cuando:** el curso existe en el campus, completo, y se puede recorrer de principio a fin.

### Semana 6 (28 sep - 4 oct) · La puerta de entrada

- **Página de venta** en la web, con la fecha de la convocatoria como argumento.
- **Formulario de inscripción** con WPForms, que ya está instalado. Sin pasarela: quien se apunta
  recibe factura y se le da de alta a mano en el campus.
- **El recorrido probado de punta a punta con una persona de confianza**: se apunta, recibe la
  factura, entra en el campus, ve la lección 1. Igual que en el piloto de TalkingMemory: nada de
  altas por detrás, porque el camino que falla es el que recorrerá el cliente.

### Semanas 7-8 (5-19 oct) · Vender

- **Boletín a la lista fría** que ya existe en GHL, segmentado por quien tenga relación con deporte.
- **Una masterclass gratuita** — es la pieza que mejor convierte en formación de ticket alto y es la
  que el roadmap ya preveía.
- **Llamadas a las entidades más probables.** Con veinte plazas, esto se cierra hablando, no con
  anuncios.

> **Hecho cuando:** hay inscritos con factura emitida.

### 22 de octubre · Arranca

La primera clase en directo. A partir de ahí, la cohorte manda: trece semanas hasta el 22 de enero,
con el alumno escribiendo su propuesta dentro del SaaS.

---

## Cuántos hacen que esto valga la pena

El roadmap pedía **≥10 inscritos en la primera cohorte**. A plan Básico son 20.000 €; con cinco,
10.000 €. El umbral de decisión conviene ponerlo antes de empezar a vender, no después:

- **Con 8 o más**: se arranca y se prepara ya la segunda cohorte.
- **Entre 4 y 7**: se arranca igual —el valor está en tener alumnos reales y sus preguntas—, pero
  la segunda cohorte espera a saber por qué no vinieron más.
- **Con 3 o menos**: no se arranca. Se devuelve, se habla con los tres uno por uno y se aprende qué
  falló, que a esa altura es información más valiosa que el dinero.

---

## Lo que solo puedes hacer tú

1. **El guion del temario.** Eres el experto; esto no se delega.
2. **La voz de las lecciones**, o decidir que la pone otra persona.
3. **Las llamadas de venta.** Con ticket alto y veinte plazas, se cierra hablando.
4. **Decidir qué se promete si la convocatoria de 2027 cambia el 15 de diciembre.**

## Riesgos

- **El de siempre en EFS: que la grabación no arranque.** Es lo único que no se puede comprimir al
  final. Si el 27 de septiembre no está grabado, la fecha del 22 de octubre no existe — y correrla
  más allá del 5 de noviembre ya no deja cohorte antes del cierre de enero.
- **Que la guía oficial del 15 de diciembre cambie la convocatoria** a mitad de cohorte. Se mitiga
  diciéndolo antes de cobrar y teniendo escrita la política de cambio o devolución.
- **La tentación de volver a las doce cohortes** en cuanto la primera funcione. La segunda se
  prepara con lo aprendido de la primera, no en paralelo.

## Lo que esta cohorte deja montado para las once siguientes

No es solo facturación: es el molde. Guion reutilizable, pipeline de grabación rodado, página de
venta, recorrido de inscripción probado y —lo que más falta hace— **alumnos reales cuyas preguntas
dicen qué contenido sobra y cuál falta**. La segunda cohorte cuesta la mitad que esta.
