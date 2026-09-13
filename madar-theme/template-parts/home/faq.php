<?php
/**
 * سؤالات پرتکرار (مخصوص دانش‌آموز و والدین).
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="faq">
	<div class="wrap">
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'سؤالات پرتکرار', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'پاسخ سؤال دانش‌آموز و خانواده', 'madar' ); ?></h2>
		</div>

		<div class="faq reveal">
			<?php foreach ( madar_demo( 'faq' ) as $madar_i => $madar_qa ) : ?>
				<div class="faq__item">
					<button class="faq__q" type="button" aria-expanded="<?php echo 0 === $madar_i ? 'true' : 'false'; ?>" aria-controls="faq-a-<?php echo esc_attr( $madar_i ); ?>">
						<?php echo esc_html( $madar_qa[0] ); ?>
					</button>
					<div class="faq__a<?php echo 0 === $madar_i ? ' is-open' : ''; ?>" id="faq-a-<?php echo esc_attr( $madar_i ); ?>">
						<?php echo esc_html( $madar_qa[1] ); ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
