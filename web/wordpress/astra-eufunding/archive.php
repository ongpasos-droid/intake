<?php
/**
 * Category / tag / date archive.
 * Reuses blog card grid from home.php.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

$title = '';
$desc  = '';
if ( is_category() ) {
	$title = single_cat_title( '', false );
	$desc  = category_description();
} elseif ( is_tag() ) {
	$title = single_tag_title( '', false );
	$desc  = tag_description();
} elseif ( is_author() ) {
	$title = get_the_author();
} elseif ( is_date() ) {
	$title = get_the_archive_title();
} else {
	$title = get_the_archive_title();
}
?>

<main id="primary" class="efs-archive">

	<header class="efs-archive-header">
		<h1><?php echo esc_html( wp_strip_all_tags( $title ) ); ?></h1>
		<?php if ( $desc ) : ?>
			<div class="efs-archive-description"><?php echo wp_kses_post( $desc ); ?></div>
		<?php endif; ?>
	</header>

	<?php if ( have_posts() ) : ?>
		<div class="efs-post-grid">
			<?php while ( have_posts() ) : the_post(); ?>
				<article <?php post_class( 'efs-post-card' ); ?>>
					<?php if ( has_post_thumbnail() ) : ?>
						<a href="<?php the_permalink(); ?>" class="efs-post-card__thumb"
							style="background-image:url('<?php echo esc_url( get_the_post_thumbnail_url( null, 'large' ) ); ?>')"
							aria-hidden="true"></a>
					<?php else : ?>
						<a href="<?php the_permalink(); ?>" class="efs-post-card__thumb" aria-hidden="true"></a>
					<?php endif; ?>
					<div class="efs-post-card__body">
						<div class="efs-post-card__cats"><?php the_category( ' · ' ); ?></div>
						<h2 class="efs-post-card__title">
							<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
						</h2>
						<p class="efs-post-card__excerpt"><?php echo esc_html( wp_trim_words( get_the_excerpt(), 24, '…' ) ); ?></p>
						<div class="efs-post-card__meta">
							<time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
						</div>
					</div>
				</article>
			<?php endwhile; ?>
		</div>

		<div class="efs-archive-pagination" style="text-align:center;margin:2rem 0 3rem;">
			<?php the_posts_pagination( array( 'mid_size' => 2, 'prev_text' => '← Anterior', 'next_text' => 'Siguiente →' ) ); ?>
		</div>
	<?php else : ?>
		<div style="max-width:var(--efs-max-w);margin:3rem auto;padding:0 1.25rem;">
			<p>Aún no hay artículos en esta categoría.</p>
		</div>
	<?php endif; ?>

	<div style="max-width:var(--efs-max-w);margin:0 auto 4rem;padding:0 1.25rem;">
		<?php efs_cta( 'newsletter' ); ?>
	</div>

</main>

<?php get_footer();
