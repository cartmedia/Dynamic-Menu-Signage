// Team Pinas Signage Admin Interface
// Handles CRUD operations for categories, products, and settings

class AdminInterface {
  constructor() {
    this.categories = [];
    this.products = [];
    this.currentEditCategory = null;
    this.currentEditProduct = null;
    this.selectedCategoryId = null;
    this.filteredProducts = [];
    this.searchTerm = '';
    this.statusFilter = '';
    this.badgeFilter = '';
    this.categoryFilterAllProducts = '';
    
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

    // Category filter removed - now using categoryFilterAllProducts in setupEventsListeners()

    // Data overview refresh button
    safeAddEventListener('refreshDataOverview', 'click', () => {
      this.refreshDataOverview();
    });

    // Tab navigation functionality
    this.setupTabNavigation();

    // New UI event listeners for improved products management
    this.setupNewProductUIListeners();

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
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-folder-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
          <p class="text-gray-500 dark:text-gray-400 text-sm">Geen categorieën gevonden</p>
          <button onclick="adminInterface.openCategoryModal()" class="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium">
            + Eerste categorie toevoegen
          </button>
        </div>
      `;
      return;
    }

    // Add "All Categories" option at the top
    let html = `
      <div class="category-item cursor-pointer p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200 ${this.selectedCategoryId === null ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30' : ''}" 
           data-category-id="" 
           onclick="adminInterface.selectCategory(null)">
        <div class="flex items-center">
          <div class="w-11 h-11 bg-blue-500 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
            <i class="fas fa-th-large text-white text-base"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-gray-900 dark:text-white text-base mb-0.5">Alle Categorieën</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 m-0">${this.products.length} totaal producten</p>
          </div>
        </div>
      </div>
    `;

    html += this.categories.map((category, index) => {
      const productCount = this.products.filter(p => p.category_id === category.id).length;
      const isSelected = this.selectedCategoryId === category.id;
      
      return `
        <div class="category-item cursor-pointer p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}" 
             draggable="true" 
             data-category-id="${category.id}" 
             data-order="${category.display_order}"
             onclick="adminInterface.selectCategory(${category.id})">
          <div class="space-y-1">
            <!-- Top row: drag handle + icon + category name -->
            <div class="flex items-center">
              <div class="drag-handle mr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 cursor-grab flex-shrink-0" onclick="event.stopPropagation()">
                <i class="fas fa-grip-vertical text-sm"></i>
              </div>
              <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <i class="fas fa-layer-group text-gray-600 dark:text-gray-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-gray-900 dark:text-white truncate text-base">${this.escapeHtml(category.name || 'Unnamed')}</h4>
              </div>
            </div>
            
            <!-- Second row: product info + status -->
            <div class="pl-16">
              <div class="flex items-center space-x-3">
                <p class="text-sm text-gray-600 dark:text-gray-400 m-0">${productCount} product${productCount === 1 ? '' : 'en'}</p>
                <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">#${category.display_order || index + 1}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${category.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}">
                  ${category.active ? 'Actief' : 'Inactief'}
                </span>
              </div>
            </div>
            
            <!-- Third row: action buttons under product info -->
            <div class="pl-16">
              <div class="flex items-center space-x-1" onclick="event.stopPropagation()">
                <button onclick="adminInterface.editCategory(${category.id})" 
                        class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors text-xs"
                        title="Bewerken">
                  <i class="fas fa-edit mr-1"></i>Bewerken
                </button>
                <button onclick="adminInterface.deleteCategory(${category.id})" 
                        class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-xs"
                        title="Verwijderen">
                  <i class="fas fa-trash mr-1"></i>Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
    
    // Re-initialize drag and drop
    this.initializeDragAndDrop();
    
    // Update header stats
    this.updateHeaderStats();
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
    const selects = ['productCategory', 'categoryFilterAllProducts'];
    
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      
      // Skip if element doesn't exist (admin container not visible yet)
      if (!select) {
        console.log(`Select element ${selectId} not found, skipping...`);
        return;
      }
      
      const currentValue = select.value;
      
      // Keep "All categories" option for filters
      if (selectId === 'categoryFilterAllProducts') {
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
      // Basic stats
      document.getElementById('categoryCount').textContent = this.categories.length;
      document.getElementById('productCount').textContent = this.products.length;
      
      // Badge statistics - count products with on_sale and is_new
      const saleCount = this.products.filter(p => p.on_sale === true).length;
      const newCount = this.products.filter(p => p.is_new === true).length;
      document.getElementById('saleCount').textContent = saleCount;
      document.getElementById('newCount').textContent = newCount;
      
      const avgPrice = this.products.length > 0 
        ? this.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / this.products.length 
        : 0;
      document.getElementById('avgPrice').textContent = '€' + avgPrice.toFixed(2).replace('.', ',');
      
      document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('nl-NL');
      
      // Update slideshow preview
      this.updateSlideshowPreview();
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  /**
   * Update slideshow preview with current settings and footer content
   */
  async updateSlideshowPreview() {
    try {
      // Load current settings for slideshow preview
      const response = await this.apiCall('/.netlify/functions/settings');
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings;
        
        // Update slide speed display
        const slideSpeed = (settings.rotation_interval || 6000) / 1000;
        document.getElementById('slideSpeedDisplay').textContent = slideSpeed + 's';
        
        // Update display settings preview
        document.getElementById('displayColumnsPreview').textContent = settings.display_columns || '2';
        document.getElementById('headerHeightPreview').textContent = (settings.header_height || '15') + '%';
        document.getElementById('footerHeightPreview').textContent = (settings.footer_height || '8') + '%';
        document.getElementById('footerSpeedPreview').textContent = (settings.footer_speed || '30') + 's';
        
        // Update footer text preview
        this.updateFooterPreview(settings.footer_text);
      }
    } catch (error) {
      console.error('Error updating slideshow preview:', error);
    }
  }

  /**
   * Update footer text preview
   */
  updateFooterPreview(footerText) {
    const footerPreview = document.getElementById('footerPreview');
    if (!footerPreview) return;
    
    if (!footerText || footerText.trim() === '') {
      footerPreview.innerHTML = `
        <div class="text-sm text-gray-500 dark:text-gray-400 italic flex items-center">
          <i class="fas fa-info-circle mr-2"></i>
          Geen footer teksten ingesteld
        </div>
      `;
      return;
    }
    
    // Split footer text by || and show as separate lines
    const lines = footerText.split('||').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      footerPreview.innerHTML = `
        <div class="text-sm text-gray-500 dark:text-gray-400 italic flex items-center">
          <i class="fas fa-info-circle mr-2"></i>
          Geen footer teksten ingesteld
        </div>
      `;
      return;
    }
    
    const linesHtml = lines.map((line, index) => `
      <div class="flex items-center justify-between py-1 ${index < lines.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}">
        <span class="text-sm text-gray-900 dark:text-white">${this.escapeHtml(line.trim())}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">#${index + 1}</span>
      </div>
    `).join('');
    
    footerPreview.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <i class="fas fa-list mr-1"></i>
            ${lines.length} regel${lines.length === 1 ? '' : 's'}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            <i class="fas fa-sync-alt mr-1"></i>
            Doorlopend
          </span>
        </div>
        ${linesHtml}
      </div>
    `;
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
      const tableBody = document.getElementById('dataOverviewMainBody');
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
      const tableBody = document.getElementById('dataOverviewMainBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-600">Error loading data</td></tr>';
      }
    }
  }

  /**
   * Populate the data overview table with admin data (real database data)
   */
  populateDataOverviewTableFromAdmin(categoriesData, productsData) {
    // Only populate the main Data Overzicht table
    const tableBodyMain = document.getElementById('dataOverviewMainBody');
    
    if (!tableBodyMain) return;
    
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
    
    tableBodyMain.innerHTML = html;
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

  // ===============================
  // NEW IMPROVED PRODUCTS UI METHODS
  // ===============================

  /**
   * Setup event listeners for the new improved products UI
   */
  setupNewProductUIListeners() {
    console.log('Setting up new product UI listeners...');

    // Search functionality
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
      productSearch.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterAndRenderProducts();
      });
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.filterAndRenderProducts();
      });
    }

    // Badge filter
    const badgeFilter = document.getElementById('badgeFilter');
    if (badgeFilter) {
      badgeFilter.addEventListener('change', (e) => {
        this.badgeFilter = e.target.value;
        this.filterAndRenderProducts();
      });
    }

    // Category filter for All Products view
    const categoryFilterAllProducts = document.getElementById('categoryFilterAllProducts');
    if (categoryFilterAllProducts) {
      categoryFilterAllProducts.addEventListener('change', (e) => {
        this.categoryFilterAllProducts = e.target.value;
        this.filterAndRenderProducts();
      });
    }

    // Bulk actions
    const bulkActivateBtn = document.getElementById('bulkActivateBtn');
    if (bulkActivateBtn) {
      bulkActivateBtn.addEventListener('click', () => {
        this.bulkActivateProducts();
      });
    }

    const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
    if (bulkDeactivateBtn) {
      bulkDeactivateBtn.addEventListener('click', () => {
        this.bulkDeactivateProducts();
      });
    }

    const bulkRemoveLabelsBtn = document.getElementById('bulkRemoveLabelsBtn');
    if (bulkRemoveLabelsBtn) {
      bulkRemoveLabelsBtn.addEventListener('click', () => {
        this.bulkRemoveLabels();
      });
    }

    // Bulk Remove Labels Modal Event Listeners
    this.setupBulkRemoveModalListeners();

    // Bulk Actions Modal Event Listeners
    this.setupBulkActionsModalListeners();

    // Select all checkbox
    const selectAllProducts = document.getElementById('selectAllProducts');
    if (selectAllProducts) {
      selectAllProducts.addEventListener('change', (e) => {
        this.toggleSelectAllProducts(e.target.checked);
      });
    }
  }

  /**
   * Select a category and filter products
   */
  selectCategory(categoryId) {
    console.log('Selecting category:', categoryId);
    this.selectedCategoryId = categoryId;
    
    // Reset category filter for All Products when selecting a specific category
    if (categoryId !== null) {
      this.categoryFilterAllProducts = '';
      const categoryFilterSelect = document.getElementById('categoryFilterAllProducts');
      if (categoryFilterSelect) {
        categoryFilterSelect.value = '';
      }
    }
    
    // Update category visual selection
    this.renderCategories();
    
    // Update product section title and filter products
    const title = document.getElementById('productsSectionTitle');
    if (title) {
      if (categoryId === null) {
        title.textContent = 'Alle Producten';
      } else {
        const category = this.categories.find(c => c.id === categoryId);
        title.textContent = category ? category.name : 'Onbekende Categorie';
      }
    }
    
    // Filter and render products
    this.filterAndRenderProducts();
  }

  /**
   * Filter products based on current filters and render them
   */
  filterAndRenderProducts() {
    console.log('=== FILTER DEBUG ===');
    console.log('Total products:', this.products.length);
    console.log('Badge filter:', this.badgeFilter);
    console.log('Selected category:', this.selectedCategoryId);
    console.log('Search term:', this.searchTerm);
    console.log('Status filter:', this.statusFilter);
    
    let filtered = this.products;

    // Log products with "new" labels
    const productsWithNewLabel = this.products.filter(p => p.is_new === true);
    console.log('Products with is_new=true:', productsWithNewLabel.length, productsWithNewLabel.map(p => ({ id: p.id, name: p.name, is_new: p.is_new })));

    // Filter by selected category
    if (this.selectedCategoryId !== null) {
      filtered = filtered.filter(p => p.category_id === this.selectedCategoryId);
      console.log('After category filter:', filtered.length);
    }

    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(this.searchTerm) ||
        (p.description && p.description.toLowerCase().includes(this.searchTerm))
      );
      console.log('After search filter:', filtered.length);
    }

    // Filter by status
    if (this.statusFilter) {
      if (this.statusFilter === 'active') {
        filtered = filtered.filter(p => p.active === true);
      } else if (this.statusFilter === 'inactive') {
        filtered = filtered.filter(p => p.active === false);
      }
      console.log('After status filter:', filtered.length);
    }

    // Filter by badge
    if (this.badgeFilter) {
      console.log('Applying badge filter:', this.badgeFilter);
      const beforeBadgeFilter = filtered.length;
      if (this.badgeFilter === 'sale') {
        filtered = filtered.filter(p => p.on_sale === true);
      } else if (this.badgeFilter === 'new') {
        filtered = filtered.filter(p => p.is_new === true);
      } else if (this.badgeFilter === 'none') {
        filtered = filtered.filter(p => !p.on_sale && !p.is_new);
      }
      console.log(`After badge filter: ${filtered.length} (was ${beforeBadgeFilter})`);
      console.log('Filtered products with new badge:', filtered.filter(p => p.is_new).map(p => ({ id: p.id, name: p.name, is_new: p.is_new })));
    }

    // Filter by category (for All Products view)
    if (this.categoryFilterAllProducts && this.selectedCategoryId === null) {
      filtered = filtered.filter(p => p.category_id == this.categoryFilterAllProducts);
      console.log('After category filter (all products):', filtered.length);
    }

    console.log('Final filtered count:', filtered.length);
    console.log('=== END FILTER DEBUG ===');

    this.filteredProducts = filtered;
    this.renderFilteredProducts();
    this.updateProductCount();
  }

  /**
   * Render the filtered products in the table
   */
  renderFilteredProducts() {
    const tbody = document.getElementById('productsTable');
    
    if (this.filteredProducts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center">
            <div class="text-gray-400 dark:text-gray-500">
              <i class="fas fa-search text-4xl mb-3"></i>
              <p class="text-lg font-medium">Geen producten gevonden</p>
              <p class="text-sm">Probeer je zoekopdracht of filters aan te passen</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredProducts.map(product => {
      const price = parseFloat(product.price) || 0;
      
      // Create badges
      const badges = [];
      if (product.on_sale === true) badges.push('<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">🏷️ Aanbieding</span>');
      if (product.is_new === true) badges.push('<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">✨ Nieuw</span>');
      
      return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap">
            <input type="checkbox" class="product-checkbox rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700" data-product-id="${product.id}">
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center mr-4">
                <i class="fas fa-cube text-gray-500 dark:text-gray-400"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${this.escapeHtml(product.name)}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">${this.escapeHtml(product.description || '')}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-semibold text-gray-900 dark:text-white">€${price.toFixed(2).replace('.', ',')}</div>
          </td>
          <td class="px-6 py-4">
            <div class="flex flex-col space-y-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}">
                ${product.active ? 'Actief' : 'Inactief'}
              </span>
              ${badges.join(' ')}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900 dark:text-white">${product.display_order || '-'}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex items-center space-x-2">
              <button onclick="adminInterface.editProduct(${product.id})" 
                      class="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors"
                      title="Bewerken">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="adminInterface.deleteProduct(${product.id})" 
                      class="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                      title="Verwijderen">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Update product count badge and header stats
   */
  updateProductCount() {
    const badge = document.getElementById('productCountBadge');
    if (badge) {
      badge.textContent = this.filteredProducts.length;
    }
    
    this.updateHeaderStats();
  }

  /**
   * Update header statistics
   */
  updateHeaderStats() {
    const categoryCountHeader = document.getElementById('categoryCountHeader');
    const productCountHeader = document.getElementById('productCountHeader');
    const activeProductCountHeader = document.getElementById('activeProductCountHeader');
    
    if (categoryCountHeader) categoryCountHeader.textContent = this.categories.length;
    if (productCountHeader) productCountHeader.textContent = this.products.length;
    if (activeProductCountHeader) {
      const activeCount = this.products.filter(p => p.active === true).length;
      activeProductCountHeader.textContent = activeCount;
    }
  }

  /**
   * Show bulk activate modal
   */
  bulkActivateProducts() {
    document.getElementById('bulkActivateCount').textContent = this.products.length;
    document.getElementById('bulkActivateModal').classList.remove('hidden');
  }

  /**
   * Execute bulk activate all products
   */
  async executeBulkActivateProducts() {
    try {
      const updates = this.products.map(product => 
        this.apiCall(`/.netlify/functions/admin-products?id=${product.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...product,
            active: true
          })
        })
      );
      
      await Promise.all(updates);
      await this.loadData();
      this.showToast('Alle producten geactiveerd', 'success');
      this.closeBulkActivateModal();
    } catch (error) {
      console.error('Error bulk activating products:', error);
      this.showToast('Fout bij bulk activeren', 'error');
    }
  }

  /**
   * Close bulk activate modal
   */
  closeBulkActivateModal() {
    document.getElementById('bulkActivateModal').classList.add('hidden');
  }

  /**
   * Show bulk deactivate modal
   */
  async bulkDeactivateProducts() {
    document.getElementById('bulkDeactivateCount').textContent = this.products.length;
    document.getElementById('bulkDeactivateModal').classList.remove('hidden');
  }

  /**
   * Execute bulk deactivate all products
   */
  async executeBulkDeactivateProducts() {
    try {
      const updates = this.products.map(product => 
        this.apiCall(`/.netlify/functions/admin-products?id=${product.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...product,
            active: false
          })
        })
      );
      
      await Promise.all(updates);
      await this.loadData();
      this.showToast('Alle producten gedeactiveerd', 'success');
      this.closeBulkDeactivateModal();
    } catch (error) {
      console.error('Error bulk deactivating products:', error);
      this.showToast('Fout bij bulk deactiveren', 'error');
    }
  }

  /**
   * Close bulk deactivate modal
   */
  closeBulkDeactivateModal() {
    document.getElementById('bulkDeactivateModal').classList.add('hidden');
  }

  /**
   * Open bulk remove labels modal (multi-step process)
   */
  bulkRemoveLabels() {
    this.openBulkRemoveLabelsModal();
  }

  /**
   * Open the multi-step bulk remove labels modal
   */
  openBulkRemoveLabelsModal() {
    // Reset modal to step 1
    this.bulkRemoveCurrentStep = 1;
    this.showBulkRemoveStep(1);
    
    // Update label counts
    this.updateBulkRemoveLabelCounts();
    
    // Show modal
    document.getElementById('bulkRemoveLabelsModal').classList.remove('hidden');
  }

  /**
   * Close bulk remove labels modal
   */
  closeBulkRemoveLabelsModal() {
    document.getElementById('bulkRemoveLabelsModal').classList.add('hidden');
    this.bulkRemoveCurrentStep = 1;
  }

  /**
   * Show specific step in bulk remove modal
   */
  showBulkRemoveStep(step) {
    // Hide all steps
    document.querySelectorAll('.bulk-remove-step').forEach(stepEl => {
      stepEl.classList.add('hidden');
    });
    
    // Show current step
    document.getElementById(`bulkRemoveStep${step}`).classList.remove('hidden');
    this.bulkRemoveCurrentStep = step;
  }

  /**
   * Update label counts in step 2
   */
  updateBulkRemoveLabelCounts() {
    const saleCount = this.products.filter(p => p.on_sale === true).length;
    const newCount = this.products.filter(p => p.is_new === true).length;
    
    document.getElementById('saleLabelsCount').textContent = `(${saleCount} producten)`;
    document.getElementById('newLabelsCount').textContent = `(${newCount} producten)`;
  }

  /**
   * Generate removal summary for step 3
   */
  generateRemovalSummary() {
    const removeSale = document.getElementById('removeSaleLabels').checked;
    const removeNew = document.getElementById('removeNewLabels').checked;
    
    if (!removeSale && !removeNew) {
      return '<p class="text-gray-500 dark:text-gray-400">Geen labels geselecteerd</p>';
    }
    
    let summary = '<ul class="space-y-1">';
    
    if (removeSale) {
      const saleCount = this.products.filter(p => p.on_sale === true).length;
      summary += `<li class="flex items-center text-red-600 dark:text-red-400">
        <i class="fas fa-times-circle mr-2"></i>
        🏷️ Aanbieding labels van ${saleCount} producten
      </li>`;
    }
    
    if (removeNew) {
      const newCount = this.products.filter(p => p.is_new === true).length;
      summary += `<li class="flex items-center text-red-600 dark:text-red-400">
        <i class="fas fa-times-circle mr-2"></i>
        ✨ Nieuw labels van ${newCount} producten
      </li>`;
    }
    
    summary += '</ul>';
    return summary;
  }

  /**
   * Execute the actual bulk removal
   */
  async executeBulkRemoveLabels() {
    const removeSale = document.getElementById('removeSaleLabels').checked;
    const removeNew = document.getElementById('removeNewLabels').checked;
    
    if (!removeSale && !removeNew) {
      this.showToast('Geen labels geselecteerd', 'error');
      return;
    }

    try {
      console.log('=== BULK LABEL REMOVAL DEBUG ===');
      console.log('Remove sale labels:', removeSale);
      console.log('Remove new labels:', removeNew);
      console.log('Current badge filter:', this.badgeFilter);
      console.log('Total products before filtering:', this.products.length);
      
      // Count affected products before making changes
      let affectedProducts = 0;
      const updates = this.products.map(product => {
        const updatedProduct = { ...product };
        let hasChanges = false;
        
        if (removeSale && product.on_sale) {
          console.log(`Removing sale label from product ${product.id}: ${product.name}`);
          updatedProduct.on_sale = false;
          hasChanges = true;
        }
        
        if (removeNew && product.is_new) {
          console.log(`Removing new label from product ${product.id}: ${product.name}`);
          updatedProduct.is_new = false;
          hasChanges = true;
        }
        
        // Only update if changes were made
        if (hasChanges) {
          affectedProducts++;
          return this.apiCall(`/.netlify/functions/admin-products?id=${product.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedProduct)
          });
        }
        
        return null;
      }).filter(update => update !== null); // Remove null values
      
      console.log(`Found ${affectedProducts} products to update`);
      console.log(`Executing ${updates.length} API calls for label removal`);
      
      if (updates.length === 0) {
        console.log('No products needed updating');
        this.showToast('Geen producten gevonden om bij te werken', 'error');
        return;
      }
      
      const results = await Promise.all(updates);
      console.log('API call results:', results.map((r, i) => ({ 
        index: i, 
        ok: r && r.ok ? r.ok : 'N/A', 
        status: r && r.status ? r.status : 'N/A' 
      })));
      
      // Invalidate cache BEFORE reloading data
      console.log('Invalidating frontend cache...');
      this.invalidateFrontendCache();
      
      console.log('Label updates completed, reloading data...');
      await this.loadData();
      console.log('Data reload completed. New product count:', this.products.length);
      
      // Check if we need to reset badge filter
      const shouldResetFilter = (removeSale && this.badgeFilter === 'sale') || (removeNew && this.badgeFilter === 'new');
      console.log('Should reset filter?', shouldResetFilter);
      
      if (shouldResetFilter) {
        console.log('Resetting badge filter from', this.badgeFilter, 'to empty');
        this.badgeFilter = '';
        const badgeFilterSelect = document.getElementById('badgeFilter');
        if (badgeFilterSelect) {
          badgeFilterSelect.value = '';
          console.log('Updated badge filter select element');
        }
      }
      
      const removedTypes = [];
      if (removeSale) removedTypes.push('aanbieding');
      if (removeNew) removedTypes.push('nieuw');
      
      this.showToast(`${removedTypes.join(' en ')} labels verwijderd van ${affectedProducts} producten`, 'success');
      this.closeBulkRemoveLabelsModal();
      
      // Force re-render products
      console.log('Force re-rendering products...');
      this.filterAndRenderProducts();
      console.log('=== BULK LABEL REMOVAL COMPLETE ===');
      
    } catch (error) {
      console.error('Error bulk removing labels:', error);
      this.showToast('Fout bij verwijderen labels: ' + error.message, 'error');
    }
  }

  /**
   * Setup event listeners for bulk remove labels modal
   */
  setupBulkRemoveModalListeners() {
    // Step 1 buttons
    const step1Next = document.getElementById('bulkRemoveStep1Next');
    const step1Cancel = document.getElementById('bulkRemoveStep1Cancel');
    
    if (step1Next) {
      step1Next.addEventListener('click', () => {
        this.showBulkRemoveStep(2);
      });
    }
    
    if (step1Cancel) {
      step1Cancel.addEventListener('click', () => {
        this.closeBulkRemoveLabelsModal();
      });
    }
    
    // Step 2 buttons
    const step2Next = document.getElementById('bulkRemoveStep2Next');
    const step2Back = document.getElementById('bulkRemoveStep2Back');
    const step2Cancel = document.getElementById('bulkRemoveStep2Cancel');
    
    if (step2Next) {
      step2Next.addEventListener('click', () => {
        const removeSale = document.getElementById('removeSaleLabels').checked;
        const removeNew = document.getElementById('removeNewLabels').checked;
        
        if (!removeSale && !removeNew) {
          this.showToast('Selecteer ten minste één type label', 'error');
          return;
        }
        
        // Generate and show summary
        document.getElementById('removalSummary').innerHTML = this.generateRemovalSummary();
        this.showBulkRemoveStep(3);
      });
    }
    
    if (step2Back) {
      step2Back.addEventListener('click', () => {
        this.showBulkRemoveStep(1);
      });
    }
    
    if (step2Cancel) {
      step2Cancel.addEventListener('click', () => {
        this.closeBulkRemoveLabelsModal();
      });
    }
    
    // Step 3 buttons
    const step3Confirm = document.getElementById('bulkRemoveStep3Confirm');
    const step3Back = document.getElementById('bulkRemoveStep3Back');
    const step3Cancel = document.getElementById('bulkRemoveStep3Cancel');
    
    if (step3Confirm) {
      step3Confirm.addEventListener('click', () => {
        this.executeBulkRemoveLabels();
      });
    }
    
    if (step3Back) {
      step3Back.addEventListener('click', () => {
        this.showBulkRemoveStep(2);
      });
    }
    
    if (step3Cancel) {
      step3Cancel.addEventListener('click', () => {
        this.closeBulkRemoveLabelsModal();
      });
    }
    
    // Close modal on background click
    const modal = document.getElementById('bulkRemoveLabelsModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'bulkRemoveLabelsModal') {
          this.closeBulkRemoveLabelsModal();
        }
      });
    }
  }

  /**
   * Setup event listeners for bulk actions modals
   */
  setupBulkActionsModalListeners() {
    // Bulk Activate Modal
    const bulkActivateConfirm = document.getElementById('bulkActivateConfirm');
    const bulkActivateCancel = document.getElementById('bulkActivateCancel');
    
    if (bulkActivateConfirm) {
      bulkActivateConfirm.addEventListener('click', () => {
        this.executeBulkActivateProducts();
      });
    }
    
    if (bulkActivateCancel) {
      bulkActivateCancel.addEventListener('click', () => {
        this.closeBulkActivateModal();
      });
    }
    
    // Bulk Deactivate Modal
    const bulkDeactivateConfirm = document.getElementById('bulkDeactivateConfirm');
    const bulkDeactivateCancel = document.getElementById('bulkDeactivateCancel');
    
    if (bulkDeactivateConfirm) {
      bulkDeactivateConfirm.addEventListener('click', () => {
        this.executeBulkDeactivateProducts();
      });
    }
    
    if (bulkDeactivateCancel) {
      bulkDeactivateCancel.addEventListener('click', () => {
        this.closeBulkDeactivateModal();
      });
    }
    
    // Close modals on background click
    const bulkActivateModal = document.getElementById('bulkActivateModal');
    if (bulkActivateModal) {
      bulkActivateModal.addEventListener('click', (e) => {
        if (e.target.id === 'bulkActivateModal') {
          this.closeBulkActivateModal();
        }
      });
    }
    
    const bulkDeactivateModal = document.getElementById('bulkDeactivateModal');
    if (bulkDeactivateModal) {
      bulkDeactivateModal.addEventListener('click', (e) => {
        if (e.target.id === 'bulkDeactivateModal') {
          this.closeBulkDeactivateModal();
        }
      });
    }
  }

  /**
   * Toggle select all products
   */
  toggleSelectAllProducts(checked) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
    });
  }

  /**
   * Override the original renderProducts to use the new filtering system
   */
  renderProducts() {
    // Initialize with all products
    this.filterAndRenderProducts();
  }

}

// Make AdminInterface class globally available
window.AdminInterface = AdminInterface;

// Initialize admin interface when page loads
// NOTE: Actual initialization happens in auth.js after authentication
window.adminInterface = null;