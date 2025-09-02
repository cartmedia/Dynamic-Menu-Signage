// CMS Configuration for Team Pinas Signage
// Configure your Neon database API endpoint here

const CMS_CONFIG = {
  // CMS API Configuration for Netlify deployment
  api: {
    // Netlify Functions endpoints
    baseUrl: window.location.origin + '/.netlify/functions',
    endpoints: {
      products: '/products',
      categories: '/categories', 
      settings: '/settings'
    },
    // API headers
    headers: {
      'Content-Type': 'application/json'
    }
  },

  // Update intervals
  refresh: {
    // How often to check for updates (in milliseconds)
    interval: 300000, // 5 minutes (reduced from 30 seconds)
    // Retry interval on failed requests
    retryInterval: 10000, // 10 seconds
    // Maximum retry attempts
    maxRetries: 3
  },

  // Fallback behavior
  fallback: {
    // Use local JSON files if API is unavailable
    useLocalFallback: true,
    localProductsPath: '/assets/data/products.json',
    localMenuPath: '/assets/data/Menu.json'
  },

  // Cache settings
  cache: {
    // Cache API responses locally
    enabled: true,
    // Cache duration in milliseconds
    duration: 300000, // 5 minutes
    storageKey: 'team-pinas-cms-cache'
  }
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.CMS_CONFIG = CMS_CONFIG;
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CMS_CONFIG;
}