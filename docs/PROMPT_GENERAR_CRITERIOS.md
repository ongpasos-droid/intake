# Prompt — Regenerar brief completo de criterios (Parte A + Parte B)

> **Uso:** pegar este prompt en una IA (Claude/GPT) junto con el `.docx` que contiene la Parte B agregada (1 criterio narrativo por pregunta). La IA regenera el documento completo con Parte A + Parte B desglosada en 4 criterios por pregunta, siguiendo el formato narrative brief.

---

## ROL

Eres una consultora senior especializada en propuestas Erasmus+ con 10+ años de experiencia evaluando y redactando solicitudes EACEA. Tu tarea no es redactar una propuesta concreta — es producir un **brief de criterios de evaluación** que sirva como manual de instrucciones para (a) una IA redactora que escriba propuestas de esta call, y (b) una IA evaluadora que puntúe propuestas contra estos criterios.

## CONTEXTO

El brief se aplica a **Small-scale Partnerships in Youth KA210-YOU — SPORTS (30.000€ o 60.000€)**. Esta es una call con características muy específicas:

- **Budget fijo** (Lump Sum): 30k€ o 60k€
- **Duración**: 6 a 24 meses
- **Consorcio pequeño**: mínimo 2 organizaciones, habitualmente 2-4
- **Target**: newcomers, organizaciones pequeñas, grassroots
- **Espíritu**: accesibilidad, focalización, ambición proporcional
- **Nada de**: lenguaje de KA220 (gran escala), impacto sistémico europeo, múltiples WPs complejos, comités de gobernanza elaborados

Todo el brief debe respetar esta "small-scale logic" de forma transversal.

## INPUT QUE RECIBES

Un documento `.docx` que, por cada pregunta del formulario, incluye:
- Título de la pregunta
- Texto oficial de la pregunta (del Programme Guide / formulario)
- Un único bloque agregado con INTENCIÓN / ELEMENTOS / EJEMPLOS (débil + fuerte) / EVITAR — pensado como si toda la pregunta fuera un solo criterio

**Este formato agregado es el punto de partida, no la salida.** Contiene el conocimiento pero mal estructurado para el pipeline.

## OUTPUT QUE TIENES QUE PRODUCIR

Para **cada pregunta** del input, un bloque Markdown con esta estructura exacta:

```markdown
## [Código] [Título oficial de la pregunta]

### PARTE A — Bloque genérico de la pregunta

**1. IDENTIFICACIÓN**
[Código] [Título oficial tal como aparece en el formulario]

**2. CONTEXTO DE LA PREGUNTA**
[Un párrafo de 4 a 6 frases explicando qué pide esta pregunta en esencia y qué busca el evaluador. Marco mental antes de entrar en criterios.]

**3. CONEXIONES**
**APOYA EN**: [narrativa de qué preguntas previas sustentan ésta. Si es la primera, decir "Es la pregunta inicial — no hay secciones previas que la sustenten".]
**ALIMENTA A**: [narrativa de qué preguntas posteriores se construyen sobre ésta]

**4. REGLA GLOBAL** (opcional — incluir solo si aplica)
[Principio transversal aplicable a todos los criterios de esta pregunta. Por ejemplo la small-scale logic.]

**5. LÍMITE DE EXTENSIÓN**
[Palabras o páginas máximas según formulario EACEA]

### PARTE B — Criterios (exactamente 4)

#### CRITERIO 1
**Título:** [5-7 palabras]
**Prioridad:** alta | media | baja
**Obligatorio:** sí | no

**INTENCIÓN**
[2-3 frases: qué debe demostrar este párrafo en la respuesta]

**ELEMENTOS**
[Qué debe aparecer concretamente. Prosa o lista breve.]

**EJEMPLOS**
**▸ DÉBIL:** [1-2 frases reales que un mal escritor pondría]
**▸ FUERTE:** [1-2 frases reales que un buen escritor pondría — con datos, fuentes, concreción]

**EVITAR**
[3-4 errores específicos que penalizan este criterio]

#### CRITERIO 2
[misma estructura]

#### CRITERIO 3
[misma estructura]

(total 4 criterios — ni más ni menos)
```

## CÓMO DESGLOSAR DE 1 CRITERIO AGREGADO A 4 CRITERIOS

El input te da un bloque agregado (INTENCIÓN + ELEMENTOS + EJEMPLOS + EVITAR unificados). Tu trabajo es **desglosarlo en exactamente 4 criterios distintos**, donde cada criterio = una idea grande que el evaluador puntúa por separado.

Método:
1. Lee el bloque agregado completo
2. Identifica los "hilos" conceptuales distintos
3. Selecciona los 4 más importantes y fusiona los solapados (ej. en 1.1: "encaje con call" y "EU added value" se pueden fusionar en un solo criterio "Alignment with call + EU added value")
4. Por cada uno de los 4 hilos seleccionados, extrae y enriquece los 5 campos
5. Si te salen naturalmente 5 ó 6 hilos distintos → fusiona hasta quedar en 4. Si te salen 3 → busca qué aspecto relevante del bloque agregado no estás cubriendo y añade el cuarto.

**Regla:** cada criterio debe tener un título que lo distinga claramente de los otros 3, y los EVITAR de criterios distintos no deben ser intercambiables.

## REGLAS DE ORO

1. **Prosa natural, no checklist pelado.** Escribe como si le explicaras por chat a un junior.
2. **Los ejemplos débil/fuerte son OBLIGATORIOS y son el oro del brief.** Sin ellos el documento pierde 80% de su valor. Deben ser frases reales, específicas, en el idioma del formulario final (inglés para EACEA).
3. **Ejemplo débil = un cliché realista** que has visto en propuestas rechazadas: "Sport plays a fundamental role in European society…"
4. **Ejemplo fuerte = frase concreta con datos, fuentes y conexión al proyecto**: "In small grassroots sport clubs across northern Spain, over 70% of coaches are volunteers without formal pedagogical training…"
5. **No copies del Programme Guide.** Reformula con tus palabras y aterrízalo al contexto Small-scale Sports.
6. **Específico > genérico.** "Evitar frases genéricas sobre el deporte" es vago. Mejor: "Evitar empezar con 'Sport plays a fundamental role...'".
7. **No inventes word_limit/page_limit si no los conoces con certeza.** Si no estás segura del límite EACEA, escribe `[verificar en eForm]`.
8. **Regla Small-scale como global_rule** en toda pregunta donde aplique (la mayoría): scope focalizado, ambición proporcional a 30-60k€ y 6-24 meses, sin lenguaje de gran escala.

## PRIORIDADES Y OBLIGATORIEDAD

No marques todos los criterios como "alta" y "sí". Eso defeats the purpose.
- **Prioridad alta** (1-2 por pregunta): los pilares que hacen que la pregunta tenga sentido. Si caen éstos, el evaluador baja mucho la nota.
- **Prioridad media** (2-3): importantes pero compensables.
- **Prioridad baja** (0-1): añaden calidad pero el evaluador no penaliza mucho su ausencia.
- **Obligatorio sí** (2-3): requisitos del Programme Guide o del formulario.
- **Obligatorio no** (resto): recomendados.

## EJEMPLO COMPLETO — CÓMO DEBE QUEDAR UNA PREGUNTA

Aquí tienes el estándar de calidad esperado. Produce este nivel de detalle y concreción para cada pregunta.

---

## 1.1 Background and general objectives

### PARTE A — Bloque genérico de la pregunta

**1. IDENTIFICACIÓN**
1.1 Background and general objectives

**2. CONTEXTO DE LA PREGUNTA**
Esta pregunta pide dos cosas a la vez: (a) explicar el problema o necesidad que el proyecto aborda en el ámbito del deporte grassroots, y (b) demostrar que el proyecto encaja con el propósito de Erasmus+ Sport y con las prioridades seleccionadas de la call. Es una de las preguntas más determinantes del puntaje: incluso una buena idea recibe puntuación baja si la relevancia respecto a la call no queda clara. El evaluador chequea cinco cosas: ¿es un problema real?, ¿a quién afecta concretamente?, ¿por qué importa ahora?, ¿qué cambio creará el proyecto? y ¿encaja con esta call Small-scale en particular y no con otra?

**3. CONEXIONES**
**APOYA EN**: Es la pregunta inicial — no hay secciones previas que la sustenten.
**ALIMENTA A**: 1.2 (Needs analysis) profundizará el problema con análisis estructurado por target group y objetivos SMART medibles. 1.3 (Complementarity + EU added value) ampliará el encaje europeo. 2.1.1 (Methodology) debe responder directamente a los objetivos generales aquí definidos. 3.1 (Impact) debe medir el cambio prometido en estos objetivos.

**4. REGLA GLOBAL**
Small-scale logic: scope focalizado, objetivos limitados, ambición proporcional a un budget de 30.000-60.000€ y 6-24 meses. Evitar lenguaje y ambición propios de KA220 (gran escala). El evaluador espera un proyecto accesible para newcomers y organizaciones pequeñas.

**5. LÍMITE DE EXTENSIÓN**
Aproximadamente 3.000 caracteres en el eForm (verificar en formulario actual).

### PARTE B — Criterios (4)

#### CRITERIO 1
**Título:** Background grounded in a real problem
**Prioridad:** alta
**Obligatorio:** sí

**INTENCIÓN**
El párrafo debe abrir describiendo la situación concreta que llevó a la idea del proyecto. El foco está en el PROBLEMA, no en lo que vais a hacer. El evaluador tiene que entender en 30 segundos cuál es el problema en el deporte grassroots y por qué merece atención ahora.

**ELEMENTOS**
- Sector y entorno geográfico donde operan las organizaciones (local, regional, grassroots específico — no "Europa en general").
- Un problema principal claramente formulado (no varios problemas mezclados).
- Quién está directamente afectado: target groups concretos (ej. "adolescentes 12-16 de clubes de barrio con menos de 50 socios"), no "la sociedad" o "los jóvenes europeos".
- Por qué importa: consecuencias si no se actúa.

**EJEMPLOS**
**▸ DÉBIL:** "Sport plays a fundamental role in European society, and there is a need to strengthen its impact on young people across different communities."

**▸ FUERTE:** "In small grassroots sport clubs across northern Spain and southern Italy, over 70% of coaches are volunteers without formal pedagogical training. This contributes to early dropout among adolescents aged 12-16 — particularly girls — who leave competitive sport after negative experiences in their first years of participation."

**EVITAR**
- Empezar con "This project aims to..." (mezcla solución con problema)
- Frases genéricas sobre la importancia del deporte o de Erasmus+
- Largas explicaciones sobre la call en sí (el evaluador ya la conoce)
- Mezclar varios problemas no relacionados

#### CRITERIO 2
**Título:** Justificación con evidencia
**Prioridad:** alta
**Obligatorio:** sí

**INTENCIÓN**
Tras presentar el problema, demostrar que existe un GAP real — algo está faltando o no funciona — y respaldarlo con evidencia, no con opinión. La diferencia entre un buen background y uno mediocre es la presencia de evidencia concreta y reciente.

**ELEMENTOS**
- Una estadística europea reciente (últimos 3 años) o referencia a informe oficial (Comisión, Eurostat, Eurofound, agencia nacional de deporte).
- Una mención a documento de política EU relevante (EU Work Plan for Sport, Council conclusions, etc.).
- Experiencia propia de las organizaciones del consorcio (datos reales de sus actividades, aunque sean de pequeña escala).
- Identificación clara del gap: qué iniciativas ya existen y por qué son insuficientes para este target concreto.

**EJEMPLOS**
**▸ DÉBIL:** "Many studies confirm that participation in sport among young people is decreasing, and current initiatives are not enough to tackle this problem."

**▸ FUERTE:** "According to the 2022 Eurobarometer on Sport and Physical Activity, 45% of Europeans never exercise. The EU Work Plan for Sport (2021-2024) highlights grassroots inclusion as a priority. Our three partners, working with 450 adolescents across 6 clubs in Italy, Spain and Poland, have observed that existing national training programmes for volunteer coaches are theoretical and not transferable to small-club contexts."

**EVITAR**
- Datos sin fuente o de hace más de 5 años
- "Hay muchos estudios que..." sin citar ninguno
- Confundir opinión con evidencia
- Listar referencias sin conectarlas al proyecto

#### CRITERIO 3
**Título:** Objetivos generales orientados a cambio
**Prioridad:** alta
**Obligatorio:** sí

**INTENCIÓN**
Presentar entre 2 y 4 objetivos generales que describan un CAMBIO o MEJORA, no una actividad. Cada objetivo debe derivar visiblemente del problema definido en Criterio 1 y debe ser realista para un proyecto Small-scale (30-60k€, 6-24 meses).

**ELEMENTOS**
- 2-4 objetivos (más es contraproducente en Small-scale).
- Cada uno como statement orientado a resultado: "Improve X among Y" / "Strengthen capacity of Z".
- Conexión explícita con el problema del Criterio 1.
- Lenguaje de outcome (improve, strengthen, enhance, build capacity), no de actividad (organise, deliver, create).

**EJEMPLOS**
**▸ DÉBIL:** "To organise 4 workshops on inclusive coaching for sport clubs and produce a handbook."

**▸ FUERTE:** "To strengthen the capacity of 4 small grassroots clubs to design and sustain inclusive sport programmes for adolescents at risk of dropout, with particular focus on girls aged 12-16."

**EVITAR**
- Actividades disfrazadas de objetivos ("to organise…", "to deliver…")
- Objetivos vagos ("improve sport in Europe")
- Más de 4 objetivos
- Objetivos no derivados del problema identificado

#### CRITERIO 4
**Título:** Encaje con la call y EU added value
**Prioridad:** alta
**Obligatorio:** sí

**INTENCIÓN**
Demostrar explícitamente que el proyecto pertenece a ESTA call Small-scale Sports — no a KA220 ni a otra — y que la cooperación transnacional produce algo que ningún partner podría conseguir solo. Es la parte más débil de la mayoría de propuestas: tienen buena idea pero no la anclan ni a la call ni al valor europeo concreto.

**ELEMENTOS**
- Identificar 2-3 objetivos/prioridades centrales de Erasmus+ Sport / Small-scale y conectar cada uno al proyecto en la práctica.
- Reflejar el propósito específico Small-scale: acceso a newcomers y organizaciones pequeñas.
- Demostrar qué aporta la diversidad de contextos de los partners (no "vienen de varios países" — qué aporta cada uno).
- Transferibilidad de los resultados a otros contextos similares en la UE.

**EJEMPLOS**
**▸ DÉBIL:** "Our project is aligned with all Erasmus+ objectives and has European added value because partners come from different countries and promote inclusion across Europe."

**▸ FUERTE:** "The Small-scale call prioritises capacity building for newcomer organisations and grassroots actors — our project responds by training 8 volunteer coaches across 4 small clubs (<50 members). Italy contributes its scuola sportiva tradition, Poland its municipal-club network, Spain its volunteer-based model. Without this diversity, none of the partners could develop a retention protocol adaptable to contexts beyond their own — which is precisely what makes the methodology transferable to other small clubs across EU."

**EVITAR**
- Copy-paste del Programme Guide
- "Estamos alineados con todas las prioridades" (vacío, sin concreción)
- Hablar de "impacto sistémico europeo" (eso es KA220, no Small-scale)
- Justificar el valor europeo sólo con "los partners son de varios países"
- Outcomes limitados al nivel local sin transferibilidad

---

## INSTRUCCIONES FINALES

Cuando recibas el `.docx` input:

1. **Lee el documento completo** antes de empezar, para ver la coherencia global entre preguntas.
2. **Produce una sección por pregunta** siguiendo exactamente la estructura del ejemplo 1.1.
3. **Para Parte A**: piensa de arriba hacia abajo — CONTEXTO enmarca, CONEXIONES ubican en el flujo, REGLA GLOBAL transversal, LÍMITE operacional.
4. **Para Parte B**: desglosa el bloque agregado del input en 4 criterios distintos. Reutiliza el contenido del input como material bruto, no lo copies tal cual.
5. **Prioridades diversas**: asegúrate de que no todos los criterios sean "alta".
6. **Ejemplos débil/fuerte en inglés** (idioma del formulario final), específicos al contexto Small-scale Sports, con datos y nombres ficticios pero creíbles.
7. **Checkpoint antes de entregar cada pregunta**: ¿los ejemplos son frases que se podrían copiar y pegar en una propuesta real? ¿el evitar de un criterio es distinto al de los otros? ¿la small-scale logic se respeta?

El resultado debe ser un documento que una IA redactora pueda leer y producir texto de calidad de evaluador-7/10 en adelante, sin intervención humana significativa.

**Empieza.**
