<?php
/**
 * Reusable newsletter CTA box with real subscription form.
 * Posts to /v1/subscribers on the tool backend.
 *
 * Usage: efs_cta( 'newsletter' );
 *
 * Tool endpoint is resolved client-side by hostname:
 *   eufundingschool.test   → http://localhost:3000
 *   eufundingschool.com    → https://app.eufundingschool.com
 */
if ( ! defined( 'ABSPATH' ) ) exit;

$source = is_single() ? 'blog_post' : ( is_home() ? 'blog_home' : 'wp' );
$source = preg_replace( '/[^a-z0-9_-]/i', '', $source ) ?: 'wp';
$variant = isset( $GLOBALS['efs_newsletter_variant'] ) ? $GLOBALS['efs_newsletter_variant'] : '';
$bare    = ( $variant === 'bare' );
$tag     = $bare ? 'div' : 'aside';
$cls     = $bare ? 'efs-newsletter efs-newsletter--bare' : 'efs-cta efs-cta--newsletter efs-newsletter';
?>
<<?php echo $tag; ?> class="<?php echo esc_attr( $cls ); ?>" data-efs-newsletter data-source="<?php echo esc_attr( $source ); ?>">
	<?php if ( ! $bare ) : ?>
		<h3>Recibe cada mes las calls Erasmus+ por prioridad</h3>
		<p>Un correo el primer viernes de cada mes. Calls abiertas, un tip práctico y el artículo destacado. Sin relleno.</p>
	<?php endif; ?>

	<form class="efs-newsletter-form" novalidate>
		<label class="sr-only" for="efs-news-email-<?php echo esc_attr( $source ); ?>">Tu email</label>
		<input
			type="email"
			name="email"
			id="efs-news-email-<?php echo esc_attr( $source ); ?>"
			class="efs-newsletter-form__input"
			placeholder="tu@email.com"
			autocomplete="email"
			required>
		<button type="submit" class="efs-cta__btn efs-newsletter-form__btn">
			Apuntarme →
		</button>
	</form>
	<p class="efs-newsletter-form__msg" role="status" aria-live="polite"></p>
	<p class="efs-newsletter-form__legal">
		Al apuntarte aceptas la <a href="<?php echo esc_url( home_url( '/politica-de-privacidad/' ) ); ?>">política de privacidad</a>. Puedes darte de baja cuando quieras desde cualquier email.
	</p>
</<?php echo $tag; ?>>

<style>
	/* Bare variant: el shortcode se inserta dentro de una sección que ya
	   tiene su propio fondo/padding (ej. la home). No envolvemos en card. */
	.efs-newsletter--bare { padding: 0; margin: 0; background: transparent; }

	.efs-newsletter-form {
		display: flex; gap: .5rem; flex-wrap: wrap;
		margin-top: .5rem; align-items: stretch;
	}
	/* Input: contraste alto, fondo blanco siempre — funciona sobre cualquier fondo */
	.efs-newsletter .efs-newsletter-form__input {
		flex: 1 1 240px; min-width: 240px;
		padding: .85rem 1rem;
		border: 2px solid var(--efs-color-accent, #fbff12);
		background: #ffffff;
		color: #1b1464;
		border-radius: var(--efs-radius, .25rem);
		font: 500 1rem/1.3 var(--efs-font-body, inherit);
		box-sizing: border-box;
	}
	.efs-newsletter .efs-newsletter-form__input::placeholder {
		color: rgba(6, 0, 62, 0.45);
	}
	.efs-newsletter .efs-newsletter-form__input:focus {
		outline: none;
		box-shadow: 0 0 0 4px rgba(231, 235, 0, 0.45);
	}
	.efs-newsletter-form__btn { flex: 0 0 auto; padding: .85rem 1.4rem !important; }

	/* Mensaje feedback — bien visible */
	.efs-newsletter-form__msg {
		margin: .9rem 0 0;
		padding: .55rem .85rem;
		font-size: .95rem; font-weight: 600;
		border-radius: var(--efs-radius, .25rem);
		min-height: 1em;
	}
	.efs-newsletter-form__msg:empty { display: none; }
	.efs-newsletter-form__msg.is-ok {
		background: rgba(231, 235, 0, 0.18);
		color: #fbff12;
		border: 1px solid rgba(231, 235, 0, 0.45);
	}
	.efs-newsletter-form__msg.is-err {
		background: rgba(255, 180, 180, 0.15);
		color: #ffb4b4;
		border: 1px solid rgba(255, 180, 180, 0.45);
	}
	/* En cajas claras: invertir colores del feedback */
	.efs-cta--light .efs-newsletter-form__msg.is-ok {
		background: #e8f5e9; color: #2E7D32; border-color: #2E7D32;
	}
	.efs-cta--light .efs-newsletter-form__msg.is-err {
		background: #ffeaea; color: var(--efs-color-error, #ba1a1a); border-color: var(--efs-color-error, #ba1a1a);
	}

	.efs-newsletter-form__legal {
		margin: .85rem 0 0 0;
		font-size: .75rem; line-height: 1.5;
		color: rgba(255, 255, 255, 0.6);
	}
	.efs-cta--light .efs-newsletter-form__legal { color: var(--efs-color-muted); }
	.efs-newsletter-form__legal a { color: inherit; text-decoration: underline; }

	.sr-only {
		position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
		overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
	}
</style>

<script>
(function () {
	if (window.__efsNewsletterBound) return;
	window.__efsNewsletterBound = true;

	function toolOrigin() {
		var h = window.location.hostname;
		if (h === 'eufundingschool.test' || h === 'localhost' || h === '127.0.0.1') {
			return 'http://localhost:3000';
		}
		return 'https://intake.eufundingschool.com';
	}

	document.addEventListener('submit', function (e) {
		var form = e.target.closest('.efs-newsletter-form');
		if (!form) return;
		e.preventDefault();

		var wrap = form.closest('[data-efs-newsletter]');
		var source = wrap ? wrap.getAttribute('data-source') || 'blog' : 'blog';
		var email  = form.querySelector('input[type=email]').value.trim();
		var msg    = wrap ? wrap.querySelector('.efs-newsletter-form__msg') : null;
		var btn    = form.querySelector('button[type=submit]');

		if (msg) { msg.textContent = ''; msg.classList.remove('is-ok','is-err'); }
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			if (msg) { msg.textContent = 'Introduce un email válido.'; msg.classList.add('is-err'); }
			return;
		}
		if (btn) { btn.disabled = true; btn.dataset.orig = btn.textContent; btn.textContent = 'Enviando…'; }

		fetch(toolOrigin() + '/v1/subscribers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify({ email: email, source: source })
		})
		.then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
		.then(function (x) {
			if (!x.r.ok || !x.j.ok) {
				var err = (x.j && x.j.error && x.j.error.message) || 'No se pudo completar la suscripción.';
				throw new Error(err);
			}
			if (msg) { msg.textContent = '¡Listo! Revisa tu bandeja de entrada.'; msg.classList.add('is-ok'); }
			form.reset();
		})
		.catch(function (err) {
			if (msg) { msg.textContent = err.message || 'Error de conexión.'; msg.classList.add('is-err'); }
		})
		.finally(function () {
			if (btn) { btn.disabled = false; btn.textContent = btn.dataset.orig || 'Apuntarme →'; }
		});
	});
})();
</script>
