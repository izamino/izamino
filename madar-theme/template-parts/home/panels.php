<?php
/**
 * پنل‌های مدرسه، مربیان و مدیریت مرکزی.
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="panels">
	<div class="wrap">
		<div class="s-head s-head--center reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'ساختار اجرایی', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'سه پنل، دسترسی‌های جدا', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'یک مدیر کل و چند دپارتمان: تحصیلی، فرهنگی‌اعتقادی، رسانه و فناوری، مهارت و اشتغال، استعداد و خلاقیت، مسابقات و رویدادها و پشتیبانی. هر نقش فقط چیزی را می‌بیند که باید.', 'madar' ); ?></p>
		</div>

		<div class="grid grid-3">
			<?php foreach ( madar_demo( 'panels' ) as $madar_panel ) : ?>
				<article class="card panel-card reveal">
					<div class="card__ico card__ico--violet" aria-hidden="true"><?php echo esc_html( $madar_panel[0] ); ?></div>
					<h3><?php echo esc_html( $madar_panel[1] ); ?></h3>
					<ul>
						<?php foreach ( $madar_panel[2] as $madar_line ) : ?>
							<li><?php echo esc_html( $madar_line ); ?></li>
						<?php endforeach; ?>
					</ul>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
