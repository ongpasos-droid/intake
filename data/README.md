# `data/` — recursos canónicos del proyecto

Datos de referencia versionados en el repo. Usar siempre desde aquí (no desde Downloads/).

## Catálogo Erasmus+ (2026 oficial + 2027 especulativo)

Fuente: Programme Guide 2026 (12/11/2025) + EU Funding & Tenders Portal. Compilado por Oscar.

- **2026** = guía oficial publicada (sin deadlines en el Excel — viven en el `notes.json`).
- **2027** = especulativo, derivado del patrón histórico, **incluye deadlines** integrados como columna.

| Archivo | Qué es |
|---|---|
| `erasmus_plus_2026_calls.xlsx` | Excel original 2026 |
| `erasmus_plus_2026_calls.json` | 170 filas crudas (incluye notas) |
| `erasmus_plus_2026_calls.clean.json` | 129 SKUs limpios + tier + amount_eur |
| `erasmus_plus_2026_calls.by_topic.json` | 47 topics agrupados |
| `erasmus_plus_2026_calls.notes.json` | 41 líneas de definiciones/deadlines/fuentes |
| `erasmus_plus_2026_calls.csv` | CSV plano del original |
| `erasmus_plus_2027_calls_speculative.xlsx` | Excel 2027 especulativo |
| `erasmus_plus_2027_calls_speculative.json` | 171 filas crudas |
| `erasmus_plus_2027_calls_speculative.clean.json` | 129 SKUs **con deadline_iso por fila** |
| `erasmus_plus_2027_calls_speculative.by_topic.json` | 47 topics + deadline por topic |
| `erasmus_plus_2027_calls_speculative.by_month.json` | **Calendario por mes** (clave para campañas y funnel) |
| `erasmus_plus_2027_calls_speculative.notes.json` | 42 líneas de notas |
| `erasmus_plus_2027_calls_speculative.csv` | CSV plano |

### Estructura del registro limpio (`*.clean.json`)

```json
{
  "year": 2027,
  "family": "Capacity Building Sport",
  "family_slug": "capacity_building_sport",
  "action_subline": "CB Sport (Region 1+2)",
  "topic_id": "ERASMUS-SPORT-2027-CB",
  "manager": "EACEA",
  "amount_text": "100,000 €",
  "amount_eur": 100000,
  "amount_type": "Min budget-based",
  "duration": "12-36 months",
  "funding_rate": "80%",
  "tier": "S",
  "deadline_iso": "2027-03-05",
  "deadline_speculative": true,
  "deadline_raw": "5 March 2027 (speculative)",
  "notes": "Min of the 100k-200k range. ..."
}
```

Tier auto-derivado: **XS<60k · S<500k · M<1,5M · L≥1,5M** (4 tiers).

### Calendario consolidado 2027 (de `by_month.json`)

```
2027-01-22  Sport Events (SNCESE + LSSNCESE)                              2 topics
2027-02-10  CBHE (11 regiones)                                           11 topics
2027-02-11  EMJM Mobility + EMJM Design                                   2 topics
2027-02-26  CB Youth (×4 regiones) + KA3 EYT                              5 topics
2027-03-05  Sport (CB+SCP+SSCP) + KA220 (×5) + KA210 (×4) + ENGO (×2)    16 topics
2027-03-10  Alliances for Innovation (Lot 1, 2 Blueprint, 3 STEM)         3 topics
2027-03-26  CB VET (×6 regiones) + Teacher Academies                      7 topics
2027-04-09  EPSD (KA240-SCH)                                              1 topic
2027-09-03  CoVE                                                          1 topic
            ─────────────────────────────────────────────────────────────
            TOTAL                                                        47 topics
```

**Insight crítico:** **44 de 47 topics (94%) cierran entre 22-ene y 9-abr** (≈ 11 semanas). CoVE en septiembre es un mercado calendárico aparte.

### Foto del catálogo (a 2026-04-28)

- **129 filas reales de calls · 47 Topic IDs · 14 familias**
- Por `manager`: EACEA (centralizadas) vs National Agency (descentralizadas KA210/KA220/KA240)
- Por funding rate: 80% standard, 90% solo CBHE
- Por tipo de monto: budget-based (con min/max) vs pre-defined lump sums vs indicative

#### Catálogo por familia

| Manager | Familia | Topics | Variantes presupuestarias | Rango € |
|---|---|---:|---:|---|
| EACEA | Capacity Building HE (CBHE) | 11 | 67 | 200k – 2M |
| NA | Cooperation Partnerships (KA220) | 5 | 15 | 120k – 400k |
| NA | Small-Scale Partnerships (KA210) | 4 | 8 | 30k – 60k |
| EACEA | Capacity Building VET | 6 | 6 | 500k |
| EACEA | Cooperation Partnerships (European NGOs) | 2 | 6 | 120k – 400k |
| EACEA | Not-for-profit Sport Events | 2 | 5 | 200k – 1,5M |
| EACEA | Partnerships for Excellence | 5 | 5 | 55k – 6,4M |
| EACEA | Capacity Building Youth | 4 | 4 | 300k – 450k |
| EACEA | Alliances for Innovation | 3 | 4 | 1M – 4M |
| EACEA | Cooperation Partnerships (Sport) | 1 | 3 | 120k – 400k |
| EACEA | Capacity Building Sport | 1 | 2 | 100k – 200k |
| EACEA | Small-Scale Partnerships (Sport) | 1 | 2 | 30k – 60k |
| EACEA | KA3 European Youth Together | 1 | 1 | 500k |
| NA | EPSD (KA240-SCH, nuevo 2026) | 1 | 1 | 400k |

### Reglas para mantener el recurso

1. Si Oscar entrega una versión nueva del Excel (cualquier año), **regenerar** con:
   ```
   node scripts/process_calls_catalog.js 2026
   node scripts/process_calls_catalog.js 2027
   ```
   El script detecta automáticamente la columna deadline si existe.
2. **No editar a mano** los `.json` derivados — siempre regenerar desde el `.xlsx`.
3. Si el código necesita filtrar / mostrar calls, leer **`*.clean.json`** o **`*.by_topic.json`**, no el original.
4. Las definiciones y co-financing rules en `*.notes.json` son versionables — si Oscar cambia las reglas, anotar la fecha en este README.
5. La 2027 es **especulativa** — usarla para planificación, NO para mostrar deadlines como oficiales en la web pública sin disclaimer.

### Posibles usos en producto / negocio

- **Pricing engine**: cada fila `clean` es un SKU potencial. Cualquier modelo de pricing (% lineal, tiers fijos, descuentos por familia) se calcula desde aquí.
- **Catálogo de Academia**: 47 topics × N strands de curso. La unidad pedagógica es el `topic_id`, no la fila.
- **Sandbox / demo**: el sandbox actual usa `ERASMUS-SPORT-2026-SSCP` (Small-scale Sports KA210-YOU). Coincide con la fila de la Excel.
- **Roadmap por manager**: corto plazo = filas con `manager = "EACEA"` (formulario Form Part B único). Otoño 2026 = filas `National Agency`. KA1 no entra (no está en este Excel; espera a guía 2028).
- **Marketing por target**: las CBHE regionales (`-WB`, `-NE`, `-LA`, etc.) son micro-mercados geográficos para campañas segmentadas.
- **Validación / eligibility**: `funding_rate`, `duration` y `notes` van directos a `call_eligibility` del Admin.

### Otros recursos en este directorio

- `cities_curated.json` — 720 ciudades E+ para geocoding (usado por Atlas + Calculator).
- `country_centroids.json` — 250 ISO2 → lat/lng centroide (fallback de geocoding).
