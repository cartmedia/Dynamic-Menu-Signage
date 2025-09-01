// Logo Control Interface
// Adds keyboard shortcuts and debug interface for logo variants

class LogoControls {
  constructor() {
    this.init();
  }

  init() {
    this.addKeyboardShortcuts();
    this.addDebugInterface();
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only work when smart logo is available
      if (!window.smartLogo) return;

      // L + M = toggle logo Mode (normal/monochrome)  
      if (e.key.toLowerCase() === 'm' && e.ctrlKey) {
        e.preventDefault();
        window.smartLogo.toggleMode();
        this.showToast(`Logo mode: ${window.smartLogo.getStatus().mode}`);
      }

      // L + D = toggle Dark/light background
      if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
        e.preventDefault();
        const currentBg = window.smartLogo.getStatus().background;
        const newBg = currentBg === 'dark' ? 'light' : 'dark';
        window.smartLogo.setBackgroundType(newBg);
        this.showToast(`Background: ${newBg}`);
      }

      // L + I = logo Info
      if (e.key.toLowerCase() === 'i' && e.ctrlKey) {
        e.preventDefault();
        const status = window.smartLogo.getStatus();
        console.log('Smart Logo Status:', status);
        this.showToast(`Mode: ${status.mode}, BG: ${status.background}`);
      }
    });
  }

  addDebugInterface() {
    // Only add in development
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('netlify')) {
      
      // Create floating debug panel (initially hidden)
      const debugPanel = document.createElement('div');
      debugPanel.id = 'logo-debug-panel';
      debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        display: none;
        backdrop-filter: blur(4px);
        min-width: 200px;
      `;

      debugPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">🎨 Smart Logo Debug</div>
        <div id="logo-status"></div>
        <div style="margin-top: 8px;">
          <button id="toggle-mode" style="margin: 2px; padding: 4px 8px; font-size: 10px;">Toggle Mode</button>
          <button id="toggle-bg" style="margin: 2px; padding: 4px 8px; font-size: 10px;">Toggle BG</button>
        </div>
        <div style="margin-top: 8px; font-size: 10px; opacity: 0.7;">
          Ctrl+M: Mode | Ctrl+D: Background | Ctrl+I: Info | Ctrl+L: Panel
        </div>
      `;

      document.body.appendChild(debugPanel);

      // Toggle debug panel with Ctrl+L
      document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
          e.preventDefault();
          const panel = document.getElementById('logo-debug-panel');
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          if (panel.style.display === 'block') {
            this.updateDebugPanel();
          }
        }
      });

      // Button event listeners
      document.getElementById('toggle-mode').addEventListener('click', () => {
        if (window.smartLogo) {
          window.smartLogo.toggleMode();
          this.updateDebugPanel();
        }
      });

      document.getElementById('toggle-bg').addEventListener('click', () => {
        if (window.smartLogo) {
          const current = window.smartLogo.getStatus().background;
          window.smartLogo.setBackgroundType(current === 'dark' ? 'light' : 'dark');
          this.updateDebugPanel();
        }
      });

      // Update panel every 2 seconds
      setInterval(() => {
        if (document.getElementById('logo-debug-panel').style.display === 'block') {
          this.updateDebugPanel();
        }
      }, 2000);
    }
  }

  updateDebugPanel() {
    if (!window.smartLogo) return;
    
    const status = window.smartLogo.getStatus();
    const statusDiv = document.getElementById('logo-status');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div>Mode: <span style="color: #4ade80;">${status.mode}</span></div>
        <div>Background: <span style="color: #60a5fa;">${status.background}</span></div>
        <div>Logo: <span style="color: #f59e0b; font-size: 10px;">${status.currentLogo.split('/').pop()}</span></div>
      `;
    }
  }

  showToast(message) {
    // Create or update toast notification
    let toast = document.getElementById('smart-logo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'smart-logo-toast';
      toast.style.cssText = `
        position: fixed;
        top: 50px;
        right: 20px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-family: sans-serif;
        font-size: 14px;
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.transform = 'translateX(0)';

    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
    }, 2000);
  }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  new LogoControls();
});