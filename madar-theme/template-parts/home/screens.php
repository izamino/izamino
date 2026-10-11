<?php
/**
 * ریل اسکرین‌های اپلیکیشن.
 *
 * @package Madar
 */

?>
<section class="section" id="screens">
	<div class="wrap">
		<div class="s-head s-head--split" data-anim="up">
			<div>
				<span class="eyebrow"><i></i><?php esc_html_e( 'داخل اپلیکیشن', 'madar' ); ?></span>
				<h2><?php esc_html_e( 'شش صفحه‌ای که دانش‌آموز هر هفته می‌بیند', 'madar' ); ?></h2>
				<p><?php esc_html_e( 'رابط کاربری راست‌چین، ساده و بدون شلوغی؛ هر صفحه یک کار مشخص انجام می‌دهد.', 'madar' ); ?></p>
			</div>
			<div class="rail__nav">
				<span class="rail__hint" style="align-self:center;margin-inline-end:10px"><?php esc_html_e( 'بکشید', 'madar' ); ?></span>
				<button type="button" data-rail="prev" aria-label="<?php esc_attr_e( 'قبلی', 'madar' ); ?>">→</button>
				<button type="button" data-rail="next" aria-label="<?php esc_attr_e( 'بعدی', 'madar' ); ?>">←</button>
			</div>
		</div>

		<div class="rail" data-anim="up">
			<div class="rail__track">

				<figure class="rail__item">
					<div class="phone phone--sm"><div class="phone__screen">
						<div class="mock-top">
							<div class="mock-avatar" aria-hidden="true">م</div>
							<div><small><?php esc_html_e( 'سلام، خوش آمدی', 'madar' ); ?></small><b><?php esc_html_e( 'محمدرضا · هشتم', 'madar' ); ?></b></div>
						</div>
						<div class="mock-xp">
							<div class="mock-xp__row"><span><?php esc_html_e( 'سطح ۴ — فعال', 'madar' ); ?></span><b><?php esc_html_e( '۲٬۴۵۰ XP', 'madar' ); ?></b></div>
							<div class="mock-bar"><i style="width:68%"></i></div>
						</div>
						<div class="mock-quick">
							<div><span aria-hidden="true">🏆</span><?php esc_html_e( 'مسابقه', 'madar' ); ?></div>
							<div><span aria-hidden="true">🎓</span><?php esc_html_e( 'مهارت', 'madar' ); ?></div>
							<div><span aria-hidden="true">🎁</span><?php esc_html_e( 'جوایز', 'madar' ); ?></div>
							<div><span aria-hidden="true">🗣️</span><?php esc_html_e( 'مشاوره', 'madar' ); ?></div>
						</div>
						<div class="mock-card">
							<div class="mock-card__head"><span class="chip chip--amber"><?php esc_html_e( 'مأموریت هفته', 'madar' ); ?></span><time><?php esc_html_e( '۳ روز', 'madar' ); ?></time></div>
							<h5><?php esc_html_e( 'کلیپ ۶۰ ثانیه‌ای محله', 'madar' ); ?></h5>
							<div class="mock-bar"><i style="width:45%"></i></div>
						</div>
					</div></div>
					<figcaption><?php esc_html_e( 'خانه دانش‌آموز', 'madar' ); ?><small><?php esc_html_e( 'سطح، مأموریت و رویداد نزدیک', 'madar' ); ?></small></figcaption>
				</figure>

				<figure class="rail__item">
					<div class="phone phone--sm"><div class="phone__screen">
						<div class="mock-top"><div><small><?php esc_html_e( 'مسیر من', 'madar' ); ?></small><b><?php esc_html_e( '🎬 مسیر رسانه', 'madar' ); ?></b></div></div>
						<div class="mock-xp">
							<div class="mock-xp__row"><span><?php esc_html_e( '۲ مرحله از ۴', 'madar' ); ?></span><b><?php esc_html_e( '۵۰٪', 'madar' ); ?></b></div>
							<div class="mock-bar"><i style="width:50%"></i></div>
						</div>
						<div class="mock-list">
							<div class="mock-row"><span class="mock-ico">✓</span><div><b><?php esc_html_e( 'سطح ۱ عکاسی', 'madar' ); ?></b><small><?php esc_html_e( 'تکمیل شد', 'madar' ); ?></small></div><span class="end"><?php esc_html_e( '۲۰۰ XP', 'madar' ); ?></span></div>
							<div class="mock-row"><span class="mock-ico">۲</span><div><b><?php esc_html_e( 'سطح ۲ تدوین', 'madar' ); ?></b><small><?php esc_html_e( 'جلسه ۳ از ۴', 'madar' ); ?></small></div><span class="end"><?php esc_html_e( '۳۵۰ XP', 'madar' ); ?></span></div>
							<div class="mock-row"><span class="mock-ico">🔒</span><div><b><?php esc_html_e( 'پروژه گزارش', 'madar' ); ?></b><small><?php esc_html_e( 'قفل', 'madar' ); ?></small></div><span class="end"><?php esc_html_e( '۵۰۰ XP', 'madar' ); ?></span></div>
							<div class="mock-row"><span class="mock-ico">★</span><div><b><?php esc_html_e( 'عضویت تیم رسانه', 'madar' ); ?></b><small><?php esc_html_e( 'تست ۱۸ آبان', 'madar' ); ?></small></div></div>
						</div>
					</div></div>
					<figcaption><?php esc_html_e( 'مسیر رشد', 'madar' ); ?><small><?php esc_html_e( 'چهار پله تا عضویت در تیم', 'madar' ); ?></small></figcaption>
				</figure>

				<figure class="rail__item">
					<div class="phone phone--sm"><div class="phone__screen">
						<div class="mock-top">
							<div class="mock-avatar" aria-hidden="true">م ر</div>
							<div><small><?php esc_html_e( 'پرونده رشد', 'madar' ); ?></small><b><?php esc_html_e( 'محمدرضا رضایی', 'madar' ); ?></b></div>
						</div>
						<div class="mock-card">
							<div class="mock-card__head"><span class="chip chip--violet"><?php esc_html_e( 'مهارت‌ها', 'madar' ); ?></span></div>
							<p style="margin-bottom:6px"><?php esc_html_e( 'تدوین ویدئو — سطح ۲', 'madar' ); ?></p>
							<div class="mock-bar"><i style="width:72%"></i></div>
							<p style="margin:8px 0 6px"><?php esc_html_e( 'فن بیان — سطح ۱', 'madar' ); ?></p>
							<div class="mock-bar"><i style="width:38%"></i></div>
						</div>
						<div class="mock-list">
							<div class="mock-row"><span class="mock-ico">🎓</span><div><b><?php esc_html_e( '۳ دوره گذرانده', 'madar' ); ?></b></div></div>
							<div class="mock-row"><span class="mock-ico">🏆</span><div><b><?php esc_html_e( '۵ مسابقه · ۲ مقام', 'madar' ); ?></b></div></div>
							<div class="mock-row"><span class="mock-ico">🤝</span><div><b><?php esc_html_e( '۳ برنامه داوطلبی', 'madar' ); ?></b></div></div>
						</div>
					</div></div>
					<figcaption><?php esc_html_e( 'پرونده رشد', 'madar' ); ?><small><?php esc_html_e( 'کارنامه واقعی از پایه هفتم', 'madar' ); ?></small></figcaption>
				</figure>

				<figure class="rail__item">
					<div class="phone phone--sm"><div class="phone__screen">
						<div class="mock-top"><div><small><?php esc_html_e( 'باشگاه امتیازات', 'madar' ); ?></small><b><?php esc_html_e( '۲٬۷۰۰ امتیاز', 'madar' ); ?></b></div></div>
						<div class="mock-xp">
							<div class="mock-xp__row"><span><?php esc_html_e( 'تا جایزه بعدی', 'madar' ); ?></span><b><?php esc_html_e( '۳۰۰ امتیاز', 'madar' ); ?></b></div>
							<div class="mock-bar"><i style="width:78%"></i></div>
						</div>
						<div class="mock-list">
							<div class="mock-row"><span class="mock-ico">📚</span><div><b><?php esc_html_e( 'بن کتاب', 'madar' ); ?></b><small><?php esc_html_e( 'قابل دریافت', 'madar' ); ?></small></div><span class="end"><?php esc_html_e( '۱٬۲۰۰', 'madar' ); ?></span></div>
							<div class="mock-row"><span class="mock-ico">🎟️</span><div><b><?php esc_html_e( 'بلیت جشن', 'madar' ); ?></b><small><?php esc_html_e( 'قابل دریافت', 'madar' ); ?></small></div><span class="end"><?php esc_html_e( '۸۰۰', 'madar' ); ?></span></div>
							<div class="mock-row"><span class="mock-ico">⛺</span><div><b><?php esc_html_e( 'اردوی یک‌روزه', 'madar' ); ?></b><small><?php esc_html_e( '۳۰۰ امتیاز مانده', 'madar' ); ?></small></div><span class="end"><?php esc_html_e( '۳٬۰۰۰', 'madar' ); ?></span></div>
						</div>
					</div></div>
					<figcaption><?php esc_html_e( 'باشگاه امتیازات', 'madar' ); ?><small><?php esc_html_e( 'تبدیل امتیاز به جایزه واقعی', 'madar' ); ?></small></figcaption>
				</figure>

				<figure class="rail__item">
					<div class="phone phone--sm"><div class="phone__screen" style="text-align:center">
						<span class="chip chip--green" style="margin-bottom:10px"><?php esc_html_e( 'بلیت معتبر', 'madar' ); ?></span>
						<h5 style="margin:6px 0 2px;font-size:.8rem"><?php esc_html_e( 'جشن بزرگ ۱۰۰۰ دانش‌آموز', 'madar' ); ?></h5>
						<p style="margin:0;font-size:.63rem;color:var(--faint)"><?php esc_html_e( 'پنجشنبه ۲۲ مهر · ۱۶:۰۰', 'madar' ); ?></p>
						<?php madar_qr( 118 ); ?>
						<p style="margin:10px 0 0;font-size:.6rem;font-family:var(--mono);color:var(--faint)">MDR-482-0917</p>
						<div class="mock-card" style="text-align:start">
							<div class="mock-card__head"><span class="chip chip--amber"><?php esc_html_e( 'بعد از حضور', 'madar' ); ?></span></div>
							<h5><?php esc_html_e( '۵۰۰ XP خودکار', 'madar' ); ?></h5>
						</div>
					</div></div>
					<figcaption><?php esc_html_e( 'بلیت و QR حضور', 'madar' ); ?><small><?php esc_html_e( 'پل بین اپ و برنامه واقعی', 'madar' ); ?></small></figcaption>
				</figure>

				<figure class="rail__item">
					<div class="phone phone--sm"><div class="phone__screen">
						<div class="mock-top"><div><small><?php esc_html_e( 'مرکز مشاوره', 'madar' ); ?></small><b><?php esc_html_e( 'مشاور تحصیلی', 'madar' ); ?></b></div></div>
						<div class="mock-card" style="background:var(--accent-soft);border-color:#DCDEFA">
							<p style="color:var(--accent)"><?php esc_html_e( '🛡️ این گفت‌وگو در سطح سازمان قابل نظارت است.', 'madar' ); ?></p>
						</div>
						<div class="mock-card"><p><?php esc_html_e( 'سلام محمدرضا. الان بیشتر روی کدام درس‌ها وقت می‌گذاری؟', 'madar' ); ?></p></div>
						<div class="mock-card" style="background:var(--ink);border-color:var(--ink)">
							<p style="color:rgba(255,255,255,.82)"><?php esc_html_e( 'بیشتر ریاضی و علوم. عربی را شب امتحان می‌خوانم.', 'madar' ); ?></p>
						</div>
						<div class="mock-card"><p><?php esc_html_e( 'برای عربی هر روز فقط ۲۰ دقیقه بگذار؛ کوتاه ولی هر روز.', 'madar' ); ?></p></div>
					</div></div>
					<figcaption><?php esc_html_e( 'مرکز مشاوره', 'madar' ); ?><small><?php esc_html_e( 'خصوصی، کنترل‌شده، قابل نظارت', 'madar' ); ?></small></figcaption>
				</figure>

			</div>
		</div>
	</div>
</section>
