<?php
/**
 * باشگاه امتیازات و جوایز.
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="rewards">
	<div class="wrap">
		<div class="s-head" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'باشگاه امتیازات', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'امتیاز بگیر، تبدیل کن', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'امتیاز از مسابقه، دوره، حضور در برنامه و کار داوطلبانه به دست می‌آید و به جایزه‌ی واقعی تبدیل می‌شود. جوایز نقدی با تأیید والد یا سرپرست پرداخت می‌شود.', 'madar' ); ?></p>
		</div>

		<div class="progress-card" data-anim="up" style="margin-bottom:26px">
			<div class="mock-xp__row">
				<span><?php esc_html_e( 'امتیاز فعلی محمدرضا', 'madar' ); ?></span>
				<b data-count><?php esc_html_e( '۲٬۷۰۰ امتیاز', 'madar' ); ?></b>
			</div>
			<div class="mock-bar"><i class="bar-fill" style="width:78%"></i></div>
			<small><?php esc_html_e( '۳۰۰ امتیاز تا «سهمیه اردوی یک‌روزه» — با یک مسابقه هفتگی و یک مأموریت کامل می‌شود.', 'madar' ); ?></small>
		</div>

		<div class="grid grid-3" data-stagger="80">
			<?php foreach ( madar_demo( 'rewards' ) as $madar_reward ) : ?>
				<article class="reward" data-anim="up">
					<span class="reward__cost"><?php echo esc_html( $madar_reward[3] ); ?></span>
					<span class="reward__ico" aria-hidden="true"><?php echo esc_html( $madar_reward[0] ); ?></span>
					<h3><?php echo esc_html( $madar_reward[1] ); ?></h3>
					<p><?php echo esc_html( $madar_reward[2] ); ?></p>
					<div class="card__foot">
						<span>🎁 <?php echo esc_html( $madar_reward[4] ); ?></span>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
