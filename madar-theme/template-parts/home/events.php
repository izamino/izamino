<?php
/**
 * تقویم رویدادها + QR حضور.
 *
 * @package Madar
 */

$madar_items = madar_posts( 'madar_event', 5 );
?>
<section class="section" id="events">
	<div class="wrap">
		<div class="split" style="align-items:start">
			<div data-anim="up">
				<span class="eyebrow"><i></i><?php esc_html_e( 'رویدادهای واقعی', 'madar' ); ?></span>
				<h2><?php esc_html_e( 'آنلاین ثبت‌نام کن، حضوری XP بگیر', 'madar' ); ?></h2>
				<p><?php esc_html_e( 'روی «شرکت می‌کنم» بزن، QR اختصاصی بگیر، روز برنامه با همان QR ورودت ثبت شود و بعد از حضور XP دریافت کن. اپ، مرکز فرماندهی همه‌ی برنامه‌های دانش‌آموزی است.', 'madar' ); ?></p>

				<div class="card" style="margin-top:24px">
					<div class="pill-row" style="margin-bottom:14px">
						<span class="chip chip--green">🎫 <?php esc_html_e( 'بلیت اختصاصی', 'madar' ); ?></span>
						<span class="chip chip--amber">📷 <?php esc_html_e( 'ثبت حضور با QR', 'madar' ); ?></span>
						<span class="chip chip--violet">📣 <?php esc_html_e( 'فراخوان هوشمند', 'madar' ); ?></span>
					</div>
					<p><?php esc_html_e( 'می‌توانید فقط «پسران پایه هشتم خرمشهر علاقه‌مند به رسانه» یا «همه‌ی مدارس یک منطقه» را به یک برنامه دعوت کنید. ظرفیت و لیست انتظار خودکار مدیریت می‌شود.', 'madar' ); ?></p>
					<div class="card__foot">
						<span>⏱ <?php esc_html_e( 'ثبت حضور: ۲ ثانیه', 'madar' ); ?></span>
						<span>📊 <?php esc_html_e( 'گزارش حضور برای مدرسه', 'madar' ); ?></span>
					</div>
				</div>
			</div>

			<div class="grid" data-stagger="90" style="gap:14px">
				<?php if ( $madar_items ) : ?>
					<?php foreach ( $madar_items as $madar_item ) : ?>
						<article class="event" data-anim="up">
							<div class="event__date">
								<b><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_date', '—' ) ); ?></b>
								<small><?php echo esc_html( madar_meta( $madar_item->ID, 'madar_month', '' ) ); ?></small>
							</div>
							<div class="event__body">
								<h3><a href="<?php echo esc_url( get_permalink( $madar_item ) ); ?>"><?php echo esc_html( get_the_title( $madar_item ) ); ?></a></h3>
								<div class="event__meta">
									<span>📍 <?php echo esc_html( madar_meta( $madar_item->ID, 'madar_place', '' ) ); ?></span>
									<span>👥 <?php echo esc_html( madar_meta( $madar_item->ID, 'madar_capacity', '' ) ); ?></span>
									<span>⚡ <?php echo esc_html( madar_meta( $madar_item->ID, 'madar_xp', '' ) ); ?></span>
								</div>
							</div>
							<a class="btn btn--line btn--sm" href="<?php echo esc_url( get_permalink( $madar_item ) ); ?>"><?php esc_html_e( 'شرکت می‌کنم', 'madar' ); ?></a>
						</article>
					<?php endforeach; ?>
				<?php else : ?>
					<?php foreach ( madar_demo( 'events' ) as $madar_event ) : ?>
						<article class="event" data-anim="up">
							<div class="event__date">
								<b><?php echo esc_html( $madar_event[0] ); ?></b>
								<small><?php echo esc_html( $madar_event[1] ); ?></small>
							</div>
							<div class="event__body">
								<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
									<span class="chip chip--soft"><?php echo esc_html( $madar_event[6] ); ?></span>
								</div>
								<h3><?php echo esc_html( $madar_event[2] ); ?></h3>
								<div class="event__meta">
									<span>📍 <?php echo esc_html( $madar_event[3] ); ?></span>
									<span>👥 <?php echo esc_html( $madar_event[4] ); ?></span>
									<span>⚡ <?php echo esc_html( $madar_event[5] ); ?></span>
								</div>
							</div>
							<a class="btn btn--line btn--sm" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>"><?php esc_html_e( 'شرکت می‌کنم', 'madar' ); ?></a>
						</article>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>
