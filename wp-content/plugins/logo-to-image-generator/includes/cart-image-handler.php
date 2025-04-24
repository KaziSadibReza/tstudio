<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Handles the custom product images in cart, checkout, orders 
 */
class LIG_Cart_Image_Handler {

    /**
     * Constructor
     */
    public function __construct() {
        // Store the selected image when adding to cart
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_selected_image_to_cart_item'), 10, 3);
        
        // Keep the custom data when updating quantity in cart
        add_filter('woocommerce_add_cart_item', array($this, 'preserve_custom_cart_item_data'), 10, 2);
        
        // Set the selected image as the cart item image
        add_filter('woocommerce_cart_item_thumbnail', array($this, 'change_cart_item_thumbnail'), 10, 3);
        
        // Change image in checkout review - legacy hook
        add_filter('woocommerce_in_cart_product_thumbnail', array($this, 'change_cart_item_thumbnail'), 10, 3);
        
        // Specific hook for checkout page thumbnails
        add_filter('woocommerce_checkout_cart_item_thumbnail', array($this, 'change_cart_item_thumbnail'), 10, 3);
        
        // Filter product image globally - useful for checkout pages with different hooks
        add_filter('woocommerce_product_get_image', array($this, 'filter_product_image'), 20, 2);
        
        // Change image in mini-cart
        add_filter('woocommerce_cart_item_thumbnail', array($this, 'change_cart_item_thumbnail'), 10, 3);
        
        // Save the custom image to order item meta
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_selected_image_to_order_item'), 10, 4);
        
        // Change image in order details
        add_filter('woocommerce_order_item_thumbnail', array($this, 'change_order_item_thumbnail'), 10, 2);
        
        // Add custom image to email
        add_filter('woocommerce_email_order_item_thumbnail', array($this, 'change_email_order_item_thumbnail'), 10, 4);
    }

    /**
     * Add the selected image to cart item data when adding to cart
     */
    public function add_selected_image_to_cart_item($cart_item_data, $product_id, $variation_id) {
        if (isset($_POST['lig_selected_image'])) {
            $cart_item_data['lig_selected_image'] = esc_url_raw($_POST['lig_selected_image']);
        }
        return $cart_item_data;
    }

    /**
     * Preserve custom cart item data when updating quantity
     */
    public function preserve_custom_cart_item_data($cart_item, $cart_id) {
        // No changes needed, just return the cart item
        return $cart_item;
    }

    /**
     * Change the cart item thumbnail to the selected image
     */
    public function change_cart_item_thumbnail($thumbnail, $cart_item, $cart_item_key = null) {
        if (isset($cart_item['lig_selected_image'])) {
            $image_url = $cart_item['lig_selected_image'];
            
            // Generate new thumbnail HTML
            $thumbnail = '<img src="' . esc_url($image_url) . '" class="lig-custom-thumbnail" alt="Product image" />';
        }
        return $thumbnail;
    }

    /**
     * Filter product images globally - especially useful for checkout
     */
    public function filter_product_image($image, $product) {
        // Only apply during checkout
        if (!is_checkout()) {
            return $image;
        }
        
        // Get the cart to check for our custom images
        $cart = WC()->cart;
        if (!$cart) {
            return $image;
        }
        
        // Check if this product is in the cart with our custom image
        foreach ($cart->get_cart() as $cart_item) {
            if (isset($cart_item['lig_selected_image']) && 
                ($cart_item['product_id'] == $product->get_id() || 
                 (isset($cart_item['variation_id']) && $cart_item['variation_id'] == $product->get_id()))) {
                
                return '<img src="' . esc_url($cart_item['lig_selected_image']) . 
                       '" class="lig-custom-thumbnail" alt="Product image" width="50" height="50" />';
            }
        }
        
        return $image;
    }

    /**
     * Add the selected image URL to the order item meta
     */
    public function add_selected_image_to_order_item($item, $cart_item_key, $cart_item, $order) {
        if (isset($cart_item['lig_selected_image'])) {
            // Add as hidden meta data (no need to display in order details)
            $item->add_meta_data('_lig_selected_image', $cart_item['lig_selected_image'], true);
        }
    }

    /**
     * Change the order item thumbnail to the selected image
     */
    public function change_order_item_thumbnail($thumbnail, $item) {
        // Get the selected image from order item meta
        $selected_image = $item->get_meta('_lig_selected_image', true);
        
        if (!empty($selected_image)) {
            $thumbnail = '<img src="' . esc_url($selected_image) . '" class="lig-custom-thumbnail" alt="Product image" />';
        }
        
        return $thumbnail;
    }
    
    /**
     * Change the product thumbnail in order emails
     *
     * @param string $image The default image HTML
     * @param object $item The order item object
     * @param object $order The order object
     * @param bool $plain_email Whether this is a plain email or not
     * @return string Modified image HTML
     */
    public function change_email_order_item_thumbnail($image, $item, $order, $plain_email = false) {
        // Don't show images in plain text emails
        if ($plain_email) {
            return '';
        }
        
        // Get the selected image from order item meta
        $selected_image = $item->get_meta('_lig_selected_image', true);
        
        if (!empty($selected_image)) {
            $image = '<img src="' . esc_url($selected_image) . '" class="lig-custom-email-thumbnail" alt="Product image" style="max-width: 100%; height: auto; margin-bottom: 10px;" />';
        }
        
        return $image;
    }

}

// Initialize the class
new LIG_Cart_Image_Handler();