<?php
/**
 * Single post template — full article page.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

while ( have_posts() ) : the_post(); ?>

<main id="primary" class="efs-single">
	<article <?php post_class( 'efs-single-wrap' ); ?>>

		<?php $cats = get_the_category_list( ' · ' ); if ( $cats ) : ?>
			<div class="efs-single__cats"><?php echo $cats; ?></div>
		<?php endif; ?>

		<h1 class="entry-title"><?php the_title(); ?></h1>

		<?php if ( has_excerpt() ) : ?>
			<p class="efs-single__excerpt"><?php echo esc_html( get_the_excerpt() ); ?></p>
		<?php endif; ?>

		<div class="efs-single__meta">
			<span><strong><?php the_author(); ?></strong></span>
			<span>·</span>
			<time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
			<?php
			$mod = get_the_modified_date( 'c' );
			if ( $mod !== get_the_date( 'c' ) ) : ?>
				<span>·</span>
				<span>Actualizado <?php echo esc_html( get_the_modified_date() ); ?></span>
			<?php endif; ?>
			<?php
			$minutes = max( 1, (int) round( str_word_count( wp_strip_all_tags( get_the_content() ) ) / 220 ) );
			?>
			<span>·</span>
			<span><?php echo esc_html( $minutes ); ?> min de lectura</span>
		</div>

		<?php if ( has_post_thumbnail() ) : ?>
			<div class="efs-single__hero"
				style="background-image:url('<?php echo esc_url( get_the_post_thumbnail_url( null, 'large' ) ); ?>')"></div>
		<?php endif; ?>

		<div class="efs-single__content entry-content">
			<?php the_content(); ?>
		</div>

		<?php efs_cta( 'newsletter' ); ?>
		<?php efs_cta( 'sandbox' ); ?>

	</article>
</main>

<?php endwhile;
get_footer();
