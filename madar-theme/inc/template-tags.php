<?php
/**
 * توابع کمکی قالب.
 *
 * @package Madar
 */

defined( 'ABSPATH' ) || exit;

/**
 * خواندن یک تنظیم قالب همراه با مقدار پیش‌فرض آن.
 *
 * @param string $key کلید تنظیم.
 * @return string
 */
function madar_opt( $key ) {
	$map     = madar_settings_map();
	$default = isset( $map[ $key ][2] ) ? $map[ $key ][2] : '';

	return (string) get_theme_mod( $key, $default );
}

/**
 * آیا این بخش صفحه اصلی نمایش داده شود؟
 *
 * @param string $key نام بخش.
 * @return bool
 */
function madar_show( $key ) {
	return (bool) get_theme_mod( 'madar_show_' . $key, true );
}

/**
 * نشان (لوگو) مدار به‌صورت SVG درون‌خطی.
 *
 * @param int $size اندازه.
 */
function madar_logo_mark( $size = 42 ) {
	?>
	<svg class="brand__mark" width="<?php echo absint( $size ); ?>" height="<?php echo absint( $size ); ?>" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
		<rect width="48" height="48" rx="14" fill="url(#madar-g)"/>
		<ellipse cx="24" cy="24" rx="15" ry="7.5" transform="rotate(-28 24 24)" stroke="#fff" stroke-opacity=".85" stroke-width="2"/>
		<circle cx="24" cy="24" r="5" fill="#fff"/>
		<circle cx="37" cy="15" r="3.2" fill="#F9A825"/>
		<defs>
			<linearGradient id="madar-g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
				<stop stop-color="#5B5BF6"/>
				<stop offset="1" stop-color="#22D3EE"/>
			</linearGradient>
		</defs>
	</svg>
	<?php
}

/**
 * نمایش برند (لوگوی سفارشی یا نشان پیش‌فرض).
 */
function madar_brand() {
	?>
	<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
		<?php
		if ( has_custom_logo() ) {
			$logo_id = get_theme_mod( 'custom_logo' );
			echo wp_get_attachment_image( $logo_id, 'full', false, array( 'class' => 'brand__mark', 'alt' => '' ) );
		} else {
			madar_logo_mark();
		}
		?>
		<span class="brand__txt">
			<span class="brand__name"><?php echo esc_html( madar_opt( 'madar_brand_name' ) ); ?></span>
			<span class="brand__sub"><?php echo esc_html( madar_opt( 'madar_brand_sub' ) ); ?></span>
		</span>
	</a>
	<?php
}

/**
 * گرفتن نوشته‌های یک نوع محتوا (اگر محتوایی ثبت شده باشد).
 *
 * @param string $type  نوع محتوا.
 * @param int    $limit تعداد.
 * @return WP_Post[]
 */
function madar_posts( $type, $limit = 6 ) {
	return get_posts(
		array(
			'post_type'        => $type,
			'posts_per_page'   => $limit,
			'orderby'          => array( 'menu_order' => 'ASC', 'date' => 'DESC' ),
			'suppress_filters' => false,
		)
	);
}

/**
 * خواندن یک فیلد اختصاصی.
 *
 * @param int    $post_id شناسه.
 * @param string $key     کلید.
 * @param string $default مقدار جایگزین.
 * @return string
 */
function madar_meta( $post_id, $key, $default = '' ) {
	$value = get_post_meta( $post_id, $key, true );
	return '' !== $value ? $value : $default;
}

/**
 * نام اولین مسیر رشد یک نوشته.
 *
 * @param int $post_id شناسه.
 * @return string
 */
function madar_track_name( $post_id ) {
	$terms = get_the_terms( $post_id, 'madar_track' );
	if ( is_wp_error( $terms ) || empty( $terms ) ) {
		return '';
	}
	return $terms[0]->name;
}

/**
 * تصویر شاخص یا ایموجی جایگزین.
 *
 * @param int    $post_id شناسه.
 * @param string $emoji   ایموجی پیش‌فرض.
 */
function madar_thumb( $post_id, $emoji = '✨' ) {
	echo '<div class="card__thumb">';
	if ( has_post_thumbnail( $post_id ) ) {
		echo get_the_post_thumbnail( $post_id, 'madar-card', array( 'alt' => '' ) );
	} else {
		echo '<span aria-hidden="true">' . esc_html( madar_meta( $post_id, 'madar_icon', $emoji ) ) . '</span>';
	}
	echo '</div>';
}

/**
 * نمایش تیتر صفحه‌های داخلی.
 *
 * @param string $title عنوان.
 * @param string $sub   زیرعنوان.
 */
function madar_page_hero( $title, $sub = '' ) {
	?>
	<section class="page-hero">
		<div class="wrap">
			<h1><?php echo esc_html( $title ); ?></h1>
			<?php if ( $sub ) : ?>
				<p><?php echo esc_html( $sub ); ?></p>
			<?php endif; ?>
		</div>
	</section>
	<?php
}

/**
 * صفحه‌بندی یکدست.
 */
function madar_pagination() {
	$links = paginate_links( array( 'type' => 'array', 'prev_text' => '→', 'next_text' => '←' ) );
	if ( empty( $links ) ) {
		return;
	}
	echo '<nav class="pagination">' . implode( '', $links ) . '</nav>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
