<?php
/**
 * سرصفحه.
 *
 * @package Madar
 */

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#070B1A">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<a class="skip-link" href="#content"><?php esc_html_e( 'پرش به محتوا', 'madar' ); ?></a>

<header class="site-header" id="site-header">
	<div class="wrap nav">
		<?php madar_brand(); ?>

		<nav class="nav__nav" aria-label="<?php esc_attr_e( 'منوی اصلی', 'madar' ); ?>">
			<?php
			if ( has_nav_menu( 'primary' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'nav__menu',
						'depth'          => 2,
					)
				);
			} else {
				?>
				<ul class="nav__menu">
					<li><a href="#features"><?php esc_html_e( 'امکانات', 'madar' ); ?></a></li>
					<li><a href="#tracks"><?php esc_html_e( 'مسیر رشد', 'madar' ); ?></a></li>
					<li><a href="#contests"><?php esc_html_e( 'مسابقات', 'madar' ); ?></a></li>
					<li><a href="#academy"><?php esc_html_e( 'آکادمی', 'madar' ); ?></a></li>
					<li><a href="#events"><?php esc_html_e( 'رویدادها', 'madar' ); ?></a></li>
					<li><a href="#schools"><?php esc_html_e( 'مدارس', 'madar' ); ?></a></li>
					<li><a href="#faq"><?php esc_html_e( 'سؤالات', 'madar' ); ?></a></li>
				</ul>
				<?php
			}
			?>
		</nav>

		<div class="nav__cta">
			<a class="btn btn--line btn--sm" href="<?php echo esc_url( madar_opt( 'madar_school_url' ) ); ?>"><?php esc_html_e( 'ثبت‌نام مدرسه', 'madar' ); ?></a>
			<a class="btn btn--primary btn--sm" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>"><?php esc_html_e( 'دریافت اپ', 'madar' ); ?></a>
			<button class="nav__burger" id="madar-burger" type="button" aria-expanded="false" aria-controls="madar-panel" aria-label="<?php esc_attr_e( 'منو', 'madar' ); ?>">
				<span></span><span></span><span></span>
			</button>
		</div>
	</div>

	<div class="nav__panel" id="madar-panel">
		<?php
		if ( has_nav_menu( 'primary' ) ) {
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'nav__menu',
					'depth'          => 2,
				)
			);
		} else {
			?>
			<ul class="nav__menu">
				<li><a href="#features"><?php esc_html_e( 'امکانات', 'madar' ); ?></a></li>
				<li><a href="#tracks"><?php esc_html_e( 'مسیر رشد', 'madar' ); ?></a></li>
				<li><a href="#dossier"><?php esc_html_e( 'پرونده رشد', 'madar' ); ?></a></li>
				<li><a href="#contests"><?php esc_html_e( 'مسابقات', 'madar' ); ?></a></li>
				<li><a href="#academy"><?php esc_html_e( 'آکادمی مهارت', 'madar' ); ?></a></li>
				<li><a href="#rewards"><?php esc_html_e( 'باشگاه امتیازات', 'madar' ); ?></a></li>
				<li><a href="#events"><?php esc_html_e( 'رویدادها', 'madar' ); ?></a></li>
				<li><a href="#gallery"><?php esc_html_e( 'نمایشگاه استعدادها', 'madar' ); ?></a></li>
				<li><a href="#schools"><?php esc_html_e( 'باشگاه مدارس', 'madar' ); ?></a></li>
				<li><a href="#safety"><?php esc_html_e( 'ایمنی نوجوان', 'madar' ); ?></a></li>
				<li><a href="#faq"><?php esc_html_e( 'سؤالات پرتکرار', 'madar' ); ?></a></li>
			</ul>
			<?php
		}
		?>
		<a class="btn btn--primary btn--block" href="<?php echo esc_url( madar_opt( 'madar_dl_android' ) ); ?>"><?php esc_html_e( 'دریافت اپلیکیشن مدار', 'madar' ); ?></a>
	</div>
</header>

<main id="content" class="site-main">
