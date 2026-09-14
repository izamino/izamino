<?php
/**
 * امکانات اپلیکیشن.
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="features">
	<div class="wrap">
		<div class="s-head" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'داخل اپ چه خبر است؟', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'یک باشگاه، نه یک سامانه اداری', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'نُه بخش که همه‌ی فعالیت دانش‌آموزی را در یک مرکز فرماندهی جمع می‌کنند — از مسابقه‌ی پنجشنبه تا پرونده‌ای که سه سال بعد به کارش می‌آید.', 'madar' ); ?></p>
		</div>

		<div class="grid grid-3" data-stagger="80">
			<?php foreach ( madar_demo( 'features' ) as $madar_feature ) : ?>
				<article class="card" data-anim="up">
					<div class="card__ico card__ico--<?php echo esc_attr( $madar_feature[3] ); ?>" aria-hidden="true"><?php echo esc_html( $madar_feature[0] ); ?></div>
					<h3><?php echo esc_html( $madar_feature[1] ); ?></h3>
					<p><?php echo esc_html( $madar_feature[2] ); ?></p>
					<div class="card__foot">
						<span><?php echo esc_html( $madar_feature[4] ); ?></span>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
