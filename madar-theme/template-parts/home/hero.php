<?php
/**
 * بخش هیرو + ماکت موبایل «خانه دانش‌آموز».
 *
 * @package Madar
 */

?>
<section class="hero">
	<span class="hero__glow" aria-hidden="true"></span>

	<div class="wrap hero__inner">
		<div class="hero__copy">
			<span class="hero__badge">
				<b><?php esc_html_e( 'نسخه ۱', 'madar' ); ?></b>
				<?php echo esc_html( madar_opt( 'madar_hero_badge' ) ); ?>
			</span>

			<h1><?php echo wp_kses_post( madar_opt( 'madar_hero_title' ) ); ?></h1>

			<p class="hero__lead"><?php echo wp_kses_post( madar_opt( 'madar_hero_text' ) ); ?></p>

			<div class="hero__btns">
				<a class="btn btn--primary" href="<?php echo esc_url( madar_opt( 'madar_hero_btn1_url' ) ); ?>">
					⬇️ <?php echo esc_html( madar_opt( 'madar_hero_btn1' ) ); ?>
				</a>
				<a class="btn btn--ghost" href="<?php echo esc_url( madar_opt( 'madar_hero_btn2_url' ) ); ?>">
					<?php echo esc_html( madar_opt( 'madar_hero_btn2' ) ); ?>
				</a>
			</div>

			<div class="hero__stats">
				<?php for ( $i = 1; $i <= 4; $i++ ) : ?>
					<div class="stat">
						<b><?php echo esc_html( madar_opt( 'madar_stat' . $i . '_num' ) ); ?></b>
						<span><?php echo esc_html( madar_opt( 'madar_stat' . $i . '_lbl' ) ); ?></span>
					</div>
				<?php endfor; ?>
			</div>
		</div>

		<div class="hero__art">
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
							<b><?php esc_html_e( '۲٫۴۵۰ XP', 'madar' ); ?></b>
						</div>
						<div class="mock-bar"><i style="width:68%"></i></div>
						<div class="mock-xp__meta">
							<span><?php esc_html_e( '۳۰۰ XP تا سطح «ماهر»', 'madar' ); ?></span>
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
						<div class="mock-bar" style="background:#EDEFF7"><i style="width:45%;background:linear-gradient(135deg,#5B5BF6,#22D3EE)"></i></div>
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

					<div class="mock-card">
						<div class="mock-card__head">
							<span class="chip chip--green"><?php esc_html_e( 'رویداد نزدیک', 'madar' ); ?></span>
							<time><?php esc_html_e( '۲۲ مهر', 'madar' ); ?></time>
						</div>
						<h5><?php esc_html_e( 'جشن بزرگ ۱۰۰۰ دانش‌آموز آبادان', 'madar' ); ?></h5>
						<p><?php esc_html_e( 'با QR حضور، ۵۰۰ XP بگیر', 'madar' ); ?></p>
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
	</div>

	<div class="hero__wave" aria-hidden="true">
		<svg viewBox="0 0 1440 110" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M0 62c180 34 340 40 520 18 180-22 320-56 500-56 180 0 300 26 420 48v38H0V62z" fill="#F5F6FB"/>
		</svg>
	</div>
</section>
