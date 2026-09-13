<?php
/**
 * قالب مدار | باشگاه رشد دانش‌آموزان
 *
 * @package Madar
 */

defined( 'ABSPATH' ) || exit;

define( 'MADAR_VERSION', '1.0.0' );

/**
 * پشتیبانی‌های قالب.
 */
function madar_setup() {
	load_theme_textdomain( 'madar', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'customize-selective-refresh-widgets' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 64,
			'width'       => 64,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	register_nav_menus(
		array(
			'primary' => __( 'منوی اصلی', 'madar' ),
			'footer'  => __( 'منوی فوتر', 'madar' ),
		)
	);

	add_image_size( 'madar-card', 720, 460, true );
}
add_action( 'after_setup_theme', 'madar_setup' );

/**
 * عرض محتوا.
 */
function madar_content_width() {
	$GLOBALS['content_width'] = 840;
}
add_action( 'after_setup_theme', 'madar_content_width', 0 );

/**
 * استایل و اسکریپت.
 */
function madar_assets() {
	wp_enqueue_style(
		'madar-fonts',
		'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap',
		array(),
		null
	);

	wp_enqueue_style( 'madar-style', get_stylesheet_uri(), array( 'madar-fonts' ), MADAR_VERSION );

	wp_enqueue_script( 'madar-script', get_template_directory_uri() . '/assets/js/madar.js', array(), MADAR_VERSION, true );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'madar_assets' );

/**
 * ابزارک‌ها.
 */
function madar_widgets_init() {
	register_sidebar(
		array(
			'name'          => __( 'ستون کنار نوشته‌ها', 'madar' ),
			'id'            => 'sidebar-1',
			'description'   => __( 'در برگه‌ی وبلاگ و نوشته‌ها نمایش داده می‌شود.', 'madar' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h3 class="widget-title">',
			'after_title'   => '</h3>',
		)
	);
}
add_action( 'widgets_init', 'madar_widgets_init' );

/**
 * قالب راست‌چین است؛ اگر زبان سایت فارسی نبود هم جهت درست بماند.
 *
 * @param string $output ویژگی‌های تگ html.
 * @return string
 */
function madar_force_rtl_attribute( $output ) {
	if ( false === strpos( $output, 'dir=' ) ) {
		$output .= ' dir="rtl"';
	}
	return $output;
}
add_filter( 'language_attributes', 'madar_force_rtl_attribute' );

/**
 * کلاس‌های بدنه.
 *
 * @param array $classes کلاس‌ها.
 * @return array
 */
function madar_body_classes( $classes ) {
	$classes[] = 'madar';
	if ( ! is_active_sidebar( 'sidebar-1' ) ) {
		$classes[] = 'no-sidebar';
	}
	return $classes;
}
add_filter( 'body_class', 'madar_body_classes' );

/**
 * طول خلاصه.
 *
 * @return int
 */
function madar_excerpt_length() {
	return 26;
}
add_filter( 'excerpt_length', 'madar_excerpt_length' );

/**
 * ادامه‌ی خلاصه.
 *
 * @return string
 */
function madar_excerpt_more() {
	return '…';
}
add_filter( 'excerpt_more', 'madar_excerpt_more' );

require_once get_template_directory() . '/inc/post-types.php';
require_once get_template_directory() . '/inc/customizer.php';
require_once get_template_directory() . '/inc/demo-data.php';
require_once get_template_directory() . '/inc/template-tags.php';
