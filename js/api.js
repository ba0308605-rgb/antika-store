// 🌸 Antika Store API Layer - LocalStorage Version (Enhanced with Footer Pages & Search)

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
                },
                "footer": {
                    "phone": "+966 50 123 4567",
                    "email": "info@antika-store.com",
                    "instagram": "https://instagram.com/antika_store",
                    "whatsapp": "https://wa.me/966501234567",
                    "snapchat": "https://snapchat.com/add/antika_store"
                },
                "productFeatures": {
                    "freeShipping": {
                        "enabled": true,
                        "text": "شحن مجاني",
                        "icon": "fa-truck"
                    },
                    "easyReturns": {
                        "enabled": true,
                        "text": "إرجاع سهل",
                        "icon": "fa-undo"
                    },
                    "qualityGuarantee": {
                        "enabled": true,
                        "text": "ضمان جودة",
                        "icon": "fa-shield-alt"
                    }
                }
            };
            localStorage.setItem('antika_settings', JSON.stringify(defaultSettings));
        }

        // Initialize footer pages if not exist
        if (!localStorage.getItem('antika_pages')) {
            const defaultPages = {
                "about": {
                    "title": "من نحن",
                    "content": "<h2 class='text-2xl font-bold text-antika-gold mb-4'>أهلاً بك في انتيكا استور</h2><p class='mb-4'>نحن وجهتك الأولى للديكور والأثاث المنزلي الفاخر. نؤمن بأن التفاصيل الصغيرة تصنع الفرق الكبير في منزلك.</p><p class='mb-4'>بدأنا رحلتنا عام 2020 بهدف تقديم منتجات عالية الجودة بتصاميم فريدة تلبي ذوق كل عميل.</p><p>فريقنا يعمل بشغف لاختيار أفضل المنتجات من حول العالم لنقدمها لك بأفضل الأسعار.</p>",
                    "lastUpdated": new Date().toISOString()
                },
                "returns": {
                    "title": "سياسة الإرجاع",
                    "content": "<h2 class='text-2xl font-bold text-antika-gold mb-4'>سياسة الإرجاع والاستبدال</h2><div class='space-y-4'><p><strong>1. فترة الإرجاع:</strong> يمكنك إرجاع المنتج خلال 14 يوماً من تاريخ الاستلام.</p><p><strong>2. حالة المنتج:</strong> يجب أن يكون المنتج في حالته الأصلية مع جميع الملحقات والتغليف.</p><p><strong>3. طريقة الإرجاع:</strong> تواصل مع خدمة العملاء لترتيب عملية الإرجاع.</p><p><strong>4. استرداد المبلغ:</strong> يتم استرداد المبلغ خلال 5-7 أيام عمل بعد استلام المنتج.</p></div>",
                    "lastUpdated": new Date().toISOString()
                },
                "terms": {
                    "title": "الشروط والأحكام",
                    "content": "<h2 class='text-2xl font-bold text-antika-gold mb-4'>الشروط والأحكام</h2><div class='space-y-4'><p><strong>1. الاستخدام:</strong> باستخدامك للموقع، فإنك توافق على هذه الشروط.</p><p><strong>2. الطلبات:</strong> جميع الطلبات خاضعة للتوفر والتأكيد.</p><p><strong>3. الأسعار:</strong> الأسعار قابلة للتغيير دون إشعار مسبق.</p><p><strong>4. الخصوصية:</strong> نحترم خصوصيتك ونحمي بياناتك الشخصية.</p></div>",
                    "lastUpdated": new Date().toISOString()
                },
                "faq": {
                    "title": "الأسئلة الشائعة",
                    "content": "<h2 class='text-2xl font-bold text-antika-gold mb-4'>الأسئلة الشائعة</h2><div class='space-y-4'><div class='bg-gray-50 p-4 rounded-lg'><h3 class='font-bold mb-2'>ما مدة التوصيل؟</h3><p>التوصيل خلال 3-5 أيام عمل داخل المدن الرئيسية.</p></div><div class='bg-gray-50 p-4 rounded-lg'><h3 class='font-bold mb-2'>هل يمكنني إلغاء الطلب؟</h3><p>نعم، يمكن الإلغاء قبل شحن الطلب.</p></div><div class='bg-gray-50 p-4 rounded-lg'><h3 class='font-bold mb-2'>ما طرق الدفع المتاحة؟</h3><p>نقبل الدفع عند الاستلام، البطاقات الائتمانية، وTabby وTamara.</p></div></div>",
                    "lastUpdated": new Date().toISOString()
                }
            };
            localStorage.setItem('antika_pages', JSON.stringify(defaultPages));
        }
    },

    // Products
    async getProducts() {
        this.init();
        let products = JSON.parse(localStorage.getItem('antika_products') || '[]');
        
        // Migrate old products with 'category' to 'categories'
        let needsUpdate = false;
        products.forEach(product => {
            // Convert single category to array
            if (product.category && !product.categories) {
                product.categories = [product.category];
                delete product.category;
                needsUpdate = true;
            }
            // Ensure categories is always an array
            if (!product.categories) {
                product.categories = [];
                needsUpdate = true;
            }
            // Check and clear expired new products
            if (product.isNew && product.newExpiryDate && new Date(product.newExpiryDate) < new Date()) {
                product.isNew = false;
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('antika_products', JSON.stringify(products));
        }
        
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

        // ✅ إضافة مميزات المنتج (افتراضياً false)
        product.features = product.features || {
            freeShipping: false,
            easyReturns: false,
            qualityGuarantee: false
        };
        
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

    // Footer Pages
    async getPages() {
        this.init();
        return JSON.parse(localStorage.getItem('antika_pages')) || {};
    },

    async getPage(pageId) {
        const pages = await this.getPages();
        return pages[pageId] || null;
    },

    async updatePage(pageId, pageData) {
        const pages = await this.getPages();
        pages[pageId] = { 
            ...pages[pageId], 
            ...pageData,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('antika_pages', JSON.stringify(pages));
        return pages[pageId];
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

    // Enhanced Search - Fuzzy search with similarity matching
    async searchProducts(query, options = {}) {
        const products = await this.getProducts();
        if (!query || query.trim() === '') return products;
        
        const searchTerm = query.toLowerCase().trim();
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 1);
        
        return products.filter(product => {
            const name = (product.name || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const subcategory = (product.subcategory || '').toLowerCase();
            const categoryNames = (product.categories || []).map(c => c.toLowerCase()).join(' ');
            
            // Exact match gets highest priority
            if (name.includes(searchTerm) || 
                description.includes(searchTerm) || 
                subcategory.includes(searchTerm)) {
                return true;
            }
            
            // Word-by-word matching for fuzzy search
            const matchCount = searchWords.filter(word => 
                name.includes(word) || 
                description.includes(word) || 
                subcategory.includes(word) ||
                categoryNames.includes(word)
            ).length;
            
            // Return true if at least half the words match
            return matchCount >= Math.ceil(searchWords.length / 2) || matchCount >= 1;
        }).sort((a, b) => {
            // Sort by relevance - exact matches first
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            const aExact = aName.includes(searchTerm) ? 2 : 0;
            const bExact = bName.includes(searchTerm) ? 2 : 0;
            return bExact - aExact;
        });
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
        localStorage.removeItem('antika_pages');
        localStorage.removeItem('antika_user');
        this.init();
    }
};

// Initialize on load
API.init();
