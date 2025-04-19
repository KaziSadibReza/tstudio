<?php
/**
 * Plugin Name: Logo to Image Generator
 * Plugin URI: https://github.com/KaziSadibReza/tstudio
 * Description: Generate images with logos overlaid on product mockups
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://github.com/KaziSadibReza
 * Text Domain: logo-to-image-generator
 * Requires at least: 5.0
 * Requires PHP: 7.2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin constants
define('LIG_PLUGIN_URL', plugins_url('', __FILE__));
define('LIG_PLUGIN_DIR', plugin_dir_path(__FILE__));

// Function to localize Ajax data for JavaScript
function lig_localize_ajax_script() {
    wp_localize_script('lig-product-slider', 'lig_ajax', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('lig_ajax_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'lig_localize_ajax_script', 99);

// Load required files
require_once(LIG_PLUGIN_DIR . 'includes/enqueue.php');
require_once(LIG_PLUGIN_DIR . 'includes/shortcode.php');
require_once(LIG_PLUGIN_DIR . 'includes/ajax-handlers.php');