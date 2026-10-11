<?php
/**
 * نقشه راه محصول.
 *
 * @package Madar
 */

?>
<section class="section" id="roadmap">
	<div class="wrap">
		<div class="s-head" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'نقشه راه', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'کوچک شروع می‌کنیم، درست بزرگ می‌شویم', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'اول با ۵۰۰ تا ۱۰۰۰ دانش‌آموز در دو شهر. وقتی مدل جواب داد، پایه‌ها و شهرهای بعدی اضافه می‌شوند.', 'madar' ); ?></p>
		</div>

		<div class="road" data-stagger="110">
			<?php foreach ( madar_demo( 'roadmap' ) as $madar_phase ) : ?>
				<article class="road__card<?php echo 'now' === $madar_phase[3] ? ' road__card--now' : ''; ?>" data-anim="up">
					<span class="road__tag road__tag--<?php echo esc_attr( $madar_phase[3] ); ?>"><?php echo esc_html( $madar_phase[2] ); ?></span>
					<span class="road__phase"><?php echo esc_html( $madar_phase[0] ); ?></span>
					<h3><?php echo esc_html( $madar_phase[1] ); ?></h3>
					<ul class="road__list">
						<?php foreach ( $madar_phase[4] as $madar_line ) : ?>
							<li class="<?php echo 'done' === $madar_phase[3] ? '' : 'todo'; ?>">
								<i aria-hidden="true"><?php echo 'done' === $madar_phase[3] ? '✓' : '•'; ?></i>
								<span><?php echo esc_html( $madar_line ); ?></span>
							</li>
						<?php endforeach; ?>
					</ul>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
