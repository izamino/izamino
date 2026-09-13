<?php
/**
 * ایمنی نوجوان — Child Safety by Design.
 *
 * @package Madar
 */

?>
<section class="section section--night" id="safety">
	<div class="wrap">
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'Child Safety by Design', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'ایمنی نوجوان، از روز اول در معماری', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'کاربران ما زیر ۱۸ سال هستند؛ ایمنی چیزی نیست که بعداً به نرم‌افزار اضافه شود. این اصول از نسخه اول جزو معماری محصول‌اند.', 'madar' ); ?></p>
		</div>

		<div class="grid grid-2">
			<?php foreach ( madar_demo( 'safety' ) as $madar_rule ) : ?>
				<div class="safety reveal">
					<i aria-hidden="true">🛡</i>
					<div>
						<b><?php echo esc_html( $madar_rule[0] ); ?></b>
						<p><?php echo esc_html( $madar_rule[1] ); ?></p>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
