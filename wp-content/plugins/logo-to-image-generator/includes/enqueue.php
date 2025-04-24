<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Enqueue scripts and styles for the product slider
 */
function lig_enqueue_scripts() {
    if (is_product()) {
        // Slick Slider
        wp_enqueue_style('slick', 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css', array(), '1.8.1');
        wp_enqueue_style('slick-theme', 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css', array(), '1.8.1');
        wp_enqueue_script('slick', 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js', array('jquery'), '1.8.1', true);
        // product zoom
        wp_enqueue_style('lig-product-zoom', plugin_dir_url(__FILE__) . '/assets/css/product-zoom.css');

        // Plugin assets
        wp_enqueue_style('lig-product-slider', LIG_PLUGIN_URL . '/assets/css/product-slider.css', array(), '1.0.0');
        wp_enqueue_script('lig-product-slider', LIG_PLUGIN_URL . '/assets/js/product-slider.js', array('jquery', 'slick'), '1.0.0', true);
    }
}
add_action('wp_enqueue_scripts', 'lig_enqueue_scripts');