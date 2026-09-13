<?php
/**
 * تنظیمات سفارشی‌سازی (ظاهر ← سفارشی‌سازی ← مدار).
 *
 * @package Madar
 */

defined( 'ABSPATH' ) || exit;

/**
 * فهرست تنظیمات قالب: کلید ← [بخش, برچسب, پیش‌فرض, نوع].
 *
 * @return array
 */
function madar_settings_map() {
	return array(
		// هویت برند.
		'madar_brand_name'   => array( 'madar_brand', __( 'نام برند', 'madar' ), 'مدار', 'text' ),
		'madar_brand_sub'    => array( 'madar_brand', __( 'زیرعنوان برند', 'madar' ), 'باشگاه رشد دانش‌آموزان', 'text' ),

		// هیرو.
		'madar_hero_badge'   => array( 'madar_hero', __( 'برچسب بالای تیتر', 'madar' ), 'فاز اول: آبادان و خرمشهر', 'text' ),
		'madar_hero_title'   => array( 'madar_hero', __( 'تیتر اصلی', 'madar' ), 'باشگاهی که هر هفته دلیلی برای <mark>رشد</mark> به دانش‌آموز می‌دهد', 'textarea' ),
		'madar_hero_text'    => array( 'madar_hero', __( 'متن هیرو', 'madar' ), 'مدار فقط اپ مسابقه و مشاوره نیست؛ یک باشگاه رشد است. مأموریت هفتگی، مسیر مهارت، پرونده رشد دیجیتال، رویدادهای واقعی و مشاوره‌ی امن — همه در یک اپ.', 'textarea' ),
		'madar_hero_btn1'    => array( 'madar_hero', __( 'متن دکمه اول', 'madar' ), 'دریافت اپلیکیشن', 'text' ),
		'madar_hero_btn1_url' => array( 'madar_hero', __( 'لینک دکمه اول', 'madar' ), '#download', 'url' ),
		'madar_hero_btn2'    => array( 'madar_hero', __( 'متن دکمه دوم', 'madar' ), 'مدار چطور کار می‌کند؟', 'text' ),
		'madar_hero_btn2_url' => array( 'madar_hero', __( 'لینک دکمه دوم', 'madar' ), '#loop', 'url' ),

		// آمار.
		'madar_stat1_num'    => array( 'madar_stats', __( 'آمار ۱ — عدد', 'madar' ), '۱۰۰۰+', 'text' ),
		'madar_stat1_lbl'    => array( 'madar_stats', __( 'آمار ۱ — عنوان', 'madar' ), 'دانش‌آموز فاز اول', 'text' ),
		'madar_stat2_num'    => array( 'madar_stats', __( 'آمار ۲ — عدد', 'madar' ), '۹', 'text' ),
		'madar_stat2_lbl'    => array( 'madar_stats', __( 'آمار ۲ — عنوان', 'madar' ), 'دسته مسابقه هفتگی', 'text' ),
		'madar_stat3_num'    => array( 'madar_stats', __( 'آمار ۳ — عدد', 'madar' ), '۸', 'text' ),
		'madar_stat3_lbl'    => array( 'madar_stats', __( 'آمار ۳ — عنوان', 'madar' ), 'مسیر رشد تخصصی', 'text' ),
		'madar_stat4_num'    => array( 'madar_stats', __( 'آمار ۴ — عدد', 'madar' ), '۲', 'text' ),
		'madar_stat4_lbl'    => array( 'madar_stats', __( 'آمار ۴ — عنوان', 'madar' ), 'شهر: آبادان، خرمشهر', 'text' ),

		// دانلود و ارتباط.
		'madar_dl_android'   => array( 'madar_contact', __( 'لینک دانلود اندروید', 'madar' ), '#', 'url' ),
		'madar_dl_ios'       => array( 'madar_contact', __( 'لینک نسخه iOS / وب‌اپ', 'madar' ), '#', 'url' ),
		'madar_school_url'   => array( 'madar_contact', __( 'لینک «ثبت‌نام مدرسه»', 'madar' ), '#schools', 'url' ),
		'madar_phone'        => array( 'madar_contact', __( 'شماره پشتیبانی', 'madar' ), '۰۶۱-۰۰۰۰۰۰۰۰', 'text' ),
		'madar_email'        => array( 'madar_contact', __( 'ایمیل', 'madar' ), 'info@madar.club', 'text' ),
		'madar_address'      => array( 'madar_contact', __( 'نشانی کوتاه', 'madar' ), 'آبادان و خرمشهر، خوزستان', 'text' ),
		'madar_social_ig'    => array( 'madar_contact', __( 'اینستاگرام', 'madar' ), '#', 'url' ),
		'madar_social_tg'    => array( 'madar_contact', __( 'تلگرام', 'madar' ), '#', 'url' ),
		'madar_social_yt'    => array( 'madar_contact', __( 'آپارات / یوتیوب', 'madar' ), '#', 'url' ),
	);
}

/**
 * ثبت تنظیمات.
 *
 * @param WP_Customize_Manager $wp_customize شیء سفارشی‌سازی.
 */
function madar_customize_register( $wp_customize ) {
	$wp_customize->add_panel(
		'madar_panel',
		array(
			'title'       => __( 'تنظیمات مدار', 'madar' ),
			'description' => __( 'محتوای صفحه اصلی، برند و راه‌های ارتباط.', 'madar' ),
			'priority'    => 20,
		)
	);

	$sections = array(
		'madar_brand'   => __( 'برند', 'madar' ),
		'madar_hero'    => __( 'بخش هیرو', 'madar' ),
		'madar_stats'   => __( 'آمار', 'madar' ),
		'madar_contact' => __( 'دانلود و ارتباط', 'madar' ),
		'madar_toggles' => __( 'نمایش بخش‌های صفحه اصلی', 'madar' ),
	);

	foreach ( $sections as $id => $title ) {
		$wp_customize->add_section( $id, array( 'title' => $title, 'panel' => 'madar_panel' ) );
	}

	foreach ( madar_settings_map() as $key => $conf ) {
		list( $section, $label, $default, $type ) = $conf;

		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $default,
				'sanitize_callback' => 'url' === $type ? 'esc_url_raw' : ( 'textarea' === $type ? 'wp_kses_post' : 'sanitize_text_field' ),
				'transport'         => 'refresh',
			)
		);

		$wp_customize->add_control(
			$key,
			array(
				'label'   => $label,
				'section' => $section,
				'type'    => 'textarea' === $type ? 'textarea' : ( 'url' === $type ? 'url' : 'text' ),
			)
		);
	}

	// کلیدهای روشن/خاموش بخش‌های صفحه اصلی.
	foreach ( madar_home_sections() as $key => $label ) {
		$wp_customize->add_setting(
			'madar_show_' . $key,
			array(
				'default'           => true,
				'sanitize_callback' => 'madar_sanitize_checkbox',
			)
		);
		$wp_customize->add_control(
			'madar_show_' . $key,
			array(
				'label'   => $label,
				'section' => 'madar_toggles',
				'type'    => 'checkbox',
			)
		);
	}
}
add_action( 'customize_register', 'madar_customize_register' );

/**
 * بخش‌های قابل نمایش صفحه اصلی.
 *
 * @return array
 */
function madar_home_sections() {
	return array(
		'loop'     => __( 'حلقه رشد', 'madar' ),
		'features' => __( 'امکانات اپ', 'madar' ),
		'tracks'   => __( 'مسیر رشد', 'madar' ),
		'dossier'  => __( 'پرونده رشد', 'madar' ),
		'contests' => __( 'مسابقات هفتگی', 'madar' ),
		'academy'  => __( 'آکادمی مهارت', 'madar' ),
		'rewards'  => __( 'باشگاه امتیازات', 'madar' ),
		'events'   => __( 'رویدادها', 'madar' ),
		'gallery'  => __( 'نمایشگاه استعدادها', 'madar' ),
		'teams'    => __( 'تیم‌ها و انجمن‌ها', 'madar' ),
		'schools'  => __( 'باشگاه مدارس', 'madar' ),
		'safety'   => __( 'ایمنی نوجوان', 'madar' ),
		'panels'   => __( 'پنل‌های مدیریتی', 'madar' ),
		'news'     => __( 'آخرین اخبار', 'madar' ),
		'faq'      => __( 'سؤالات پرتکرار', 'madar' ),
		'cta'      => __( 'فراخوان پایانی', 'madar' ),
	);
}

/**
 * پاک‌سازی چک‌باکس.
 *
 * @param mixed $value مقدار.
 * @return bool
 */
function madar_sanitize_checkbox( $value ) {
	return (bool) $value;
}
