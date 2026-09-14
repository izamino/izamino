<?php
/**
 * روایت‌ها — دانش‌آموز، والد، مدیر مدرسه و مربی.
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="voices">
	<div class="wrap">
		<div class="s-head" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'روایت‌ها', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'چهار نگاه به یک باشگاه', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'مدار وقتی کار می‌کند که هر چهار طرف — دانش‌آموز، خانواده، مدرسه و مربی — از آن راضی باشند.', 'madar' ); ?></p>
		</div>

		<div class="grid grid-2" data-stagger="110">
			<?php foreach ( madar_demo( 'voices' ) as $madar_voice ) : ?>
				<article class="voice<?php echo $madar_voice[4] ? ' voice--' . esc_attr( $madar_voice[4] ) : ''; ?>" data-anim="up">
					<p><?php echo esc_html( $madar_voice[3] ); ?></p>
					<div class="voice__who">
						<span class="voice__av" aria-hidden="true"><?php echo esc_html( $madar_voice[0] ); ?></span>
						<span>
							<b><?php echo esc_html( $madar_voice[1] ); ?></b>
							<small><?php echo esc_html( $madar_voice[2] ); ?></small>
						</span>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
