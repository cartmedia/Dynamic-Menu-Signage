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

  // Setting the text (Team Pinas branding)
  dayTitleSpan.textContent = "Team Pinas — " + currentDayName + " Menu";

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

// Products rendering and rotation
document.addEventListener("DOMContentLoaded", function () {
  const SLOTS = [".MenuBreakfast", ".MenuLunch", ".MenuDinner", ".MenuDessert"];
  const PRIMARY_SLOT = SLOTS[0];
  const ROTATE_INTERVAL_MS = 6000; // faster rotation for visibility during testing (6s)

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
    const titleHtml = `<div class="MenuMealType">${category.title}</div><hr />`;
    let itemsHtml = '<div class="MenuItemsContainer">';
    const list = Array.isArray(itemsOverride) ? itemsOverride : (category.items || []);
    list.forEach((it) => {
      itemsHtml += `
        <div class="MenuItem">
          <div class="MenuItemType">${cleanName(it.name)}</div>
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
      const response = await fetch("assets/products.json");
      return await response.json();
    }
  };

  loadProducts()
    .then((data) => {
      const categories = Array.isArray(data.categories) ? data.categories : [];
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
        // Prefer cached value if present
        if (visibleCountCache.has(catIdx)) return visibleCountCache.get(catIdx);
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
        let hi = cat.items.length;
        let best = 1;
        // Binary search max items that fit
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

        visibleCountCache.set(catIdx, best);
        return best;
      }

      function renderSingle(catIdx) {
        const cat = categories[catIdx];
        // render into first slot and show it
        const visibleCount = computeVisibleCountFor(catIdx);
        const items = cat.items || [];
        const totalParts = Math.max(1, Math.ceil(items.length / Math.max(1, visibleCount)));
        const start = Math.min(pagePartIndex, totalParts - 1) * Math.max(1, visibleCount);
        const end = Math.min(items.length, start + Math.max(1, visibleCount));
        renderCategory(PRIMARY_SLOT, cat, items.slice(start, end));
        const primaryEl = document.querySelector(PRIMARY_SLOT);
        if (primaryEl) primaryEl.style.display = "block";
        // hide and clear other slots
        for (let i = 1; i < SLOTS.length; i++) {
          const el = document.querySelector(SLOTS[i]);
          if (el) {
            el.innerHTML = "";
            el.style.display = "none";
          }
        }

        // Hide the secondary column to truly center the single category
        const containers = document.querySelectorAll('.MenuSubContainer');
        containers.forEach((container) => {
          const hasPrimary = container.contains(primaryEl);
          container.style.display = hasPrimary ? 'flex' : 'none';
        });
      }

      // Invalidate cache shortly after load to account for late-loading fonts
      setTimeout(() => visibleCountCache.clear(), 2000);
      window.addEventListener("resize", () => {
        visibleCountCache.clear();
        renderSingle(categoryIndex);
      });

      // initial render
      renderSingle(categoryIndex);

      // Re-measure once web fonts have finished loading (prevents underestimation)
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          visibleCountCache.clear();
          pagePartIndex = 0;
          renderSingle(categoryIndex);
        }).catch(() => {
          /* no-op */
        });
      }
      setInterval(() => {
        const cat = categories[categoryIndex];
        const visibleCount = computeVisibleCountFor(categoryIndex);
        const items = cat.items || [];
        const totalParts = Math.max(1, Math.ceil(items.length / Math.max(1, visibleCount)));
        // advance page within category first
        if (pagePartIndex + 1 < totalParts) {
          pagePartIndex += 1;
        } else {
          pagePartIndex = 0;
          categoryIndex = (categoryIndex + 1) % categories.length;
        }
        renderSingle(categoryIndex);
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
              
              // Clear cache and restart rotation
              visibleCountCache.clear();
              categoryIndex = 0;
              pagePartIndex = 0;
              
              // Update categories with new data
              const newCategories = Array.isArray(newData.categories) ? newData.categories : [];
              categories.length = 0;
              categories.push(...newCategories);
              
              // Re-render current category
              renderSingle(categoryIndex);
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

  function setAnimationDuration() {
    // Get half the width since the text is duplicated
    const spanWidth = scrollingTextSpan.offsetWidth / 2;
    // Increase duration to slow down the scroll (higher = slower)
    const duration = (spanWidth / 30) * 0.6; // footer scroll speed
    scrollingTextSpan.style.animationDuration = duration + "s";
  }

  setAnimationDuration();

  // Restart the animation when it ends to simulate an infinite scroll
  scrollingTextSpan.addEventListener("animationiteration", () => {
    setAnimationDuration();
  });
});
