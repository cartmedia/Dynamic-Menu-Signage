// Hybrid Authentication for Team Pinas Signage Admin
// Uses Auth0 when configured; falls back to API key auth in development mode

class AuthManager {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.apiKey = null;
    this.config = { developmentMode: true };
    this.auth0Client = null;
    
    this.init();
  }

  async init() {
    await this.loadConfig();

    if (!this.config.developmentMode) {
      await this.initAuth0();
      // Handle Auth0 redirect callback
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        try {
          await this.auth0Client.handleRedirectCallback();
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Auth0 redirect error:', err);
        }
      }

      const isAuth = await this.auth0Client.isAuthenticated();
      if (isAuth) {
        this.isAuthenticated = true;
        this.user = await this.auth0Client.getUser();
        this.showAdminInterface();
        return;
      }

      // Not authenticated yet -> show login UI (Auth0 button)
      this.showLoginInterface(true);
    } else {
      // Development mode: API key flow
      const storedApiKey = localStorage.getItem('admin_api_key');
      const keyExpiry = localStorage.getItem('admin_key_expiry');
      
      if (storedApiKey && keyExpiry && new Date().getTime() < parseInt(keyExpiry)) {
        this.apiKey = storedApiKey;
        this.isAuthenticated = true;
        this.user = {
          email: 'admin@teampinas.nl',
          name: 'Team Pinas Admin',
          picture: 'https://via.placeholder.com/40'
        };
        this.showAdminInterface();
      } else {
        this.showLoginInterface(false);
      }
    }
  }

  async loadConfig() {
    try {
      const res = await fetch('/.netlify/functions/auth-config');
      if (!res.ok) throw new Error('Failed to load auth config');
      const data = await res.json();
      this.config = data.config || { developmentMode: true };
      console.log('Auth config loaded:', this.config);
    } catch (err) {
      console.warn('Using development auth (config load failed):', err.message);
      this.config = { developmentMode: true };
    }
  }

  async initAuth0() {
    if (!window.auth0 || !this.config?.domain || !this.config?.clientId) {
      throw new Error('Auth0 SDK not available or config missing');
    }
    this.auth0Client = await auth0.createAuth0Client({
      domain: this.config.domain,
      clientId: this.config.clientId,
      authorizationParams: {
        audience: this.config.audience || 'team-pinas-admin',
        redirect_uri: window.location.origin + '/admin.html'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
  }

  async login(inputApiKey) {
    if (!this.config.developmentMode) {
      // Auth0 mode: start redirect login
      try {
        await this.auth0Client.loginWithRedirect();
      } catch (error) {
        console.error('Auth0 login error:', error);
        this.showError('Login mislukt. Probeer het opnieuw.');
      }
      return false;
    } else {
      try {
        // Verify API key with server
        const response = await fetch('/.netlify/functions/verify-api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ apiKey: inputApiKey })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.valid) {
            // Store API key with 24 hour expiry
            this.apiKey = inputApiKey;
            this.isAuthenticated = true;
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
            
            localStorage.setItem('admin_api_key', inputApiKey);
            localStorage.setItem('admin_key_expiry', expiryTime.toString());
            
            this.user = {
              email: 'admin@teampinas.nl',
              name: 'Team Pinas Admin',
              picture: 'https://via.placeholder.com/40'
            };
            
            this.showAdminInterface();
            return true;
          }
        }
        
        this.showError('Ongeldig API key. Probeer opnieuw.');
        return false;
      } catch (error) {
        console.error('Login error:', error);
        this.showError('Login mislukt. Controleer je internetverbinding.');
        return false;
      }
    }
  }

  logout() {
    if (!this.config.developmentMode && this.auth0Client) {
      this.auth0Client.logout({ logoutParams: { returnTo: window.location.origin + '/admin.html' } });
      return;
    }
    // Dev/API key mode
    this.isAuthenticated = false;
    this.user = null;
    this.apiKey = null;
    localStorage.removeItem('admin_api_key');
    localStorage.removeItem('admin_key_expiry');
    this.showLoginInterface(true);
  }

  getApiKey() {
    return this.apiKey;
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  getUser() {
    return this.user;
  }

  // UI Management
  showLoginInterface(isAuth0 = false) {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';

    // Toggle UI texts/buttons based on mode
    const form = document.getElementById('loginForm');
    const apiKeyInput = document.getElementById('apiKey');
    const loginBtn = document.getElementById('loginBtn');
    const infoBox = document.querySelector('#loginContainer .mt-4');

    if (isAuth0) {
      if (apiKeyInput) apiKeyInput.disabled = true;
      if (apiKeyInput) apiKeyInput.placeholder = 'Auth0 login vereist';
      if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login with Auth0';
      if (infoBox) infoBox.style.display = 'none';
    } else {
      if (apiKeyInput) apiKeyInput.disabled = false;
      if (loginBtn) loginBtn.innerHTML = 'Inloggen';
      if (infoBox) infoBox.style.display = 'block';
    }
  }

  showAdminInterface() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
    
    // Update category dropdowns now that admin interface is visible
    if (window.adminInterface && window.adminInterface.categories) {
      setTimeout(() => {
        window.adminInterface.updateCategoryDropdowns();
      }, 100);
    }
    
    // Update user info in header
    if (this.user) {
      const userInfo = document.getElementById('userInfo');
      if (userInfo) {
        userInfo.innerHTML = `
          <div class="flex items-center space-x-3">
            <img src="${this.user.picture || 'https://via.placeholder.com/40'}" 
                 alt="${this.user.name}" class="w-8 h-8 rounded-full">
            <div class="text-sm">
              <div class="font-medium text-gray-900 dark:text-white">${this.user.name}</div>
              <div class="text-gray-500 dark:text-gray-400">${this.user.email}</div>
            </div>
            <button id="logoutBtn" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
              <i class="fas fa-sign-out-alt mr-1"></i>
              Uitloggen
            </button>
          </div>
        `;
        
        // Add logout handler
        document.getElementById('logoutBtn').addEventListener('click', () => {
          this.logout();
        });
      }
    }
    
    // Initialize admin interface if not already done (only on admin page)
    try {
      if (window.AdminInterface) {
        if (!window.adminInterface) {
          console.log('Creating new AdminInterface instance...');
          window.adminInterface = new window.AdminInterface();
        }
        
        // Always call init after authentication is confirmed
        console.log('Calling adminInterface.init()...');
        window.adminInterface.init();
      } else {
        console.log('AdminInterface not available on this page (not admin.html)');
      }
    } catch (error) {
      console.log('AdminInterface not available on this page:', error.message);
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('authError');
    const errorMessage = document.getElementById('authErrorMessage');
    if (errorDiv && errorMessage) {
      errorMessage.textContent = message;
      errorDiv.classList.remove('hidden');
      setTimeout(() => {
        errorDiv.classList.add('hidden');
      }, 5000);
    }
  }

  // API Request helper with API key headers
  async authenticatedFetch(url, options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    let authHeaders = { 'Content-Type': 'application/json' };
    if (!this.config.developmentMode) {
      // Use Auth0 access token
      const token = await this.auth0Client.getTokenSilently();
      authHeaders.Authorization = `Bearer ${token}`;
    } else {
      // API key mode
      if (!this.apiKey) throw new Error('Missing API key');
      authHeaders['X-API-Key'] = this.apiKey;
    }

    const authOptions = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers
      }
    };

    const response = await fetch(url, authOptions);
    
    if (response.status === 401) {
      // API key invalid, redirect to login
      this.logout();
      throw new Error('Authentication expired');
    }
    
    return response;
  }
}

// Initialize auth when page loads
window.authManager = null;
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});