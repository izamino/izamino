<?php
/**
 * آکادمی مهارت.
 *
 * @package Madar
 */

$madar_items = madar_posts( 'madar_course', 8 );
?>
<section class="section" id="academy">
	<div class="wrap">
		<div class="s-head s-head--split" data-anim="up">
			<div>
				<span class="eyebrow"><i></i><?php esc_html_e( 'آکادمی مهارت', 'madar' ); ?></span>
				<h2><?php esc_html_e( 'دوره‌های کوتاه، پروژه‌محور، جذاب', 'madar' ); ?></h2>
				<p><?php esc_html_e( 'هر دوره سه تا شش جلسه‌ی کوتاه است، با یک خروجی واقعی و XP مشخص که در پرونده رشد دانش‌آموز ثبت می‌شود.', 'madar' ); ?></p>
			</div>
			<span class="chip chip--soft"><?php esc_html_e( '۱۲ دوره فعال · ثبت‌نام رایگان', 'madar' ); ?></span>
		</div>

		<div class="grid grid-4" data-stagger="70">
			<?php if ( $madar_items ) : ?>
				<?php foreach ( $madar_items as $madar_item ) : ?>
					<article class="card card--media" data-anim="up">
						<?php madar_thumb( $madar_item->ID, '🎓' ); ?>
						<div class="card__body">
							<h3><a href="<?php echo esc_url( get_permalink( $madar_item ) ); ?>"><?php echo esc_html( get_the_title( $madar_item ) ); ?></a></h3>
							<p><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_duration', '' ) ); ?></p>
							<div class="card__foot">
								<span class="chip chip--soft"><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_level', 'سطح ۱' ) ); ?></span>
								<span>⚡ <?php echo esc_html( madar_meta( $madar_item->ID, 'madar_xp', '۲۰۰ XP' ) ); ?></span>
							</div>
						</div>
					</article>
				<?php endforeach; ?>
			<?php else : ?>
				<?php foreach ( madar_demo( 'courses' ) as $madar_demo_item ) : ?>
					<article class="card card--media" data-anim="up">
						<div class="card__thumb"><span aria-hidden="true"><?php echo esc_html( $madar_demo_item[0] ); ?></span></div>
						<div class="card__body">
							<h3><?php echo esc_html( $madar_demo_item[1] ); ?></h3>
							<p><?php echo esc_html( $madar_demo_item[3] ); ?><br><?php echo esc_html( 'مربی: ' . $madar_demo_item[4] ); ?></p>
							<div class="card__foot">
								<span class="chip chip--soft"><?php echo esc_html( $madar_demo_item[2] ); ?></span>
								<span>⚡ <?php echo esc_html( $madar_demo_item[5] ); ?></span>
							</div>
							<div class="card__foot" style="border-top:0;padding-top:8px;margin-top:0">
								<span>👥 <?php echo esc_html( $madar_demo_item[6] ); ?></span>
								<span class="link-u"><?php esc_html_e( 'ثبت‌نام', 'madar' ); ?></span>
							</div>
						</div>
					</article>
				<?php endforeach; ?>
			<?php endif; ?>
		</div>
	</div>
</section>
