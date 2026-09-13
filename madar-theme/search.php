<?php
/**
 * نتایج جست‌وجو.
 *
 * @package Madar
 */

get_header();

madar_page_hero(
	/* translators: %s: عبارت جست‌وجو. */
	sprintf( __( 'نتایج جست‌وجو برای: %s', 'madar' ), get_search_query() ),
	''
);
?>

<div class="content-area">
	<div class="wrap">
		<div class="entry" style="margin-bottom:22px"><?php get_search_form(); ?></div>

		<?php if ( have_posts() ) : ?>
			<div class="grid grid-3">
				<?php
				while ( have_posts() ) :
					the_post();
					get_template_part( 'template-parts/content-card' );
				endwhile;
				?>
			</div>
			<?php madar_pagination(); ?>
		<?php else : ?>
			<div class="entry">
				<h2><?php esc_html_e( 'نتیجه‌ای پیدا نشد', 'madar' ); ?></h2>
				<p><?php esc_html_e( 'عبارت دیگری را امتحان کنید؛ مثلاً «مسابقه رسانه» یا «اردو».', 'madar' ); ?></p>
			</div>
		<?php endif; ?>
	</div>
</div>

<?php
get_footer();
