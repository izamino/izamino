<?php
/**
 * اعداد کلیدی با شمارنده.
 *
 * @package Madar
 */

?>
<section class="section section--tight" id="numbers">
	<div class="wrap">
		<div class="s-head s-head--center" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'مدار در عدد', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'هدف فاز اول، شفاف و قابل اندازه‌گیری', 'madar' ); ?></h2>
		</div>

		<div class="nums" data-stagger="90">
			<?php foreach ( madar_demo( 'numbers' ) as $madar_num ) : ?>
				<div class="num" data-anim="up">
					<span class="num__val" data-count><?php echo esc_html( $madar_num[0] ); ?></span>
					<span class="num__lbl"><?php echo esc_html( $madar_num[1] ); ?></span>
					<span class="num__sub"><?php echo esc_html( $madar_num[2] ); ?></span>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
