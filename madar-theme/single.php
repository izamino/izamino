<?php
/**
 * نمایش یک نوشته / مسابقه / دوره / رویداد / تیم / اثر.
 *
 * @package Madar
 */

get_header();

while ( have_posts() ) :
	the_post();

	$madar_fields = madar_meta_fields();
	$madar_type   = get_post_type();
	$madar_extra  = isset( $madar_fields[ $madar_type ] ) ? $madar_fields[ $madar_type ] : array();

	madar_page_hero( get_the_title(), madar_track_name( get_the_ID() ) );
	?>

	<div class="content-area">
		<div class="wrap">
			<div class="content-grid<?php echo is_active_sidebar( 'sidebar-1' ) ? '' : ' content-grid--full'; ?>">
				<div>
					<article id="post-<?php the_ID(); ?>" <?php post_class( 'entry' ); ?>>
						<div class="entry__meta">
							<span>🗓 <?php echo esc_html( get_the_date() ); ?></span>
							<?php if ( 'post' === $madar_type ) : ?>
								<span>✍️ <?php the_author(); ?></span>
							<?php endif; ?>
							<?php if ( comments_open() ) : ?>
								<span>💬 <?php comments_number( 'بدون دیدگاه', 'یک دیدگاه', '% دیدگاه' ); ?></span>
							<?php endif; ?>
						</div>

						<?php if ( has_post_thumbnail() ) : ?>
							<div class="entry__thumb"><?php the_post_thumbnail( 'full', array( 'alt' => '' ) ); ?></div>
						<?php endif; ?>

						<?php if ( $madar_extra ) : ?>
							<div class="pill-row" style="margin-bottom:20px">
								<?php
								foreach ( $madar_extra as $madar_key => $madar_label ) :
									$madar_value = madar_meta( get_the_ID(), $madar_key );
									if ( '' === $madar_value || 'madar_icon' === $madar_key ) {
										continue;
									}
									?>
									<span class="chip chip--soft"><?php echo esc_html( $madar_label . ': ' . $madar_value ); ?></span>
								<?php endforeach; ?>
							</div>
						<?php endif; ?>

						<div class="entry-content">
							<?php
							the_content();
							wp_link_pages( array( 'before' => '<nav class="pagination">', 'after' => '</nav>' ) );
							?>
						</div>

						<?php if ( 'post' === $madar_type ) : ?>
							<div class="card__foot"><?php the_tags( '<span>🏷 ', ' · ', '</span>' ); ?></div>
						<?php endif; ?>
					</article>

					<?php
					if ( comments_open() || get_comments_number() ) {
						echo '<div class="comments-area">';
						comments_template();
						echo '</div>';
					}
					?>
				</div>

				<?php if ( is_active_sidebar( 'sidebar-1' ) ) : ?>
					<aside class="widget-area"><?php dynamic_sidebar( 'sidebar-1' ); ?></aside>
				<?php endif; ?>
			</div>
		</div>
	</div>

	<?php
endwhile;

get_footer();
