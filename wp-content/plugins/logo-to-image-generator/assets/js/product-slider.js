jQuery(document).ready(($) => {
  // Add mobile detection at the top
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

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
    activeImageUrl: null, // Track the currently active image URL
    zoomEnabled: !isMobile, // Disable zoom on mobile
    activeUpdateTimeout: null, // Timeout for active state updates
    isProcessing: false, // Flag to prevent multiple simultaneous operations
  };

  /**
   * Initialize zoom functionality on product images
   */
  const initProductZoom = () => {
    // First check if elevateZoom is available
    if (typeof $.fn.elevateZoom === "undefined") {
      console.log(
        "ElevateZoom plugin not available, skipping zoom initialization"
      );
      return;
    }

    // First remove any existing zoom elements
    $(".zoomContainer").remove();

    // Add custom CSS for zoom lens
    if (!$("#lig-zoom-styles").length) {
      $("head").append(
        '<style id="lig-zoom-styles">' +
          ".zoomContainer .zoomWindow, .zoomLens { background-color: #fff !important; }" +
          ".lig-product-slider-container.processing { pointer-events: none; opacity: 0.7; }" +
          ".lig-product-slider-container.processing * { pointer-events: none; }" +
          "</style>"
      );
    }

    // Apply zoom to each product image in the slider
    $(".lig-main-slider .lig-slide img").each((_, img) => {
      $(img).removeData("elevateZoom");

      try {
        // Initialize zoom with settings similar to WooCommerce
        $(img).elevateZoom({
          zoomType: "inner",
          cursor: "crosshair",
          zoomWindowFadeIn: 300,
          zoomWindowFadeOut: 300,
          responsive: true,
          scrollZoom: false,
        });
      } catch (e) {
        console.error("Error initializing zoom:", e);
      }
    });
  };

  /**
   * Refresh zoom on active slide
   */
  const refreshZoomOnActiveSlide = () => {
    if (!state.zoomEnabled) return;

    // Wait a moment for slide transition to complete
    setTimeout(() => {
      // Get current active slide image
      const activeSlideImg = $(".lig-main-slider .slick-active img");
      if (activeSlideImg.length) {
        // Remove previous zoom
        activeSlideImg.removeData("elevateZoom");
        $(".zoomContainer").remove();

        // Re-initialize zoom on active image
        activeSlideImg.elevateZoom({
          zoomType: "inner",
          cursor: "crosshair",
          zoomWindowFadeIn: 300,
          zoomWindowFadeOut: 300,
          responsive: true,
        });
      }
    }, 200);
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
    state.activeImageUrl = null;

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

    // Set initial active image URL from the first slide
    const firstSlideImg = $(".lig-main-slider .lig-slide:first-child img");
    if (firstSlideImg.length) {
      state.activeImageUrl = firstSlideImg.attr("src");
      updateCartImageInput(state.activeImageUrl);
    }

    // Set initial active state on first thumbnail
    $(".lig-nav-item:first").addClass("active");

    // Set up YITH WAPO option handlers
    setupWapoHandlers();

    // Check and select default option if no color option is selected

    // Initialize zoom functionality after slider is ready
    if (state.zoomEnabled) {
      setTimeout(initProductZoom, 500);
    }
  };

  /**
   * Initialize Slick slider
   */
  const initializeSlick = () => {
    // Clean up any existing slider
    if ($(".lig-main-slider").hasClass("slick-initialized")) {
      $(".lig-main-slider").slick("unslick");
    }

    // Cleanup any zoom containers
    $(".zoomContainer").remove();

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
      prevArrow:
        '<button type="button" class="slick-prev custom-arrow"><svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20M4 12L8 8M4 12L8 16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>',
      nextArrow:
        '<button type="button" class="slick-next custom-arrow"><svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 12H20M20 12L16 8M20 12L16 16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg></button>",
    });

    // Set up slider navigation events
    setupSliderEvents();

    // Initialize zoom after slider is ready
    if (state.zoomEnabled) {
      setTimeout(initProductZoom, 300);
    }
  };

  /**
   * Set up slider navigation events
   */
  const setupSliderEvents = () => {
    $(".lig-nav-item")
      .off("click keydown")
      .on("click keydown", function (event) {
        // Handle keyboard events for Enter (13) or Space (32)
        if (event.type === "keydown" && ![13, 32].includes(event.keyCode)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const $this = $(this);
        const imgSrc = $this.find("img").attr("src");
        const compositeImgSrc = $this.data("composite");
        let slideIndex = -1;

        // Find the correct slide index
        $(".lig-main-slider .lig-slide").each((idx, slide) => {
          const slideImg = $(slide).find("img");
          if (
            slideImg.length &&
            (slideImg.attr("src") === imgSrc ||
              slideImg.attr("src") === compositeImgSrc)
          ) {
            slideIndex = idx;
            return false;
          }
        });

        if (slideIndex === -1) {
          slideIndex = $this.index();
        }

        // Ensure slider is initialized
        if (!state.sliderInitialized) {
          initializeSlick();
          state.sliderInitialized = true;
        }

        // Update state and navigate
        updateActiveState($this);
        $(".lig-main-slider").slick("slickGoTo", slideIndex);
      });

    // Track slider changes with arrow function and handle zoom
    $(".lig-main-slider").on(
      "beforeChange",
      (_, slick, currentSlide, nextSlide) => {
        // First destroy any zoom to prevent issues
        $(".lig-main-slider .slick-slide img").each(function () {
          $(this).removeData("elevateZoom");
        });
        $(".zoomContainer").remove();

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

    // After slide change, reinitialize zoom on the active slide
    $(".lig-main-slider").on("afterChange", (_, slick, currentSlide) => {
      refreshZoomOnActiveSlide();
    });

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
      // Validate image URLs first
      if (!logoImageUrl || logoImageUrl === "") {
        console.error("Invalid logo image URL");
        reject("Invalid logo image URL");
        return;
      }

      // Check if mockup is a placeholder/empty image
      if (
        !mockupImageUrl ||
        mockupImageUrl.includes("data:image/gif;base64") ||
        mockupImageUrl === ""
      ) {
        console.error("Invalid mockup image URL (placeholder detected)");
        reject("Invalid mockup image URL");
        return;
      }

      // Check if we already have this composite in cache
      const cacheKey = `${mockupImageUrl}|${logoImageUrl}`;
      if (state.compositeImages[cacheKey]) {
        console.log("Using cached composite image URL");
        // Even for cached images, add a small delay for better UX
        setTimeout(() => {
          resolve(state.compositeImages[cacheKey]);
        }, 500);
        return;
      }

      // Show loading indicator immediately
      $(".lig-product-slider-container")
        .addClass("loading")
        .append(
          '<div class="lig-loading-overlay"><div class="lig-loading-skeleton"></div></div>'
        );

      // Add minimum loading time for better UX
      const minLoadingTime = 1500; // 1.5 seconds minimum loading time
      const startTime = Date.now();

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
          if (
            response &&
            response.success &&
            response.data &&
            response.data.url
          ) {
            // Cache the URL
            state.compositeImages[cacheKey] = response.data.url;

            // Calculate remaining time to meet minimum loading duration
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

            // Add delay to ensure loading indicator shows for at least minLoadingTime
            setTimeout(() => {
              // Preload the image before resolving
              const img = new Image();
              img.onload = () => {
                resolve(response.data.url);
              };
              img.onerror = () => {
                reject("Failed to load generated image");
              };
              img.src = response.data.url;
            }, remainingTime);

            console.log(
              response.data.from_cache
                ? "Used server-cached composite image"
                : "Generated new composite image"
            );
          } else {
            console.error("Server response error:", response);
            reject(
              "Failed to generate composite image: Invalid server response"
            );
          }
        },
        error: function (xhr) {
          console.error("AJAX error:", xhr.responseText);
          reject("AJAX error generating composite image");
        },
        complete: function () {
          // Loading indicator will be removed after the delay
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

          setTimeout(() => {
            $(".lig-product-slider-container")
              .removeClass("loading")
              .find(".lig-loading-overlay")
              .remove();
          }, remainingTime);
        },
      });
    });
  };

  /**
   * Set up yith handlers
   */
  const setupWapoHandlers = () => {
    // Remove existing handlers to avoid duplicates
    $(".yith-wapo-addon-type-color .yith-wapo-option").off("click.ligSlider");

    // Handle WAPO option clicks
    $(".yith-wapo-addon-type-color .yith-wapo-option").on(
      "click.ligSlider",
      async function () {
        const option = $(this);
        const img = option.find("img");

        // Prevent multiple simultaneous operations
        if (state.isProcessing) {
          console.log("Operation in progress, please wait...");
          return;
        }

        state.isProcessing = true;
        $(".lig-product-slider-container").addClass("processing");

        try {
          // Extract background color from the color span
          let backgroundColor = null;
          const colorSpan = option.find(".color");
          if (colorSpan.length) {
            backgroundColor =
              colorSpan.css("background-color") || colorSpan.attr("style");
            if (backgroundColor && backgroundColor.includes("background:")) {
              backgroundColor = backgroundColor.match(
                /background:(#[A-Fa-f0-9]{3,6}|rgb\([^)]+\))/i
              );
              backgroundColor = backgroundColor ? backgroundColor[1] : null;
            }

            // Apply background color to main product navigation items
            if (backgroundColor) {
              $(".lig-nav-item").removeClass("has-custom-background").css({
                "background-color": "",
                "border-color": "",
              });

              $(".lig-nav-item").each(function () {
                const thumbImg = $(this).find("img");
                if (
                  thumbImg.length &&
                  state.originalImages.includes(thumbImg.attr("src"))
                ) {
                  $(this)
                    .css({
                      "background-color": backgroundColor,
                      "border-color": backgroundColor,
                    })
                    .addClass("has-custom-background");
                }
              });
            }
          }

          if (img.length) {
            const mockupImgSrc = img.attr("src");

            if (
              !mockupImgSrc ||
              mockupImgSrc.includes("data:image/gif;base64")
            ) {
              console.log("Skipping placeholder/empty image");
              return;
            }

            // Remove all previously generated images
            removeGeneratedImages();

            if (
              state.logoImageUrl &&
              !state.originalImages.includes(mockupImgSrc)
            ) {
              try {
                const compositeImgSrc = await generateCompositeImage(
                  mockupImgSrc,
                  state.logoImageUrl
                );
                console.log("Generated composite image:", compositeImgSrc);

                const newThumb = addImageToSlider(
                  compositeImgSrc,
                  mockupImgSrc,
                  backgroundColor
                );

                // Update states after slider is updated
                setTimeout(() => {
                  updateActiveState(option);
                  if (newThumb && newThumb.length) {
                    updateActiveState(newThumb);
                  }
                }, 150);
              } catch (error) {
                console.error("Error creating composite image:", error);
                handleRegularOptionClick(mockupImgSrc, option, backgroundColor);
              }
            } else {
              handleRegularOptionClick(mockupImgSrc, option, backgroundColor);
            }
          }
        } finally {
          state.isProcessing = false;
          $(".lig-product-slider-container").removeClass("processing");
        }
      }
    );
  };

  /**
   * Handle regular option click (original behavior)
   */
  const handleRegularOptionClick = (imgSrc, option, backgroundColor = null) => {
    // Different handling based on image type
    if (state.originalImages.includes(imgSrc)) {
      // Original image: remove any generated images and navigate
      removeGeneratedImages();
      const slideIndex = state.productImages.indexOf(imgSrc);
      navigateToSlide(slideIndex);
    } else if (state.optionImage === imgSrc) {
      // Same option image: just navigate to it
      const slideIndex = state.productImages.indexOf(imgSrc);
      navigateToSlide(slideIndex);
    } else {
      // Different option image: remove previous and add new one
      removeGeneratedImages();
      addImageToSlider(imgSrc, null, backgroundColor);
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

      // Only keep the main product images by filtering out all added images
      state.productImages = state.productImages.filter((img) =>
        state.originalImages.includes(img)
      );

      // Stop slider to prevent issues during DOM manipulation
      if (
        state.sliderInitialized &&
        $(".lig-main-slider").hasClass("slick-initialized")
      ) {
        $(".lig-main-slider").slick("unslick");
      }

      // Remove all custom slides
      $(".lig-main-slider .lig-slide").each(function () {
        const slideImg = $(this).find("img");
        if (
          slideImg.length &&
          !state.originalImages.includes(slideImg.attr("src"))
        ) {
          $(this).remove();
        }
      });

      // Remove all custom thumbnails
      $(".lig-nav-item").each(function () {
        const thumbImg = $(this).find("img");
        if (
          thumbImg.length &&
          !state.originalImages.includes(thumbImg.attr("src"))
        ) {
          $(this).remove();
        }
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
   * Remove all generated images from the slider
   */
  const removeGeneratedImages = () => {
    // Stop slider to prevent issues during DOM manipulation
    if (
      state.sliderInitialized &&
      $(".lig-main-slider").hasClass("slick-initialized")
    ) {
      $(".lig-main-slider").slick("unslick");
    }

    // Remove all slides with generated-image attribute
    $(".lig-main-slider .lig-slide[data-generated-image='true']").remove();

    // Remove all thumbnails with generated-image attribute
    $(".lig-nav-item[data-generated-image='true']").remove();

    // Update productImages array to only keep original images
    state.productImages = state.productImages.filter((img) =>
      state.originalImages.includes(img)
    );

    // Reset tracking states
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
  };

  /**
   * Add image to slider
   */
  const addImageToSlider = (
    imgSrc,
    originalSrc = null,
    backgroundColor = null
  ) => {
    // First remove any existing generated images
    removeGeneratedImages();

    // Set as the current option image and track the original mockup
    state.optionImage = imgSrc;
    state.mockupImage = originalSrc;

    // Add to our tracking array (keeping only one item)
    state.addedOptionImages = [
      {
        image: imgSrc,
        mockup: originalSrc,
        backgroundColor: backgroundColor,
      },
    ];

    // Check if this image is already in the slider
    if (state.productImages.includes(imgSrc)) {
      console.log("Image already in slider, just navigating");
      const index = state.productImages.indexOf(imgSrc);
      if (index !== -1) {
        navigateToSlide(index);
        return $(".lig-nav-item").eq(index);
      }
    }

    // Clean up zoom before unslicking
    $(".zoomContainer").remove();
    $(".lig-main-slider .slick-slide img").each(function () {
      $(this).removeData("elevateZoom");
    });

    // Stop slider if initialized
    if (
      state.sliderInitialized &&
      $(".lig-main-slider").hasClass("slick-initialized")
    ) {
      $(".lig-main-slider").slick("unslick");
    }

    // Add to tracking array
    state.productImages.push(imgSrc);

    // Create DOM elements with generated-image and auto-active attributes
    const newSlide = $(
      `<div class="lig-slide active" data-generated-image="true" data-auto-active="true"><img src="${imgSrc}" alt="Product option"></div>`
    );
    const newNavItem = $(
      `<div class="lig-nav-item active" data-composite="${imgSrc}" data-generated-image="true" data-auto-active="true"><img src="${imgSrc}" alt="Product option thumbnail"></div>`
    );

    // Apply border color to composite image thumbnails
    if (backgroundColor) {
      newNavItem
        .css({
          "border-color": backgroundColor,
        })
        .addClass("has-custom-border");
    }

    // Add to DOM
    $(".lig-main-slider").append(newSlide);
    $(".lig-vertical-nav").append(newNavItem);

    console.log("Added new slide with image:", imgSrc);

    // Initialize slider if needed
    if (state.productImages.length > 1) {
      initializeSlick();
      state.sliderInitialized = true;

      // Navigate to the newly added slide
      setTimeout(() => {
        navigateToSlide(state.productImages.length - 1);
      }, 100);
    } else {
      // If only one image, just show it without slider
      state.sliderInitialized = false;
    }

    // Update the active image URL to the generated image
    state.activeImageUrl = imgSrc;
    updateCartImageInput(imgSrc);

    // Set up event handlers on the new thumbnail
    setupSliderEvents();

    // Debug: Log current state
    console.group("Generated Images Debug Info");
    console.log("Original Images:", state.originalImages);
    console.log("Added Option Images:", state.addedOptionImages);
    console.log("Current Option Image:", state.optionImage);
    console.log("Current Mockup Image:", state.mockupImage);
    console.log("Total Images:", state.productImages);
    console.groupEnd();

    return newNavItem;
  };

  /**
   * Navigate to specific slide
   */
  const navigateToSlide = (index) => {
    if (state.productImages.length > 1) {
      if (
        !state.sliderInitialized ||
        !$(".lig-main-slider").hasClass("slick-initialized")
      ) {
        initializeSlick();
        state.sliderInitialized = true;
      }

      console.log("Navigating to slide: 1");

      // Always go to slide 1
      $(".lig-main-slider").slick("slickGoTo", 1);

      // Find and activate matching thumbnail
      const imgSrc = state.productImages[1]; // Use index 1 to match the slide
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

      // Use index as fallback, but still use index 1
      if (!matchingThumb || !matchingThumb.length) {
        matchingThumb = $(".lig-nav-item").eq(1);
      }

      // Update active state
      if (matchingThumb && matchingThumb.length) {
        updateActiveState(matchingThumb);
      }

      // Apply zoom to the new active slide after navigation
      setTimeout(() => {
        refreshZoomOnActiveSlide();
      }, 300);
    }
  };

  /**
   * Update active state on elements
   */
  const updateActiveState = (element) => {
    if (!element || !element.length) return;

    // Check if there's an auto-active element and we're not clicking it
    const autoActive = $('[data-auto-active="true"]');
    if (
      autoActive.length &&
      !element.is(autoActive) &&
      !element.hasClass("yith-wapo-option")
    ) {
      // If we're explicitly selecting a non-generated image, remove auto-active
      element
        .closest(".lig-main-slider, .lig-vertical-nav")
        .find('[data-auto-active="true"]')
        .removeAttr("data-auto-active");
    }

    // Clear any pending updates
    if (state.activeUpdateTimeout) {
      clearTimeout(state.activeUpdateTimeout);
    }

    // Synchronous removal of active states
    $(".lig-nav-item, .yith-wapo-option").removeClass("active");

    // Force immediate state update
    element.addClass("active");

    if (element.hasClass("lig-nav-item")) {
      const activeImg = element.find("img");
      if (activeImg.length) {
        state.activeImageUrl = activeImg.attr("src");
        updateCartImageInput(state.activeImageUrl);

        // Update corresponding option
        const imgSrc = state.activeImageUrl;
        $(".yith-wapo-option").each(function () {
          const optionImg = $(this).find("img");
          if (optionImg.length && optionImg.attr("src") === imgSrc) {
            $(this).addClass("active");
          }
        });
      }
    } else if (element.hasClass("yith-wapo-option")) {
      const optionImg = element.find("img");
      if (optionImg.length) {
        const imgSrc = optionImg.attr("src");
        $(".lig-nav-item").each(function () {
          const navImg = $(this).find("img");
          const compositeImgSrc = $(this).data("composite");
          if (
            (navImg.length && navImg.attr("src") === imgSrc) ||
            compositeImgSrc === imgSrc
          ) {
            $(this).addClass("active");
          }
        });
      }
    }

    // Ensure proper focus
    if (
      element.hasClass("lig-nav-item") &&
      document.activeElement !== element[0]
    ) {
      element.focus();
    }

    // Force visual refresh
    requestAnimationFrame(() => {
      element.hide().show(0);
    });
  };

  /**
   * Update the hidden input for cart with the active image URL
   */
  const updateCartImageInput = (imageUrl) => {
    // Remove any existing input
    $('input[name="lig_selected_image"]').remove();

    // Add the hidden input to the cart form
    if (imageUrl) {
      const input = $("<input>").attr({
        type: "hidden",
        name: "lig_selected_image",
        value: imageUrl,
      });

      // Add to the cart form
      $("form.cart").append(input);
      console.log("Updated cart image input with URL:", imageUrl);
    }
  };

  // Load elevateZoom plugin if not already loaded, with error handling
  if (typeof $.fn.elevateZoom === "undefined") {
    console.log("Loading ElevateZoom dynamically");

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/elevatezoom/3.0.8/jquery.elevatezoom.min.js";
    script.onload = function () {
      console.log("ElevateZoom loaded successfully");
      initProductZoom();
    };
    script.onerror = function () {
      console.error(
        "Failed to load ElevateZoom plugin, zoom functionality disabled"
      );
      state.zoomEnabled = false;
    };
    document.head.appendChild(script);
  }

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
      // Check and select default after AJAX as well
    }, 300);
  });

  // Watch for YITH WAPO option changes
  $(document).on("yith-wapo-product-option-changed", function () {
    setupWapoHandlers();
    // Check if we need to select the default after options change
  });

  // Handle add to cart button click to ensure the selected image is captured
  $("form.cart").on("submit", function () {
    // Make sure the hidden input is present with the current active image
    if (state.activeImageUrl) {
      updateCartImageInput(state.activeImageUrl);
    }
  });
});
