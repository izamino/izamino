<?php
/**
 * آرشیو نوشته‌ها، مسابقات، دوره‌ها، رویدادها، تیم‌ها و آثار.
 *
 * @package Madar
 */

get_header();

madar_page_hero( get_the_archive_title(), wp_strip_all_tags( get_the_archive_description() ) );
?>

<div class="content-area">
	<div class="wrap">
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
				<h2><?php esc_html_e( 'چیزی برای نمایش نیست', 'madar' ); ?></h2>
				<p><?php esc_html_e( 'هنوز محتوایی در این بخش ثبت نشده است.', 'madar' ); ?></p>
			</div>
		<?php endif; ?>
	</div>
</div>

<?php
get_footer();
