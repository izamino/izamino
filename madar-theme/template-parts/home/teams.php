<?php
/**
 * تیم‌ها و انجمن‌ها.
 *
 * @package Madar
 */

$madar_items = madar_posts( 'madar_team', 12 );
?>
<section class="section section--tight" id="teams">
	<div class="wrap">
		<div class="s-head s-head--center reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'تیم‌ها و انجمن‌ها', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'جای هر استعداد، یک تیم', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'با رسیدن به سطح لازم، درخواست عضویت بده و بخشی از تیم‌های واقعی مدار شو.', 'madar' ); ?></p>
		</div>

		<div class="teams reveal" style="justify-content:center">
			<?php if ( $madar_items ) : ?>
				<?php foreach ( $madar_items as $madar_item ) : ?>
					<a class="team" href="<?php echo esc_url( get_permalink( $madar_item ) ); ?>">
						<span aria-hidden="true"><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_icon', '👥' ) ); ?></span>
						<?php echo esc_html( get_the_title( $madar_item ) ); ?>
						<small><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_level', '' ) ); ?></small>
					</a>
				<?php endforeach; ?>
			<?php else : ?>
				<?php foreach ( madar_demo( 'teams' ) as $madar_team ) : ?>
					<span class="team">
						<span aria-hidden="true"><?php echo esc_html( $madar_team[0] ); ?></span>
						<?php echo esc_html( $madar_team[1] ); ?>
						<small><?php echo esc_html( $madar_team[2] ); ?></small>
					</span>
				<?php endforeach; ?>
			<?php endif; ?>
		</div>
	</div>
</section>
