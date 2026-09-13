<?php
/**
 * نمایشگاه استعدادها.
 *
 * @package Madar
 */

$madar_items = madar_posts( 'madar_work', 8 );
?>
<section class="section section--alt" id="gallery">
	<div class="wrap">
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'نمایشگاه استعدادها', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'کار بچه‌ها دیده می‌شود', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'عکس، ویدئو، نقاشی، پوستر، پروژه علمی و دست‌سازه — همه‌ی آثار پیش از انتشار توسط مدیر بررسی و تأیید می‌شوند.', 'madar' ); ?></p>
		</div>

		<div class="gallery reveal">
			<?php if ( $madar_items ) : ?>
				<?php foreach ( $madar_items as $madar_item ) : ?>
					<a class="gallery__item" href="<?php echo esc_url( get_permalink( $madar_item ) ); ?>">
						<?php
						if ( has_post_thumbnail( $madar_item->ID ) ) {
							echo get_the_post_thumbnail( $madar_item->ID, 'madar-card', array( 'alt' => '' ) );
						} else {
							echo '<span aria-hidden="true">' . esc_html( madar_meta( $madar_item->ID, 'madar_icon', '🖼️' ) ) . '</span>';
						}
						?>
						<span class="gallery__cap">
							<?php echo esc_html( get_the_title( $madar_item ) ); ?>
							<small><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_student', '' ) ); ?></small>
						</span>
					</a>
				<?php endforeach; ?>
			<?php else : ?>
				<?php foreach ( madar_demo( 'works' ) as $madar_work ) : ?>
					<div class="gallery__item">
						<span aria-hidden="true"><?php echo esc_html( $madar_work[0] ); ?></span>
						<span class="gallery__cap">
							<?php echo esc_html( $madar_work[1] ); ?>
							<small><?php echo esc_html( $madar_work[2] ); ?></small>
						</span>
					</div>
				<?php endforeach; ?>
			<?php endif; ?>
		</div>

		<p class="reveal" style="text-align:center;margin:26px 0 0;color:var(--muted);font-size:.92rem">
			<?php esc_html_e( 'هیچ اطلاعات تماس یا هویتی حساسی همراه آثار منتشر نمی‌شود.', 'madar' ); ?>
		</p>
	</div>
</section>
