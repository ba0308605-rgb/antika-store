// 🌸 Antika Store API - Enhanced with Orders Support

const API = {
    // Base URL for API requests
    baseURL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : '/api',

    getAuthToken() {
        return localStorage.getItem('antika_admin_token') || '';
    },

    getAuthHeaders(extraHeaders = {}) {
        const headers = { ...extraHeaders };
        const token = this.getAuthToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    },

    async adminLogin(username, password) {
        const response = await fetch(`${this.baseURL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Admin login failed');
        return data;
    },

    async verifyAdminSession() {
        const response = await fetch(`${this.baseURL}/admin/session`, {
            headers: this.getAuthHeaders()
        });
        if (!response.ok) return null;
        return await response.json();
    },

    // ============================================
    // PRODUCTS
    // ============================================

    async getProducts(category = null, search = null, discount = null) {
        try {
            // Build query string
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (search) params.append('search', search);
            if (discount) params.append('discount', 'true');
            
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const response = await fetch(`${this.baseURL}/products${queryString}`);
            
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            // Normalize products to ensure they all have an 'id' field
            const normalizedData = Array.isArray(data) ? data.map(p => this._normalizeProduct(p)) : data;
            return normalizedData;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    async getProduct(id) {
        try {
            // Add timestamp to prevent browser caching
            const response = await fetch(`${this.baseURL}/products/${id}?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch product');
            const product = await response.json();
            return this._normalizeProduct(product);
        } catch (error) {
            console.error('Error fetching product from API:', error);
            return null;
        }
    },

    async addProduct(productData) {
        try {
            const response = await fetch(`${this.baseURL}/products`, {
                method: 'POST',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(productData)
            });
            if (!response.ok) throw new Error('Failed to add product');
            return await response.json();
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    },

    async updateProduct(id, productData) {
        try {
            // Ensure id is valid
            if (!id) {
                throw new Error('Product ID is required');
            }
            // Support both _id (MongoDB) and id
            const productId = id;
            console.log('API: Updating product', productId, productData.name);
            const response = await fetch(`${this.baseURL}/products/${productId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({...productData, id: productId})
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update product');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    async deleteProduct(id) {
        try {
            const response = await fetch(`${this.baseURL}/products/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete product');
            return await response.json();
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    },

    // ============================================
    // CATEGORIES
    // ============================================

    async getCategories() {
        try {
            const response = await fetch(`${this.baseURL}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            return await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    async addCategory(categoryData) {
        try {
            const response = await fetch(`${this.baseURL}/categories`, {
                method: 'POST',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(categoryData)
            });
            if (!response.ok) throw new Error('Failed to add category');
            return await response.json();
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    },

    async updateCategory(id, categoryData) {
        try {
            const response = await fetch(`${this.baseURL}/categories/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(categoryData)
            });
            if (!response.ok) throw new Error('Failed to update category');
            return await response.json();
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    },

    async deleteCategory(id) {
        try {
            const response = await fetch(`${this.baseURL}/categories/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete category');
            return await response.json();
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    },

// ============================================
// CART
// ============================================

// Get or create session ID
getSessionId() {
    // Isolate cart sessions per account to avoid user A/user B mixing on same browser.
    let scope = 'guest';
    try {
        const rawUser = localStorage.getItem('antika_user');
        if (rawUser) {
            const user = JSON.parse(rawUser);
            scope = String(user.uid || user.email || 'guest').toLowerCase();
        }
    } catch (e) {}

    const key = `sessionId_${scope}`;
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
        sessionId = `session_${scope}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem(key, sessionId);
    }
    return sessionId;
},

async getCart() {
    try {
        const response = await fetch(`${this.baseURL}/cart`, {
            headers: {
                'x-session-id': this.getSessionId()
            }
        });
        if (!response.ok) throw new Error('Failed to fetch cart');
        return await response.json();
    } catch (error) {
        console.error('Error fetching cart:', error);
        return [];
    }
},

    async addToCart(item) {
        try {
            console.log('🔵 API.addToCart called with:', item);
            const response = await fetch(`${this.baseURL}/cart`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-session-id': this.getSessionId()
                },
                body: JSON.stringify(item)
            });
            console.log('🟢 API Response Status:', response.status);
            if (!response.ok) throw new Error('Failed to add to cart');
            const result = await response.json();
            console.log('🟢 API Response:', result);
            return result;
        } catch (error) {
            console.error('🔴 Error adding to cart:', error);
            throw error;
        }
    },

    async updateCartItem(id, quantity) {
        try {
            const response = await fetch(`${this.baseURL}/cart/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-session-id': this.getSessionId()
                },
                body: JSON.stringify({ quantity })
            });
            if (!response.ok) throw new Error('Failed to update cart item');
            return await response.json();
        } catch (error) {
            console.error('Error updating cart item:', error);
            throw error;
        }
    },

    async removeFromCart(id) {
        try {
            const response = await fetch(`${this.baseURL}/cart/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-session-id': this.getSessionId()
                }
            });
            if (!response.ok) throw new Error('Failed to remove from cart');
            return await response.json();
        } catch (error) {
            console.error('Error removing from cart:', error);
            throw error;
        }
    },

    async clearCart() {
        try {
            const response = await fetch(`${this.baseURL}/cart`, {
                method: 'DELETE',
                headers: {
                    'x-session-id': this.getSessionId()
                }
            });
            if (!response.ok) throw new Error('Failed to clear cart');
            return await response.json();
        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    },

    // ============================================
    // ORDERS - إدارة الطلبات
    // ============================================

    async getOrders() {
        try {
            const response = await fetch(`${this.baseURL}/orders`, {
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            return await response.json();
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    },

    async getOrder(id) {
        try {
            const response = await fetch(`${this.baseURL}/orders/${id}`, {
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch order');
            return await response.json();
        } catch (error) {
            console.error('Error fetching order:', error);
            return null;
        }
    },

    async createOrder(orderData) {
        try {
            const response = await fetch(`${this.baseURL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) throw new Error('Failed to create order');
            return await response.json();
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    },

    async updateOrderStatus(id, status) {
        try {
            const response = await fetch(`${this.baseURL}/orders/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error('Failed to update order status');
            return await response.json();
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    },

    async deleteOrder(id) {
        try {
            const response = await fetch(`${this.baseURL}/orders/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete order');
            return await response.json();
        } catch (error) {
            console.error('Error deleting order:', error);
            throw error;
        }
    },

    // ============================================
    // SETTINGS
    // ============================================

    async getSettings() {
        try {
            const response = await fetch(`${this.baseURL}/settings`);
            if (!response.ok) throw new Error('Failed to fetch settings');
            return await response.json();
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {};
        }
    },

    async updateSettings(settings) {
        try {
            const response = await fetch(`${this.baseURL}/settings`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(settings)
            });
            if (!response.ok) throw new Error('Failed to update settings');
            return await response.json();
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    },

    // ============================================
    // ANNOUNCING BAR
    // ============================================

    async getAnnouncingText() {
        try {
            const response = await fetch(`${this.baseURL}/announcing`);
            if (!response.ok) throw new Error('Failed to fetch announcing text');
            const data = await response.json();
            return data.text || '🚚 تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة';
        } catch (error) {
            console.error('Error fetching announcing text:', error);
            return '🚚 تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة';
        }
    },

    async getAnnouncingSettings() {
        try {
            const response = await fetch(`${this.baseURL}/announcing`);
            if (!response.ok) throw new Error('Failed to fetch announcing settings');
            const data = await response.json();
            return {
                text: data.text || '🚚 تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة',
                isVisible: data.isVisible !== false // default true
            };
        } catch (error) {
            console.error('Error fetching announcing settings:', error);
            return {
                text: '🚚 تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة',
                isVisible: true
            };
        }
    },

    async updateAnnouncingText(text) {
        try {
            const response = await fetch(`${this.baseURL}/announcing`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('Failed to update announcing text');
            return await response.json();
        } catch (error) {
            console.error('Error updating announcing text:', error);
            throw error;
        }
    },

    async updateAnnouncingSettings({ text, isVisible }) {
        try {
            const response = await fetch(`${this.baseURL}/announcing`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ text, isVisible })
            });
            if (!response.ok) throw new Error('Failed to update announcing settings');
            return await response.json();
        } catch (error) {
            console.error('Error updating announcing settings:', error);
            throw error;
        }
    },

    // ============================================
    // FOOTER PAGES
    // ============================================

    async getFooterPages() {
        try {
            const response = await fetch(`${this.baseURL}/pages`);
            if (!response.ok) throw new Error('Failed to fetch footer pages');
            return await response.json();
        } catch (error) {
            console.error('Error fetching footer pages:', error);
            return {};
        }
    },

    async updateFooterPage(pageId, pageData) {
        try {
            const response = await fetch(`${this.baseURL}/pages/${pageId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(pageData)
            });
            if (!response.ok) throw new Error('Failed to update footer page');
            return await response.json();
        } catch (error) {
            console.error('Error updating footer page:', error);
            throw error;
        }
    },

    async deleteAllProducts() {
        try {
            const response = await fetch(`${this.baseURL}/products`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete all products');
            return await response.json();
        } catch (error) {
            console.error('Error deleting all products:', error);
            throw error;
        }
    },

    // ============================================
    // HELPER METHODS
    // ============================================

    _normalizeProduct(product) {
        if (!product) return null;
        console.log('🔧 Normalizing product:', product.name, '| Raw SKU:', product.sku, '| Raw freeShipping:', product.freeShipping);
        // Ensure product has a valid id
        let productId = product._id || product.id;
        if (!productId && product.name) {
            // Generate a temporary id if none exists (fallback)
            productId = 'temp_' + Math.random().toString(36).substr(2, 9);
            console.warn('Product missing ID, generated temporary ID:', productId, product.name);
        }
        const normalized = {
            ...product,
            id: productId,
            sku: product.sku || '',
            freeShipping: product.freeShipping !== undefined ? product.freeShipping : true,
            categories: product.categories || (product.category ? [product.category] : []),
            images: product.images || []
        };
        console.log('🔧 Normalized product:', normalized.name, '| SKU:', normalized.sku, '| freeShipping:', normalized.freeShipping);
        return normalized;
    },

    // ============================================
    // BULK DISCOUNT
    // ============================================

    async applyBulkDiscount(productIds, discountType, discountValue, endDate = null) {
        try {
            const products = await this.getProducts();
            const updatePromises = productIds.map(async (productId) => {
                const product = products.find(p => p.id === productId);
                if (!product) return;

                let discountPrice = product.price;
                let discountPercentage = 0;

                switch (discountType) {
                    case 'percentage':
                        discountPercentage = discountValue;
                        discountPrice = Math.round(product.price * (1 - discountValue / 100));
                        break;
                    case 'fixed':
                        discountPrice = Math.max(0, product.price - discountValue);
                        discountPercentage = Math.round((discountValue / product.price) * 100);
                        break;
                    case 'newPrice':
                        discountPrice = discountValue;
                        discountPercentage = Math.round(((product.price - discountValue) / product.price) * 100);
                        break;
                }

                return this.updateProduct(productId, {
                    ...product,
                    discountPrice: discountPrice,
                    discountPercentage: discountPercentage,
                    discountEndDate: endDate
                });
            });

            await Promise.all(updatePromises);
            return { success: true };
        } catch (error) {
            console.error('Error applying bulk discount:', error);
            throw error;
        }
    }
    ,
    // ============================================
    // USERS / ADDRESSES (server sync)
    // ============================================
    async getUser(email) {
        try {
            if (!email) return null;
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}`);
            if (!resp.ok) return null;
            return await resp.json();
        } catch (err) {
            console.error('Error fetching user:', err);
            return null;
        }
    },

    async upsertUser(email, data = {}) {
        try {
            if (!email) throw new Error('Email required');
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!resp.ok) throw new Error('Failed to upsert user');
            return await resp.json();
        } catch (err) {
            console.error('Error upserting user:', err);
            throw err;
        }
    },

    async addUserAddress(email, address) {
        try {
            if (!email) throw new Error('Email required');
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}/addresses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(address)
            });
            if (!resp.ok) throw new Error('Failed to add address');
            return await resp.json();
        } catch (err) {
            console.error('Error adding user address:', err);
            throw err;
        }
    },

    async updateUserAddress(email, idx, address) {
        try {
            if (!email) throw new Error('Email required');
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}/addresses/${idx}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(address)
            });
            if (!resp.ok) throw new Error('Failed to update address');
            return await resp.json();
        } catch (err) {
            console.error('Error updating user address:', err);
            throw err;
        }
    },

    async deleteUserAddress(email, idx) {
        try {
            if (!email) throw new Error('Email required');
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}/addresses/${idx}`, {
                method: 'DELETE'
            });
            if (!resp.ok) throw new Error('Failed to delete address');
            return await resp.json();
        } catch (err) {
            console.error('Error deleting user address:', err);
            throw err;
        }
    },

    // ============================================
    // DEFAULT LOCATION (for one-tap checkout)
    // ============================================
    async getUserLocation(email) {
        try {
            if (!email) return null;
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}/location`);
            if (!resp.ok) return null;
            return await resp.json();
        } catch (err) {
            console.error('Error fetching user location:', err);
            return null;
        }
    },

    async setUserLocation(email, lat, lng, label = 'موقعي') {
        try {
            if (!email) throw new Error('Email required');
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}/location`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng, label })
            });
            if (!resp.ok) throw new Error('Failed to set location');
            return await resp.json();
        } catch (err) {
            console.error('Error setting user location:', err);
            throw err;
        }
    },

    async deleteUserLocation(email) {
        try {
            if (!email) throw new Error('Email required');
            const encoded = encodeURIComponent(email.toLowerCase());
            const resp = await fetch(`${this.baseURL}/users/${encoded}/location`, {
                method: 'DELETE'
            });
            if (!resp.ok) throw new Error('Failed to delete location');
            return await resp.json();
        } catch (err) {
            console.error('Error deleting user location:', err);
            throw err;
        }
    },

    // ============================================
    // SYSTEM STATUS (for debugging)
    // ============================================
    async getSystemStatus() {
        try {
            const resp = await fetch(`${this.baseURL}/status`);
            if (resp.ok) {
                return await resp.json();
            }
        } catch (e) {
            console.log('Could not fetch system status from API');
        }
        return { 
            mongodb: 'unknown', 
            productCount: 0,
            categoryCount: 0,
            source: 'fallback'
        };
    }
};

// Expose API globally for other scripts
window.API = API;

// Expose API globally for other scripts
window.API = API;
