<?php
/**
 * کارت نوشته در آرشیوها.
 *
 * @package Madar
 */

?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'card card--media post-card' ); ?>>
	<a href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
		<?php madar_thumb( get_the_ID(), '📣' ); ?>
	</a>
	<div class="card__body">
		<?php
		$madar_terms = get_the_terms( get_the_ID(), 'madar_track' );
		if ( $madar_terms && ! is_wp_error( $madar_terms ) ) :
			?>
			<span class="chip chip--cyan"><?php echo esc_html( $madar_terms[0]->name ); ?></span>
		<?php endif; ?>

		<h3 style="margin-top:10px"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
		<p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 22 ) ); ?></p>

		<div class="card__foot">
			<span><?php echo esc_html( get_the_date() ); ?></span>
			<a href="<?php the_permalink(); ?>"><?php esc_html_e( 'ادامه ←', 'madar' ); ?></a>
		</div>
	</div>
</article>
