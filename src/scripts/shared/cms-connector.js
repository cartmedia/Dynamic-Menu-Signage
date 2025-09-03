// CMS API Connector for Team Pinas Signage
// Handles communication with Neon database and data caching

class CMSConnector {
  constructor(config) {
    this.config = config || window.CMS_CONFIG;
    this.cache = new Map();
    this.retryCount = 0;
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.retryFailedRequests();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Fetch products data from CMS or fallback to local JSON
   */
  async getProducts() {
    const cacheKey = 'products';
    
    // Try cache first
    if (this.config.cache.enabled && this.isCacheValid(cacheKey)) {
      console.log('Loading products from cache - fast load!');
      return this.getFromCache(cacheKey);
    }

    // Try CMS API if online
    if (this.isOnline) {
      try {
        const url = this.config.api.baseUrl + this.config.api.endpoints.products;
        const response = await fetch(url, {
          headers: this.config.api.headers,
          signal: AbortSignal.timeout(3000) // 3 second timeout - faster fail
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Raw CMS API data:', data);
          console.log('Raw categories with display_order:');
          data.categories?.forEach((c, idx) => {
            console.log(`  ${idx}: ${c.title} (display_order: ${c.display_order})`);
          });
          const mappedData = this.mapProductsData(data);
          console.log('Mapped categories:', mappedData.categories?.map(c => c.title));
          
          // Cache the result
          this.setCache(cacheKey, mappedData);
          this.retryCount = 0; // Reset retry count on success
          
          console.log('Products loaded from CMS');
          return mappedData;
        } else {
          throw new Error(`API request failed: ${response.status}`);
        }
      } catch (error) {
        console.warn('CMS API request failed:', error.message);
        return this.handleAPIFailure('products');
      }
    }

    // Fallback to local JSON
    return this.loadLocalProducts();
  }

  /**
   * Load products from local JSON file
   */
  async loadLocalProducts() {
    try {
      const response = await fetch(this.config.fallback.localProductsPath);
      if (response.ok) {
        const data = await response.json();
        console.log('Products loaded from local fallback');
        return data;
      }
    } catch (error) {
      console.error('Failed to load local products:', error);
    }
    
    // Return fast local fallback if everything fails
    console.log('🚨 All data sources failed - using emergency fallback');
    return {
      categories: [
        {
          title: "Team Pinas Menu", 
          display_order: 1,
          items: [
            { name: "Loading menu...", price: 0, display_order: 1, on_sale: false, is_new: false }
          ]
        }
      ],
      lastUpdated: new Date().toISOString(),
      source: 'emergency-fallback'
    };
  }

  /**
   * Map CMS data to the expected products.json format
   */
  mapProductsData(cmsData) {
    // If CMS already returns the expected format, return as-is
    if (cmsData.categories && Array.isArray(cmsData.categories)) {
      return cmsData;
    }

    // Map from potential CMS structures to our format
    if (Array.isArray(cmsData)) {
      return {
        categories: cmsData.map(category => ({
          title: category.name || category.title,
          items: (category.products || category.items || []).map(item => ({
            name: item.name || item.title,
            price: parseFloat(item.price || item.cost || 0)
          }))
        }))
      };
    }

    // Handle single category response
    if (cmsData.name && (cmsData.products || cmsData.items)) {
      return {
        categories: [{
          title: cmsData.name,
          items: (cmsData.products || cmsData.items).map(item => ({
            name: item.name || item.title,
            price: parseFloat(item.price || item.cost || 0)
          }))
        }]
      };
    }

    console.warn('Unknown CMS data format, using fallback');
    return { categories: [] };
  }

  /**
   * Handle API failure with retry logic
   */
  async handleAPIFailure(endpoint) {
    this.retryCount++;
    
    if (this.retryCount <= 1) { // Only 1 retry for faster loading
      console.log(`Retrying ${endpoint} request (attempt ${this.retryCount})`);
      // Shorter wait before retry
      await new Promise(resolve => 
        setTimeout(resolve, 500) // 500ms instead of longer interval
      );
      return this.getProducts(); // Retry
    }

    // Max retries reached, use fallback
    console.log('Max retries reached, using local fallback');
    return this.loadLocalProducts();
  }

  /**
   * Retry failed requests when coming back online
   */
  async retryFailedRequests() {
    if (this.retryCount > 0) {
      console.log('Back online, retrying failed requests');
      this.retryCount = 0;
      // Trigger a refresh
      window.dispatchEvent(new CustomEvent('cms-reconnected'));
    }
  }

  /**
   * Cache management
   */
  setCache(key, data) {
    if (!this.config.cache.enabled) return;
    
    const cacheEntry = {
      data: data,
      timestamp: Date.now(),
      expires: Date.now() + this.config.cache.duration
    };
    
    this.cache.set(key, cacheEntry);
    
    // Also store in localStorage for persistence
    try {
      localStorage.setItem(
        `${this.config.cache.storageKey}-${key}`, 
        JSON.stringify(cacheEntry)
      );
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  getFromCache(key) {
    let cacheEntry = this.cache.get(key);
    
    // Try localStorage if not in memory
    if (!cacheEntry) {
      try {
        const stored = localStorage.getItem(`${this.config.cache.storageKey}-${key}`);
        if (stored) {
          cacheEntry = JSON.parse(stored);
          this.cache.set(key, cacheEntry);
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
    }
    
    return cacheEntry ? cacheEntry.data : null;
  }

  isCacheValid(key) {
    const cacheEntry = this.cache.get(key) || 
      (() => {
        try {
          const stored = localStorage.getItem(`${this.config.cache.storageKey}-${key}`);
          return stored ? JSON.parse(stored) : null;
        } catch (e) {
          return null;
        }
      })();
    
    return cacheEntry && cacheEntry.expires > Date.now();
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    
    // Clear localStorage entries
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.config.cache.storageKey)) {
          localStorage.removeItem(key);
        }
      });
      console.log('Cache cleared successfully');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }

  /**
   * Invalidate cache and force refresh from server
   */
  async invalidateAndRefresh() {
    this.clearCache();
    // Force fresh data load
    return await this.getProducts();
  }

  /**
   * Get CMS settings (for future use)
   */
  async getSettings() {
    if (!this.isOnline) return {};
    
    try {
      const url = this.config.api.baseUrl + this.config.api.endpoints.settings;
      const response = await fetch(url, {
        headers: this.config.api.headers
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to load CMS settings:', error);
    }
    
    return {};
  }
}

// Make CMSConnector available globally
if (typeof window !== 'undefined') {
  window.CMSConnector = CMSConnector;
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CMSConnector;
}