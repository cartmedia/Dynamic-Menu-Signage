// Team Pinas Signage Admin Interface
// Handles CRUD operations for categories, products, and settings

class AdminInterface {
  constructor() {
    this.categories = [];
    this.products = [];
    this.currentEditCategory = null;
    this.currentEditProduct = null;
    
    // Don't auto-initialize - wait for auth
    console.log('AdminInterface constructed, waiting for authentication');
  }

  // Helper function for authenticated API calls
  async apiCall(url, options = {}) {
    const authManager = window.authManager;
    if (authManager && authManager.isUserAuthenticated()) {
      return await authManager.authenticatedFetch(url, options);
    } else {
      // Fallback for development mode
      return await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
    }
  }

  async init() {
    this.setupEventListeners();
    await this.loadData();
    await this.loadDisplaySettings();
    this.updateStats();
    
    // Handle initial tab based on URL parameters
    this.handleInitialTab();
  }

  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Helper function to safely add event listener
    const safeAddEventListener = (elementId, event, handler) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(event, handler);
        console.log(`Event listener added for ${elementId}`);
      } else {
        console.error(`Element not found: ${elementId}`);
      }
    };

    // Refresh button
    safeAddEventListener('refreshBtn', 'click', () => {
      this.loadData();
    });

    // Category modal handlers
    safeAddEventListener('addCategoryBtn', 'click', () => {
      this.openCategoryModal();
    });
    
    safeAddEventListener('saveCategoryBtn', 'click', () => {
      this.saveCategory();
    });
    
    safeAddEventListener('cancelCategoryBtn', 'click', () => {
      this.closeCategoryModal();
    });

    // Product modal handlers
    safeAddEventListener('addProductBtn', 'click', () => {
      this.openProductModal();
    });
    
    safeAddEventListener('saveProductBtn', 'click', () => {
      this.saveProduct();
    });
    
    safeAddEventListener('cancelProductBtn', 'click', () => {
      this.closeProductModal();
    });

    // Settings handlers
    safeAddEventListener('saveSettings', 'click', () => {
      this.saveDisplaySettings();
    });

    // Footer text lines handlers - WITH DEBUGGING
    const addFooterLineBtn = document.getElementById('addFooterLine');
    if (addFooterLineBtn) {
      console.log('Found addFooterLine button:', addFooterLineBtn);
      addFooterLineBtn.addEventListener('click', (e) => {
        console.log('addFooterLine button clicked!', e);
        this.addFooterTextLine();
      });
      console.log('Event listener added for addFooterLine button');
    } else {
      console.error('addFooterLine button NOT FOUND');
    }

    // Category filter
    safeAddEventListener('categoryFilter', 'change', (e) => {
      this.filterProducts(e.target.value);
    });

    // Data overview refresh button
    safeAddEventListener('refreshDataOverview', 'click', () => {
      this.refreshDataOverview();
    });

    // Tab navigation functionality
    this.setupTabNavigation();

    // Close modals on background click
    ['categoryModal', 'productModal'].forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target.id === modalId) {
            this.closeModal(modalId);
          }
        });
      }
    });
  }

  async loadData() {
    try {
      this.showLoading(true);
      
      // Load categories, products, and settings from admin endpoints
      const [categoriesResponse, productsResponse, settingsResponse] = await Promise.all([
        this.apiCall('/.netlify/functions/admin-categories'),
        this.apiCall('/.netlify/functions/admin-products'),
        this.apiCall('/.netlify/functions/settings')
      ]);
      
      if (!categoriesResponse.ok || !productsResponse.ok) {
        throw new Error('Failed to load data');
      }
      
      const categoriesData = await categoriesResponse.json();
      const productsData = await productsResponse.json();
      const settingsData = settingsResponse.ok ? await settingsResponse.json() : { settings: {} };
      
      this.categories = categoriesData.categories || [];
      this.products = productsData.products || [];
      this.settings = settingsData.settings || {};

      console.log('Loaded categories:', this.categories);
      console.log('Loaded products:', this.products);
      console.log('Loaded settings:', this.settings);

      this.renderCategories();
      this.renderProducts();
      this.updateCategoryDropdowns();
      this.updateStats();
      
      this.showToast('Data geladen', 'success');
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Fout bij laden van data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  renderCategories() {
    const container = document.getElementById('categoriesList');
    
    if (this.categories.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-sm">Geen categorieën gevonden</p>';
      return;
    }

    container.innerHTML = this.categories.map((category, index) => {
      const productCount = category.product_count || 0;
      return `
        <div class="category-item flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-move" 
             draggable="true" 
             data-category-id="${category.id}" 
             data-order="${category.display_order}">
          <div class="flex items-center flex-1">
            <div class="drag-handle mr-3 text-gray-400 hover:text-gray-600 cursor-grab">
              <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-center">
                <span class="font-medium text-gray-900">${category.name || 'Unnamed'}</span>
                <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  ${category.active ? 'Actief' : 'Inactief'}
                </span>
              </div>
              <p class="text-sm text-gray-500">${productCount} producten</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <button onclick="adminInterface.editCategory(${category.id})" 
                    class="text-blue-600 hover:text-blue-800 text-sm">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="adminInterface.deleteCategory(${category.id})" 
                    class="text-red-600 hover:text-red-800 text-sm">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Add drag and drop listeners
    this.initializeDragAndDrop();
  }

  renderProducts() {
    const tbody = document.getElementById('productsTable');
    
    if (this.products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Geen producten gevonden</td></tr>';
      return;
    }

    tbody.innerHTML = this.products.map(product => {
      const price = parseFloat(product.price) || 0;
      return `
        <tr class="product-item hover:bg-gray-50 cursor-move" 
            draggable="true" 
            data-product-id="${product.id}" 
            data-category-id="${product.category_id}"
            data-order="${product.display_order}">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="drag-handle-product mr-3 text-gray-400 hover:text-gray-600 cursor-grab">
                <i class="fas fa-grip-vertical"></i>
              </div>
              <div class="text-sm font-medium text-gray-900">${product.name || 'Unnamed'}</div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              ${product.category_name || 'No category'}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">€${price.toFixed(2).replace('.', ',')}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex flex-col space-y-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${product.active ? 'Actief' : 'Inactief'}
              </span>
              ${product.on_sale ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">🏷️ Aanbieding</span>' : ''}
              ${product.is_new ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">✨ Nieuw</span>' : ''}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="adminInterface.editProduct(${product.id})" 
                    class="text-indigo-600 hover:text-indigo-900 mr-3">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="adminInterface.deleteProduct(${product.id})" 
                    class="text-red-600 hover:text-red-900">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Add drag and drop listeners for products
    this.initializeProductDragAndDrop();
  }

  updateCategoryDropdowns() {
    const selects = ['categoryFilter', 'productCategory'];
    
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      
      // Skip if element doesn't exist (admin container not visible yet)
      if (!select) {
        console.log(`Select element ${selectId} not found, skipping...`);
        return;
      }
      
      const currentValue = select.value;
      
      // Keep "All categories" option for filter
      if (selectId === 'categoryFilter') {
        select.innerHTML = '<option value="">Alle categorieën</option>';
      } else {
        select.innerHTML = '<option value="">Selecteer categorie</option>';
      }
      
      this.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      });
      
      // Restore previous selection
      select.value = currentValue;
      
      console.log(`Updated ${selectId} with ${this.categories.length} categories`);
    });
  }

  updateStats() {
    try {
      document.getElementById('categoryCount').textContent = this.categories.length;
      document.getElementById('productCount').textContent = this.products.length;
      
      const avgPrice = this.products.length > 0 
        ? this.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / this.products.length 
        : 0;
      document.getElementById('avgPrice').textContent = '€' + avgPrice.toFixed(2).replace('.', ',');
      
      document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('nl-NL');
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  filterProducts(categoryId) {
    console.log('Filtering products by category:', categoryId);
    
    const filteredProducts = categoryId 
      ? this.products.filter(p => p.category_id == categoryId)
      : this.products;
    
    console.log('Filtered products:', filteredProducts.length);
    
    const tbody = document.getElementById('productsTable');
    
    if (filteredProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Geen producten gevonden voor deze categorie</td></tr>';
      return;
    }

    tbody.innerHTML = filteredProducts.map(product => {
      const price = parseFloat(product.price) || 0;
      return `
        <tr class="product-item hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move" 
            draggable="true" 
            data-product-id="${product.id}" 
            data-category-id="${product.category_id}"
            data-order="${product.display_order}">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="drag-handle-product mr-3 text-gray-400 hover:text-gray-600 cursor-grab">
                <i class="fas fa-grip-vertical"></i>
              </div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">${product.name || 'Unnamed'}</div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              ${product.category_name || 'No category'}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900 dark:text-white">€${price.toFixed(2).replace('.', ',')}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${product.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}">
              ${product.active ? 'Actief' : 'Inactief'}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="adminInterface.editProduct(${product.id})" 
                    class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="adminInterface.deleteProduct(${product.id})" 
                    class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Re-initialize drag and drop for filtered products
    this.initializeProductDragAndDrop();
  }

  // Category Modal Functions
  openCategoryModal(category = null) {
    this.currentEditCategory = category;
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    
    if (category) {
      title.textContent = 'Categorie Bewerken';
      document.getElementById('categoryName').value = category.name;
      document.getElementById('categoryOrder').value = category.display_order;
      document.getElementById('categoryActive').checked = category.active;
    } else {
      title.textContent = 'Nieuwe Categorie';
      document.getElementById('categoryForm').reset();
      document.getElementById('categoryActive').checked = true;
    }
    
    modal.classList.remove('hidden');
  }

  closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
    this.currentEditCategory = null;
  }

  async saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const order = parseInt(document.getElementById('categoryOrder').value);
    const active = document.getElementById('categoryActive').checked;

    if (!name) {
      this.showToast('Naam is verplicht', 'error');
      return;
    }

    try {
      const categoryData = {
        name,
        display_order: order,
        active
      };

      let response;
      if (this.currentEditCategory) {
        // Update existing category
        response = await this.apiCall(`/.netlify/functions/admin-categories?id=${this.currentEditCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
          this.showToast('Categorie bijgewerkt', 'success');
        }
      } else {
        // Add new category
        response = await this.apiCall('/.netlify/functions/admin-categories', {
          method: 'POST',
          body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
          this.showToast('Categorie toegevoegd', 'success');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save category');
      }

      // Reload data to reflect changes
      await this.loadData();
      this.closeCategoryModal();
      
      // Invalidate frontend cache so changes appear immediately on signage
      this.invalidateFrontendCache();

    } catch (error) {
      console.error('Error saving category:', error);
      this.showToast('Fout bij opslaan: ' + error.message, 'error');
    }
  }

  editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      this.openCategoryModal(category);
    }
  }

  async deleteCategory(categoryId) {
    if (!confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) {
      return;
    }

    try {
      const response = await this.apiCall(`/.netlify/functions/admin-categories?id=${categoryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
      
      this.showToast('Categorie verwijderd', 'success');
      await this.loadData();
      
    } catch (error) {
      console.error('Error deleting category:', error);
      this.showToast('Fout bij verwijderen: ' + error.message, 'error');
    }
  }

  // Product Modal Functions
  openProductModal(product = null) {
    this.currentEditProduct = product;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    
    if (product) {
      title.textContent = 'Product Bewerken';
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category_id;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productDescription').value = product.description || '';
      document.getElementById('productOrder').value = product.display_order;
      document.getElementById('productActive').checked = product.active;
      document.getElementById('productOnSale').checked = product.on_sale || false;
      document.getElementById('productIsNew').checked = product.is_new || false;
    } else {
      title.textContent = 'Nieuw Product';
      document.getElementById('productForm').reset();
      document.getElementById('productActive').checked = true;
      document.getElementById('productOnSale').checked = false;
      document.getElementById('productIsNew').checked = false;
    }
    
    modal.classList.remove('hidden');
  }

  closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
    this.currentEditProduct = null;
  }

  async saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const categoryId = parseInt(document.getElementById('productCategory').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value.trim();
    const order = parseInt(document.getElementById('productOrder').value);
    const active = document.getElementById('productActive').checked;
    const onSale = document.getElementById('productOnSale').checked;
    const isNew = document.getElementById('productIsNew').checked;

    if (!name || !categoryId || isNaN(price)) {
      this.showToast('Naam, categorie en prijs zijn verplicht', 'error');
      return;
    }

    try {
      const productData = {
        name,
        category_id: categoryId,
        price,
        description,
        display_order: order,
        active,
        on_sale: onSale,
        is_new: isNew
      };

      let response;
      if (this.currentEditProduct) {
        // Update existing product
        response = await this.apiCall(`/.netlify/functions/admin-products?id=${this.currentEditProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productData)
        });
        
        if (response.ok) {
          this.showToast('Product bijgewerkt', 'success');
        }
      } else {
        // Add new product
        response = await this.apiCall('/.netlify/functions/admin-products', {
          method: 'POST',
          body: JSON.stringify(productData)
        });
        
        if (response.ok) {
          this.showToast('Product toegevoegd', 'success');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save product');
      }

      // Reload data to reflect changes
      await this.loadData();
      this.closeProductModal();
      
      // Invalidate frontend cache so changes appear immediately on signage
      this.invalidateFrontendCache();

    } catch (error) {
      console.error('Error saving product:', error);
      this.showToast('Fout bij opslaan: ' + error.message, 'error');
    }
  }

  editProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.openProductModal(product);
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) {
      return;
    }

    try {
      const response = await this.apiCall(`/.netlify/functions/admin-products?id=${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
      
      this.showToast('Product verwijderd', 'success');
      await this.loadData();
      
    } catch (error) {
      console.error('Error deleting product:', error);
      this.showToast('Fout bij verwijderen: ' + error.message, 'error');
    }
  }

  // Utility Functions
  closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // Update toast styling based on type
    const toastDiv = toast.firstElementChild;
    toastDiv.className = `px-6 py-3 rounded-lg shadow-lg flex items-center ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  showLoading(show) {
    // Simple loading indicator
    const refreshBtn = document.getElementById('refreshBtn');
    if (show) {
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
      refreshBtn.disabled = true;
    } else {
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh Data';
      refreshBtn.disabled = false;
    }
  }

  async loadDisplaySettings() {
    try {
      const response = await this.apiCall('/.netlify/functions/settings');
      if (response.ok) {
        const data = await response.json();
        
        // Populate settings form - check if elements exist first
        const displayColumns = document.getElementById('displayColumns');
        const slideSpeed = document.getElementById('slideSpeed');
        const headerHeight = document.getElementById('headerHeight');
        const footerHeight = document.getElementById('footerHeight');
        const footerText = document.getElementById('footerText');
        const footerSpeed = document.getElementById('footerSpeed');
        const footerContinuous = document.getElementById('footerContinuous');
        
        if (displayColumns) displayColumns.value = data.settings.display_columns || '2';
        if (slideSpeed) slideSpeed.value = (data.settings.rotation_interval || 6000) / 1000; // Convert ms to seconds
        if (headerHeight) headerHeight.value = data.settings.header_height || '15';
        if (footerHeight) footerHeight.value = data.settings.footer_height || '8';
        if (footerSpeed) footerSpeed.value = data.settings.footer_speed || '30';
        if (footerContinuous) footerContinuous.value = data.settings.footer_continuous !== false ? 'true' : 'false';
        
        // Load footer text lines
        this.loadFooterTextLines(data.settings.footer_text);
        
        console.log('Settings loaded:', data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Don't show error toast for missing form elements
    }
  }

  async saveDisplaySettings() {
    try {
      // Safely get form elements with fallback values
      const displayColumns = document.getElementById('displayColumns')?.value || '2';
      const slideSpeed = document.getElementById('slideSpeed')?.value || '6';
      const headerHeight = document.getElementById('headerHeight')?.value || '15';
      const footerHeight = document.getElementById('footerHeight')?.value || '8';
      const footerSpeed = document.getElementById('footerSpeed')?.value || '30';
      const footerContinuous = document.getElementById('footerContinuous')?.value === 'true';
      
      // Collect footer text lines from dynamic inputs
      const footerText = this.collectFooterTextLines();

      const settingsData = {
        display_columns: parseInt(displayColumns),
        rotation_interval: parseInt(slideSpeed) * 1000, // Convert seconds to milliseconds
        header_height: parseInt(headerHeight),
        footer_height: parseInt(footerHeight),
        footer_text: footerText,
        footer_speed: parseInt(footerSpeed),
        footer_continuous: footerContinuous
      };

      const response = await this.apiCall('/.netlify/functions/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData)
      });

      if (response.ok) {
        this.showToast('Display instellingen opgeslagen!');
        console.log('Display settings saved:', settingsData);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Fout bij opslaan instellingen: ' + error.message, 'error');
    }
  }

  /**
   * Invalidate frontend cache to ensure changes appear immediately on signage
   */
  invalidateFrontendCache() {
    try {
      // Clear cache keys used by frontend CMS connector
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('team-pinas-cms-cache')) {
          localStorage.removeItem(key);
        }
      });
      
      // Also dispatch event to notify any open frontend tabs
      window.postMessage({
        type: 'CACHE_INVALIDATE',
        source: 'admin-panel'
      }, window.location.origin);
      
      console.log('Frontend cache invalidated');
      this.showToast('Cache geleegd - wijzigingen direct zichtbaar', 'success');
    } catch (error) {
      console.warn('Failed to invalidate frontend cache:', error);
    }
  }

  /**
   * Initialize drag and drop functionality for products
   */
  initializeProductDragAndDrop() {
    const productItems = document.querySelectorAll('.product-item');
    
    productItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          productId: e.target.dataset.productId,
          categoryId: e.target.dataset.categoryId
        }));
        e.target.style.opacity = '0.5';
      });
      
      item.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
      });
      
      item.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
        
        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetProductId = e.currentTarget.dataset.productId;
        const targetCategoryId = e.currentTarget.dataset.categoryId;
        
        if (dragData.productId !== targetProductId) {
          // Only allow reordering within the same category
          if (dragData.categoryId === targetCategoryId) {
            this.reorderProducts(dragData.productId, targetProductId);
          } else {
            this.showToast('Producten kunnen alleen binnen dezelfde categorie worden gesorteerd', 'error');
          }
        }
      });
    });
  }

  /**
   * Initialize drag and drop functionality for categories
   */
  initializeDragAndDrop() {
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.dataset.categoryId);
        e.target.style.opacity = '0.5';
      });
      
      item.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
      });
      
      item.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId = e.currentTarget.dataset.categoryId;
        
        if (draggedId !== targetId) {
          this.reorderCategories(draggedId, targetId);
        }
      });
    });
  }

  /**
   * Reorder categories after drag and drop
   */
  async reorderCategories(draggedId, targetId) {
    try {
      // Find the categories
      const draggedCategory = this.categories.find(c => c.id == draggedId);
      const targetCategory = this.categories.find(c => c.id == targetId);
      
      if (!draggedCategory || !targetCategory) return;
      
      // Swap display orders
      const tempOrder = draggedCategory.display_order;
      draggedCategory.display_order = targetCategory.display_order;
      targetCategory.display_order = tempOrder;
      
      // Update both categories in database
      await Promise.all([
        this.apiCall(`/.netlify/functions/admin-categories?id=${draggedId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: draggedCategory.name,
            display_order: draggedCategory.display_order,
            active: draggedCategory.active
          })
        }),
        this.apiCall(`/.netlify/functions/admin-categories?id=${targetId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: targetCategory.name,
            display_order: targetCategory.display_order,
            active: targetCategory.active
          })
        })
      ]);
      
      // Reload data and invalidate cache
      await this.loadData();
      this.invalidateFrontendCache();
      this.showToast('Volgorde bijgewerkt', 'success');
      
    } catch (error) {
      console.error('Error reordering categories:', error);
      this.showToast('Fout bij wijzigen volgorde: ' + error.message, 'error');
      // Reload to restore original order
      await this.loadData();
    }
  }

  /**
   * Reorder products after drag and drop within the same category
   */
  async reorderProducts(draggedId, targetId) {
    try {
      // Find the products
      const draggedProduct = this.products.find(p => p.id == draggedId);
      const targetProduct = this.products.find(p => p.id == targetId);
      
      if (!draggedProduct || !targetProduct) return;
      
      // Swap display orders
      const tempOrder = draggedProduct.display_order;
      draggedProduct.display_order = targetProduct.display_order;
      targetProduct.display_order = tempOrder;
      
      // Update both products in database
      await Promise.all([
        this.apiCall(`/.netlify/functions/admin-products?id=${draggedId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: draggedProduct.name,
            category_id: draggedProduct.category_id,
            price: draggedProduct.price,
            description: draggedProduct.description,
            display_order: draggedProduct.display_order,
            active: draggedProduct.active
          })
        }),
        this.apiCall(`/.netlify/functions/admin-products?id=${targetId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: targetProduct.name,
            category_id: targetProduct.category_id,
            price: targetProduct.price,
            description: targetProduct.description,
            display_order: targetProduct.display_order,
            active: targetProduct.active
          })
        })
      ]);
      
      // Reload data and invalidate cache
      await this.loadData();
      this.invalidateFrontendCache();
      this.showToast('Product volgorde bijgewerkt', 'success');
      
    } catch (error) {
      console.error('Error reordering products:', error);
      this.showToast('Fout bij wijzigen product volgorde: ' + error.message, 'error');
      // Reload to restore original order
      await this.loadData();
    }
  }

  /**
   * Load footer text lines into dynamic interface
   */
  loadFooterTextLines(footerTextSetting) {
    const container = document.getElementById('footerTextLines');
    if (!container) return;
    
    // Parse the footer text (either || separated string or already an array)
    let lines = [];
    if (typeof footerTextSetting === 'string') {
      lines = footerTextSetting.split('||').filter(line => line.trim());
    } else if (Array.isArray(footerTextSetting)) {
      lines = footerTextSetting;
    }
    
    // Default lines if none exist
    if (lines.length === 0) {
      lines = [
        'Investeer in jezelf of in je kind – personal training vanaf €37,50 per les. Begin vandaag nog!',
        'Interesse? Meld je bij de bar of stuur ons een mailtje.'
      ];
    }
    
    container.innerHTML = '';
    lines.forEach((line, index) => {
      this.addFooterTextLineElement(line.trim(), index);
    });
  }

  /**
   * Add a new footer text line input element
   */
  addFooterTextLineElement(value = '', index = null) {
    console.log('addFooterTextLineElement() called with value:', value, 'index:', index);
    
    const container = document.getElementById('footerTextLines');
    console.log('footerTextLines container:', container);
    
    if (!container) {
      console.error('footerTextLines container NOT FOUND');
      return;
    }
    
    const lineIndex = index !== null ? index : container.children.length;
    console.log('Creating new footer line with index:', lineIndex);
    
    const lineDiv = document.createElement('div');
    lineDiv.className = 'flex items-center space-x-2';
    lineDiv.innerHTML = `
      <input type="text" 
             class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
             placeholder="Voer footer tekst in..."
             value="${value}"
             data-line-index="${lineIndex}">
      <button type="button" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2" 
              onclick="window.adminInterface.removeFooterTextLine(this)">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    console.log('Appending line div to container...');
    container.appendChild(lineDiv);
    console.log('Footer text line added successfully');
  }

  /**
   * Add new empty footer text line
   */
  addFooterTextLine() {
    console.log('addFooterTextLine() called');
    try {
      this.addFooterTextLineElement();
      this.toggleFooterVisibility(true);
      console.log('addFooterTextLineElement() completed successfully');
    } catch (error) {
      console.error('Error in addFooterTextLine():', error);
    }
  }

  /**
   * Remove a footer text line
   */
  removeFooterTextLine(button) {
    const lineDiv = button.closest('div');
    if (lineDiv) {
      lineDiv.remove();
      
      // Check if no lines remain and hide footer if empty
      const container = document.getElementById('footerTextLines');
      if (container && container.children.length === 0) {
        this.toggleFooterVisibility(false);
      }
    }
  }

  /**
   * Toggle footer visibility on signage display based on content
   */
  toggleFooterVisibility(show) {
    // This will be handled by the display script based on footer_text content
    // When footer_text is empty, the footer should be hidden
    console.log('Footer visibility toggled:', show ? 'visible' : 'hidden');
  }

  /**
   * Collect all footer text lines into a string
   */
  collectFooterTextLines() {
    const container = document.getElementById('footerTextLines');
    if (!container) return '';
    
    const inputs = container.querySelectorAll('input[type="text"]');
    const lines = Array.from(inputs)
      .map(input => input.value.trim())
      .filter(line => line.length > 0);
    
    return lines.join('||');
  }

  /**
   * Refresh data overview table with all menu data
   */
  async refreshDataOverview() {
    try {
      console.log('Refreshing data overview...');
      
      // Show loading state
      const tableBody = document.getElementById('dataOverviewBody');
      if (!tableBody) {
        console.error('Data overview table body not found');
        return;
      }
      
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading...</td></tr>';
      
      // Fetch real data from admin endpoints to get actual database values
      const [categoriesResponse, productsResponse] = await Promise.all([
        this.apiCall('/.netlify/functions/admin-categories'),
        this.apiCall('/.netlify/functions/admin-products')
      ]);
      
      if (!categoriesResponse.ok || !productsResponse.ok) {
        throw new Error('Failed to load admin data');
      }
      
      const categoriesData = await categoriesResponse.json();
      const productsData = await productsResponse.json();
      
      console.log('Data overview categories:', categoriesData);
      console.log('Data overview products:', productsData);
      
      this.populateDataOverviewTableFromAdmin(categoriesData, productsData);
      
    } catch (error) {
      console.error('Error refreshing data overview:', error);
      const tableBody = document.getElementById('dataOverviewBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-600">Error loading data</td></tr>';
      }
    }
  }

  /**
   * Populate the data overview table with admin data (real database data)
   */
  populateDataOverviewTableFromAdmin(categoriesData, productsData) {
    const tableBody = document.getElementById('dataOverviewBody');
    if (!tableBody) return;
    
    let html = '';
    const categories = categoriesData.categories || [];
    const products = productsData.products || [];
    
    if (categories.length === 0) {
      html = '<tr><td colspan="7" class="text-center py-4">No categories available</td></tr>';
    } else {
      categories.forEach((category, categoryIndex) => {
        // Get products for this category
        const categoryProducts = products.filter(p => p.category_id === category.id);
        const categoryDisplayOrder = category.display_order !== undefined ? category.display_order : 'Not set';
        const categoryStatus = category.active ? 'Active' : 'Inactive';
        
        if (categoryProducts.length === 0) {
          // Category with no products
          html += `
            <tr class="bg-gray-50 dark:bg-gray-800">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                ${this.escapeHtml(category.name)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" colspan="6">
                No products
              </td>
            </tr>
          `;
        } else {
          // Category with products
          categoryProducts.forEach((product, productIndex) => {
            const showCategoryName = productIndex === 0;
            const productDisplayOrder = product.display_order !== undefined ? product.display_order : 'Not set';
            const productStatus = product.active ? 'Active' : 'Inactive';
            
            // Create badges array from actual database values
            const badges = [];
            if (product.on_sale === true) badges.push('AANBIEDING');
            if (product.is_new === true) badges.push('NIEUW');
            const badgesText = badges.length > 0 ? badges.join(', ') : 'None';
            
            html += `
              <tr class="${productIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  ${showCategoryName ? this.escapeHtml(category.name) : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${this.escapeHtml(product.name)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  €${parseFloat(product.price).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${productDisplayOrder}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${productStatus === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
                    ${productStatus}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${badgesText}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  Database
                </td>
              </tr>
            `;
          });
        }
      });
    }
    
    tableBody.innerHTML = html;
    console.log('Data overview table populated with admin data successfully');
  }

  /**
   * Populate the data overview table with menu data (legacy - for public API)
   */
  populateDataOverviewTable(data) {
    const tableBody = document.getElementById('dataOverviewBody');
    if (!tableBody) return;
    
    let html = '';
    
    if (!data.categories || data.categories.length === 0) {
      html = '<tr><td colspan="7" class="text-center py-4">No data available</td></tr>';
    } else {
      data.categories.forEach((category, categoryIndex) => {
        const categoryDisplayOrder = category.display_order || 'Not set';
        const categoryStatus = 'Active'; // Categories in API response are active
        
        if (!category.items || category.items.length === 0) {
          // Category with no items
          html += `
            <tr class="bg-gray-50 dark:bg-gray-800">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                ${this.escapeHtml(category.title)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" colspan="6">
                No products
              </td>
            </tr>
          `;
        } else {
          // Category with products
          category.items.forEach((product, productIndex) => {
            const showCategoryName = productIndex === 0;
            const productDisplayOrder = product.display_order || 'Not set';
            const productStatus = 'Active'; // Products in API response are active
            
            // Create badges array
            const badges = [];
            if (product.on_sale) badges.push('AANBIEDING');
            if (product.is_new) badges.push('NIEUW');
            const badgesText = badges.length > 0 ? badges.join(', ') : 'None';
            
            html += `
              <tr class="${productIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  ${showCategoryName ? this.escapeHtml(category.title) : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${this.escapeHtml(product.name)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  €${parseFloat(product.price).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${productDisplayOrder}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    ${productStatus}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${badgesText}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${data.source || 'API'}
                </td>
              </tr>
            `;
          });
        }
      });
    }
    
    tableBody.innerHTML = html;
    console.log('Data overview table populated successfully');
  }

  /**
   * Setup tab navigation functionality
   */
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Add click listeners to tab buttons
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        this.switchToTab(targetTab);
      });
    });
    
    console.log('Tab navigation setup complete');
  }

  /**
   * Switch to a specific tab
   */
  switchToTab(targetTab) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    // Activate target tab button
    const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
    if (targetButton) {
      targetButton.classList.add('active');
      targetButton.setAttribute('aria-selected', 'true');
    }
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    
    // Show target tab content
    const targetContent = document.getElementById(`${targetTab}-tab`);
    if (targetContent) {
      targetContent.classList.remove('hidden');
    }
    
    console.log(`Switched to tab: ${targetTab}`);
    
    // Trigger specific actions when switching to certain tabs
    this.onTabSwitch(targetTab);
  }

  /**
   * Handle tab-specific actions when switching
   */
  onTabSwitch(tabName) {
    // Update URL without refreshing page
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url);
    
    switch(tabName) {
      case 'dashboard':
        // Refresh stats when returning to dashboard
        this.updateStats();
        break;
      case 'data':
        // Auto-refresh data overview when switching to data tab
        setTimeout(() => this.refreshDataOverview(), 300);
        break;
      case 'menu':
        // Ensure latest data is shown
        this.renderCategories();
        this.renderProducts();
        break;
      case 'settings':
        // Reload display settings
        this.loadDisplaySettings();
        break;
    }
  }

  /**
   * Handle initial tab based on URL parameters
   */
  handleInitialTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    
    // Valid tabs
    const validTabs = ['dashboard', 'menu', 'settings', 'data'];
    
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      this.switchToTab(tabFromUrl);
    } else {
      // Default to dashboard
      this.switchToTab('dashboard');
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

}

// Make AdminInterface class globally available
window.AdminInterface = AdminInterface;

// Initialize admin interface when page loads
// NOTE: Actual initialization happens in auth.js after authentication
window.adminInterface = null;