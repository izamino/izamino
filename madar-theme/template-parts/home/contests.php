<?php
/**
 * مسابقات هفتگی — از نوع محتوای «مسابقات» یا داده نمونه.
 *
 * @package Madar
 */

$madar_items = madar_posts( 'madar_contest', 6 );
?>
<section class="section section--alt" id="contests">
	<div class="wrap">
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'مسابقات این هفته', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'هر هفته، یک میدان تازه', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'علمی، هوش، اطلاعات عمومی، فرهنگی، ورزشی، رسانه، قرآن، فناوری و مسابقات مناسبتی. هر شرکت امتیاز دارد و مسابقات مهم جایزه واقعی.', 'madar' ); ?></p>
		</div>

		<div class="grid grid-3">
			<?php if ( $madar_items ) : ?>
				<?php foreach ( $madar_items as $madar_item ) : ?>
					<article class="card reveal">
						<div class="card__ico" aria-hidden="true"><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_icon', '🏆' ) ); ?></div>
						<?php if ( madar_track_name( $madar_item->ID ) ) : ?>
							<span class="chip chip--cyan"><?php echo esc_html( madar_track_name( $madar_item->ID ) ); ?></span>
						<?php endif; ?>
						<h3 style="margin-top:10px"><a href="<?php echo esc_url( get_permalink( $madar_item ) ); ?>"><?php echo esc_html( get_the_title( $madar_item ) ); ?></a></h3>
						<p><?php echo esc_html( wp_trim_words( get_the_excerpt( $madar_item ), 20 ) ); ?></p>
						<div class="card__foot">
							<span>⚡ <?php echo esc_html( madar_meta( $madar_item->ID, 'madar_xp', '۲۰۰ XP' ) ); ?></span>
							<span>⏳ <?php echo esc_html( madar_meta( $madar_item->ID, 'madar_deadline', '' ) ); ?></span>
						</div>
					</article>
				<?php endforeach; ?>
			<?php else : ?>
				<?php foreach ( madar_demo( 'contests' ) as $madar_demo_item ) : ?>
					<article class="card reveal">
						<div class="card__ico" aria-hidden="true"><?php echo esc_html( $madar_demo_item[0] ); ?></div>
						<span class="chip chip--cyan"><?php echo esc_html( $madar_demo_item[2] ); ?></span>
						<h3 style="margin-top:10px"><?php echo esc_html( $madar_demo_item[1] ); ?></h3>
						<p><?php echo esc_html( $madar_demo_item[3] ); ?></p>
						<div class="card__foot">
							<span>⚡ <?php echo esc_html( $madar_demo_item[4] ); ?></span>
							<span>⏳ <?php echo esc_html( $madar_demo_item[5] ); ?></span>
						</div>
						<div class="card__foot" style="border-top:0;padding-top:6px;margin-top:0">
							<span>👥 <?php echo esc_html( $madar_demo_item[6] ); ?></span>
							<a class="btn btn--primary btn--sm" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>"><?php esc_html_e( 'شرکت در مسابقه', 'madar' ); ?></a>
						</div>
					</article>
				<?php endforeach; ?>
			<?php endif; ?>
		</div>
	</div>
</section>
