<?php
/**
 * هیرو سینمایی + قاب پیش‌نمایش دسکتاپ / موبایل.
 *
 * @package Madar
 */

?>
<section class="hero">
	<canvas class="hero__canvas" id="madar-orbit" aria-hidden="true"></canvas>
	<span class="hero__fade" aria-hidden="true"></span>

	<div class="wrap hero__inner">
		<span class="hero__badge">
			<b><?php esc_html_e( 'نسخه ۱', 'madar' ); ?></b>
			<?php echo esc_html( madar_opt( 'madar_hero_badge' ) ); ?>
		</span>

		<h1><?php echo wp_kses_post( madar_opt( 'madar_hero_title' ) ); ?></h1>

		<p class="hero__lead"><?php echo wp_kses_post( madar_opt( 'madar_hero_text' ) ); ?></p>

		<div class="hero__btns">
			<a class="btn btn--primary" href="<?php echo esc_url( madar_opt( 'madar_hero_btn1_url' ) ); ?>">
				<?php echo esc_html( madar_opt( 'madar_hero_btn1' ) ); ?>
			</a>
			<a class="btn btn--ghost" href="<?php echo esc_url( madar_opt( 'madar_hero_btn2_url' ) ); ?>">
				<?php echo esc_html( madar_opt( 'madar_hero_btn2' ) ); ?>
			</a>
		</div>

		<div class="hero__meta">
			<span><?php esc_html_e( 'رایگان برای دانش‌آموز', 'madar' ); ?></span>
			<span><?php esc_html_e( 'با تأیید والد', 'madar' ); ?></span>
			<span><?php esc_html_e( 'بدون چت عمومی', 'madar' ); ?></span>
			<span><?php esc_html_e( 'آبادان و خرمشهر', 'madar' ); ?></span>
		</div>

		<div class="showcase" data-anim="scale">
			<div style="text-align:center">
				<div class="showcase__switch" role="tablist" aria-label="<?php esc_attr_e( 'حالت پیش‌نمایش', 'madar' ); ?>">
					<button type="button" role="tab" aria-selected="true" data-pane="mobile"><?php esc_html_e( 'MOBILE', 'madar' ); ?></button>
					<button type="button" role="tab" aria-selected="false" data-pane="desktop"><?php esc_html_e( 'DESKTOP', 'madar' ); ?></button>
				</div>
			</div>

			<div class="showcase__stage">

				<div class="showcase__pane showcase__pane--mobile is-active" id="pane-mobile">
					<div class="phone" role="img" aria-label="<?php esc_attr_e( 'نمای صفحه خانه دانش‌آموز در اپلیکیشن مدار', 'madar' ); ?>">
						<div class="phone__screen">

							<div class="mock-top">
								<div class="mock-avatar" aria-hidden="true">م</div>
								<div>
									<small><?php esc_html_e( 'سلام، خوش آمدی', 'madar' ); ?></small>
									<b><?php esc_html_e( 'محمدرضا · پایه هشتم', 'madar' ); ?></b>
								</div>
								<div class="mock-bell" aria-hidden="true">🔔</div>
							</div>

							<div class="mock-xp">
								<div class="mock-xp__row">
									<span><?php esc_html_e( 'سطح ۴ — فعال', 'madar' ); ?></span>
									<b><?php esc_html_e( '۲٬۴۵۰ XP', 'madar' ); ?></b>
								</div>
								<div class="mock-bar"><i style="width:68%"></i></div>
								<div class="mock-xp__meta">
									<span><?php esc_html_e( '۳۰۰ XP تا «ماهر»', 'madar' ); ?></span>
									<span><?php esc_html_e( '🏅 ۷ نشان', 'madar' ); ?></span>
									<span><?php esc_html_e( '🏫 رتبه ۳', 'madar' ); ?></span>
								</div>
							</div>

							<div class="mock-quick">
								<div><span aria-hidden="true">🏆</span><?php esc_html_e( 'مسابقه', 'madar' ); ?></div>
								<div><span aria-hidden="true">🎓</span><?php esc_html_e( 'مهارت', 'madar' ); ?></div>
								<div><span aria-hidden="true">🎁</span><?php esc_html_e( 'جوایز', 'madar' ); ?></div>
								<div><span aria-hidden="true">🗣️</span><?php esc_html_e( 'مشاوره', 'madar' ); ?></div>
							</div>

							<div class="mock-card">
								<div class="mock-card__head">
									<span class="chip chip--amber"><?php esc_html_e( 'مأموریت هفته', 'madar' ); ?></span>
									<time><?php esc_html_e( '۳ روز مانده', 'madar' ); ?></time>
								</div>
								<h5><?php esc_html_e( 'یک کلیپ ۶۰ ثانیه‌ای از محله‌ات بساز', 'madar' ); ?></h5>
								<div class="mock-bar"><i style="width:45%"></i></div>
								<p style="margin-top:6px"><?php esc_html_e( 'پیشرفت ۴۵٪ · پاداش ۵۰۰ XP', 'madar' ); ?></p>
							</div>

							<div class="mock-card">
								<div class="mock-card__head">
									<span class="chip chip--cyan"><?php esc_html_e( 'مسابقه فعال', 'madar' ); ?></span>
									<time><?php esc_html_e( 'تا پنجشنبه', 'madar' ); ?></time>
								</div>
								<h5><?php esc_html_e( 'مسابقه هوش و ریاضی هفته', 'madar' ); ?></h5>
								<p><?php esc_html_e( '۴۸۲ شرکت‌کننده · ۲۵۰ XP', 'madar' ); ?></p>
							</div>

							<div class="mock-tabbar">
								<div class="is-on"><span aria-hidden="true">🏠</span><?php esc_html_e( 'خانه', 'madar' ); ?></div>
								<div><span aria-hidden="true">🏆</span><?php esc_html_e( 'مسابقه', 'madar' ); ?></div>
								<div><span aria-hidden="true">🧭</span><?php esc_html_e( 'مسیر', 'madar' ); ?></div>
								<div><span aria-hidden="true">🎁</span><?php esc_html_e( 'جوایز', 'madar' ); ?></div>
								<div><span aria-hidden="true">👤</span><?php esc_html_e( 'پرونده', 'madar' ); ?></div>
							</div>

						</div>
					</div>
				</div>

				<div class="showcase__pane showcase__pane--desktop" id="pane-desktop">
					<div class="browser">
						<div class="browser__bar">
							<i></i><i></i><i></i>
							<span class="browser__url">madar.club</span>
						</div>
						<div class="browser__body">
							<div class="browser__hero">
								<span class="chip chip--amber"><?php esc_html_e( 'پنل مدرسه', 'madar' ); ?></span>
								<h4 style="margin-top:12px"><?php esc_html_e( 'دبیرستان نمونه شهید بهشتی', 'madar' ); ?></h4>
								<p><?php esc_html_e( 'آبادان · ناحیه ۱ · ۲۴۷ دانش‌آموز فعال', 'madar' ); ?></p>
							</div>
							<div class="browser__row">
								<div class="browser__block"><b><?php esc_html_e( '۳۸٬۴۰۰', 'madar' ); ?></b><small><?php esc_html_e( 'امتیاز ماه مدرسه', 'madar' ); ?></small></div>
								<div class="browser__block"><b><?php esc_html_e( '۶۴٪', 'madar' ); ?></b><small><?php esc_html_e( 'نرخ مشارکت هفتگی', 'madar' ); ?></small></div>
								<div class="browser__block"><b><?php esc_html_e( 'رتبه ۱', 'madar' ); ?></b><small><?php esc_html_e( 'باشگاه مدارس آبادان', 'madar' ); ?></small></div>
							</div>
							<div class="browser__row">
								<div class="browser__block"><b><?php esc_html_e( 'مسابقه رسانه', 'madar' ); ?></b><small><?php esc_html_e( '۱۹۶ شرکت‌کننده از این مدرسه', 'madar' ); ?></small></div>
								<div class="browser__block"><b><?php esc_html_e( 'اردوی خرمشهر', 'madar' ); ?></b><small><?php esc_html_e( '۳۲ ظرفیت باقی‌مانده', 'madar' ); ?></small></div>
								<div class="browser__block"><b><?php esc_html_e( 'فراخوان رسانه', 'madar' ); ?></b><small><?php esc_html_e( 'پایه هشتم علاقه‌مند به رسانه', 'madar' ); ?></small></div>
							</div>
						</div>
					</div>
				</div>

			</div>
		</div>

		<div class="hero__stats" data-stagger="90">
			<?php for ( $i = 1; $i <= 4; $i++ ) : ?>
				<div class="stat" data-anim="up">
					<b data-count><?php echo esc_html( madar_opt( 'madar_stat' . $i . '_num' ) ); ?></b>
					<span><?php echo esc_html( madar_opt( 'madar_stat' . $i . '_lbl' ) ); ?></span>
				</div>
			<?php endfor; ?>
		</div>
	</div>
</section>
