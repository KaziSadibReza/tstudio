jQuery(document).ready(($) => {
  // State tracking with modern variable declarations
  const state = {
    productImages: [],
    originalImages: [], // Track original product images
    optionImage: null, // Track currently added option image
    mockupImage: null, // Track the source mockup image
    sliderInitialized: false,
    logoImageUrl: null, // Store the logo image URL
    compositeImages: {}, // Cache for composite images
    addedOptionImages: [], // Track all added option images
  };

  /**
   * Initialize product slider
   */
  const initProductSlider = () => {
    // Reset state
    state.productImages = [];
    state.originalImages = [];
    state.optionImage = null;
    state.mockupImage = null;
    state.compositeImages = {};
    state.addedOptionImages = [];

    // Get logo image URL from hidden input
    state.logoImageUrl = $(
      ".lig-hidden-product-image input[name='product_image']"
    ).val();
    console.log("Logo image URL:", state.logoImageUrl);

    // Collect all initial product images using modern iteration
    $(".lig-main-slider .lig-slide img").each((_, img) => {
      const imgSrc = $(img).attr("src");
      if (!state.productImages.includes(imgSrc)) {
        state.productImages.push(imgSrc);
        state.originalImages.push(imgSrc);
      }
    });

    // Initialize slider if we have multiple images
    if (state.productImages.length > 1) {
      initializeSlick();
      state.sliderInitialized = true;
    } else {
      console.log("Not enough images for slider, just displaying single image");
    }

    // Set initial active state on first thumbnail
    $(".lig-nav-item:first").addClass("active");

    // Set up YITH WAPO option handlers
    setupWapoHandlers();
  };

  /**
   * Initialize Slick slider
   */
  const initializeSlick = () => {
    // Clean up any existing slider
    if ($(".lig-main-slider").hasClass("slick-initialized")) {
      $(".lig-main-slider").slick("unslick");
    }

    // Initialize the slider with settings optimized for performance
    $(".lig-main-slider").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: true,
      fade: true,
      adaptiveHeight: true,
      pauseOnFocus: false,
      pauseOnHover: true,
      accessibility: true,
      touchThreshold: 10,
    });

    // Set up slider navigation events
    setupSliderEvents();
  };

  /**
   * Set up slider navigation events
   */
  const setupSliderEvents = () => {
    // First, ensure we unbind any existing click handlers to prevent duplicates
    $(document).off("click", ".lig-nav-item");
    $(".lig-nav-item").off("click keydown");

    // Handle thumbnail clicks directly on elements for better reliability
    $(".lig-nav-item").each(function (index) {
      $(this).attr("tabindex", "0"); // Make thumbnails focusable for keyboard users

      $(this).on("click keydown", function (event) {
        // Handle keyboard events only for Enter (13) or Space (32)
        if (
          event.type === "keydown" &&
          event.keyCode !== 13 &&
          event.keyCode !== 32
        ) {
          return;
        }

        event.preventDefault(); // Prevent any default action
        event.stopPropagation(); // Stop event from bubbling up

        console.log("Thumbnail clicked:", index); // Debug logging

        if (!state.sliderInitialized) {
          initializeSlick();
          state.sliderInitialized = true;
        }

        // Check if this is a composite image thumbnail
        const compositeImgSrc = $(this).data("composite");
        if (compositeImgSrc) {
          // Find the slide with the composite image
          let slideIndex = -1;
          $(".lig-main-slider .lig-slide img").each((idx, img) => {
            if ($(img).attr("src") === compositeImgSrc) {
              slideIndex = idx;
            }
          });

          if (slideIndex !== -1) {
            $(".lig-main-slider").slick("slickGoTo", slideIndex);
            updateActiveState($(this));
            return;
          }
        }

        // Use data-index attribute if available, otherwise use the DOM index
        const clickedIndex = $(this).data("index") || index;

        // Try to find the matching image source
        const imgSrc = $(this).find("img").attr("src");
        let slideIndex = state.productImages.indexOf(imgSrc);

        // Fallback to the DOM index if we can't find the image in our array
        if (slideIndex === -1) {
          slideIndex = clickedIndex;
          console.log(
            `Image src not found in state. Using index ${slideIndex} instead.`
          );
        }

        console.log("Going to slide:", slideIndex); // Debug logging

        $(".lig-main-slider").slick("slickGoTo", slideIndex);
        updateActiveState($(this));
      });

      // Add data-index attribute for easier tracking
      $(this).attr("data-index", index);
    });

    // Track slider changes with arrow function
    $(".lig-main-slider").on(
      "beforeChange",
      (_, slick, currentSlide, nextSlide) => {
        const nextImgSrc = $(".lig-main-slider .slick-slide")
          .eq(nextSlide)
          .find("img")
          .attr("src");

        // Find matching thumbnail based on image source
        const matchingThumb = $(".lig-nav-item").filter(function () {
          return $(this).find("img").attr("src") === nextImgSrc;
        });

        matchingThumb.length
          ? updateActiveState(matchingThumb)
          : updateActiveState($(".lig-nav-item").eq(nextSlide));
      }
    );

    // Handle arrow key navigation in the slider
    $(".lig-main-slider, .lig-nav-item").on("keydown", function (e) {
      if (e.keyCode === 37) {
        // left arrow
        $(".lig-main-slider").slick("slickPrev");
      } else if (e.keyCode === 39) {
        // right arrow
        $(".lig-main-slider").slick("slickNext");
      }
    });
  };

  /**
   * Generate composite image using server-side processing
   */
  const generateCompositeImage = (mockupImageUrl, logoImageUrl) => {
    return new Promise((resolve, reject) => {
      // Check if we already have this composite in cache
      const cacheKey = `${mockupImageUrl}|${logoImageUrl}`;
      if (state.compositeImages[cacheKey]) {
        console.log("Using cached composite image URL");
        resolve(state.compositeImages[cacheKey]);
        return;
      }

      // Show loading indicator
      $(".lig-product-slider-container")
        .addClass("loading")
        .append(
          '<div class="lig-loading-overlay"><div class="lig-loading-spinner"></div></div>'
        );

      // Send AJAX request to generate image
      $.ajax({
        type: "POST",
        url: lig_ajax.ajax_url,
        data: {
          action: "generate_composite_image",
          mockup_url: mockupImageUrl,
          logo_url: logoImageUrl,
          nonce: lig_ajax.nonce,
        },
        success: function (response) {
          if (response.success && response.data.url) {
            // Cache the URL
            state.compositeImages[cacheKey] = response.data.url;
            resolve(response.data.url);
            console.log(
              response.data.from_cache
                ? "Used server-cached composite image"
                : "Generated new composite image"
            );
          } else {
            console.error("Server response error:", response);
            reject("Failed to generate composite image");
          }
        },
        error: function (xhr) {
          console.error("AJAX error:", xhr.responseText);
          reject("AJAX error generating composite image");
        },
        complete: function () {
          // Remove loading indicator
          $(".lig-product-slider-container")
            .removeClass("loading")
            .find(".lig-loading-overlay")
            .remove();
        },
      });
    });
  };

  /**
   * Set up WAPO handlers
   */
  const setupWapoHandlers = () => {
    // Remove existing handlers to avoid duplicates
    $(".yith-wapo-addon-type-color .yith-wapo-option, .wapo-option-image").off(
      "click.ligSlider"
    );

    // Handle WAPO option clicks
    $(".yith-wapo-addon-type-color .yith-wapo-option, .wapo-option-image").on(
      "click.ligSlider",
      function () {
        const option = $(this);
        const img = option.find("img");

        if (img.length) {
          const mockupImgSrc = img.attr("src");
          console.log("Option clicked with mockup image:", mockupImgSrc);

          // First clean up any previous added option images - this needs to completely remove any old images
          removeAddedOptionImage();

          if (
            state.logoImageUrl &&
            !state.originalImages.includes(mockupImgSrc)
          ) {
            // Show loading indicator directly on the slider
            $(".lig-product-slider-container").addClass("loading");

            // Generate composite image
            generateCompositeImage(mockupImgSrc, state.logoImageUrl)
              .then((compositeImgSrc) => {
                console.log("Generated composite image:", compositeImgSrc);

                // Add the composite image to slider and mark both the option and new thumbnail as active
                const newThumb = addImageToSlider(
                  compositeImgSrc,
                  mockupImgSrc
                );

                // Update the active state after the slider has been updated
                setTimeout(() => {
                  updateActiveState(option);
                  if (newThumb && newThumb.length) {
                    updateActiveState(newThumb);
                  }
                }, 150);
              })
              .catch((error) => {
                console.error("Error creating composite image:", error);
                // Fallback to original behavior if composite generation fails
                handleRegularOptionClick(mockupImgSrc, option);
              })
              .finally(() => {
                // Remove loading indicator
                $(".lig-product-slider-container").removeClass("loading");
              });
          } else {
            // Original product image or no logo available, use regular handling
            handleRegularOptionClick(mockupImgSrc, option);
          }
        }
      }
    );
  };

  /**
   * Handle regular option click (original behavior)
   */
  const handleRegularOptionClick = (imgSrc, option) => {
    // Different handling based on image type
    if (state.originalImages.includes(imgSrc)) {
      // Original image: remove any added option image and navigate
      removeAddedOptionImage();
      const slideIndex = state.productImages.indexOf(imgSrc);
      navigateToSlide(slideIndex);
    } else if (state.optionImage === imgSrc) {
      // Same option image: just navigate to it
      const slideIndex = state.productImages.indexOf(imgSrc);
      navigateToSlide(slideIndex);
    } else {
      // Different option image: remove previous and add new one
      removeAddedOptionImage();
      addImageToSlider(imgSrc);
    }

    updateActiveState(option);
  };

  /**
   * Remove added option image
   */
  const removeAddedOptionImage = () => {
    // If we have option images added
    if (state.addedOptionImages && state.addedOptionImages.length > 0) {
      console.log("Removing option images:", state.addedOptionImages);

      // Stop slider to prevent issues during DOM manipulation
      if (
        state.sliderInitialized &&
        $(".lig-main-slider").hasClass("slick-initialized")
      ) {
        $(".lig-main-slider").slick("unslick");
      }

      // Remove all custom option images
      state.addedOptionImages.forEach((imgInfo) => {
        // Remove from productImages array
        const index = state.productImages.indexOf(imgInfo.image);
        if (index !== -1) {
          state.productImages.splice(index, 1);
        }

        // More thorough slide removal
        $(".lig-main-slider .lig-slide").each(function () {
          const slideImg = $(this).find("img");
          if (slideImg.length) {
            const slideSrc = slideImg.attr("src");
            if (slideSrc === imgInfo.image || slideSrc === imgInfo.mockup) {
              $(this).remove();
            }
          }
        });

        // More thorough thumbnail removal
        $(".lig-nav-item").each(function () {
          const thumbComposite = $(this).data("composite");
          const thumbImg = $(this).find("img");

          if (
            (thumbComposite && thumbComposite === imgInfo.image) ||
            (thumbImg.length &&
              (thumbImg.attr("src") === imgInfo.image ||
                thumbImg.attr("src") === imgInfo.mockup))
          ) {
            $(this).remove();
          }
        });
      });

      // Reset tracking completely
      state.addedOptionImages = [];
      state.optionImage = null;
      state.mockupImage = null;

      // Reinitialize slider if needed
      if (state.productImages.length > 1) {
        initializeSlick();
        state.sliderInitialized = true;

        // Navigate to first slide after cleanup
        setTimeout(() => {
          navigateToSlide(0);
        }, 50);
      } else if (state.productImages.length === 1) {
        // If only one image left, just show it without slider
        $(".lig-main-slider").html(
          `<div class="lig-slide"><img src="${state.productImages[0]}" alt="Product"></div>`
        );
        state.sliderInitialized = false;
      }
    }
  };

  /**
   * Add image to slider
   */
  const addImageToSlider = (imgSrc, originalSrc = null) => {
    // Set as the current option image and track the original mockup
    state.optionImage = imgSrc;
    state.mockupImage = originalSrc;

    // Add to our tracking array
    state.addedOptionImages.push({
      image: imgSrc,
      mockup: originalSrc,
    });

    // Check if this image is already in the slider
    if (state.productImages.includes(imgSrc)) {
      console.log("Image already in slider, just navigating");
      const index = state.productImages.indexOf(imgSrc);
      if (index !== -1) {
        navigateToSlide(index);
        return $(".lig-nav-item").eq(index);
      }
    }

    // Stop slider if initialized
    if (
      state.sliderInitialized &&
      $(".lig-main-slider").hasClass("slick-initialized")
    ) {
      $(".lig-main-slider").slick("unslick");
    }

    // Add to tracking array
    state.productImages.push(imgSrc);

    // Create DOM elements
    const newSlide = $(
      `<div class="lig-slide"><img src="${imgSrc}" alt="Product option"></div>`
    );
    const newNavItem = $(
      `<div class="lig-nav-item" data-composite="${imgSrc}"><img src="${imgSrc}" alt="Product option thumbnail"></div>`
    );

    // Add to DOM
    $(".lig-main-slider").append(newSlide);
    $(".lig-vertical-nav").append(newNavItem);

    console.log("Added new slide with image:", imgSrc);

    // Initialize slider if needed
    if (state.productImages.length > 1) {
      initializeSlick();
      state.sliderInitialized = true;

      // Navigate to the newly added slide
      // Use timeout to ensure DOM is ready
      setTimeout(() => {
        navigateToSlide(state.productImages.length - 1);
      }, 100);
    } else {
      // If only one image, just show it without slider
      state.sliderInitialized = false;
    }

    // Set up event handlers on the new thumbnail
    setupSliderEvents();

    // Return the new thumbnail so we can manipulate it further
    return newNavItem;
  };

  /**
   * Navigate to specific slide
   */
  const navigateToSlide = (index) => {
    if (
      state.productImages.length > 1 &&
      index >= 0 &&
      index < state.productImages.length
    ) {
      if (
        !state.sliderInitialized ||
        !$(".lig-main-slider").hasClass("slick-initialized")
      ) {
        initializeSlick();
        state.sliderInitialized = true;
      }

      console.log("Navigating to slide:", index);

      // Go to the slide
      $(".lig-main-slider").slick("slickGoTo", index);

      // Find and activate matching thumbnail
      const imgSrc = state.productImages[index];
      let matchingThumb = null;

      // More thorough thumbnail matching
      $(".lig-nav-item").each(function () {
        const thumbComposite = $(this).data("composite");
        const thumbImg = $(this).find("img");

        // Check by data-composite first
        if (thumbComposite && thumbComposite === imgSrc) {
          matchingThumb = $(this);
          return false; // Break the loop
        }

        // Then check by img src
        if (thumbImg.length && thumbImg.attr("src") === imgSrc) {
          matchingThumb = $(this);
          return false; // Break the loop
        }
      });

      // Use index as fallback
      if (!matchingThumb || !matchingThumb.length) {
        matchingThumb = $(".lig-nav-item").eq(index);
      }

      // Update active state
      if (matchingThumb && matchingThumb.length) {
        updateActiveState(matchingThumb);
      }
    }
  };

  /**
   * Update active state on elements
   */
  const updateActiveState = (element) => {
    if (!element || !element.length) return;

    // Decide which elements to update based on the element type
    if (element.hasClass("lig-nav-item")) {
      // If it's a thumbnail, update only thumbnails
      $(".lig-nav-item").removeClass("active");
      element.addClass("active");
    } else if (
      element.hasClass("yith-wapo-option") ||
      element.hasClass("wapo-option-image")
    ) {
      // If it's an option, update only options
      $(".yith-wapo-option, .wapo-option-image").removeClass("active");
      element.addClass("active");
    } else {
      // Otherwise, update everything
      $(".lig-nav-item, .yith-wapo-option, .wapo-option-image").removeClass(
        "active"
      );
      element.addClass("active");
    }

    // Set focus to the element for keyboard users when appropriate
    if (
      document.activeElement &&
      document.activeElement.classList.contains("lig-nav-item") &&
      element.hasClass("lig-nav-item")
    ) {
      element.focus();
    }
  };

  // Initialize on page load
  initProductSlider();

  // Replace generic AJAX re-init to skip composite image generation calls
  $(document).ajaxComplete((event, xhr, settings) => {
    // Skip reinitialization when we've just generated a composite image
    if (
      settings.url === lig_ajax.ajax_url &&
      ((typeof settings.data === "string" &&
        settings.data.indexOf("action=generate_composite_image") !== -1) ||
        (settings.data && settings.data.action === "generate_composite_image"))
    ) {
      return;
    }
    setTimeout(() => {
      initProductSlider();
      if (state.sliderInitialized) {
        setupSliderEvents();
      }
    }, 300);
  });

  // Watch for YITH WAPO option changes
  $(document).on("yith-wapo-product-option-changed", setupWapoHandlers);
});
