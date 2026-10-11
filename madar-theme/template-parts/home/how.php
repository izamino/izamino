<?php
/**
 * چطور شروع می‌کنی — چهار گام.
 *
 * @package Madar
 */

?>
<section class="section section--alt" id="how">
	<div class="wrap">
		<div class="s-head s-head--center" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'شروع مسیر', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'از نصب تا اولین مأموریت، کمتر از ۱۰ دقیقه', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'ثبت‌نام ساده است، اما حساب دانش‌آموز تا تأیید والد فعال نمی‌شود. این ترتیب عمدی است.', 'madar' ); ?></p>
		</div>

		<div class="how" data-stagger="120">
			<?php
			$madar_index = 1;
			foreach ( madar_demo( 'how' ) as $madar_step ) :
				?>
				<div class="how__step" data-anim="up">
					<div class="how__n"><?php echo esc_html( str_pad( (string) $madar_index, 2, '0', STR_PAD_LEFT ) ); ?></div>
					<h3><?php echo esc_html( $madar_step[0] ); ?></h3>
					<p><?php echo esc_html( $madar_step[1] ); ?></p>
					<small><?php echo esc_html( $madar_step[2] ); ?></small>
				</div>
				<?php
				$madar_index++;
			endforeach;
			?>
		</div>

		<div class="pill-row" style="justify-content:center;margin-top:38px" data-anim="up">
			<a class="btn btn--primary" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>"><?php esc_html_e( 'شروع ثبت‌نام دانش‌آموز', 'madar' ); ?></a>
			<a class="btn btn--line" href="<?php echo esc_url( madar_opt( 'madar_school_url' ) ); ?>"><?php esc_html_e( 'من مدیر مدرسه‌ام', 'madar' ); ?></a>
		</div>
	</div>
</section>
