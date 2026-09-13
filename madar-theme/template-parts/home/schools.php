<?php
/**
 * باشگاه مدارس — جدول رتبه‌بندی.
 *
 * @package Madar
 */

?>
<section class="section" id="schools">
	<div class="wrap">
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'باشگاه مدارس', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'مدرسه‌ها هم با هم رقابت می‌کنند', 'madar' ); ?></h2>
			<p><?php esc_html_e( '«فعال‌ترین مدرسه این ماه» و «مدرسه برتر مسابقه رسانه» — بر اساس مشارکت واقعی دانش‌آموزان، نه فقط تعداد ثبت‌نام.', 'madar' ); ?></p>
		</div>

		<div class="board reveal">
			<div class="board__row board__row--head">
				<span><?php esc_html_e( 'رتبه', 'madar' ); ?></span>
				<span><?php esc_html_e( 'مدرسه', 'madar' ); ?></span>
				<span><?php esc_html_e( 'مشارکت', 'madar' ); ?></span>
				<span><?php esc_html_e( 'امتیاز ماه', 'madar' ); ?></span>
			</div>

			<?php foreach ( madar_demo( 'schools' ) as $madar_index => $madar_school ) : ?>
				<div class="board__row">
					<span class="board__rank"><?php echo esc_html( $madar_index + 1 ); ?></span>
					<span>
						<b><?php echo esc_html( $madar_school[0] ); ?></b>
						<small><?php echo esc_html( $madar_school[1] ); ?></small>
					</span>
					<span style="color:var(--muted);font-size:.86rem"><?php echo esc_html( $madar_school[2] ); ?></span>
					<span><b><?php echo esc_html( $madar_school[3] ); ?></b></span>
				</div>
			<?php endforeach; ?>
		</div>

		<div class="pill-row reveal" style="margin-top:22px">
			<a class="btn btn--primary" href="<?php echo esc_url( madar_opt( 'madar_school_url' ) ); ?>">🏫 <?php esc_html_e( 'مدرسه من را ثبت کن', 'madar' ); ?></a>
			<a class="btn btn--line" href="#panels"><?php esc_html_e( 'پنل مدرسه چه امکاناتی دارد؟', 'madar' ); ?></a>
		</div>
	</div>
</section>
