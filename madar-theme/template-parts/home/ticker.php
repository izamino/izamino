<?php
/**
 * نوار فعالیت زنده.
 *
 * @package Madar
 */

$madar_items = madar_demo( 'ticker' );
?>
<div class="ticker" aria-label="<?php esc_attr_e( 'فعالیت زنده باشگاه', 'madar' ); ?>">
	<div class="ticker__track">
		<?php for ( $madar_pass = 0; $madar_pass < 2; $madar_pass++ ) : ?>
			<div class="ticker__group" <?php echo 1 === $madar_pass ? 'aria-hidden="true"' : ''; ?>>
				<span class="ticker__item">
					<i class="ticker__live" aria-hidden="true"></i>
					<em><?php esc_html_e( 'همین حالا در مدار', 'madar' ); ?></em>
				</span>
				<?php foreach ( $madar_items as $madar_item ) : ?>
					<span class="ticker__item">
						<span aria-hidden="true"><?php echo esc_html( $madar_item[0] ); ?></span>
						<b><?php echo esc_html( $madar_item[1] ); ?></b>
						<?php echo esc_html( $madar_item[2] ); ?>
					</span>
				<?php endforeach; ?>
			</div>
		<?php endfor; ?>
	</div>
</div>
