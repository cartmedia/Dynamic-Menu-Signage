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
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadData();
    });

    // Category modal handlers
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      this.openCategoryModal();
    });
    
    document.getElementById('saveCategoryBtn').addEventListener('click', () => {
      this.saveCategory();
    });
    
    document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
      this.closeCategoryModal();
    });

    // Product modal handlers
    document.getElementById('addProductBtn').addEventListener('click', () => {
      this.openProductModal();
    });
    
    document.getElementById('saveProductBtn').addEventListener('click', () => {
      this.saveProduct();
    });
    
    document.getElementById('cancelProductBtn').addEventListener('click', () => {
      this.closeProductModal();
    });

    // Settings handlers
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveDisplaySettings();
    });

    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      this.filterProducts(e.target.value);
    });

    // Close modals on background click
    ['categoryModal', 'productModal'].forEach(modalId => {
      document.getElementById(modalId).addEventListener('click', (e) => {
        if (e.target.id === modalId) {
          this.closeModal(modalId);
        }
      });
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
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${product.name || 'Unnamed'}</div>
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
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${product.active ? 'Actief' : 'Inactief'}
            </span>
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
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900 dark:text-white">${product.name || 'Unnamed'}</div>
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
    } else {
      title.textContent = 'Nieuw Product';
      document.getElementById('productForm').reset();
      document.getElementById('productActive').checked = true;
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
        active
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
        const headerHeight = document.getElementById('headerHeight');
        const footerHeight = document.getElementById('footerHeight');
        
        if (displayColumns) displayColumns.value = data.settings.display_columns || '2';
        if (headerHeight) headerHeight.value = data.settings.header_height || '15';
        if (footerHeight) footerHeight.value = data.settings.footer_height || '8';
        
        console.log('Settings loaded:', data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Don't show error toast for missing form elements
    }
  }

  async saveDisplaySettings() {
    try {
      const displayColumns = document.getElementById('displayColumns').value;
      const rotationInterval = document.getElementById('rotationInterval').value;
      const footerText = document.getElementById('footerText').value;
      const headerHeight = document.getElementById('headerHeight').value;
      const footerHeight = document.getElementById('footerHeight').value;

      const response = await this.apiCall('/.netlify/functions/settings', {
        method: 'PUT',
        body: JSON.stringify({
          display_columns: parseInt(displayColumns),
          rotation_interval: parseInt(rotationInterval),
          footer_text: footerText,
          header_height: parseInt(headerHeight),
          footer_height: parseInt(footerHeight)
        })
      });

      if (response.ok) {
        this.showToast('Settings saved successfully!');
        console.log('Settings saved - display columns:', displayColumns);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
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

}

// Initialize admin interface when page loads
window.adminInterface = null;
document.addEventListener('DOMContentLoaded', () => {
  window.adminInterface = new AdminInterface();
});