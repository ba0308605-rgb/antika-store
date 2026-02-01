// 🌸 Antika Store API Layer - LocalStorage Version (Enhanced with Multiple Images Support)

const API = {
    init() {
        if (!localStorage.getItem('antika_products')) {
            const defaultProducts = [
                {
                    "id": "1",
                    "name": "شمعة العود الفاخرة",
                    "description": "شمعة يدوية الصنع من الشمع الطبيعي بنسبة 100%، مع عبق العود الفاخر الذي يضفي أجواءً من الرفاهية والهدوء على منزلك. تدوم 60 ساعة.",
                    "price": 150,
                    "discountPrice": 120,
                    "discountPercentage": 20,
                    "categories": ["candles", "decor"],
                    "subcategory": "شموع عطرية",
                    "images": [
                        "https://images.unsplash.com/photo-1602607688656-1c7a1b1c0b5e?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?w=800&h=800&fit=crop"
                    ],
                    "stock": 20,
                    "stockDisplay": "number",
                    "rating": 4.8,
                    "reviews": 45,
                    "reviewsList": [],
                    "isNew": false,
                    "isFeatured": true,
                    "createdAt": "2025-01-15",
                    "updatedAt": "2025-01-15"
                },
                {
                    "id": "2",
                    "name": "كرسي خشبي كلاسيكي",
                    "description": "كرسي بتصميم Scandinavian أنيق، مصنوع من خشب الزان الطبيعي. مريح وعملي، يناسب جميع ديكورات المنزل العصرية والكلاسيكية.",
                    "price": 800,
                    "discountPrice": 650,
                    "discountPercentage": 18.75,
                    "categories": ["furniture"],
                    "subcategory": "كراسي",
                    "images": [
                        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=800&fit=crop"
                    ],
                    "stock": 5,
                    "stockDisplay": "text",
                    "rating": 4.9,
                    "reviews": 28,
                    "reviewsList": [],
                    "isNew": false,
                    "isFeatured": true,
                    "createdAt": "2025-01-10",
                    "updatedAt": "2025-01-10"
                },
                {
                    "id": "3",
                    "name": "فازة سيراميك يدوية",
                    "description": "فازة فنية مصنوعة يدوياً من السيراميك عالي الجودة. تصميم عصري بألوان هادئة تناسب جميع الأزهار والديكورات.",
                    "price": 85,
                    "discountPrice": null,
                    "discountPercentage": null,
                    "categories": ["tools", "decor"],
                    "subcategory": "غرفة المعيشة",
                    "images": [
                        "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1612196808214-b7e239e5bbae?w=800&h=800&fit=crop"
                    ],
                    "stock": 15,
                    "stockDisplay": "number",
                    "rating": 4.6,
                    "reviews": 12,
                    "reviewsList": [],
                    "isNew": true,
                    "isFeatured": false,
                    "createdAt": "2025-01-20",
                    "updatedAt": "2025-01-20"
                },
                {
                    "id": "4",
                    "name": "لوحة جدارية فنية",
                    "description": "لوحة فنية مطبوعة على قماش عالي الجودة، بإطار خشبي أنيق. تضفي لمسة فنية راقية على غرفة المعيشة أو غرفة النوم.",
                    "price": 200,
                    "discountPrice": null,
                    "discountPercentage": null,
                    "categories": ["decor"],
                    "subcategory": "لوحات",
                    "images": [
                        "https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop"
                    ],
                    "stock": 8,
                    "stockDisplay": "hidden",
                    "rating": 4.7,
                    "reviews": 19,
                    "reviewsList": [],
                    "isNew": true,
                    "isFeatured": false,
                    "createdAt": "2025-01-22",
                    "updatedAt": "2025-01-22"
                },
                {
                    "id": "5",
                    "name": "طقم شموع معطرة (3 قطع)",
                    "description": "طقم يتكون من 3 شموع معطرة بروائح مختلفة: فانيليا، لافندر، وورد. هدية مثالية لمن تحبين.",
                    "price": 180,
                    "discountPrice": 144,
                    "discountPercentage": 20,
                    "categories": ["candles", "decor"],
                    "subcategory": "شموع عطرية",
                    "images": [
                        "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1602607688656-1c7a1b1c0b5e?w=800&h=800&fit=crop"
                    ],
                    "stock": 30,
                    "stockDisplay": "text",
                    "rating": 4.9,
                    "reviews": 67,
                    "reviewsList": [],
                    "isNew": false,
                    "isFeatured": true,
                    "createdAt": "2025-01-05",
                    "updatedAt": "2025-01-05"
                },
                {
                    "id": "6",
                    "name": "طاولة قهوة خشبية",
                    "description": "طاولة قهوة دائرية بتصميم عصري، سطح خشبي طبيعي مع أرجل معدنية أنيقة. مناسبة للمساحات الصغيرة والكبيرة.",
                    "price": 450,
                    "discountPrice": 382,
                    "discountPercentage": 15,
                    "categories": ["furniture", "decor"],
                    "subcategory": "طاولات",
                    "images": [
                        "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&h=800&fit=crop",
                        "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=800&h=800&fit=crop"
                    ],
                    "stock": 3,
                    "stockDisplay": "number",
                    "rating": 4.8,
                    "reviews": 34,
                    "reviewsList": [],
                    "isNew": false,
                    "isFeatured": true,
                    "createdAt": "2025-01-08",
                    "updatedAt": "2025-01-08"
                }
            ];
            localStorage.setItem('antika_products', JSON.stringify(defaultProducts));
        }

        if (!localStorage.getItem('antika_categories')) {
            const defaultCategories = [
                { "id": "candles", "name": "شموع منزلية", "icon": "🕯️", "color": "#FFB6C1", "subcategories": ["شموع عطرية", "شموع زينة", "فواحات"] },
                { "id": "furniture", "name": "أثاث", "icon": "🪑", "color": "#8B4513", "subcategories": ["كراسي", "طاولات", "خزائن"] },
                { "id": "decor", "name": "ديكور جداري", "icon": "🖼️", "color": "#DDA0DD", "subcategories": ["لوحات", "مرايا", "رفوف"] },
                { "id": "tools", "name": "أدوات منزلية", "icon": "🏺", "color": "#F4A460", "subcategories": ["مطبخ", "حمام", "غرفة المعيشة"] }
            ];
            localStorage.setItem('antika_categories', JSON.stringify(defaultCategories));
        }

        if (!localStorage.getItem('antika_cart')) {
            localStorage.setItem('antika_cart', JSON.stringify([]));
        }

        if (!localStorage.getItem('antika_settings')) {
            const defaultSettings = {
                "hero": {
                    "title": "أضفي لمسة من الأناقة إلى منزلك",
                    "subtitle": "مع تشكيلتنا الفريدة من الديكور والأثاث والشموع العطرية",
                    "color": "#FFB6C1"
                },
                "promo": {
                    "text": "خصم 20% على الشموع هذا الأسبوع فقط!",
                    "code": "ANT20",
                    "color": "#8B4513"
                }
            };
            localStorage.setItem('antika_settings', JSON.stringify(defaultSettings));
        }
    },

    // Products
    async getProducts() {
        const products = JSON.parse(localStorage.getItem('antika_products') || '[]');
        
        // Check and clear expired new products
        const now = new Date();
        products.forEach(product => {
            if (product.isNew && product.newExpiryDate && new Date(product.newExpiryDate) < now) {
                product.isNew = false;
            }
            // Clear old reviews - start fresh
            product.reviewsList = [];
            product.reviews = 0;
            product.rating = 5; // Default rating
        });
        
        localStorage.setItem('antika_products', JSON.stringify(products));
        return products;
    },

    async getProduct(id) {
        const products = await this.getProducts();
        const product = products.find(p => p.id == id);
        if (product) {
            if (!product.reviewsList) product.reviewsList = [];
        }
        return product || null;
    },

    async addProduct(product) {
        const products = await this.getProducts();
        product.id = Date.now().toString();
        product.createdAt = new Date().toISOString().split('T')[0];
        product.updatedAt = product.createdAt;
        product.reviewsList = product.reviewsList || [];
        
        if (!product.images || !Array.isArray(product.images)) {
            product.images = ['https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'];
        }
        
        if (product.isNew && !product.newExpiryDate) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 7);
            product.newExpiryDate = expiry.toISOString().split('T')[0];
        }
        
        products.push(product);
        localStorage.setItem('antika_products', JSON.stringify(products));
        return product;
    },

    async updateProduct(id, updates) {
        const products = await this.getProducts();
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            if (updates.images && !Array.isArray(updates.images)) {
                updates.images = [updates.images];
            }
            
            if (updates.isNew && !updates.newExpiryDate) {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);
                updates.newExpiryDate = expiry.toISOString().split('T')[0];
            }
            
            products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
            localStorage.setItem('antika_products', JSON.stringify(products));
            return products[index];
        }
        return null;
    },

    async deleteProduct(id) {
        const products = await this.getProducts();
        const filtered = products.filter(p => p.id != id);
        localStorage.setItem('antika_products', JSON.stringify(filtered));
        return true;
    },

    // Categories
    async getCategories() {
        this.init();
        return JSON.parse(localStorage.getItem('antika_categories')) || [];
    },

    async addCategory(category) {
        const categories = await this.getCategories();
        category.id = 'cat_' + Date.now();
        categories.push(category);
        localStorage.setItem('antika_categories', JSON.stringify(categories));
        return category;
    },

    async updateCategory(id, updates) {
        const categories = await this.getCategories();
        const index = categories.findIndex(c => c.id == id);
        if (index !== -1) {
            categories[index] = { ...categories[index], ...updates };
            localStorage.setItem('antika_categories', JSON.stringify(categories));
            return categories[index];
        }
        return null;
    },

    async deleteCategory(id) {
        const categories = await this.getCategories();
        const filtered = categories.filter(c => c.id != id);
        localStorage.setItem('antika_categories', JSON.stringify(filtered));
        return true;
    },

    // Cart
    async getCart() {
        this.init();
        return JSON.parse(localStorage.getItem('antika_cart')) || [];
    },

    async addToCart(item) {
        const cart = await this.getCart();
        const existing = cart.find(i => i.id === item.id);

        if (existing) {
            return await this.updateCartItem(existing.id, { quantity: existing.quantity + 1 });
        }

        cart.push({ ...item, quantity: 1 });
        localStorage.setItem('antika_cart', JSON.stringify(cart));
        return item;
    },

    async updateCartItem(id, updates) {
        const cart = await this.getCart();
        const index = cart.findIndex(i => i.id == id);
        if (index !== -1) {
            cart[index] = { ...cart[index], ...updates };
            localStorage.setItem('antika_cart', JSON.stringify(cart));
            return cart[index];
        }
        return null;
    },

    async deleteCartItem(id) {
        const cart = await this.getCart();
        const filtered = cart.filter(i => i.id != id);
        localStorage.setItem('antika_cart', JSON.stringify(filtered));
        return true;
    },

    async clearCart() {
        localStorage.setItem('antika_cart', JSON.stringify([]));
        return true;
    },

    // Settings
    async getSettings() {
        this.init();
        return JSON.parse(localStorage.getItem('antika_settings')) || {};
    },

    async updateSettings(updates) {
        const settings = await this.getSettings();
        const newSettings = { ...settings, ...updates };
        localStorage.setItem('antika_settings', JSON.stringify(newSettings));
        return newSettings;
    },

    // Reviews
    async addReview(productId, review) {
        const products = await this.getProducts();
        const product = products.find(p => p.id == productId);
        if (product) {
            if (!product.reviewsList) product.reviewsList = [];
            
            review.date = new Date().toISOString().split('T')[0];
            review.id = Date.now().toString();
            product.reviewsList.push(review);
            
            const totalRating = product.reviewsList.reduce((sum, r) => sum + r.rating, 0);
            product.rating = totalRating / product.reviewsList.length;
            product.reviews = product.reviewsList.length;
            
            localStorage.setItem('antika_products', JSON.stringify(products));
        }
        return product;
    },

    // Get related products
    async getRelatedProducts(productId, limit = 4) {
        const products = await this.getProducts();
        const currentProduct = products.find(p => p.id == productId);
        
        if (!currentProduct) return [];
        
        let related = products.filter(p => {
            if (p.id == productId) return false;
            if (currentProduct.categories && p.categories) {
                return p.categories.some(cat => currentProduct.categories.includes(cat));
            }
            return false;
        });
        
        if (related.length < limit) {
            const otherProducts = products.filter(p => 
                p.id != productId && !related.includes(p)
            );
            related = [...related, ...otherProducts.slice(0, limit - related.length)];
        }
        
        return related.slice(0, limit);
    },

    // Bulk Operations
    async applyBulkDiscount(productIds, discountType, discountValue, endDate = null) {
        const products = await this.getProducts();

        for (const id of productIds) {
            const product = products.find(p => p.id == id);
            if (!product) continue;

            let discountPrice = product.price;
            let discountPercentage = 0;

            if (discountType === 'percentage') {
                discountPrice = Math.round(product.price * (1 - discountValue / 100));
                discountPercentage = discountValue;
            } else if (discountType === 'fixed') {
                discountPrice = product.price - discountValue;
                discountPercentage = Math.round((discountValue / product.price) * 100);
            } else if (discountType === 'newPrice') {
                discountPrice = discountValue;
                discountPercentage = Math.round(((product.price - discountValue) / product.price) * 100);
            }

            product.discountPrice = discountPrice;
            product.discountPercentage = discountPercentage;
            product.updatedAt = new Date().toISOString().split('T')[0];

            if (endDate) product.discountEndDate = endDate;
        }

        localStorage.setItem('antika_products', JSON.stringify(products));
        return true;
    },

    // Reset all data (for testing)
    resetData() {
        localStorage.removeItem('antika_products');
        localStorage.removeItem('antika_categories');
        localStorage.removeItem('antika_cart');
        localStorage.removeItem('antika_settings');
        localStorage.removeItem('antika_user');
        this.init();
    }
};

// Initialize on load
API.init();