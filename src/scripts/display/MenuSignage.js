// Debug Mode Implementation - check if debug is enabled
let debugMode = localStorage.getItem('debugMode') === 'true';
let originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Apply debug mode on page load
if (!debugMode) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Keep console.error for critical issues
}

// Hide loading screen when menu data is ready
function hideLoadingScreenWhenReady() {
  let attempts = 0;
  const maxAttempts = 25; // Max 5 seconds (25 * 200ms)
  
  console.log('🔄 hideLoadingScreenWhenReady started');
  
  // Check if menu data has been loaded and rendered
  const checkDataReady = () => {
    const menuItems = document.querySelectorAll('.MenuItem');
    const hasMenuData = menuItems.length > 0;
    
    console.log(`📊 Check ${attempts + 1}/${maxAttempts}: Found ${menuItems.length} menu items`);
    
    if (hasMenuData) {
      console.log('✅ Menu data rendered, hiding loading screen...');
      hideLoadingScreen();
    } else if (attempts < maxAttempts) {
      // Data not ready yet, check again after a short delay
      attempts++;
      setTimeout(checkDataReady, 200);
    } else {
      // Safety timeout - hide loading screen even if no data loaded
      console.warn('⏰ Loading screen timeout - hiding anyway after 5 seconds');
      hideLoadingScreen();
    }
  };
  
  // Start checking after a minimal initial delay to ensure DOM is ready
  setTimeout(checkDataReady, 300);
  
  // Additional safety net - force hide after 8 seconds no matter what
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
      console.warn('🚨 EMERGENCY: Force hiding loading screen after 8 seconds');
      hideLoadingScreen();
    }
  }, 8000);
}

// Actually hide the loading screen with animation
function hideLoadingScreen() {
  console.log('🎯 hideLoadingScreen called');
  const loadingScreen = document.getElementById('loadingScreen');
  console.log('Loading screen element found:', loadingScreen ? 'YES' : 'NO');
  if (loadingScreen) {
    console.log('Adding fade-out class...');
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      if (loadingScreen && loadingScreen.parentNode) {
        console.log('Removing loading screen element...');
        loadingScreen.remove();
      }
      console.log('🚀 Loading screen hidden - menu ready!');
    }, 500);
  } else {
    console.warn('⚠️ Loading screen element not found - cannot hide');
  }
}

document.addEventListener("DOMContentLoaded", function () {

  // Getting the span element
  var dayTitleSpan = document.getElementById("DayTitle");

  // Getting the current day's name
  var days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  var currentDate = new Date();
  var currentDayName = days[currentDate.getDay()];

  // Setting the text (CounterCast branding)
  dayTitleSpan.textContent = "CounterCast — " + currentDayName + " Menu";

  // Live clock (Dutch locale)
  const clockEl = document.getElementById("Clock");
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = now.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    // Render two lines similar to the Next.js dashboard clock
    clockEl.innerHTML = `
      <div class="ClockTime" aria-label="Huidige tijd">${timeStr}</div>
      <div class="ClockDate" aria-label="Huidige datum">${dateStr}</div>
    `;
  }
  updateClock();
  setInterval(updateClock, 1000);
});

// Display Settings Management
class DisplaySettings {
  constructor() {
    this.settings = {};
    this.loadSettings();
  }

  async loadSettings() {
    try {
      // Try to load from CMS settings API
      const response = await fetch('/.netlify/functions/settings');
      if (response.ok) {
        const data = await response.json();
        this.settings = data.settings || {};
      } else {
        // Fallback to defaults
        this.settings = {
          display_columns: 2,
          rotation_interval: 6000
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults on error
      this.settings = {
        display_columns: 2,
        rotation_interval: 6000
      };
    }
    
    // Apply column layout
    this.applyColumnLayout();
  }

  applyColumnLayout() {
    const columns = parseInt(this.settings.display_columns) || 2;
    const container = document.querySelector('.MenuContainer');
    if (container) {
      // Set both CSS custom property and data attribute
      container.style.setProperty('--columns', columns);
      container.setAttribute('data-columns', columns);
      
      console.log(`Applied ${columns} column layout`);
    }
    
    // Apply dynamic header/footer heights
    this.applyLayoutHeights();
  }

  applyLayoutHeights() {
    const headerHeight = parseInt(this.settings.header_height) || 15;
    const footerHeight = parseFloat(this.settings.footer_height) || 7.8; // Match CSS default
    const logoSize = parseInt(this.settings.logo_size) || 36; // Match CSS default
    const footerTextColor = this.settings.footer_text_color || 'dark'; // Default to dark text
    
    // Set CSS custom properties on body element
    document.body.style.setProperty('--header-height', `${headerHeight}vh`);
    document.body.style.setProperty('--footer-height', `${footerHeight}vh`);
    document.body.style.setProperty('--logo-size', `${logoSize}vh`);
    document.body.style.setProperty('--body-height', `calc(100vh - ${headerHeight}vh - ${footerHeight}vh)`);
    
    // Apply footer text color
    this.applyFooterTextColor(footerTextColor);
    
    console.log(`Applied header: ${headerHeight}vh, footer: ${footerHeight}vh, logo: ${logoSize}vh, footer text: ${footerTextColor}`);
  }

  applyFooterTextColor(colorMode) {
    const footerContainer = document.querySelector('.SignageFooter');
    if (!footerContainer) return;
    
    // Remove existing color classes
    footerContainer.classList.remove('footer-light', 'footer-dark');
    
    // Apply new color class and CSS custom property
    if (colorMode === 'light') {
      footerContainer.classList.add('footer-light');
      document.body.style.setProperty('--footer-text-color', '#ffffff');
      console.log('🎨 Applied light footer text color');
    } else {
      footerContainer.classList.add('footer-dark');
      document.body.style.setProperty('--footer-text-color', '#101010');
      console.log('🎨 Applied dark footer text color');
    }
  }

  getColumnCount() {
    return parseInt(this.settings.display_columns) || 2;
  }
}

// Initialize display settings
const displaySettings = new DisplaySettings();

// Products rendering and rotation
document.addEventListener("DOMContentLoaded", function () {
  const SLOTS = [".CategorySlot[data-slot='1']", ".CategorySlot[data-slot='2']", ".CategorySlot[data-slot='3']", ".CategorySlot[data-slot='0']"];
  const PRIMARY_SLOT = SLOTS[0]; // Now points to slot 1
  let ROTATE_INTERVAL_MS = 6000; // Default, will be updated from settings
  
  // Load settings and products in parallel for faster initialization
  const initPromises = [
    displaySettings.loadSettings().then(() => {
      ROTATE_INTERVAL_MS = parseInt(displaySettings.settings.rotation_interval) || 6000;
      console.log(`Updated rotation interval to ${ROTATE_INTERVAL_MS}ms`);
    }),
    // Products will be loaded by setupAndInit() 
  ];

  Promise.all(initPromises).then(() => {
    console.log('⚡ Parallel initialization complete');
  }).catch(error => {
    console.warn('Some initialization failed, continuing anyway:', error);
  });

  // Strip technical prefixes from names (e.g., "A Cola" -> "Cola")
  function cleanName(name) {
    if (!name) return "";
    const str = String(name).trim();
    const parts = str.split(/\s+/);
    if (parts.length > 1) {
      const first = parts[0];
      const removable = new Set(["A", "B", "AA", "Br", "W"]);
      if (removable.has(first)) {
        return parts.slice(1).join(" ");
      }
    }
    return str;
  }

  function euro(value) {
    try {
      const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
      if (Number.isFinite(n)) {
        return "€" + n.toFixed(2).replace(".", ",");
      }
    } catch (_) {}
    return String(value);
  }

  function renderCategory(slotSelector, category, itemsOverride) {
    if (!category) {
      document.querySelector(slotSelector).innerHTML = "";
      return;
    }
    const titleHtml = `<div class="CategoryTitle">${category.title}</div><hr />`;
    let itemsHtml = '<div class="MenuItemsContainer">';
    const list = Array.isArray(itemsOverride) ? itemsOverride : (category.items || []);
    list.forEach((it) => {
      // CSS classes for special styling
      const specialClasses = [];
      if (it.on_sale) specialClasses.push('on-sale');
      if (it.is_new) specialClasses.push('is-new');
      const itemClass = specialClasses.length > 0 ? ` ${specialClasses.join(' ')}` : '';
      
      // Badge elements
      const badges = [];
      if (it.on_sale) badges.push('<span class="sale-badge">Aanbieding</span>');
      if (it.is_new) badges.push('<span class="new-badge">Nieuw</span>');
      const badgesHtml = badges.join('');
      
      itemsHtml += `
        <div class="MenuItem${itemClass}">
          <div class="MenuItemType">${cleanName(it.name)}${badgesHtml}</div>
          <div class="MenuFoodItem">${euro(it.price)}</div>
        </div>
      `;
    });
    itemsHtml += "</div>";
    document.querySelector(slotSelector).innerHTML = titleHtml + itemsHtml;
  }

  function chunk(array, size) {
    const out = [];
    for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
    return out;
  }

  // Initialize CMS connector
  const cmsConnector = window.CMSConnector ? new window.CMSConnector() : null;
  
  // Load products from CMS or fallback to local JSON
  const loadProducts = async () => {
    if (cmsConnector) {
      return await cmsConnector.getProducts();
    } else {
      // Fallback to original method if CMS connector not available
      const response = await fetch("/assets/data/products.json");
      return await response.json();
    }
  };

  loadProducts()
    .then((data) => {
      console.log("Initial data loaded:", data);
      const categories = Array.isArray(data.categories) ? data.categories : [];
      console.log("Initial categories:", categories.map(c => c.title));
      if (categories.length === 0) {
        SLOTS.forEach((s) => (document.querySelector(s).innerHTML = ""));
        return;
      }
      let categoryIndex = 0;
      let pagePartIndex = 0; // which slice within current category

      const visibleCountCache = new Map(); // categoryIndex -> count

      function getSlotEl() {
        return document.querySelector(PRIMARY_SLOT);
      }

      function fits(slotEl) {
        // allow a tiny epsilon
        return slotEl.scrollHeight <= slotEl.clientHeight + 1;
      }

      function computeVisibleCountFor(catIdx) {
        // Hard limit: maximum 8 items per slot
        const MAX_ITEMS = 8;
        
        // Prefer cached value if present
        if (visibleCountCache.has(catIdx)) return Math.min(visibleCountCache.get(catIdx), MAX_ITEMS);
        const cat = categories[catIdx];
        if (!cat || !Array.isArray(cat.items) || cat.items.length === 0) {
          visibleCountCache.set(catIdx, 0);
          return 0;
        }
        const slotEl = getSlotEl();
        if (!slotEl) return 0;

        // Ensure slot is measurable: force display and hide visually to avoid flicker
        const prevDisplay = slotEl.style.display;
        const prevVisibility = slotEl.style.visibility;
        slotEl.style.display = "block";
        slotEl.style.visibility = "hidden";

        let lo = 1;
        let hi = Math.min(cat.items.length, MAX_ITEMS); // Cap at MAX_ITEMS
        let best = 1;
        // Binary search max items that fit (up to MAX_ITEMS)
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          renderCategory(PRIMARY_SLOT, cat, cat.items.slice(0, mid));
          if (fits(slotEl)) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        // Restore styles
        slotEl.style.visibility = prevVisibility || "";
        slotEl.style.display = prevDisplay || "";

        const finalCount = Math.min(best, MAX_ITEMS);
        visibleCountCache.set(catIdx, finalCount);
        return finalCount;
      }

      function renderDynamicSlots() {
        // Get display mode from settings
        const columnCount = displaySettings.getColumnCount();
        
        // Clear all slots first
        SLOTS.forEach(slot => {
          const el = document.querySelector(slot);
          if (el) {
            el.innerHTML = "";
            el.style.display = "none"; // Hide all initially
          }
        });
        
        // Determine how many slots to actually use based on content
        const currentCategory = categories[categoryIndex];
        if (!currentCategory || !currentCategory.items || currentCategory.items.length === 0) {
          return;
        }
        
        const visibleCount = computeVisibleCountFor(categoryIndex);
        const items = currentCategory.items || [];
        const totalItems = items.length;
        
        // Decide how many slots we need and fill them intelligently
        let slotsToUse = columnCount === 1 ? 1 : 2;
        
        if (slotsToUse === 1) {
          // Single slot mode - show current page of current category, MAX 8 ITEMS
          const MAX_ITEMS_PER_SLOT = 8;
          const slotEl = document.querySelector(SLOTS[0]);
          if (slotEl) {
            slotEl.style.display = "block";
            const start = pagePartIndex * MAX_ITEMS_PER_SLOT;
            const end = Math.min(totalItems, start + MAX_ITEMS_PER_SLOT);
            const slotItems = items.slice(start, end);
            renderCategory(SLOTS[0], currentCategory, slotItems);
          }
        } else {
          // Two slot mode - Use visibleCount for consistency with rotation logic
          const MAX_ITEMS_PER_SLOT = Math.min(visibleCount, 8); // Respect computed visible count but cap at 8
          
          if (totalItems > MAX_ITEMS_PER_SLOT) {
            // Split current category across 2 slots based on pagination
            const start = pagePartIndex * MAX_ITEMS_PER_SLOT;
            const end = Math.min(totalItems, start + MAX_ITEMS_PER_SLOT * 2);
            
            // Slot 1: Current page items
            const slot1El = document.querySelector(SLOTS[0]);
            if (slot1El) {
              slot1El.style.display = "block";
              const slot1Items = items.slice(start, Math.min(end, start + MAX_ITEMS_PER_SLOT));
              renderCategory(SLOTS[0], currentCategory, slot1Items);
            }
            
            // Slot 2: Next page items (if available)
            const slot2El = document.querySelector(SLOTS[1]);
            if (slot2El && start + MAX_ITEMS_PER_SLOT < end) {
              slot2El.style.display = "block";
              const slot2Items = items.slice(start + MAX_ITEMS_PER_SLOT, end);
              renderCategory(SLOTS[1], currentCategory, slot2Items);
            } else if (slot2El) {
              // If no more items in current category, show next category
              const nextCategoryIndex = (categoryIndex + 1) % categories.length;
              const nextCategory = categories[nextCategoryIndex];
              if (nextCategory) {
                slot2El.style.display = "block";
                const nextItems = (nextCategory.items || []).slice(0, MAX_ITEMS_PER_SLOT);
                renderCategory(SLOTS[1], nextCategory, nextItems);
              }
            }
          } else {
            // Show current category in slot 1, next category in slot 2
            const slot1El = document.querySelector(SLOTS[0]);
            if (slot1El) {
              slot1El.style.display = "block";
              const slot1Items = items.slice(0, MAX_ITEMS_PER_SLOT);
              renderCategory(SLOTS[0], currentCategory, slot1Items);
            }
            
            // Show next category in slot 2
            const nextCategoryIndex = (categoryIndex + 1) % categories.length;
            const nextCategory = categories[nextCategoryIndex];
            const slot2El = document.querySelector(SLOTS[1]);
            if (slot2El && nextCategory) {
              slot2El.style.display = "block";
              const nextItems = (nextCategory.items || []).slice(0, MAX_ITEMS_PER_SLOT);
              renderCategory(SLOTS[1], nextCategory, nextItems);
            }
          }
        }
        
        // No need for container management with direct slots
      }

      // Invalidate cache shortly after load to account for late-loading fonts
      setTimeout(() => visibleCountCache.clear(), 2000);
      window.addEventListener("resize", () => {
        visibleCountCache.clear();
        renderDynamicSlots();
      });

      // initial render
      renderDynamicSlots();

      // Hide loading screen after menu data is properly rendered
      hideLoadingScreenWhenReady();

      // Re-measure once web fonts have finished loading (prevents underestimation)
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          visibleCountCache.clear();
          pagePartIndex = 0;
          renderDynamicSlots();
        }).catch(() => {
          /* no-op */
        });
      }
      setInterval(() => {
        // Simple rotation: just advance the starting point
        // This will naturally cycle through all categories and pages
        pagePartIndex += 1;
        
        // Check if we need to move to next category
        if (categories[categoryIndex] && categories[categoryIndex].items) {
          const visibleCount = computeVisibleCountFor(categoryIndex);
          const items = categories[categoryIndex].items || [];
          const totalParts = Math.max(1, Math.ceil(items.length / Math.max(1, visibleCount)));
          
          console.log(`Category: ${categories[categoryIndex].title} (${categoryIndex}), pagePartIndex: ${pagePartIndex}, totalParts: ${totalParts}, visibleCount: ${visibleCount}`);
          
          if (pagePartIndex >= totalParts) {
            const oldCategoryIndex = categoryIndex;
            pagePartIndex = 0;
            categoryIndex = (categoryIndex + 1) % categories.length;
            console.log(`Advancing from category ${oldCategoryIndex} (${categories[oldCategoryIndex].title}) to ${categoryIndex} (${categories[categoryIndex].title})`);
          }
        } else {
          // Skip empty categories
          console.log(`Skipping empty category ${categoryIndex}: ${categories[categoryIndex]?.title || 'undefined'}`);
          pagePartIndex = 0;
          categoryIndex = (categoryIndex + 1) % categories.length;
        }
        
        renderDynamicSlots();
      }, ROTATE_INTERVAL_MS);

      // Set up automatic refresh for CMS updates
      if (cmsConnector) {
        const refreshData = async () => {
          try {
            console.log("Checking for CMS updates...");
            const newData = await cmsConnector.getProducts();
            
            // Only update if data has actually changed
            if (JSON.stringify(newData) !== JSON.stringify(data)) {
              console.log("CMS data updated, refreshing display");
              console.log("New categories from CMS:", newData.categories?.map(c => c.title));
              
              // Preserve current rotation position when possible
              const currentCategoryTitle = categories[categoryIndex]?.title;
              
              // Clear cache but preserve rotation state
              visibleCountCache.clear();
              
              // Update categories with new data
              const newCategories = Array.isArray(newData.categories) ? newData.categories : [];
              categories.length = 0;
              categories.push(...newCategories);
              
              // Try to find the same category in the new data to preserve position
              if (currentCategoryTitle) {
                const newIndex = categories.findIndex(cat => cat.title === currentCategoryTitle);
                if (newIndex !== -1) {
                  categoryIndex = newIndex;
                  console.log(`Preserved rotation position at category: ${currentCategoryTitle} (${newIndex})`);
                } else {
                  categoryIndex = 0;
                  pagePartIndex = 0;
                  console.log("Could not preserve position, resetting to start");
                }
              } else {
                categoryIndex = 0;
                pagePartIndex = 0;
              }
              
              console.log("Updated categories array:", categories.map(c => c.title));
              
              // Re-render all slots
              renderDynamicSlots();
            }
          } catch (error) {
            console.warn("Failed to refresh CMS data:", error);
          }
        };

        // Set up periodic refresh
        setInterval(refreshData, cmsConnector.config.refresh.interval);

        // Listen for reconnection events
        window.addEventListener('cms-reconnected', refreshData);
      }
    })
    .catch((err) => console.error("Error loading products data", err));
});

document.addEventListener("DOMContentLoaded", function () {
  const scrollingTextSpan = document.querySelector(".ScrollingText span");

  // Footer slideshow management
  let footerSpeed = 30; // Default pixels per second
  let footerText = ""; // No fallback content - only show footer if database has content
  let footerContinuous = true; // Default to continuous scrolling
  let footerInitialized = false;

  function updateFooterContent() {
    if (!scrollingTextSpan) return;
    
    // Split text by custom separator and add SVG dividers
    const textParts = footerText.split('||').filter(part => part.trim());
    
    // Hide footer if no content
    const footerContainer = document.querySelector('.Footer');
    if (textParts.length === 0 || !footerText.trim()) {
      if (footerContainer) {
        footerContainer.style.display = 'none';
      }
      return;
    } else {
      if (footerContainer) {
        footerContainer.style.display = 'block';
        console.log('✅ Footer shown immediately with content');
      }
    }
    
    let htmlContent = '';
    
    // Get per-row color settings if available
    const footerRowColors = displaySettings?.settings?.footer_row_colors;
    const usePerRowColors = footerRowColors && Array.isArray(footerRowColors);
    
    // Create the scrolling content with SVG separators and optional per-row colors
    textParts.forEach((part, index) => {
      let partContent = part.trim();
      
      // Apply per-row color if specified
      if (usePerRowColors && footerRowColors[index]) {
        const colorClass = footerRowColors[index] === 'light' ? 'footer-text-light' : 'footer-text-dark';
        partContent = `<span class="${colorClass}">${partContent}</span>`;
        console.log(`🎨 Applied ${colorClass} to row ${index + 1}`);
      }
      
      htmlContent += partContent;
      // Add SVG separator after each part
      htmlContent += '<img class="sep" src="assets/images/pinas_kroon.svg" alt="" role="presentation" aria-hidden="true" />';
    });
    
    if (footerContinuous) {
      // Voor echte continue scrolling: dupliceer de content met extra spacing
      scrollingTextSpan.innerHTML = htmlContent + ' ' + htmlContent;
      scrollingTextSpan.style.animationName = 'scrollTextContinuous';
    } else {
      // Discrete mode: enkele content met natuurlijke pauze
      scrollingTextSpan.innerHTML = htmlContent;
      scrollingTextSpan.style.animationName = 'scrollTextDiscrete';
    }
    
    // Set animation immediately after content is set
    requestAnimationFrame(() => {
      setAnimationDuration();
      footerInitialized = true;
    });
  }

  function setAnimationDuration() {
    if (!scrollingTextSpan || !scrollingTextSpan.innerHTML.trim()) return;
    
    // Force layout calculation to ensure accurate measurements
    const containerWidth = scrollingTextSpan.parentElement.offsetWidth;
    let spanWidth = scrollingTextSpan.offsetWidth;
    
    // Fallback if measurements fail
    if (!containerWidth || !spanWidth) {
      console.warn('⚠️ Footer measurement failed, using fallback timing');
      scrollingTextSpan.style.animationDuration = '20s';
      return;
    }
    
    let totalDistance;
    
    if (footerContinuous && spanWidth > 0) {
      // Continue: van 100% naar -50% = 150% van container breedte
      // Maar we gebruiken halve span breedte omdat content gedupliceerd is
      spanWidth = spanWidth / 2;
      totalDistance = containerWidth + (spanWidth / 2); // 100% + 50% van de echte content
    } else {
      // Discrete: van 100% naar -100% = 200% van container breedte  
      totalDistance = spanWidth + (2 * containerWidth); // Volledige span + 200% container
    }
    
    // Calculate duration based on speed setting (pixels per second)
    // Minimum duration of 5s to prevent too fast scrolling
    const calculatedDuration = Math.max(5, totalDistance / footerSpeed);
    scrollingTextSpan.style.animationDuration = calculatedDuration + "s";
    
    console.log(`🎬 Footer animation: ${footerContinuous ? 'continuous' : 'discrete'}, spanWidth: ${spanWidth}px, containerWidth: ${containerWidth}px, totalDistance: ${totalDistance}px, duration: ${calculatedDuration}s`);
  }

  // Load footer settings from CMS
  async function loadFooterSettings() {
    console.log('🔄 loadFooterSettings called');
    
    if (displaySettings && displaySettings.settings && displaySettings.settings.footer_text) {
      footerSpeed = parseInt(displaySettings.settings.footer_speed) || 30;
      footerText = displaySettings.settings.footer_text.trim();
      footerContinuous = displaySettings.settings.footer_continuous !== false; // Default to true
      const footerTextColor = displaySettings.settings.footer_text_color || 'dark'; // Default to dark
      
      console.log('📊 Database footer settings loaded:');
      console.log(`  Speed: ${footerSpeed}px/s, Continuous: ${footerContinuous}, Global Color: ${footerTextColor}`);
      console.log(`  Text: "${footerText.substring(0, 50)}${footerText.length > 50 ? '...' : ''}"`);
      
      // Check for per-row colors
      const footerRowColors = displaySettings.settings.footer_row_colors;
      if (footerRowColors && Array.isArray(footerRowColors)) {
        console.log(`  Per-row colors: [${footerRowColors.join(', ')}]`);
      }
      
      // Apply footer text color setting
      if (displaySettings.applyFooterTextColor) {
        displaySettings.applyFooterTextColor(footerTextColor);
      }
      
      // Only show footer if we have actual content from database
      if (footerText) {
        console.log('✅ Footer content available, initializing...');
        updateFooterContent(); // This will show the footer and start animation
      } else {
        console.log('⚠️ Empty footer text in database, hiding footer');
        const footerContainer = document.querySelector('.Footer');
        if (footerContainer) {
          footerContainer.style.display = 'none';
        }
      }
    } else {
      console.log('ℹ️ No footer content in database, hiding footer');
      const footerContainer = document.querySelector('.Footer');
      if (footerContainer) {
        footerContainer.style.display = 'none';
      }
    }
  }

  // Show footer with loading state initially, then load settings
  const footerContainer = document.querySelector('.Footer');
  if (footerContainer) {
    footerContainer.style.display = 'none'; // Start hidden, but load quickly
    console.log('🔄 Footer initialized, loading settings...');
  }

  // Fast settings loading with immediate check and timeout fallback
  const loadFooterWithTimeout = async () => {
    // Check if settings are already loaded
    if (displaySettings && displaySettings.settings && displaySettings.settings.footer_text) {
      console.log('⚡ Footer settings already loaded, showing immediately');
      loadFooterSettings();
      return;
    }
    
    const settingsTimeout = new Promise(resolve => setTimeout(resolve, 1500)); // Reduced to 1.5s timeout
    
    try {
      if (displaySettings) {
        // Race between settings loading and timeout
        await Promise.race([
          displaySettings.loadSettings().then(() => {
            console.log('⚡ Footer settings loaded via promise');
            loadFooterSettings();
          }),
          settingsTimeout.then(() => {
            console.warn('⏰ Footer settings timeout, checking if settings are now available...');
            if (displaySettings.settings && displaySettings.settings.footer_text) {
              console.log('⚡ Footer settings found after timeout');
              loadFooterSettings();
            } else {
              console.log('ℹ️ No footer settings available after timeout');
            }
          })
        ]);
      } else {
        console.log('⚠️ No displaySettings available, keeping footer hidden');
      }
    } catch (error) {
      console.warn('❌ Footer settings loading failed:', error);
    }
  };

  // Start loading immediately - run async without blocking
  loadFooterWithTimeout();

  // Restart the animation when it ends to simulate an infinite scroll
  if (scrollingTextSpan) {
    scrollingTextSpan.addEventListener("animationiteration", () => {
      if (footerInitialized) {
        setAnimationDuration();
      }
    });
  }
});
