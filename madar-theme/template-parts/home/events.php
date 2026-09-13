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
			<div class="reveal">
				<span class="eyebrow"><i></i><?php esc_html_e( 'رویدادهای واقعی', 'madar' ); ?></span>
				<h2><?php esc_html_e( 'آنلاین ثبت‌نام کن، حضوری XP بگیر', 'madar' ); ?></h2>
				<p style="color:var(--muted)">
					<?php esc_html_e( 'روی «شرکت می‌کنم» بزن، QR اختصاصی بگیر، روز برنامه با همان QR ورودت ثبت شود و بعد از حضور XP دریافت کن. مدار مرکز فرماندهی همه برنامه‌های دانش‌آموزی است.', 'madar' ); ?>
				</p>
				<div class="dossier" style="padding:22px">
					<div class="pill-row" style="margin-bottom:14px">
						<span class="chip chip--green">🎫 <?php esc_html_e( 'بلیت اختصاصی', 'madar' ); ?></span>
						<span class="chip chip--amber">📷 <?php esc_html_e( 'ثبت حضور با QR', 'madar' ); ?></span>
					</div>
					<p style="margin:0;color:var(--muted);font-size:.94rem">
						<?php esc_html_e( 'فراخوان هوشمند: می‌توانید فقط «پسران پایه هشتم خرمشهر علاقه‌مند به رسانه» یا «همه‌ی مدارس یک منطقه» را به یک برنامه دعوت کنید.', 'madar' ); ?>
					</p>
				</div>
			</div>

			<div class="grid reveal" style="gap:14px">
				<?php if ( $madar_items ) : ?>
					<?php foreach ( $madar_items as $madar_item ) : ?>
						<article class="event">
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
						<article class="event">
							<div class="event__date">
								<b><?php echo esc_html( $madar_event[0] ); ?></b>
								<small><?php echo esc_html( $madar_event[1] ); ?></small>
							</div>
							<div class="event__body">
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
