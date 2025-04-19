<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Register the product slider shortcode
 */
function lig_product_slider_shortcode($atts) {
    $atts = shortcode_atts(array(
        'id' => get_the_ID(),
    ), $atts);

    $product_id = $atts['id'];
    $product = wc_get_product($product_id);

    if (!$product) {
        return '';
    }

    // Get product images
    $main_image_id = $product->get_image_id();
    $gallery_image_ids = $product->get_gallery_image_ids();
    $all_image_ids = array_merge(array($main_image_id), $gallery_image_ids);

    ob_start();
    ?>
<div class="lig-product-slider-container">
    <div class="lig-vertical-nav">
        <?php
            foreach ($all_image_ids as $image_id) {
                if (!$image_id) continue;
                $thumb_url = wp_get_attachment_image_url($image_id, 'thumbnail');
                echo '<div class="lig-nav-item">';
                echo '<img src="' . esc_url($thumb_url) . '" alt="Product thumbnail">';
                echo '</div>';
            }
        ?>
    </div>
    <div class="lig-main-slider">
        <?php
            foreach ($all_image_ids as $image_id) {
                if (!$image_id) continue;
                $full_image_url = wp_get_attachment_image_url($image_id, 'full');
                echo '<div class="lig-slide">';
                echo '<img src="' . esc_url($full_image_url) . '" alt="Product image">';
                echo '</div>';
            }
        ?>
    </div>
    <!-- Hidden div with product image input -->
    <div class="lig-hidden-product-image" style="display: none;">
        <?php
            if ($main_image_id) {
                $product_image_url = wp_get_attachment_image_url($main_image_id, 'full');
                echo '<input type="hidden" name="product_image" value="' . esc_url($product_image_url) . '">';
            }
        ?>
    </div>
</div>
<?php
    return ob_get_clean();
}
add_shortcode('product_slider', 'lig_product_slider_shortcode');