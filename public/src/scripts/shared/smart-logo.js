// Smart Logo System for Team Pinas Signage
// Automatically selects the appropriate logo variant based on background and theme

class SmartLogo {
  constructor() {
    this.logoVariants = {
      // Normal logos
      darkBackground: '/assets/images/logo/team_pinas_logo_1.svg',    // Normal logo for dark background
      lightBackground: '/assets/images/logo/team_pinas_logo_2.svg',   // Normal logo for light background
      
      // Monochrome logos  
      monocroomDark: '/assets/images/logo/team_pinas_logo_3.svg',     // Monochrome for dark background
      monocroomLight: '/assets/images/logo/team_pinas_logo_4.svg'     // Monochrome for light background
    };
    
    this.currentMode = 'normal'; // 'normal' or 'monochrome'
    this.backgroundType = 'dark'; // 'dark' or 'light'
    
    this.init();
  }

  init() {
    // Auto-detect background type and set initial logo
    this.detectBackground();
    this.updateAllLogos();
    
    // Listen for theme changes (if dark mode toggle exists)
    this.observeThemeChanges();
    
    // Listen for background changes (if background changes dynamically)  
    this.observeBackgroundChanges();
  }

  detectBackground() {
    // Check if we're in a light theme context (like admin interface)
    const isLightMode = !document.documentElement.classList.contains('dark') &&
                       !document.body.classList.contains('dark-theme');
    
    // Check if we have a dark overlay on the background
    const hasBackground = document.body.style.background && 
                         document.body.style.background.includes('linear-gradient');
    
    // For signage display: always dark background due to overlay
    // For admin: depends on theme
    if (hasBackground || window.location.pathname === '/') {
      this.backgroundType = 'dark';
    } else {
      this.backgroundType = isLightMode ? 'light' : 'dark';
    }
  }

  getCurrentLogo() {
    if (this.currentMode === 'monochrome') {
      return this.backgroundType === 'dark' 
        ? this.logoVariants.monocroomDark 
        : this.logoVariants.monocroomLight;
    } else {
      return this.backgroundType === 'dark'
        ? this.logoVariants.darkBackground
        : this.logoVariants.lightBackground;
    }
  }

  updateAllLogos() {
    const logoElements = document.querySelectorAll('img[src*="team-pinas-logo"], img[src*="team_pinas_logo"]');
    const newLogoSrc = this.getCurrentLogo();
    
    logoElements.forEach(img => {
      if (img.src !== window.location.origin + newLogoSrc) {
        img.src = newLogoSrc;
        
        // Add loading states
        img.addEventListener('load', () => {
          img.style.opacity = '1';
        });
        
        img.addEventListener('error', () => {
          // Fallback to original logo if variant fails to load
          console.warn(`Failed to load logo variant: ${newLogoSrc}`);
          img.src = '/assets/images/team-pinas-logo.svg';
        });
      }
    });
  }

  // Switch between normal and monochrome modes
  setMode(mode) {
    if (['normal', 'monochrome'].includes(mode)) {
      this.currentMode = mode;
      this.updateAllLogos();
    }
  }

  // Manually set background type
  setBackgroundType(type) {
    if (['dark', 'light'].includes(type)) {
      this.backgroundType = type;
      this.updateAllLogos();
    }
  }

  observeThemeChanges() {
    // Watch for dark mode class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          this.detectBackground();
          this.updateAllLogos();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
  }

  observeBackgroundChanges() {
    // Watch for style changes that might affect background
    const observer = new MutationObserver(() => {
      this.detectBackground();
      this.updateAllLogos();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // Public API for manual control
  toggleMode() {
    this.setMode(this.currentMode === 'normal' ? 'monochrome' : 'normal');
  }

  // Get current configuration
  getStatus() {
    return {
      mode: this.currentMode,
      background: this.backgroundType,
      currentLogo: this.getCurrentLogo()
    };
  }
}

// Auto-initialize when DOM is loaded
let smartLogo = null;

document.addEventListener('DOMContentLoaded', () => {
  smartLogo = new SmartLogo();
  
  // Make it globally accessible
  window.smartLogo = smartLogo;
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartLogo;
}