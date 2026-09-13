<?php
/**
 * امکانات اپلیکیشن.
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="features">
	<div class="wrap">
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'داخل اپ چه خبر است؟', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'یک باشگاه، نه یک سامانه اداری', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'همه‌ی فعالیت‌های دانش‌آموزی — مسابقه، مهارت، مشاوره، رویداد و نمایشگاه — در یک مرکز فرماندهی جمع شده‌اند.', 'madar' ); ?></p>
		</div>

		<div class="grid grid-3">
			<?php foreach ( madar_demo( 'features' ) as $feature ) : ?>
				<article class="card reveal">
					<div class="card__ico card__ico--<?php echo esc_attr( $feature[3] ); ?>" aria-hidden="true"><?php echo esc_html( $feature[0] ); ?></div>
					<h3><?php echo esc_html( $feature[1] ); ?></h3>
					<p><?php echo esc_html( $feature[2] ); ?></p>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
