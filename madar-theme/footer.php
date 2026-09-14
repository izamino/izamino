<?php
/**
 * پاصفحه.
 *
 * @package Madar
 */

?>
</main><!-- #content -->

<footer class="site-footer" id="download">
	<div class="wrap">
		<div class="footer-grid">
			<div>
				<?php madar_brand(); ?>
				<p style="margin-top:16px;max-width:34ch">
					<?php esc_html_e( 'هر دانش‌آموز یک پروفایل، یک مسیر رشد و یک ارتباط دائمی با شبکه‌ای از مربیان، فرصت‌ها و برنامه‌های دانش‌آموزی داشته باشد.', 'madar' ); ?>
				</p>
				<div class="pill-row" style="margin-top:18px">
					<a class="btn btn--primary btn--sm" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>">🤖 <?php esc_html_e( 'نسخه اندروید', 'madar' ); ?></a>
					<a class="btn btn--ghost btn--sm" href="<?php echo esc_url( madar_opt( 'madar_dl_ios' ) ); ?>">🌐 <?php esc_html_e( 'نسخه وب', 'madar' ); ?></a>
				</div>
			</div>

			<div>
				<h4><?php esc_html_e( 'باشگاه', 'madar' ); ?></h4>
				<?php
				if ( has_nav_menu( 'footer' ) ) {
					wp_nav_menu(
						array(
							'theme_location' => 'footer',
							'container'      => false,
							'menu_class'     => '',
							'depth'          => 1,
						)
					);
				} else {
					?>
					<ul>
						<li><a href="#features"><?php esc_html_e( 'امکانات اپ', 'madar' ); ?></a></li>
						<li><a href="#screens"><?php esc_html_e( 'اسکرین‌های اپ', 'madar' ); ?></a></li>
						<li><a href="#contests"><?php esc_html_e( 'مسابقات هفتگی', 'madar' ); ?></a></li>
						<li><a href="#academy"><?php esc_html_e( 'آکادمی مهارت', 'madar' ); ?></a></li>
						<li><a href="#rewards"><?php esc_html_e( 'باشگاه امتیازات', 'madar' ); ?></a></li>
						<li><a href="#gallery"><?php esc_html_e( 'نمایشگاه استعدادها', 'madar' ); ?></a></li>
						<li><a href="#roadmap"><?php esc_html_e( 'نقشه راه', 'madar' ); ?></a></li>
					</ul>
					<?php
				}
				?>
			</div>

			<div>
				<h4><?php esc_html_e( 'برای بزرگ‌ترها', 'madar' ); ?></h4>
				<ul>
					<li><a href="#schools"><?php esc_html_e( 'پنل مدرسه', 'madar' ); ?></a></li>
					<li><a href="#panels"><?php esc_html_e( 'پنل مربیان', 'madar' ); ?></a></li>
					<li><a href="#panels"><?php esc_html_e( 'مدیریت مرکزی', 'madar' ); ?></a></li>
					<li><a href="#safety"><?php esc_html_e( 'ایمنی نوجوان', 'madar' ); ?></a></li>
					<li><a href="#faq"><?php esc_html_e( 'سؤالات والدین', 'madar' ); ?></a></li>
					<li><a href="#voices"><?php esc_html_e( 'روایت‌ها', 'madar' ); ?></a></li>
				</ul>
			</div>

			<div>
				<h4><?php esc_html_e( 'ارتباط با مدار', 'madar' ); ?></h4>
				<ul>
					<li>📍 <?php echo esc_html( madar_opt( 'madar_address' ) ); ?></li>
					<li>☎️ <?php echo esc_html( madar_opt( 'madar_phone' ) ); ?></li>
					<li>✉️ <?php echo esc_html( madar_opt( 'madar_email' ) ); ?></li>
				</ul>
				<form class="newsletter" onsubmit="return false">
					<input type="email" placeholder="<?php esc_attr_e( 'ایمیل برای خبرنامه ماهانه', 'madar' ); ?>" aria-label="<?php esc_attr_e( 'ایمیل', 'madar' ); ?>">
					<button class="btn btn--primary btn--sm" type="submit"><?php esc_html_e( 'عضویت', 'madar' ); ?></button>
				</form>

				<div class="social" style="margin-top:16px">
					<a href="<?php echo esc_url( madar_opt( 'madar_social_ig' ) ); ?>" aria-label="<?php esc_attr_e( 'اینستاگرام', 'madar' ); ?>">📸</a>
					<a href="<?php echo esc_url( madar_opt( 'madar_social_tg' ) ); ?>" aria-label="<?php esc_attr_e( 'تلگرام', 'madar' ); ?>">✈️</a>
					<a href="<?php echo esc_url( madar_opt( 'madar_social_yt' ) ); ?>" aria-label="<?php esc_attr_e( 'آپارات', 'madar' ); ?>">▶️</a>
				</div>
			</div>
		</div>

		<div class="footer-bottom">
			<span>
				<?php
				printf(
					/* translators: %1$s: سال, %2$s: نام سایت. */
					esc_html__( '© %1$s %2$s — همه حقوق محفوظ است.', 'madar' ),
					esc_html( wp_date( 'Y' ) ),
					esc_html( get_bloginfo( 'name' ) )
				);
				?>
			</span>
			<span><?php esc_html_e( 'ساخته‌شده با رعایت اصول ایمنی نوجوان (Child Safety by Design)', 'madar' ); ?></span>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
