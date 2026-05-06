# EU Funding School — Astra Child

Child theme de [Astra](https://wordpress.org/themes/astra/) para `eufundingschool.com`. Controla el diseño del blog, plantillas de landing y componentes recurrentes (CTA newsletter, CTA sandbox).

> **Este theme forma parte del monorepo `eplus-tools`.** No es un repo independiente.
> Path dentro del monorepo: `web/wordpress/astra-eufunding/`.

## Filosofía

- **Contenido vive en la BD de producción**, no en git. Los posts y páginas se editan en `eufundingschool.com/wp-admin`.
- **Diseño vive en el monorepo** (`eplus-tools`), desplegado vía Coolify a `wp-content/themes/astra-eufunding/`.
- **Brand tokens compartidos** en `web/brand/tokens.css` — misma paleta/fuente que el tool E+.
- El tema padre (`astra`) sigue gestionándose desde wp-admin como plugin — no lo versionamos.

## Estructura

```
web/wordpress/astra-eufunding/
├── style.css                    # Theme header + tokens locales (sync'd con brand/) + custom CSS
├── functions.php                # Enqueue parent + Poppins + hooks, helpers
├── home.php                     # Blog index (/blog/)
├── single.php                   # Post individual
├── archive.php                  # Categoría / tag / fecha
├── page-landing.php             # Template "Landing (sin menú)" — para ads
└── template-parts/
    ├── cta-newsletter.php
    └── cta-sandbox.php
```

## Desarrollo local

WordPress local corre en Laragon en `eufundingschool.test`. El theme no se edita dentro de Laragon — se edita **aquí**, en el monorepo, y Laragon lo lee mediante un **junction** de Windows:

```
C:\laragon\www\eufundingschool\wp-content\themes\astra-eufunding\
  ↓  (junction transparente)
C:\Users\Usuario\eplus-tools\web\wordpress\astra-eufunding\
```

Comando para crearlo (UNA vez, no requiere admin):

```cmd
mklink /J "C:\laragon\www\eufundingschool\wp-content\themes\astra-eufunding" "C:\Users\Usuario\eplus-tools\web\wordpress\astra-eufunding"
```

Cualquier cambio en `.php` o `.css` se ve tras recargar `http://eufundingschool.test`. No requiere build.

## Deploy

Coolify corre **dos servicios** desde el mismo repo, con filtros de carpeta:

- `eplus-tools` → rebuild Node si cambia `node/`, `public/`, `migrations/`, `server.js`.
- `wp-theme-sync` → rsync rápido de `web/wordpress/astra-eufunding/` al contenedor WP si cambia `web/wordpress/`.

**Cambios de WP no reinician el tool**, y viceversa.

## Componentes reutilizables

Desde cualquier plantilla:

```php
efs_cta( 'newsletter' );  // Caja CTA azul oscuro — alta al boletín
efs_cta( 'sandbox' );     // Caja CTA clara — enlace al intake
```

## Design tokens

Fuente de verdad: `web/brand/tokens.css` (monorepo).

Paleta actual (alineada con la visión de Ana — Presentation Templates de EU Funding School):

```css
--efs-color-primary:      #1b1464   /* single brand blue — titles, text, nav, icons */
--efs-color-accent:       #fbff12   /* lime yellow — CTA bg, highlights */
--efs-color-accent-warm:  #c7afdf   /* lavender — soft accents, secondary cards */
--efs-color-surface:      #f8f8f8   /* neutral light gray background */
--efs-color-line:         #cccccc   /* separators, pills inactive */
--efs-font-body:          'Poppins', system-ui, sans-serif
```

Cualquier cambio de paleta/fuente que deba afectar a ambos ecosistemas (web + tool) se hace en `web/brand/tokens.css` y se refleja en `style.css` y en el tool.
