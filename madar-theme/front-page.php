<?php
/**
 * صفحه اصلی مدار.
 *
 * @package Madar
 */

get_header();

get_template_part( 'template-parts/home/hero' );

$madar_sections = array(
	'ticker',
	'loop',
	'features',
	'how',
	'screens',
	'tracks',
	'dossier',
	'contests',
	'academy',
	'rewards',
	'events',
	'gallery',
	'teams',
	'voices',
	'numbers',
	'schools',
	'safety',
	'panels',
	'roadmap',
	'news',
	'faq',
	'download',
	'cta',
);

foreach ( $madar_sections as $madar_section ) {
	if ( madar_show( $madar_section ) ) {
		get_template_part( 'template-parts/home/' . $madar_section );
	}
}

get_footer();
