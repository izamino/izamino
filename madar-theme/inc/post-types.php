<?php
/**
 * نوع‌های محتوا و فیلدهای اختصاصی مدار.
 *
 * @package Madar
 */

defined( 'ABSPATH' ) || exit;

/**
 * ثبت نوع‌های محتوا.
 */
function madar_register_post_types() {
	$types = array(
		'madar_contest' => array(
			'single' => __( 'مسابقه', 'madar' ),
			'plural' => __( 'مسابقات', 'madar' ),
			'slug'   => 'contests',
			'icon'   => 'dashicons-awards',
		),
		'madar_course'  => array(
			'single' => __( 'دوره مهارت', 'madar' ),
			'plural' => __( 'آکادمی مهارت', 'madar' ),
			'slug'   => 'courses',
			'icon'   => 'dashicons-welcome-learn-more',
		),
		'madar_event'   => array(
			'single' => __( 'رویداد', 'madar' ),
			'plural' => __( 'رویدادها', 'madar' ),
			'slug'   => 'events',
			'icon'   => 'dashicons-calendar-alt',
		),
		'madar_team'    => array(
			'single' => __( 'تیم', 'madar' ),
			'plural' => __( 'تیم‌ها و انجمن‌ها', 'madar' ),
			'slug'   => 'teams',
			'icon'   => 'dashicons-groups',
		),
		'madar_work'    => array(
			'single' => __( 'اثر', 'madar' ),
			'plural' => __( 'نمایشگاه استعدادها', 'madar' ),
			'slug'   => 'talents',
			'icon'   => 'dashicons-format-image',
		),
	);

	foreach ( $types as $key => $type ) {
		register_post_type(
			$key,
			array(
				'labels'       => array(
					'name'          => $type['plural'],
					'singular_name' => $type['single'],
					/* translators: %s: نام نوع محتوا. */
					'add_new_item'  => sprintf( __( 'افزودن %s', 'madar' ), $type['single'] ),
					/* translators: %s: نام نوع محتوا. */
					'edit_item'     => sprintf( __( 'ویرایش %s', 'madar' ), $type['single'] ),
					'menu_name'     => $type['plural'],
				),
				'public'       => true,
				'has_archive'  => true,
				'rewrite'      => array( 'slug' => $type['slug'] ),
				'menu_icon'    => $type['icon'],
				'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'page-attributes' ),
				'show_in_rest' => true,
			)
		);
	}
}
add_action( 'init', 'madar_register_post_types' );

/**
 * ثبت طبقه‌بندی‌ها.
 */
function madar_register_taxonomies() {
	register_taxonomy(
		'madar_track',
		array( 'madar_course', 'madar_contest', 'madar_team', 'madar_work', 'madar_event' ),
		array(
			'labels'            => array(
				'name'          => __( 'مسیر رشد', 'madar' ),
				'singular_name' => __( 'مسیر', 'madar' ),
			),
			'public'            => true,
			'hierarchical'      => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'rewrite'           => array( 'slug' => 'track' ),
		)
	);

	register_taxonomy(
		'madar_city',
		array( 'madar_event', 'madar_contest', 'madar_team' ),
		array(
			'labels'            => array(
				'name'          => __( 'شهر / محدوده', 'madar' ),
				'singular_name' => __( 'شهر', 'madar' ),
			),
			'public'            => true,
			'hierarchical'      => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'rewrite'           => array( 'slug' => 'city' ),
		)
	);
}
add_action( 'init', 'madar_register_taxonomies' );

/**
 * تعریف فیلدهای اختصاصی هر نوع محتوا.
 *
 * @return array
 */
function madar_meta_fields() {
	return array(
		'madar_contest' => array(
			'madar_xp'       => __( 'XP مسابقه', 'madar' ),
			'madar_points'   => __( 'امتیاز باشگاه', 'madar' ),
			'madar_deadline' => __( 'مهلت شرکت (مثلاً: تا پنجشنبه ۲۲)', 'madar' ),
			'madar_joined'   => __( 'تعداد شرکت‌کننده', 'madar' ),
			'madar_prize'    => __( 'جایزه', 'madar' ),
			'madar_icon'     => __( 'ایموجی / نشان', 'madar' ),
		),
		'madar_course'  => array(
			'madar_level'    => __( 'سطح دوره', 'madar' ),
			'madar_duration' => __( 'مدت دوره', 'madar' ),
			'madar_mentor'   => __( 'مربی', 'madar' ),
			'madar_xp'       => __( 'XP دوره', 'madar' ),
			'madar_icon'     => __( 'ایموجی / نشان', 'madar' ),
		),
		'madar_event'   => array(
			'madar_date'     => __( 'تاریخ (روز)', 'madar' ),
			'madar_month'    => __( 'ماه', 'madar' ),
			'madar_place'    => __( 'مکان', 'madar' ),
			'madar_capacity' => __( 'ظرفیت', 'madar' ),
			'madar_xp'       => __( 'XP حضور', 'madar' ),
		),
		'madar_team'    => array(
			'madar_level' => __( 'سطح موردنیاز', 'madar' ),
			'madar_icon'  => __( 'ایموجی / نشان', 'madar' ),
		),
		'madar_work'    => array(
			'madar_student' => __( 'نام دانش‌آموز (نمایشی)', 'madar' ),
			'madar_icon'    => __( 'ایموجی / نشان', 'madar' ),
		),
	);
}

/**
 * افزودن جعبه فیلدها.
 */
function madar_add_meta_boxes() {
	foreach ( array_keys( madar_meta_fields() ) as $type ) {
		add_meta_box(
			'madar-details',
			__( 'جزئیات مدار', 'madar' ),
			'madar_render_meta_box',
			$type,
			'normal',
			'high'
		);
	}
}
add_action( 'add_meta_boxes', 'madar_add_meta_boxes' );

/**
 * نمایش جعبه فیلدها.
 *
 * @param WP_Post $post نوشته.
 */
function madar_render_meta_box( $post ) {
	$fields = madar_meta_fields();
	if ( empty( $fields[ $post->post_type ] ) ) {
		return;
	}

	wp_nonce_field( 'madar_save_meta', 'madar_meta_nonce' );

	echo '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:6px 0">';
	foreach ( $fields[ $post->post_type ] as $key => $label ) {
		printf(
			'<p style="margin:0"><label for="%1$s" style="display:block;font-weight:600;margin-bottom:4px">%2$s</label>
			<input type="text" id="%1$s" name="%1$s" value="%3$s" class="widefat"></p>',
			esc_attr( $key ),
			esc_html( $label ),
			esc_attr( get_post_meta( $post->ID, $key, true ) )
		);
	}
	echo '</div>';
}

/**
 * ذخیره فیلدها.
 *
 * @param int $post_id شناسه نوشته.
 */
function madar_save_meta( $post_id ) {
	if ( ! isset( $_POST['madar_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['madar_meta_nonce'] ) ), 'madar_save_meta' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	$fields = madar_meta_fields();
	$type   = get_post_type( $post_id );
	if ( empty( $fields[ $type ] ) ) {
		return;
	}

	foreach ( array_keys( $fields[ $type ] ) as $key ) {
		if ( isset( $_POST[ $key ] ) ) {
			update_post_meta( $post_id, $key, sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) );
		}
	}
}
add_action( 'save_post', 'madar_save_meta' );
