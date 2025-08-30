// Auth0 Authentication for Team Pinas Signage Admin
// Handles user authentication and authorization

class AuthManager {
  constructor() {
    this.auth0 = null;
    this.user = null;
    this.isAuthenticated = false;
    this.config = null;
    this.developmentMode = false;
    
    this.init();
  }

  async init() {
    try {
      // Load Auth0 configuration from server
      const configResponse = await fetch('/.netlify/functions/auth-config');
      const configData = await configResponse.json();
      
      if (configData.config.developmentMode) {
        console.warn('Auth0 not configured, using development mode');
        this.developmentMode = true;
        this.handleDevelopmentMode();
        return;
      }

      // Set up Auth0 configuration
      this.config = {
        domain: configData.config.domain,
        clientId: configData.config.clientId,
        redirectUri: window.location.origin + '/admin.html',
        audience: configData.config.audience,
        scope: 'openid profile email'
      };

      // Check if Auth0 SDK is available
      if (typeof auth0 === 'undefined') {
        console.warn('Auth0 SDK not loaded, using development mode');
        this.developmentMode = true;
        this.handleDevelopmentMode();
        return;
      }

      // Initialize Auth0
      this.auth0 = new auth0.WebAuth({
        domain: this.config.domain,
        clientID: this.config.clientId,
        redirectUri: this.config.redirectUri,
        audience: this.config.audience,
        responseType: 'token id_token',
        scope: this.config.scope
      });

      console.log('Auth0 initialized with domain:', this.config.domain);

      // Check if user is returning from login
      if (window.location.hash.includes('access_token')) {
        this.handleAuthentication();
      } else {
        // Check if user has valid session
        this.checkSession();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.developmentMode = true;
      this.handleDevelopmentMode();
    }
  }

  handleDevelopmentMode() {
    // For development/testing without Auth0 setup
    console.log('Running in development mode - skipping authentication');
    this.isAuthenticated = true;
    this.user = {
      email: 'admin@teampinas.nl',
      name: 'Admin User',
      picture: 'https://via.placeholder.com/40'
    };
    this.showAdminInterface();
  }

  login() {
    // Check for development mode
    if (this.developmentMode || !this.auth0) {
      console.log('Development mode - simulating login');
      this.handleDevelopmentMode();
      return;
    }

    this.auth0.authorize();
  }

  logout() {
    if (!this.auth0) {
      console.log('Development mode - simulating logout');
      this.isAuthenticated = false;
      this.user = null;
      this.showLoginInterface();
      return;
    }

    this.auth0.logout({
      returnTo: window.location.origin,
      clientID: this.config.clientId
    });
  }

  handleAuthentication() {
    this.auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
      } else if (err) {
        console.error('Authentication error:', err);
        this.showError('Login failed. Please try again.');
        this.showLoginInterface();
      }
    });
  }

  setSession(authResult) {
    // Store tokens
    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('id_token', authResult.idToken);
    localStorage.setItem('expires_at', JSON.stringify(authResult.expiresIn * 1000 + new Date().getTime()));

    this.auth0.client.userInfo(authResult.accessToken, (err, user) => {
      if (err) {
        console.error('Error getting user info:', err);
        return;
      }
      
      this.user = user;
      this.isAuthenticated = true;
      
      // Remove hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      this.showAdminInterface();
    });
  }

  checkSession() {
    const accessToken = localStorage.getItem('access_token');
    const expiresAt = JSON.parse(localStorage.getItem('expires_at') || '0');
    const isExpired = new Date().getTime() > expiresAt;

    if (accessToken && !isExpired) {
      // Valid session exists
      this.auth0.client.userInfo(accessToken, (err, user) => {
        if (err) {
          console.error('Session check error:', err);
          this.showLoginInterface();
          return;
        }
        
        this.user = user;
        this.isAuthenticated = true;
        this.showAdminInterface();
      });
    } else {
      // No valid session
      this.showLoginInterface();
    }
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  getUser() {
    return this.user;
  }

  // UI Management
  showLoginInterface() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
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
              <div class="font-medium text-gray-900">${this.user.name}</div>
              <div class="text-gray-500">${this.user.email}</div>
            </div>
            <button id="logoutBtn" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
              <i class="fas fa-sign-out-alt mr-1"></i>
              Logout
            </button>
          </div>
        `;
        
        // Add logout handler
        document.getElementById('logoutBtn').addEventListener('click', () => {
          this.logout();
        });
      }
    }
    
    // Initialize admin interface if not already done
    if (!window.adminInterface) {
      window.adminInterface = new AdminInterface();
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  // API Request helper with auth headers
  async authenticatedFetch(url, options = {}) {
    const token = this.getAccessToken();
    
    // In development mode, skip authentication
    if (this.developmentMode || !token) {
      console.log('Development mode - making request without auth headers');
      const devOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        }
      };
      return await fetch(url, devOptions);
    }

    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(url, authOptions);
    
    if (response.status === 401) {
      // Token expired, redirect to login
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