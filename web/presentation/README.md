# Presentaciones — EU Funding School

Decks visuales en HTML+CSS con la paleta de marca (`#1b1464`, `#fbff12`, `#c7afdf`, Poppins).
Cada HTML produce un PDF idéntico vía Chrome headless.

## Archivos

| Archivo | Qué es |
|---|---|
| `efs-pricing-deck.html` | Pricing & Operations Framework 2026-2027 (20 slides). Resume sesión 2026-04-28. |
| `efs-pricing-deck.pdf` | Exportación PDF (A4 landscape, 1 slide por página). |

## Cómo regenerar el PDF tras editar el HTML

PowerShell, una sola línea:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="C:\Users\Usuario\eplus-tools\web\presentation\efs-pricing-deck.pdf" --virtual-time-budget=10000 "file:///C:/Users/Usuario/eplus-tools/web/presentation/efs-pricing-deck.html"
```

Sale instantáneo (1-2 segundos). Sobreescribe el PDF anterior.

## Cómo abrirlo

- **HTML interactivo** (mejor visualización con scroll y hover): doble click en `efs-pricing-deck.html`
- **PDF estático** (para imprimir o compartir): doble click en `efs-pricing-deck.pdf`

## Convenciones de estilo

- Slides ratio 16:10 en pantalla, A4 landscape al imprimir.
- Paleta marca: `--blue:#1b1464` · `--yellow:#fbff12` · `--lavender:#c7afdf`.
- Tipografía: Poppins (Google Fonts).
- Slide negras (`.dark` / `.deeper`) para portada y momentos de énfasis.
- Slide lavanda (`.lavender`) para secciones intermedias.
- Cards amarillas (`.card-yellow`) para "el corazón" del producto/precio.
- Coherente con `web/brand/tokens.css` y `astra-eufunding/style.css`.
