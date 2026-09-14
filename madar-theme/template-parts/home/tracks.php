<?php
/**
 * مسیر رشد — تب‌های مسیر و پله‌های پیشرفت.
 *
 * @package Madar
 */

$madar_tracks = madar_demo( 'tracks' );
?>
<section class="section section--night" id="tracks">
	<div class="wrap">
		<div class="s-head" data-anim="up">
			<span class="eyebrow"><i></i><?php esc_html_e( 'مسیر رشد', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'از علاقه تا عضویت در تیم، پله‌پله', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'دانش‌آموز مسیرش را انتخاب می‌کند و مدار دقیقاً نشان می‌دهد قدم بعدی چیست. هر پله XP مشخص دارد و آخرین پله به یک تیم واقعی می‌رسد.', 'madar' ); ?></p>
		</div>

		<div class="tracks" data-anim="up">
			<div class="track-tabs" role="tablist" aria-label="<?php esc_attr_e( 'مسیرهای رشد', 'madar' ); ?>">
				<?php foreach ( $madar_tracks as $madar_index => $madar_track ) : ?>
					<button
						class="track-tab"
						type="button"
						role="tab"
						id="tab-<?php echo esc_attr( $madar_track['key'] ); ?>"
						aria-controls="panel-<?php echo esc_attr( $madar_track['key'] ); ?>"
						aria-selected="<?php echo 0 === $madar_index ? 'true' : 'false'; ?>"
						data-track="<?php echo esc_attr( $madar_track['key'] ); ?>">
						<span aria-hidden="true"><?php echo esc_html( $madar_track['icon'] ); ?></span>
						<?php echo esc_html( $madar_track['name'] ); ?>
						<em><?php echo esc_html( $madar_track['count'] ); ?></em>
					</button>
				<?php endforeach; ?>
			</div>

			<div class="track-panels">
				<?php foreach ( $madar_tracks as $madar_index => $madar_track ) : ?>
					<div
						class="track-panel<?php echo 0 === $madar_index ? ' is-active' : ''; ?>"
						id="panel-<?php echo esc_attr( $madar_track['key'] ); ?>"
						role="tabpanel"
						aria-labelledby="tab-<?php echo esc_attr( $madar_track['key'] ); ?>">
						<div class="track-panel__head">
							<h3><?php echo esc_html( $madar_track['icon'] . ' مسیر ' . $madar_track['name'] ); ?></h3>
							<span class="chip chip--violet"><?php echo esc_html( $madar_track['count'] . ' در این مسیر' ); ?></span>
						</div>
						<p><?php echo esc_html( $madar_track['desc'] ); ?></p>

						<div class="steps">
							<?php
							$madar_last = count( $madar_track['steps'] ) - 1;
							foreach ( $madar_track['steps'] as $madar_step_index => $madar_step ) :
								?>
								<div class="step<?php echo $madar_step_index === $madar_last ? ' step--last' : ''; ?>">
									<div class="step__n" aria-hidden="true"><?php echo $madar_step_index === $madar_last ? '★' : esc_html( $madar_step_index + 1 ); ?></div>
									<div>
										<b><?php echo esc_html( $madar_step[0] ); ?></b>
										<p><?php echo esc_html( $madar_step[1] ); ?></p>
									</div>
									<span class="step__xp"><?php echo esc_html( $madar_step[2] ); ?></span>
								</div>
							<?php endforeach; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>
