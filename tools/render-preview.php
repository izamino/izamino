<?php
/**
 * شبیه‌ساز حداقلی وردپرس برای تولید فایل پیش‌نمایش استاتیک از قالب مدار.
 * فقط برای ساخت preview استفاده می‌شود و جزو قالب نیست.
 */

define( 'ABSPATH', __DIR__ );
define( 'MADAR_THEME_DIR', dirname( __DIR__ ) . '/madar-theme' );
define( 'MADAR_PREVIEW_OUT', dirname( __DIR__ ) . '/preview/madar-preview.html' );

$theme = MADAR_THEME_DIR;

/* ---- توابع بی‌اثر ---- */
foreach ( array(
	'add_action', 'add_filter', 'add_theme_support', 'register_nav_menus', 'load_theme_textdomain',
	'add_image_size', 'register_sidebar', 'register_post_type', 'register_taxonomy', 'add_meta_box',
	'wp_nonce_field', 'wp_body_open', 'dynamic_sidebar', 'the_post', 'wp_enqueue_script', 'wp_enqueue_style',
) as $noop ) {
	if ( ! function_exists( $noop ) ) {
		eval( "function {$noop}() {}" );
	}
}

/* ---- ترجمه و فرار ---- */
function __( $t, $d = null ) { return $t; }
function esc_html__( $t, $d = null ) { return $t; }
function esc_attr__( $t, $d = null ) { return $t; }
function _e( $t, $d = null ) { echo $t; }
function esc_html_e( $t, $d = null ) { echo htmlspecialchars( $t, ENT_QUOTES, 'UTF-8' ); }
function esc_attr_e( $t, $d = null ) { echo htmlspecialchars( $t, ENT_QUOTES, 'UTF-8' ); }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_url( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES, 'UTF-8' ); }
function esc_url_raw( $u ) { return $u; }
function wp_kses_post( $t ) { return $t; }
function sanitize_text_field( $t ) { return $t; }
function absint( $n ) { return abs( (int) $n ); }
function wp_trim_words( $t, $n = 20 ) { return $t; }
function wp_strip_all_tags( $t ) { return strip_tags( (string) $t ); }

/* ---- محیط قالب ---- */
function get_template_directory() { return MADAR_THEME_DIR; }
function get_template_directory_uri() { return 'assets-placeholder'; }
function get_stylesheet_uri() { return 'style.css'; }
function home_url( $p = '/' ) { return '#'; }
function get_bloginfo( $k = '' ) { return 'مدار'; }
function bloginfo( $k = '' ) { echo 'UTF-8'; }
function wp_date( $f ) { return date( $f ); }
function get_theme_mod( $k, $d = '' ) { return $d; }
function has_custom_logo() { return false; }
function has_nav_menu( $l ) { return false; }
function wp_nav_menu( $a = array() ) {}
function is_active_sidebar( $s ) { return false; }
function get_posts( $a = array() ) { return array(); }
function get_search_form() {}
function language_attributes() { echo 'lang="fa-IR" dir="rtl"'; }
function body_class( $c = '' ) { echo 'class="madar no-sidebar home"'; }
function comments_open() { return false; }
function get_comments_number() { return 0; }

function wp_head() {
	echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
	echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	echo '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">' . "\n";
	echo "<style>\n" . file_get_contents( get_template_directory() . '/style.css' ) . "\n</style>\n";
	echo '<title>مدار | باشگاه رشد دانش‌آموزان</title>' . "\n";
}

function wp_footer() {
	echo "<script>\n" . file_get_contents( get_template_directory() . '/assets/js/madar.js' ) . "\n</script>\n";
}

function get_header() { include get_template_directory() . '/header.php'; }
function get_footer() { include get_template_directory() . '/footer.php'; }

function get_template_part( $slug, $name = null ) {
	$file = get_template_directory() . '/' . $slug . ( $name ? "-{$name}" : '' ) . '.php';
	if ( file_exists( $file ) ) {
		include $file;
	}
}

/* ---- بارگذاری قالب ---- */
require $theme . '/inc/customizer.php';
require $theme . '/inc/demo-data.php';
require $theme . '/inc/template-tags.php';
require $theme . '/inc/post-types.php';

ob_start();
include $theme . '/front-page.php';
$html = ob_get_clean();

file_put_contents( MADAR_PREVIEW_OUT, $html );
echo "OK " . strlen( $html ) . " bytes\n";
