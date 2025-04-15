<?php
/**
 * Plugin Name: Logo to Image Generator
 * Plugin URI: https://github.com/KaziSadibReza/tstudio
 * Description: A basic plugin that will generate images from specified logos.
 * Version: 1.0
 * Author: Kazi Sadib Reza
 * Author URI: https://github.com/KaziSadibReza
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// Step 1: Add image generation logic on the product page
add_action('wp_footer', function () {
    if (is_product()) {
        ?>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function() {
    // Main product image container
    const mainImageContainer = document.querySelector(".woocommerce-product-gallery__image");
    if (!mainImageContainer) {
        return; // Exit if the product image container is not found
    }

    // Product logo (main image)
    const productLogoUrl = document.querySelector(".woocommerce-product-gallery__image img")?.getAttribute(
        "src");
    if (!productLogoUrl) {
        return; // Exit if the product logo is not found
    }

    // Check if color options exist and proceed
    const colorOptions = document.querySelectorAll(".yith-wapo-option");
    if (colorOptions.length > 0) {
        colorOptions.forEach(option => {
            option.addEventListener("click", function() {
                // Get the replace image URL from the clicked option
                const newImageUrl = this.getAttribute("data-replace-image");

                if (newImageUrl && mainImageContainer) {
                    // Remove existing generated canvas if present
                    const existingCanvas = mainImageContainer.querySelector(
                        ".generated-overlay");
                    if (existingCanvas) {
                        existingCanvas.remove();
                    }

                    // Create a canvas to overlay the logo on the selected color image
                    const canvas = document.createElement("canvas");
                    canvas.width = 600; // Set width for canvas (match your image size)
                    canvas.height = 500; // Set height for canvas (match your image size)
                    canvas.classList.add("generated-overlay");

                    const ctx = canvas.getContext("2d");
                    const baseImage = new Image();
                    const logoImage = new Image();

                    baseImage.src = newImageUrl;
                    logoImage.src = productLogoUrl;

                    baseImage.onload = function() {
                        // Draw base (color image)
                        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

                        // Draw logo at center with size 200x200
                        const logoSize = 200;
                        const x = (canvas.width - logoSize) / 2;
                        const y = (canvas.height - logoSize) / 2;
                        ctx.drawImage(logoImage, x, y, logoSize, logoSize);

                        // Replace the main product image with the canvas
                        mainImageContainer.innerHTML = ""; // Clear existing content
                        mainImageContainer.appendChild(canvas);

                        let generatedImageUrl = canvas.toDataURL('image/png');
                        generatedImageUrl = generatedImageUrl.replace("data:image",
                            "dataimage"); // Remove colon
                        document.getElementById('generated_image_url').value =
                            generatedImageUrl;
                        // Create and append preview image in product gallery
                        const previewImg = document.createElement("img");
                        previewImg.className = "previewImage";
                        previewImg.src = generatedImageUrl.replace("dataimage",
                            "data:image");
                        previewImg.alt = "Generated Preview Image";
                        previewImg.style.marginTop = "15px";
                        previewImg.style.maxWidth = "100%";
                        //mainImageContainer.appendChild(previewImg);

                        // ✅ ALSO show image inside #previewImage container (if exists)
                        const externalPreviewContainer = document.querySelector(
                            "#previewImage");
                        if (externalPreviewContainer) {
                            // Remove old image if already inside
                            externalPreviewContainer.innerHTML = '';

                            const externalImg = document.createElement("img");
                            externalImg.src = generatedImageUrl.replace("dataimage",
                                "data:image");
                            externalImg.alt = "Generated Preview Image";
                            externalImg.style.maxWidth = "100%";
                            externalImg.style.marginTop = "10px";
                            externalPreviewContainer.appendChild(externalImg);
                        }




                    };
                }
            });
        });
    }
});
</script>
<style>
/* Style to ensure the canvas fits the product image container */
.woocommerce-product-gallery__image .generated-overlay {
    display: block;
    margin: 0 auto;
}
</style>
<?php
    }
});

// Step 2: Add hidden field for generated image URL in the product page
add_action('woocommerce_before_add_to_cart_button', function () {
    echo '<input type="text" name="generated_image_url" id="generated_image_url" value="">';
});

// Step 3: Store the Base64 image URL in session after Add to Cart
add_action('woocommerce_add_cart_item_data', function ($cart_item_data, $product_id, $variation_id) {
    if (isset($_POST['generated_image_url']) && !empty($_POST['generated_image_url'])) {
        WC()->session->set('generated_image_url', sanitize_text_field($_POST['generated_image_url']));
        $cart_item_data['generated_image'] = sanitize_text_field($_POST['generated_image_url']);
    }
    return $cart_item_data;
}, 10, 3);

// Step 4: Display the generated image in the cart item thumbnail
add_filter('woocommerce_cart_item_thumbnail', function ($thumbnail, $cart_item, $cart_item_key) {
    // Check if the cart item has a generated image
    if (isset($cart_item['generated_image']) && !empty($cart_item['generated_image'])) {
        $generated_image_url = $cart_item['generated_image'];

        // Ensure the URL is correctly formatted
        $generated_image_url = str_replace('http://', '', $generated_image_url);
       $generated_image_url = str_replace('dataimage', 'data:image', $generated_image_url);

        // Return the corrected image tag
        return '<img decoding="async" src="' . esc_attr($generated_image_url) . '" alt="Product Image">';
    }
    return $thumbnail;
}, 10, 3);


// Step 5: Add the generated image to the order item meta for emails
add_action('woocommerce_checkout_create_order_line_item', function ($item, $cart_item_key, $values, $order) {
    if (isset($values['generated_image'])) {
        $item->add_meta_data('generated_image', $values['generated_image']);
    }
}, 10, 4);

// Step 6: Display the generated image in order emails
add_filter('woocommerce_order_item_thumbnail', function ($image, $item) {
    $generated_image = $item->get_meta('generated_image');
    if ($generated_image) {
        return '<img src="' . esc_url($generated_image) . '" alt="Custom Product Image" style="width:100px;height:auto;">';
    }
    return $image;
}, 10, 2);

// Step 7: Show generated image on the order details page (Thank You page)
add_action('woocommerce_order_item_meta_end', function ($item_id, $item, $order) {
    $generated_image = $item->get_meta('generated_image');

    if ($generated_image) {
        $generated_image = str_replace('dataimage', 'data:image', $generated_image);

        echo '<p><strong>Generated Image:</strong></p>';
        echo '<img src="' . esc_attr($generated_image) . '" alt="Custom Product Image" style="width:200px;height:auto;">';
    }
}, 10, 3);



// Step 8: Replace product image on the Checkout page with the generated image
// add_filter('woocommerce_checkout_cart_item_quantity', function ($quantity, $cart_item, $cart_item_key) {
//     if (isset($cart_item['generated_image'])) {
//         $quantity = '<img src="' . esc_url($cart_item['generated_image']) . '" alt="Custom Product Image" style="width:100px;height:auto;">';
//     }
//     return $quantity;
// }, 10, 2);
//Apply generated image to the checkout page thumbnail
add_filter('woocommerce_checkout_cart_item_thumbnail', function ($thumbnail, $cart_item, $cart_item_key) {
    // Check if the cart item has a generated image
    if (isset($cart_item['generated_image']) && !empty($cart_item['generated_image'])) {
        $generated_image_url = $cart_item['generated_image'];

        // Ensure the URL is correctly formatted
        $generated_image_url = str_replace('http://', '', $generated_image_url); 
        $generated_image_url = str_replace('dataimage', 'data:image', $generated_image_url);

        // Return the corrected image tag
        return '<img decoding="async" src="' . esc_attr($generated_image_url) . '" alt="Product Image">';
    }
    return $thumbnail;
}, 10, 3);



// Step 9: Display generated image on the Thank You page
add_action('woocommerce_thankyou', function ($order_id) {
    $order = wc_get_order($order_id);

    // Loop through the order items
    foreach ($order->get_items() as $item_id => $item) {
        // Retrieve the 'generated_image' meta
        $generated_image = $item->get_meta('generated_image');
        
        // Check if the generated image exists
        if ($generated_image) {
            // Ensure the URL is correctly formatted
           // $generated_image = str_replace('http://', '', $generated_image);
            $generated_image = str_replace('dataimage', 'data:image', $generated_image);
            
            // Display the generated image
            echo '<p><strong>Generated Image:</strong></p>';
            echo '<img src="' . esc_url($generated_image) . '" alt="Custom Product Image" style="width:200px;height:auto;">';
        }
    }
}, 10, 1);


// Step 10: Console log the generated image URL on the cart page
add_action('wp_footer', function () {
    if (is_checkout()) {
        ?>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function() {
    const generatedImageUrl = '<?php echo esc_js(WC()->session->get("generated_image_url", "")); ?>';
    if (generatedImageUrl) {
        console.log("Generated Image URL on checkout:", generatedImageUrl);
    } else {
        console.log('Product Link not found')
    }
});
</script>
<?php
		
		
		
		
		
		
		
    }
});