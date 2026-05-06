<?php
/**
 * Reusable sandbox CTA box.
 * Usage: efs_cta( 'sandbox' );
 */
if ( ! defined( 'ABSPATH' ) ) exit;
?>
<aside class="efs-cta efs-cta--light efs-cta--sandbox">
	<h3>Prueba la herramienta antes de tu próxima call</h3>
	<p>Juega con una convocatoria de ejemplo y aprende cómo se estructura un proyecto Erasmus+ real. Gratis, sin alta.</p>
	<a class="efs-cta__btn" href="<?php echo esc_url( home_url( '/sandbox/' ) ); ?>">Entrar al sandbox →</a>
</aside>
