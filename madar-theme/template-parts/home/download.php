<?php
/**
 * دانلود اپلیکیشن و مشخصات فنی.
 *
 * @package Madar
 */

?>
<section class="section section--night" id="download-app">
	<div class="wrap download">
		<div data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'دریافت اپلیکیشن', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'روی گوشی خودت، بدون هزینه', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'نسخه اندروید را مستقیم دانلود کن یا با همان حساب وارد نسخه وب شو. ورود با شماره موبایل و تأیید والد انجام می‌شود.', 'madar' ); ?></p>

			<div class="pill-row" style="margin-top:26px">
				<a class="btn btn--primary" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>"><?php esc_html_e( 'دانلود نسخه اندروید', 'madar' ); ?></a>
				<a class="btn btn--line" href="<?php echo esc_url( madar_opt( 'madar_dl_ios' ) ); ?>"><?php esc_html_e( 'ورود به نسخه وب', 'madar' ); ?></a>
			</div>

			<ul class="spec-list">
				<?php foreach ( madar_demo( 'specs' ) as $madar_spec ) : ?>
					<li><span><?php echo esc_html( $madar_spec[0] ); ?></span><b><?php echo esc_html( $madar_spec[1] ); ?></b></li>
				<?php endforeach; ?>
			</ul>
		</div>

		<div data-anim="scale">
			<div class="dl-box">
				<?php madar_qr( 130 ); ?>
				<div>
					<b><?php esc_html_e( 'اسکن کن و نصب کن', 'madar' ); ?></b>
					<p><?php esc_html_e( 'دوربین گوشی را روی کد بگیر تا مستقیم به صفحه دانلود بروی.', 'madar' ); ?></p>
					<span class="chip chip--green chip--dot"><?php esc_html_e( 'نسخه پایدار', 'madar' ); ?></span>
				</div>
			</div>

			<div class="card" style="margin-top:16px">
				<div class="card__foot" style="margin-top:0;padding-top:0;border-top:0">
					<span>🔐 <?php esc_html_e( 'ورود با کد یک‌بارمصرف', 'madar' ); ?></span>
					<span>👨‍👦 <?php esc_html_e( 'فعال‌سازی با تأیید والد', 'madar' ); ?></span>
				</div>
				<p style="margin-top:14px"><?php esc_html_e( 'اگر مدرسه شما هنوز به مدار نپیوسته، باز هم می‌توانی ثبت‌نام کنی؛ بعد از پیوستن مدرسه، فعالیت‌هایت به آمار مدرسه اضافه می‌شود.', 'madar' ); ?></p>
			</div>
		</div>
	</div>
</section>
