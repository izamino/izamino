<?php
/**
 * حلقه رشد (Game Loop).
 *
 * @package Madar
 */

?>
<section class="section section--tight" id="loop">
	<div class="wrap">
		<div class="s-head s-head--center reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'حلقه رشد مدار', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'چرا دانش‌آموز هر هفته برمی‌گردد؟', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'فقط محتوا کافی نیست. مدار یک حلقه‌ی پیوسته از مأموریت، پاداش، ارتقای سطح و رقابت سالم است — از «تازه‌وارد» تا «همیار».', 'madar' ); ?></p>
		</div>

		<div class="loop reveal">
			<?php foreach ( madar_demo( 'loop' ) as $step ) : ?>
				<div class="loop__item">
					<span aria-hidden="true"><?php echo esc_html( $step[2] ); ?></span>
					<?php echo esc_html( $step[0] ); ?>
					<small><?php echo esc_html( $step[1] ); ?></small>
				</div>
			<?php endforeach; ?>
		</div>

		<div class="pill-row reveal" style="justify-content:center;margin-top:26px">
			<span class="chip chip--soft"><?php esc_html_e( 'تازه‌وارد', 'madar' ); ?></span>
			<span class="chip chip--cyan"><?php esc_html_e( 'فعال', 'madar' ); ?></span>
			<span class="chip"><?php esc_html_e( 'ماهر', 'madar' ); ?></span>
			<span class="chip chip--amber"><?php esc_html_e( 'برگزیده', 'madar' ); ?></span>
			<span class="chip chip--pink"><?php esc_html_e( 'نخبه', 'madar' ); ?></span>
			<span class="chip chip--green"><?php esc_html_e( 'همیار مدار', 'madar' ); ?></span>
		</div>
	</div>
</section>
