<?php
/**
 * برگه.
 *
 * @package Madar
 */

get_header();

while ( have_posts() ) :
	the_post();
	madar_page_hero( get_the_title(), get_the_excerpt() );
	?>

	<div class="content-area">
		<div class="wrap">
			<div class="content-grid content-grid--full">
				<article id="post-<?php the_ID(); ?>" <?php post_class( 'entry' ); ?>>
					<?php if ( has_post_thumbnail() ) : ?>
						<div class="entry__thumb"><?php the_post_thumbnail( 'full', array( 'alt' => '' ) ); ?></div>
					<?php endif; ?>
					<div class="entry-content">
						<?php the_content(); ?>
					</div>
				</article>

				<?php
				if ( comments_open() || get_comments_number() ) {
					echo '<div class="comments-area">';
					comments_template();
					echo '</div>';
				}
				?>
			</div>
		</div>
	</div>

	<?php
endwhile;

get_footer();
