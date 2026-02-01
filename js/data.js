// 🌸 Antika Store Data Layer

// Default Categories
const defaultCategories = [
    { id: 'candles', name: 'شموع منزلية', icon: '🕯️', color: '#FFB6C1', subcategories: ['شموع عطرية', 'شموع زينة', 'فواحات'] },
    { id: 'furniture', name: 'أثاث', icon: '🪑', color: '#8B4513', subcategories: ['كراسي', 'طاولات', 'خزائن'] },
    { id: 'decor', name: 'ديكور جداري', icon: '🖼️', color: '#DDA0DD', subcategories: ['لوحات', 'مرايا', 'رفوف'] },
    { id: 'tools', name: 'أدوات منزلية', icon: '🏺', color: '#F4A460', subcategories: ['مطبخ', 'حمام', 'غرفة المعيشة'] }
];

// Default Products
const defaultProducts = [
    {
        id: 1,
        name: 'شمعة العود الفاخرة',
        description: 'شمعة يدوية الصنع من الشمع الطبيعي بنسبة 100%، مع عبق العود الفاخر الذي يضفي أجواءً من الرفاهية والهدوء على منزلك. تدوم 60 ساعة.',
        price: 150,
        discountPrice: 120,
        discountPercentage: 20,
        category: 'candles',
        subcategory: 'شموع عطرية',
        images: ['https://images.unsplash.com/photo-1602607688656-1c7a1b1c0b5e?w=800&h=800&fit=crop'],
        stock: 20,
        rating: 4.8,
        reviews: 45,
        isNew: false,
        isFeatured: true,
        createdAt: '2025-01-15'
    },
    {
        id: 2,
        name: 'كرسي خشبي كلاسيكي',
        description: 'كرسي بتصميم Scandinavian أنيق، مصنوع من خشب الزان الطبيعي. مريح وعملي، يناسب جميع ديكورات المنزل العصرية والكلاسيكية.',
        price: 800,
        discountPrice: 650,
        discountPercentage: 18.75,
        category: 'furniture',
        subcategory: 'كراسي',
        images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop'],
        stock: 5,
        rating: 4.9,
        reviews: 28,
        isNew: false,
        isFeatured: true,
        createdAt: '2025-01-10'
    },
    {
        id: 3,
        name: 'فازة سيراميك يدوية',
        description: 'فازة فنية مصنوعة يدوياً من السيراميك عالي الجودة. تصميم عصري بألوان هادئة تناسب جميع الأزهار والديكورات.',
        price: 85,
        discountPrice: null,
        discountPercentage: null,
        category: 'tools',
        subcategory: 'غرفة المعيشة',
        images: ['https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=800&fit=crop'],
        stock: 15,
        rating: 4.6,
        reviews: 12,
        isNew: true,
        isFeatured: false,
        createdAt: '2025-01-20'
    },
    {
        id: 4,
        name: 'لوحة جدارية فنية',
        description: 'لوحة فنية مطبوعة على قماش عالي الجودة، بإطار خشبي أنيق. تضفي لمسة فنية راقية على غرفة المعيشة أو غرفة النوم.',
        price: 200,
        discountPrice: null,
        discountPercentage: null,
        category: 'decor',
        subcategory: 'لوحات',
        images: ['https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=800&h=800&fit=crop'],
        stock: 8,
        rating: 4.7,
        reviews: 19,
        isNew: true,
        isFeatured: false,
        createdAt: '2025-01-22'
    },
    {
        id: 5,
        name: 'طقم شموع معطرة (3 قطع)',
        description: 'طقم يتكون من 3 شموع معطرة بروائح مختلفة: فانيليا، لافندر، وورد. هدية مثالية لمن تحبين.',
        price: 180,
        discountPrice: 144,
        discountPercentage: 20,
        category: 'candles',
        subcategory: 'شموع عطرية',
        images: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&h=800&fit=crop'],
        stock: 30,
        rating: 4.9,
        reviews: 67,
        isNew: false,
        isFeatured: true,
        createdAt: '2025-01-05'
    },
    {
        id: 6,
        name: 'طاولة قهوة خشبية',
        description: 'طاولة قهوة دائرية بتصميم عصري، سطح خشبي طبيعي مع أرجل معدنية أنيقة. مناسبة للمساحات الصغيرة والكبيرة.',
        price: 450,
        discountPrice: 382,
        discountPercentage: 15,
        category: 'furniture',
        subcategory: 'طاولات',
        images: ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&h=800&fit=crop'],
        stock: 3,
        rating: 4.8,
        reviews: 34,
        isNew: false,
        isFeatured: true,
        createdAt: '2025-01-08'
    }
];

// Data Management
const DataManager = {
    // Initialize data
    init() {
        if (!localStorage.getItem('antika_categories')) {
            localStorage.setItem('antika_categories', JSON.stringify(defaultCategories));
        }
        if (!localStorage.getItem('antika_products')) {
            localStorage.setItem('antika_products', JSON.stringify(defaultProducts));
        }
        if (!localStorage.getItem('antika_cart')) {
            localStorage.setItem('antika_cart', JSON.stringify([]));
        }
    },

    // Getters
    getCategories() {
        return JSON.parse(localStorage.getItem('antika_categories')) || [];
    },

    getProducts() {
        return JSON.parse(localStorage.getItem('antika_products')) || [];
    },

    getCart() {
        return JSON.parse(localStorage.getItem('antika_cart')) || [];
    },

    // Setters
    saveCategories(categories) {
        localStorage.setItem('antika_categories', JSON.stringify(categories));
    },

    saveProducts(products) {
        localStorage.setItem('antika_products', JSON.stringify(products));
    },

    saveCart(cart) {
        localStorage.setItem('antika_cart', JSON.stringify(cart));
    },

    // Product operations
    addProduct(product) {
        const products = this.getProducts();
        product.id = Date.now();
        product.createdAt = new Date().toISOString().split('T')[0];
        products.push(product);
        this.saveProducts(products);
        return product;
    },

    updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
            this.saveProducts(products);
            return products[index];
        }
        return null;
    },

    deleteProduct(id) {
        const products = this.getProducts();
        const filtered = products.filter(p => p.id != id);
        this.saveProducts(filtered);
    },

    // Category operations
    addCategory(category) {
        const categories = this.getCategories();
        category.id = 'cat_' + Date.now();
        categories.push(category);
        this.saveCategories(categories);
        return category;
    },

    updateCategory(id, updates) {
        const categories = this.getCategories();
        const index = categories.findIndex(c => c.id == id);
        if (index !== -1) {
            categories[index] = { ...categories[index], ...updates };
            this.saveCategories(categories);
            return categories[index];
        }
        return null;
    },

    deleteCategory(id) {
        const categories = this.getCategories();
        const filtered = categories.filter(c => c.id != id);
        this.saveCategories(filtered);
    },

    // Cart operations
    addToCart(product, quantity = 1) {
        const cart = this.getCart();
        const existing = cart.find(item => item.id == product.id);
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.discountPrice || product.price,
                image: product.images[0],
                quantity: quantity
            });
        }
        
        this.saveCart(cart);
        return cart;
    },

    removeFromCart(productId) {
        const cart = this.getCart();
        const filtered = cart.filter(item => item.id != productId);
        this.saveCart(filtered);
        return filtered;
    },

    updateCartQuantity(productId, quantity) {
        const cart = this.getCart();
        const item = cart.find(item => item.id == productId);
        if (item) {
            item.quantity = quantity;
            if (item.quantity <= 0) {
                return this.removeFromCart(productId);
            }
            this.saveCart(cart);
        }
        return cart;
    },

    clearCart() {
        this.saveCart([]);
    },

    getCartTotal() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    getCartCount() {
        const cart = this.getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    },

    // Bulk discount
    applyBulkDiscount(productIds, discountType, discountValue, endDate = null) {
        const products = this.getProducts();
        const updates = [];
        
        productIds.forEach(id => {
            const product = products.find(p => p.id == id);
            if (product) {
                if (discountType === 'percentage') {
                    product.discountPercentage = discountValue;
                    product.discountPrice = Math.round(product.price * (1 - discountValue / 100));
                } else if (discountType === 'fixed') {
                    product.discountPrice = product.price - discountValue;
                    product.discountPercentage = Math.round((discountValue / product.price) * 100);
                } else if (discountType === 'newPrice') {
                    product.discountPrice = discountValue;
                    product.discountPercentage = Math.round(((product.price - discountValue) / product.price) * 100);
                }
                
                if (endDate) {
                    product.discountEndDate = endDate;
                }
                
                product.updatedAt = new Date().toISOString().split('T')[0];
                updates.push(product);
            }
        });
        
        this.saveProducts(products);
        return updates;
    },

    // Reset to defaults (for testing)
    resetData() {
        localStorage.removeItem('antika_categories');
        localStorage.removeItem('antika_products');
        localStorage.removeItem('antika_cart');
        this.init();
    }
};

// Initialize on load
DataManager.init();