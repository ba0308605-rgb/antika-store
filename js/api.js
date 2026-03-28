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
            const normalizedData = Array.isArray(data)
                ? data.map(p => this._normalizeProduct(p))
                : this._normalizeTextDeep(data);
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
            const categories = await response.json();
            return this._normalizeTextDeep(categories);
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
    // Use a stable scope key to avoid switching carts between uid/email across pages.
    let scope = 'guest';
    let emailScope = '';
    let uidScope = '';
    try {
        const rawUser = localStorage.getItem('antika_user');
        if (rawUser) {
            const user = JSON.parse(rawUser) || {};
            emailScope = String(user.email || '').trim().toLowerCase();
            uidScope = String(user.uid || '').trim().toLowerCase();
            scope = emailScope || uidScope || 'guest';
        }
    } catch (e) {}

    const key = `sessionId_${scope}`;
    let sessionId = localStorage.getItem(key);
    if (!sessionId && emailScope && uidScope && emailScope !== uidScope) {
        const legacyUidKey = `sessionId_${uidScope}`;
        const legacySessionId = localStorage.getItem(legacyUidKey);
        if (legacySessionId) {
            sessionId = legacySessionId;
            localStorage.setItem(key, sessionId);
        }
    }
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
        const cart = await response.json();
        return this._normalizeTextDeep(cart);
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
            const safeId = encodeURIComponent(String(id ?? '').trim());
            const response = await fetch(`${this.baseURL}/cart/${safeId}`, {
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
            const safeId = encodeURIComponent(String(id ?? '').trim());
            const response = await fetch(`${this.baseURL}/cart/${safeId}`, {
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
            const orders = await response.json();
            return this._normalizeTextDeep(orders);
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
            const order = await response.json();
            return this._normalizeTextDeep(order);
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
            const data = await response.json();
            return data?.order || data;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    },

    async updateOrder(id, payload = {}) {
        try {
            const response = await fetch(`${this.baseURL}/orders/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload || {})
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to update order');
            return data?.order || data;
        } catch (error) {
            console.error('Error updating order:', error);
            throw error;
        }
    },

    async createOtoShipment(orderId, payload = {}) {
        try {
            const response = await fetch(`${this.baseURL}/orders/${orderId}/create-shipment`, {
                method: 'POST',
                headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload || {})
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to create OTO shipment');
            return data;
        } catch (error) {
            console.error('Error creating OTO shipment:', error);
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

    _fixMojibakeText(value) {
        if (typeof value !== 'string' || !value) return value;

        const pairMap = {
            // Common mojibake pairs (UTF-8 Arabic decoded incorrectly)
            'ط§': 'ا', 'ط¢': 'آ', 'ط£': 'أ', 'ط¥': 'إ', 'ط¦': 'ئ', 'ط¤': 'ؤ',
            'ط¨': 'ب', 'ط©': 'ة', 'طھ': 'ت', 'ط«': 'ث', 'ط¬': 'ج', 'ط­': 'ح', 'ط®': 'خ',
            'ط¯': 'د', 'ط°': 'ذ', 'ط±': 'ر', 'ط²': 'ز', 'ط³': 'س', 'ط´': 'ش',
            'طµ': 'ص', 'ط¶': 'ض', 'ط·': 'ط', 'ط¸': 'ظ', 'ط¹': 'ع', 'ط؛': 'غ',
            'ط': 'ف', 'ط‚': 'ق', 'طƒ': 'ك', 'ط„': 'ل', 'ط…': 'م', 'ط†': 'ن',
            'ط‡': 'ه', 'طˆ': 'و', 'ط‰': 'ى', 'طٹ': 'ي',
            'ظپ': 'ف', 'ظ‚': 'ق', 'ظƒ': 'ك', 'ظ„': 'ل', 'ظ…': 'م', 'ظ†': 'ن',
            'ظ‡': 'ه', 'ظˆ': 'و', 'ظ‰': 'ى', 'ظٹ': 'ي', 'ظ‘': 'ّ', 'ظْ': 'ْ',
            'ظ‹': 'ً', 'ظŒ': '،', 'ظ؟': '؟', 'ظ€': 'ـ',
            'ط،': '،', 'ط›': '؛', 'طں': '؟'
        };

        let text = value
            .replaceAll('âڑ ️', '⚠️')
            .replaceAll('âڑ ï¸ڈ', '⚠️')
            .replaceAll('âœ…', '✅')
            .replaceAll('â‌Œ', '❌')
            .replaceAll('â„¹ï¸ڈ', 'ℹ️')
            .replaceAll('â„¹️', 'ℹ️')
            .replaceAll('أ—', '×');

        // Fix sequences like: ط§ظ„ظ…...
        if (/(?:ط.|ظ.){2,}/.test(text)) {
            text = text.replace(/ط.|ظ./g, (m) => pairMap[m] || m);
        }

        return text;
    },

    _normalizeTextDeep(value) {
        if (typeof value === 'string') {
            return this._fixMojibakeText(value);
        }

        if (Array.isArray(value)) {
            return value.map((item) => this._normalizeTextDeep(item));
        }

        if (value && typeof value === 'object') {
            const normalized = {};
            Object.keys(value).forEach((key) => {
                normalized[key] = this._normalizeTextDeep(value[key]);
            });
            return normalized;
        }

        return value;
    },

    _normalizeProduct(product) {
        if (!product) return null;
        const cleanedProduct = this._normalizeTextDeep(product);
        // Ensure product has a valid id
        let productId = cleanedProduct._id || cleanedProduct.id;
        if (!productId && cleanedProduct.name) {
            // Generate a temporary id if none exists (fallback)
            productId = 'temp_' + Math.random().toString(36).substr(2, 9);
            console.warn('Product missing ID, generated temporary ID:', productId, cleanedProduct.name);
        }
        const normalized = {
            ...cleanedProduct,
            id: productId,
            sku: cleanedProduct.sku || '',
            freeShipping: cleanedProduct.freeShipping !== undefined ? cleanedProduct.freeShipping : true,
            categories: cleanedProduct.categories || (cleanedProduct.category ? [cleanedProduct.category] : []),
            images: cleanedProduct.images || []
        };
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

// ============================================
// REVIEWS API
// ============================================
const ReviewsAPI = {
  async getReviews(productId) {
    const res = await fetch(`/api/products/${productId}/reviews`);
    if (!res.ok) throw new Error('فشل جلب التعليقات');
    return await res.json();
  },
  async addReview(productId, data) {
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل إضافة التعليق');
    return json;
  },
  async deleteReview(reviewId) {
    const adminToken = localStorage.getItem('antika_admin_token');

    if (adminToken) {
      // حذف بواسطة الأدمن
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (!res.ok) throw new Error('فشل حذف التعليق');
      return await res.json();
    }

    // حذف بواسطة صاحب التعليق — نتحقق من Firebase أولاً
    const firebaseUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    const res = await fetch(`/api/reviews/${reviewId}/user`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: firebaseUser.email })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'فشل حذف التعليق');
    }
    return await res.json();
  }
};
window.ReviewsAPI = ReviewsAPI;

// Expose API globally for other scripts
window.API = API;