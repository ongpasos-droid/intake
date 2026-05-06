<?php
/**
 * Template Name: Landing (sin menú)
 *
 * Full-width landing used for ad campaigns. Hides header/footer via
 * efs-landing-page body class (see style.css).
 */
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
?>

<main id="primary" class="efs-landing">

	<?php while ( have_posts() ) : the_post(); ?>
		<article <?php post_class(); ?>>
			<div class="efs-single__content">
				<?php the_content(); ?>
			</div>
		</article>
	<?php endwhile; ?>

</main>

<?php get_footer();
