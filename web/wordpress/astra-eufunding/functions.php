<?php
/**
 * EU Funding School — Astra Child
 *
 * Notas de diseño:
 * - El tema hereda de Astra. Solo añade/sobrescribe lo que marca diferencia.
 * - Plantillas custom: home.php (blog index), single.php, archive.php.
 * - CSS custom vive en style.css, cargado después del padre.
 * - Template partials reutilizables en /template-parts/ (cta-newsletter, cta-sandbox).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'EFS_CHILD_VERSION', '0.3.0' );

/* -------------------------------------------------------------------------
 * Enqueue parent + child styles + Poppins
 * Poppins es la fuente compartida del ecosistema (WP + tool E+), alineada
 * con las Presentation Templates de EU Funding School.
 * Tokens completos en web/brand/tokens.css del monorepo.
 * ------------------------------------------------------------------------- */
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style(
		'efs-poppins',
		'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
		array(),
		null
	);

	$parent_handle = 'astra-theme-css';
	wp_enqueue_style(
		'astra-eufunding',
		get_stylesheet_directory_uri() . '/style.css',
		array( $parent_handle, 'efs-poppins' ),
		EFS_CHILD_VERSION
	);
}, 20 );

/* -------------------------------------------------------------------------
 * Landing page template support — a page assigned to the
 * "Landing (sin menú)" template gets body class efs-landing-page
 * ------------------------------------------------------------------------- */
add_filter( 'theme_page_templates', function ( $templates ) {
	$templates['page-landing.php'] = 'Landing (sin menú)';
	return $templates;
} );

add_filter( 'template_include', function ( $template ) {
	if ( is_page() ) {
		$page_template = get_post_meta( get_the_ID(), '_wp_page_template', true );
		if ( 'page-landing.php' === $page_template ) {
			$candidate = locate_template( 'page-landing.php' );
			if ( $candidate ) return $candidate;
		}
	}
	return $template;
} );

add_filter( 'body_class', function ( $classes ) {
	if ( is_page() ) {
		$tpl = get_post_meta( get_the_ID(), '_wp_page_template', true );
		if ( 'page-landing.php' === $tpl ) $classes[] = 'efs-landing-page';
	}
	return $classes;
} );

/* -------------------------------------------------------------------------
 * Helper: render CTA partial
 * ------------------------------------------------------------------------- */
function efs_cta( $slug ) {
	get_template_part( 'template-parts/cta', $slug );
}

/* -------------------------------------------------------------------------
 * Shortcodes para usar los CTAs dentro de páginas/posts editados en wp-admin.
 *   [efs_newsletter]   → form del boletín (POST a /v1/subscribers)
 *   [efs_sandbox]      → caja CTA hacia el sandbox del tool
 * ------------------------------------------------------------------------- */
add_shortcode( 'efs_newsletter', function ( $atts ) {
	$atts = shortcode_atts( array( 'variant' => '' ), $atts, 'efs_newsletter' );
	// Pass variant to the partial via a global the partial can read.
	$GLOBALS['efs_newsletter_variant'] = $atts['variant']; // 'bare' = no outer card
	ob_start();
	get_template_part( 'template-parts/cta', 'newsletter' );
	unset( $GLOBALS['efs_newsletter_variant'] );
	return ob_get_clean();
} );

add_shortcode( 'efs_sandbox', function () {
	ob_start();
	get_template_part( 'template-parts/cta', 'sandbox' );
	return ob_get_clean();
} );

/* -------------------------------------------------------------------------
 * Tweaks to Astra defaults that the blog needs
 * ------------------------------------------------------------------------- */

// Show 9 posts per page on blog index (instead of default 10 but more grid-friendly)
add_action( 'pre_get_posts', function ( $q ) {
	if ( ! is_admin() && $q->is_main_query() && ( $q->is_home() || $q->is_archive() ) ) {
		$q->set( 'posts_per_page', 9 );
	}
} );

// Excerpt length and more string tuned for blog cards
add_filter( 'excerpt_length', function () { return 28; }, 999 );
add_filter( 'excerpt_more',   function () { return '…'; }, 999 );

// Disable wp_page_menu() fallback globally — we always want the assigned nav_menu,
// never an auto-generated list of every published page.
add_filter( 'wp_page_menu', '__return_empty_string', 999 );

/* -------------------------------------------------------------------------
 * TOP BAR común (web + tool).
 *
 * Render: franja delgada en la cabecera con logo + 3 items de menú +
 * CTA "Iniciar sesión" / "Mi cuenta · Nombre". Los items del centro los
 * controlas en wp-admin → Apariencia → Menús, asignándolos al location
 * "EFS Top Bar".
 *
 * El visual debe coincidir 1:1 con el del tool (public/index.html).
 * Si tocas algo en el HTML aquí, replícalo allá.
 * ------------------------------------------------------------------------- */

// Registrar location del menú principal del top bar.
add_action( 'after_setup_theme', function () {
	register_nav_menus( array(
		'efs_primary' => __( 'EFS Top Bar (header común)', 'astra-eufunding' ),
	) );
} );

// Inyectar el top bar al abrir <body>. Se queda fixed arriba en TODAS las
// páginas excepto las que usen la plantilla "Landing (sin menú)".
add_action( 'wp_body_open', function () {
	if ( is_page_template( 'page-landing.php' ) ) return;
	?>
	<header class="efs-topbar" role="banner">
		<div class="efs-topbar__inner">
			<a class="efs-topbar__brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="EU Funding School — Inicio">
				<span class="efs-topbar__logo" aria-hidden="true"></span>
				<span class="efs-topbar__name">EU Funding School</span>
			</a>
			<nav class="efs-topbar__nav" aria-label="Primary">
				<?php
				wp_nav_menu( array(
					'theme_location' => 'efs_primary',
					'container'      => false,
					'menu_class'     => 'efs-topbar__menu',
					'fallback_cb'    => '__return_empty_string',
					'depth'          => 1,
				) );
				?>
			</nav>
			<div class="efs-topbar__cta">
				<a class="efs-topbar__login efs-app-login" href="https://intake.eufundingschool.com/">
					Iniciar sesión
				</a>
			</div>
		</div>
	</header>
	<?php
} );

/* -------------------------------------------------------------------------
 * Cross-ecosystem session detection.
 *
 * Si el visitante ya tiene sesión iniciada en el tool (app.eufundingschool.com)
 * cualquier enlace del menú con la clase CSS `efs-app-login` se reescribe a
 * "Mi cuenta · Nombre" y apunta a la home del tool. Si no hay sesión, se queda
 * tal cual ("Iniciar sesión", "Empezar", lo que Oscar haya puesto en wp-admin).
 *
 * Cómo activarlo en wp-admin:
 *   Apariencia → Menús → editar el item "Iniciar sesión" → Clases CSS → añadir `efs-app-login`.
 *
 * Funciona en producción cuando WP y el tool comparten registrable domain
 * (eufundingschool.com / app.eufundingschool.com). En dev cross-domain
 * (eufundingschool.test ↔ localhost:3000) el navegador no envía la cookie
 * por SameSite=Lax — comportamiento esperado, no es bug.
 * ------------------------------------------------------------------------- */
add_action( 'wp_footer', function () {
	?>
	<script>
	(function () {
		var h = location.hostname;
		var isDev  = (h === 'eufundingschool.test' || h === 'localhost' || h === '127.0.0.1');
		var origin = isDev ? 'http://localhost:3000' : 'https://intake.eufundingschool.com';
		var targets = document.querySelectorAll('.efs-app-login, .efs-app-login a, .menu-item.efs-app-login a');
		if (!targets.length) return;

		fetch(origin + '/v1/auth/session-status', { credentials: 'include' })
			.then(function (r) { return r.json(); })
			.then(function (j) {
				if (!j || !j.ok || !j.data || !j.data.logged_in) return;
				var name = j.data.first_name || '';
				targets.forEach(function (el) {
					// If the item is a wrapper, find the inner <a>; otherwise use the el itself
					var a = el.tagName === 'A' ? el : el.querySelector('a');
					if (!a) return;
					a.textContent = name ? ('Mi cuenta · ' + name) : 'Mi cuenta';
					a.setAttribute('href', origin + '/');
				});
			})
			.catch(function () { /* sin sesión / red caída → dejar el botón tal cual */ });
	})();
	</script>
	<?php
} );
