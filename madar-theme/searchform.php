<?php
/**
 * فرم جست‌وجو.
 *
 * @package Madar
 */

?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="madar-s"><?php esc_html_e( 'جست‌وجو', 'madar' ); ?></label>
	<input type="search" id="madar-s" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="<?php esc_attr_e( 'جست‌وجو در مدار…', 'madar' ); ?>">
	<button type="submit" class="btn btn--primary btn--sm"><?php esc_html_e( 'بگرد', 'madar' ); ?></button>
</form>
