<?php
/**
 * سؤالات پرتکرار (مخصوص دانش‌آموز و والدین).
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="faq">
	<div class="wrap wrap--narrow">
		<div class="s-head s-head--center" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'سؤالات پرتکرار', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'پاسخ سؤال دانش‌آموز و خانواده', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'اگر سؤالت اینجا نبود، از پشتیبانی بپرس؛ شنبه تا چهارشنبه، ۸ تا ۱۸ پاسخ می‌دهیم.', 'madar' ); ?></p>
		</div>

		<div class="faq" data-stagger="60">
			<?php foreach ( madar_demo( 'faq' ) as $madar_i => $madar_qa ) : ?>
				<div class="faq__item<?php echo 0 === $madar_i ? ' is-open' : ''; ?>" data-anim="up">
					<button class="faq__q" type="button" aria-expanded="<?php echo 0 === $madar_i ? 'true' : 'false'; ?>" aria-controls="faq-a-<?php echo esc_attr( $madar_i ); ?>">
						<?php echo esc_html( $madar_qa[0] ); ?>
					</button>
					<div class="faq__a<?php echo 0 === $madar_i ? ' is-open' : ''; ?>" id="faq-a-<?php echo esc_attr( $madar_i ); ?>">
						<div><p><?php echo esc_html( $madar_qa[1] ); ?></p></div>
					</div>
				</div>
			<?php endforeach; ?>
		</div>

		<div class="pill-row" style="justify-content:center;margin-top:30px" data-anim="up">
			<a class="btn btn--line btn--sm" href="#download-app"><?php esc_html_e( 'سؤال دیگری دارم', 'madar' ); ?></a>
		</div>
	</div>
</section>
