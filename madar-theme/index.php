<?php
/**
 * قالب پیش‌فرض (وبلاگ و آرشیو).
 *
 * @package Madar
 */

get_header();

madar_page_hero(
	is_home() ? __( 'خبرها و اطلاعیه‌های مدار', 'madar' ) : get_the_archive_title(),
	is_home() ? __( 'آخرین برنامه‌ها، فراخوان‌ها و گزارش‌های باشگاه رشد دانش‌آموزان', 'madar' ) : ''
);
?>

<div class="content-area">
	<div class="wrap">
		<div class="content-grid<?php echo is_active_sidebar( 'sidebar-1' ) ? '' : ' content-grid--full'; ?>">
			<div>
				<?php if ( have_posts() ) : ?>
					<div class="grid grid-2">
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
						<h2><?php esc_html_e( 'هنوز مطلبی منتشر نشده', 'madar' ); ?></h2>
						<p><?php esc_html_e( 'به‌زودی خبرها و اطلاعیه‌های مدار اینجا منتشر می‌شود.', 'madar' ); ?></p>
						<?php get_search_form(); ?>
					</div>
				<?php endif; ?>
			</div>

			<?php if ( is_active_sidebar( 'sidebar-1' ) ) : ?>
				<aside class="widget-area"><?php dynamic_sidebar( 'sidebar-1' ); ?></aside>
			<?php endif; ?>
		</div>
	</div>
</div>

<?php
get_footer();
