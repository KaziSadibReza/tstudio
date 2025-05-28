<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Get cached composite image if it exists and is valid
 */
function lig_get_cached_image($mockup_url, $logo_url) {
    $upload_dir = wp_upload_dir();
    $filename = md5($mockup_url . $logo_url) . '.png';
    $save_path = $upload_dir['basedir'] . '/lig-composite-images/' . $filename;
    $image_url = $upload_dir['baseurl'] . '/lig-composite-images/' . $filename;

    // Check if file exists and is not too old (7 days)
    if (file_exists($save_path)) {
        $file_age = time() - filemtime($save_path);
        if ($file_age < 7 * DAY_IN_SECONDS) {
            return array(
                'url' => $image_url,
                'from_cache' => true
            );
        }
        // File exists but is too old, delete it
        @unlink($save_path);
    }
    return false;
}

/**
 * Save composite image to cache
 */
function lig_save_to_cache($composite, $mockup_url, $logo_url) {
    $upload_dir = wp_upload_dir();
    $lig_dir = $upload_dir['basedir'] . '/lig-composite-images';
    
    // Create cache directory if it doesn't exist
    if (!file_exists($lig_dir)) {
        wp_mkdir_p($lig_dir);
        
        // Create .htaccess to protect cache directory
        $htaccess = $lig_dir . '/.htaccess';
        if (!file_exists($htaccess)) {
            $rules = "# Protect composite images\n";
            $rules .= "<IfModule mod_rewrite.c>\n";
            $rules .= "RewriteEngine On\n";
            $rules .= "RewriteCond %{HTTP_REFERER} !^" . get_site_url() . " [NC]\n";
            $rules .= "RewriteRule .* - [F,L]\n";
            $rules .= "</IfModule>";
            @file_put_contents($htaccess, $rules);
        }
    }
    
    $filename = md5($mockup_url . $logo_url) . '.png';
    $save_path = $lig_dir . '/' . $filename;
    $image_url = $upload_dir['baseurl'] . '/lig-composite-images/' . $filename;

    // Save the image
    if (imagepng($composite, $save_path)) {
        return array(
            'url' => $image_url,
            'from_cache' => false
        );
    }
    return false;
}

/**
 * Clean up old cached images (run daily via cron)
 */
function lig_cleanup_cached_images() {
    $upload_dir = wp_upload_dir();
    $lig_dir = $upload_dir['basedir'] . '/lig-composite-images';
    
    if (!file_exists($lig_dir)) {
        return;
    }
    
    $files = glob($lig_dir . '/*.png');
    $now = time();
    
    foreach ($files as $file) {
        // Remove files older than 7 days
        if ($now - filemtime($file) > 7 * DAY_IN_SECONDS) {
            @unlink($file);
        }
    }
}

// Schedule daily cache cleanup
if (!wp_next_scheduled('lig_daily_cache_cleanup')) {
    wp_schedule_event(time(), 'daily', 'lig_daily_cache_cleanup');
}
add_action('lig_daily_cache_cleanup', 'lig_cleanup_cached_images');

/**
 * Handle AJAX request to generate composite image
 */
function lig_generate_composite_image() {
    // Check nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'lig_ajax_nonce')) {
        wp_send_json_error('Invalid security token.');
        return;
    }

    // Get and validate parameters
    $mockup_url = isset($_POST['mockup_url']) ? sanitize_text_field($_POST['mockup_url']) : '';
    $logo_url = isset($_POST['logo_url']) ? sanitize_text_field($_POST['logo_url']) : '';
    
    if (empty($mockup_url) || empty($logo_url)) {
        wp_send_json_error('Missing required parameters.');
        return;
    }

    // Try to get cached image first
    $cached = lig_get_cached_image($mockup_url, $logo_url);
    if ($cached !== false) {
        wp_send_json_success($cached);
        return;
    }

    // Download the source images with error suppression
    $mockup_content = @file_get_contents($mockup_url);
    $logo_content = @file_get_contents($logo_url);
    
    if (!$mockup_content || !$logo_content) {
        wp_send_json_error('Failed to download source images.');
        return;
    }

    // Create temporary files
    $mockup_temp = wp_tempnam('lig_mockup');
    $logo_temp = wp_tempnam('lig_logo');
    
    file_put_contents($mockup_temp, $mockup_content);
    file_put_contents($logo_temp, $logo_content);
    
    try {
        // Create image resources with error suppression
        $mockup = @imagecreatefromstring($mockup_content);
        $logo = @imagecreatefromstring($logo_content);
        
        if (!$mockup || !$logo) {
            throw new Exception('Failed to create image resources.');
        }
        
        // Get dimensions
        $mockup_width = imagesx($mockup);
        $mockup_height = imagesy($mockup);
        $logo_width = imagesx($logo);
        $logo_height = imagesy($logo);
        
        // Resize logo to fit on mockup (30% of mockup width)
        $new_logo_width = $mockup_width * 0.3;
        $new_logo_height = $logo_height * ($new_logo_width / $logo_width);
        
        // Position logo in the center of mockup
        $logo_x = ($mockup_width - $new_logo_width) / 2;
        $logo_y = ($mockup_height - $new_logo_height) / 2;
        
        // Create canvas for the composite image
        $composite = imagecreatetruecolor($mockup_width, $mockup_height);
        
        // Preserve transparency for PNG
        imagealphablending($composite, false);
        imagesavealpha($composite, true);
        $transparent = imagecolorallocatealpha($composite, 255, 255, 255, 127);
        imagefilledrectangle($composite, 0, 0, $mockup_width, $mockup_height, $transparent);
        
        // Copy mockup to canvas
        imagecopyresampled($composite, $mockup, 0, 0, 0, 0, $mockup_width, $mockup_height, $mockup_width, $mockup_height);
        
        // Enable alpha blending for overlay
        imagealphablending($composite, true);
        
        // Copy logo to canvas with resizing
        imagecopyresampled($composite, $logo, $logo_x, $logo_y, 0, 0, $new_logo_width, $new_logo_height, $logo_width, $logo_height);
        
        // Save to cache and get result
        $result = lig_save_to_cache($composite, $mockup_url, $logo_url);
        
        // Clean up resources
        imagedestroy($mockup);
        imagedestroy($logo);
        imagedestroy($composite);
        
        if ($result === false) {
            throw new Exception('Failed to save composite image.');
        }
        
        wp_send_json_success($result);
        
    } catch (Exception $e) {
        wp_send_json_error('Error processing images: ' . $e->getMessage());
    }
    
    // Clean up temp files
    @unlink($mockup_temp);
    @unlink($logo_temp);
    
    exit;
}

add_action('wp_ajax_generate_composite_image', 'lig_generate_composite_image');
add_action('wp_ajax_nopriv_generate_composite_image', 'lig_generate_composite_image');