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
		<div class="s-head reveal">
			<span class="eyebrow"><i></i><?php esc_html_e( 'مسیر رشد', 'madar' ); ?></span>
			<h2><?php esc_html_e( 'از علاقه تا عضویت در تیم، پله‌پله', 'madar' ); ?></h2>
			<p><?php esc_html_e( 'دانش‌آموز مسیرش را انتخاب می‌کند و مدار دقیقاً نشان می‌دهد قدم بعدی چیست: سطح ۱ ← سطح ۲ ← پروژه ← عضویت در تیم.', 'madar' ); ?></p>
		</div>

		<div class="tracks reveal">
			<div class="track-tabs" role="tablist" aria-label="<?php esc_attr_e( 'مسیرهای رشد', 'madar' ); ?>">
				<?php foreach ( $madar_tracks as $index => $track ) : ?>
					<button
						class="track-tab"
						type="button"
						role="tab"
						id="tab-<?php echo esc_attr( $track['key'] ); ?>"
						aria-controls="panel-<?php echo esc_attr( $track['key'] ); ?>"
						aria-selected="<?php echo 0 === $index ? 'true' : 'false'; ?>"
						data-track="<?php echo esc_attr( $track['key'] ); ?>">
						<span aria-hidden="true"><?php echo esc_html( $track['icon'] ); ?></span>
						<?php echo esc_html( $track['name'] ); ?>
					</button>
				<?php endforeach; ?>
			</div>

			<div class="track-panels">
				<?php foreach ( $madar_tracks as $index => $track ) : ?>
					<div
						class="track-panel<?php echo 0 === $index ? ' is-active' : ''; ?>"
						id="panel-<?php echo esc_attr( $track['key'] ); ?>"
						role="tabpanel"
						aria-labelledby="tab-<?php echo esc_attr( $track['key'] ); ?>">
						<h3><?php echo esc_html( $track['icon'] . ' مسیر ' . $track['name'] ); ?></h3>
						<p><?php echo esc_html( $track['desc'] ); ?></p>

						<div class="steps">
							<?php
							$madar_last = count( $track['steps'] ) - 1;
							foreach ( $track['steps'] as $step_index => $step ) :
								?>
								<div class="step<?php echo $step_index === $madar_last ? ' step--last' : ''; ?>">
									<div class="step__n" aria-hidden="true"><?php echo $step_index === $madar_last ? '★' : esc_html( $step_index + 1 ); ?></div>
									<div>
										<b><?php echo esc_html( $step[0] ); ?></b>
										<p><?php echo esc_html( $step[1] ); ?></p>
									</div>
								</div>
							<?php endforeach; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>
