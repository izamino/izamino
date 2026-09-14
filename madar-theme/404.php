<?php
/**
 * صفحه پیدا نشد.
 *
 * @package Madar
 */

get_header();
?>

<div class="wrap error-404">
	<div class="big">۴۰۴</div>
	<h1><?php esc_html_e( 'این صفحه در مدار نیست', 'madar' ); ?></h1>
	<p style="color:var(--muted)"><?php esc_html_e( 'شاید نشانی تغییر کرده باشد. از اینجا به مسیر رشدت برگرد.', 'madar' ); ?></p>
	<div class="pill-row" style="justify-content:center;margin-top:22px">
		<a class="btn btn--primary" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'صفحه اصلی', 'madar' ); ?></a>
		<a class="btn btn--line" href="<?php echo esc_url( home_url( '/contests/' ) ); ?>"><?php esc_html_e( 'مسابقات هفتگی', 'madar' ); ?></a>
	</div>
	<div style="max-width:420px;margin:30px auto 0"><?php get_search_form(); ?></div>
</div>

<?php
get_footer();
