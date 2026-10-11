<?php
/**
 * آخرین اخبار و اطلاعیه‌ها.
 *
 * @package Madar
 */

$madar_news = get_posts( array( 'posts_per_page' => 3 ) );

if ( ! $madar_news ) {
	return;
}
?>
<section class="section" id="news">
	<div class="wrap">
		<div class="s-head" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'خبرها و اطلاعیه‌ها', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'آخرین خبرهای مدار', 'madar' ); ?></h2>
		</div>

		<div class="grid grid-3" data-stagger="80">
			<?php foreach ( $madar_news as $madar_post ) : ?>
				<article class="card card--media post-card" data-anim="up">
					<?php madar_thumb( $madar_post->ID, '📣' ); ?>
					<div class="card__body">
						<h3><a href="<?php echo esc_url( get_permalink( $madar_post ) ); ?>"><?php echo esc_html( get_the_title( $madar_post ) ); ?></a></h3>
						<p><?php echo esc_html( wp_trim_words( get_the_excerpt( $madar_post ), 20 ) ); ?></p>
						<div class="card__foot">
							<span><?php echo esc_html( get_the_date( '', $madar_post ) ); ?></span>
							<a href="<?php echo esc_url( get_permalink( $madar_post ) ); ?>"><?php esc_html_e( 'ادامه ←', 'madar' ); ?></a>
						</div>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
