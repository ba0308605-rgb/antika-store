// 🌸 Antika Store Main JavaScript - Unified Product Cards Version

document.addEventListener('DOMContentLoaded', async function() {
    await initApp();
});

async function initApp() {
    updateCartCount();
    checkLoginStatus();
    await loadCategories();
    await loadFeaturedProducts();
    await loadNewProducts();
}

// Check login status and update UI
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('antika_user');
    const loginBtn = document.getElementById('login-btn');
    if (isLoggedIn && loginBtn) {
        const user = JSON.parse(isLoggedIn);
        loginBtn.innerHTML = `<i class="fas fa-user-circle text-xl"></i>`;
        loginBtn.href = '#';
        loginBtn.onclick = function(e) {
            e.preventDefault();
            showAccountMenu(user);
        };
    }
}

// ✅ Check if user is registered - required for cart and wishlist
function isUserRegistered() {
    const user = localStorage.getItem('antika_user');
    return user !== null;
}

// ✅ Require login before proceeding - guards cart and wishlist
function requireLogin(action = 'continue') {
    if (!isUserRegistered()) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-md p-8 text-center">
                <div class="mb-6">
                    <i class="fas fa-lock-open text-6xl text-antika-gold mb-4"></i>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">يجب تسجيل الدخول</h3>
                    <p class="text-gray-600">تسجيل الدخول أو إنشاء حساب للمتابعة</p>
                </div>
                <div class="space-y-3">
                    <button onclick="window.location.href='register.html'" class="w-full bg-antika-gold text-white font-bold py-3 rounded-lg hover:bg-antika-gold-dark transition">
                        📝 إنشاء حساب جديد
                    </button>
                    <button onclick="window.location.href='login.html'" class="w-full border-2 border-antika-gold text-antika-gold font-bold py-3 rounded-lg hover:bg-antika-beige transition">
                        🔐 تسجيل الدخول
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="w-full text-gray-600 py-2">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return false;
    }
    return true;
}

// Show account menu - نفس تصميم المتجر المرجعي
function showAccountMenu(user) {
    // إغلاق القائمة المفتوحة إذا وجدت
    const existingMenu = document.getElementById('account-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const menu = document.createElement('div');
    menu.id = 'account-menu';
    menu.className = 'fixed bg-white shadow-2xl rounded-xl border border-gray-100 z-50';
    menu.style.cssText = 'top: 80px; left: 20px; width: 320px; max-height: 80vh; overflow-y: auto;';
    
    menu.innerHTML = `
        <!-- Header with user info -->
        <div class="p-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-antika-gold to-antika-pink flex items-center justify-center text-white text-xl font-bold">
                    ${user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                </div>
                <div class="flex-1">
                    <p class="font-bold text-gray-800 text-sm">${user.name || 'المستخدم'}</p>
                    <p class="text-xs text-gray-500">${user.email || ''}</p>
                </div>
                <button onclick="document.getElementById('account-menu').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        
        <!-- Menu Items -->
        <div class="py-2">
            <!-- الإشعارات -->
            <a href="#" onclick="showNotifications(); return false;" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">الإشعارات</p>
                </div>
                <span class="bg-antika-pink text-white text-xs px-2 py-1 rounded-full">0</span>
            </a>
            
            <!-- الطلبات -->
            <a href="#" onclick="showOrders(); return false;" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">الطلبات</p>
                </div>
            </a>
            
            <!-- المفضلة -->
            <a href="wishlist.html" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">المفضلة</p>
                </div>
            </a>
            
            <!-- حسابي -->
            <a href="#" onclick="showProfile(); return false;" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                    <i class="fas fa-user"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">حسابي</p>
                </div>
            </a>
            
            <!-- الإعدادات -->
            <a href="#" onclick="showSettings(); return false;" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <i class="fas fa-cog"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">الإعدادات</p>
                </div>
            </a>
        </div>
        
        <!-- Logout -->
        <div class="border-t border-gray-100 p-3">
            <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition">
                <i class="fas fa-sign-out-alt"></i>
                <span class="font-semibold">تسجيل الخروج</span>
            </button>
        </div>
    `;

    document.body.appendChild(menu);

    // إغلاق القائمة عند النقر خارجها
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target !== document.getElementById('login-btn')) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// Show notifications modal
function showNotifications() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-800">الإشعارات</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-8 text-center">
                <i class="fas fa-bell-slash text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">لا توجد إشعارات جديدة</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show orders modal
function showOrders() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-800">طلباتي</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-8 text-center">
                <i class="fas fa-shopping-bag text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 mb-4">لا توجد طلبات حالياً</p>
                <a href="products.html" class="inline-block bg-antika-gold text-white px-6 py-2 rounded-full hover:bg-antika-gold-dark transition">
                    تسوق الآن
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show profile modal
function showProfile() {
    const user = JSON.parse(localStorage.getItem('antika_user') || '{}');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-800">حسابي</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-6">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 rounded-full bg-gradient-to-br from-antika-gold to-antika-pink flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                        ${user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                    </div>
                    <h4 class="font-bold text-lg">${user.name || 'المستخدم'}</h4>
                    <p class="text-gray-500 text-sm">${user.email || ''}</p>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 text-sm mb-1">الاسم</label>
                        <input type="text" value="${user.name || ''}" class="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50" readonly>
                    </div>
                    <div>
                        <label class="block text-gray-700 text-sm mb-1">البريد الإلكتروني</label>
                        <input type="email" value="${user.email || ''}" class="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50" readonly>
                    </div>
                    <div>
                        <label class="block text-gray-700 text-sm mb-1">رقم الجوال</label>
                        <input type="tel" value="${user.phone || 'غير محدد'}" class="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50" readonly>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show settings modal
function showSettings() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-800">الإعدادات</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-4">
                <div class="space-y-2">
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-bell text-gray-400"></i>
                            <span>الإشعارات</span>
                        </div>
                        <i class="fas fa-chevron-left text-gray-400"></i>
                    </div>
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-moon text-gray-400"></i>
                            <span>الوضع الليلي</span>
                        </div>
                        <div class="w-10 h-6 bg-gray-200 rounded-full relative">
                            <div class="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow"></div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-language text-gray-400"></i>
                            <span>اللغة</span>
                        </div>
                        <span class="text-gray-500 text-sm">العربية</span>
                    </div>
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-shield-alt text-gray-400"></i>
                            <span>الخصوصية والأمان</span>
                        </div>
                        <i class="fas fa-chevron-left text-gray-400"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Logout function
function logout() {
    localStorage.removeItem('antika_user');
    localStorage.removeItem('antika_token');
    window.location.reload();
}

// Update cart count in header
async function updateCartCount() {
    try {
        const cart = await API.getCart();
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) {
            cartBadge.textContent = count;
            cartBadge.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const categories = await API.getCategories();

        // ترتيب التصنيفات حسب sortOrder
        categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        const dropdown = document.getElementById('categories-dropdown');
        if (dropdown) {
            dropdown.innerHTML = categories.map(cat => `
                <a href="products.html?category=${cat.id}" class="block px-4 py-2 hover:bg-antika-lavender transition text-gray-700">
                    ${cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:')) ? `<img src="${cat.icon}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;display:inline-block">` : cat.icon} ${cat.name}
                </a>
            `).join('');
        }

        const grid = document.getElementById('categories-grid');
        if (grid) {
            grid.innerHTML = categories.map(cat => `
                <a href="products.html?category=${cat.id}" class="group">
                    <div class="bg-antika-lavender rounded-2xl p-6 text-center hover:shadow-xl transition transform hover:-translate-y-2 border-2 border-transparent hover:border-antika-pink">
                        <div class="text-5xl mb-4 group-hover:scale-110 transition">${cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:')) ? `<img src="${cat.icon}" style="width:60px;height:60px;object-fit:contain;display:inline-block">` : cat.icon}</div>
                        <h3 class="font-bold text-antika-gold text-lg mb-2">${cat.name}</h3>
                        <p class="text-sm text-gray-500">${cat.subcategories ? cat.subcategories.length : 0} تصنيف فرعي</p>
                    </div>
                </a>
            `).join('');
        }

        // Load categories in mobile menu
        const mobileCategories = document.getElementById('mobile-categories');
        if (mobileCategories) {
            if (categories.length === 0) {
                mobileCategories.innerHTML = '<p class="text-gray-400 text-sm">لا توجد تصنيفات</p>';
            } else {
                mobileCategories.innerHTML = categories.map(cat => `
                    <a href="products.html?category=${cat.id}" class="flex items-center gap-3 py-2 text-gray-700 hover:text-antika-pink transition" onclick="toggleMenu()">
                        <span class="text-xl">${cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:')) ? `<img src="${cat.icon}" style="width:24px;height:24px;object-fit:contain;vertical-align:middle">` : (cat.icon || '📦')}</span>
                        <span>${cat.name}</span>
                    </a>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// UNIFIED PRODUCT CARD - Used everywhere
function createProductCard(product, options = {}) {
    // Validate product has an ID
    if (!product || !product.id) {
        console.error('Invalid product data - missing ID:', product);
        return ''; // Return empty string if product is invalid
    }
    
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store';
    const showEye = options.showEye !== false;
    const isNew = product.isNew && new Date(product.newExpiryDate) > new Date();
    
    // Stock display
    let stockHtml = '';
    if (product.stockDisplay !== 'hidden') {
        let stockText = '';
        let stockClass = product.stock < 5 ? 'text-red-500' : 'text-green-500';
        
        if (product.stockDisplay === 'text' && product.stockText) {
            stockText = product.stockText;
        } else if (product.stockDisplay === 'number') {
            stockText = `متوفر: ${product.stock} قطعة`;
        }
        
        if (stockText) {
            stockHtml = `<p class="${stockClass} text-xs mb-1"><i class="fas fa-box ml-1"></i>${stockText}</p>`;
        }
    }

    // Rating display - EMPTY stars when no reviews
    let ratingHtml = '';
    if (!product.reviews || product.reviews === 0) {
        ratingHtml = '<span class="text-gray-300">☆☆☆☆☆</span><span class="text-gray-400 mr-1">(0)</span>';
    } else {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(product.rating)) {
                stars += '<span class="text-yellow-400">★</span>';
            } else if (i === Math.ceil(product.rating) && !Number.isInteger(product.rating)) {
                stars += '<span class="text-yellow-400 relative"><span class="absolute overflow-hidden w-1/2">★</span><span class="text-gray-300">☆</span></span>';
            } else {
                stars += '<span class="text-gray-300">☆</span>';
            }
        }
        ratingHtml = stars + `<span class="text-gray-400 mr-1">(${product.reviews})</span>`;
    }

    const eyeButton = showEye ? `
        <button onclick="event.stopPropagation(); openQuickView('${product.id}')" class="eye-icon" title="نظرة سريعة">
            <i class="fas fa-eye"></i>
        </button>
    ` : '';

    const newBadge = isNew ? `
        <div class="absolute top-4 right-4 bg-antika-pink text-white px-3 py-1 rounded-full text-xs font-bold">جديد</div>
    ` : '';

    // Out of Stock Ribbon - Diagonal red ribbon
    const outOfStockRibbon = (product.stock <= 0 || product.isOutOfStock) ? `
        <div class="out-of-stock-ribbon" style="
            position: absolute;
            top: 18px;
            right: -28px;
            background: #dc2626;
            color: white;
            padding: 5px 40px;
            font-size: 10px;
            font-weight: bold;
            transform: rotate(45deg);
            transform-origin: center;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
            direction: rtl;
            letter-spacing: 0;
        ">${product.outOfStockText || 'نفذت الكمية'}</div>
    ` : '';

    // Build product URL safely
    const productUrl = product.id ? `product.html?id=${encodeURIComponent(product.id)}` : '#';
    
    return `
        <div class="product-card bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 product-square ${(product.stock <= 0 || product.isOutOfStock) ? 'out-of-stock' : ''}" onclick="window.location.href='${productUrl}'">
            <div class="product-image-container relative">
                <img src="${imageUrl}" alt="${product.name}" class="w-full h-full object-cover">
                ${eyeButton}
                ${newBadge}
                ${outOfStockRibbon}
            </div>
            <div class="p-4">
                <h3 class="font-bold text-gray-800 mb-2 text-sm truncate">${product.name}</h3>
                ${stockHtml}
                <div class="flex items-center gap-1 mb-2 text-xs">${ratingHtml}</div>
                <div class="flex items-center justify-between">
                    <div>
                        ${hasDiscount ? `
                            <span class="text-gray-400 line-through text-xs block">${product.price} ر.س</span>
                            <span class="text-antika-pink-dark font-bold">${product.discountPrice} ر.س</span>
                        ` : `
                            <span class="text-antika-gold font-bold">${product.price} ر.س</span>
                        `}
                    </div>
                    ${(product.stock <= 0 || product.isOutOfStock) ? `
                        <button disabled class="add-to-cart-btn" style="opacity: 0.5; cursor: not-allowed; background: #9ca3af;">
                            <i class="fas fa-times"></i> غير متوفر
                        </button>
                    ` : `
                        <button onclick="event.stopPropagation(); addToCart('${product.id}')" class="add-to-cart-btn">
                                <i class="fas fa-shopping-bag"></i> أضف للسلة
                            </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Load featured products (DISCOUNTED products - عروض خاصة)
async function loadFeaturedProducts() {
    try {
        const products = await API.getProducts();
        // ✅ Show products with actual discount (discountPrice < price)
        const discounted = products.filter(p => p.discountPrice && p.discountPrice < p.price).slice(0, 4);
        
        const container = document.getElementById('featured-products');
        if (!container) return;
        
        if (discounted.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center">لا توجد منتجات مخفضة حالياً</p>';
            return;
        }

        container.innerHTML = discounted.map(product => `
            <antika-product-card 
                data-product='${JSON.stringify(product)}'
                data-variant="default">
            </antika-product-card>
        `).join('');
    } catch (error) {
        console.error('Error loading featured products:', error);
    }
}

// Load new products
async function loadNewProducts() {
    try {
        const products = await API.getProducts();
        const newProducts = products.filter(p => p.isNew).slice(0, 4);
        
        const container = document.getElementById('new-products');
        if (!container) return;
        
        if (newProducts.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center">لا توجد منتجات جديدة</p>';
            return;
        }

        container.innerHTML = newProducts.map(product => `
            <antika-product-card 
                data-product='${JSON.stringify(product)}'
                data-variant="default">
            </antika-product-card>
        `).join('');
    } catch (error) {
        console.error('Error loading new products:', error);
    }
}

// Quick View Function
// ✅ Handle add to cart with login check
async function handleAddToCart(productId) {
    if (!requireLogin('إضافة للسلة')) {
        return; // User not logged in
    }
    await addToCart(productId);
}

// Add to cart
async function addToCart(productId) {
    try {
        const products = await API.getProducts();
        const product = products.find(p => p.id == productId);

        if (product && product.stock > 0) {
            await API.addToCart({
                productId: product.id,
                name: product.name,
                price: product.discountPrice || product.price,
                image: product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store',
                stock: product.stock
            });
            await updateCartCount();
            showNotification(`تمت إضافة "${product.name}" للسلة! 🛒`);
        } else {
            showNotification('عذراً، المنتج غير متوفر حالياً', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('حدث خطأ، حاول مرة أخرى', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce ${
        type === 'success' ? 'bg-antika-pink text-white' : 'bg-red-500 text-white'
    }`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} ml-2"></i>
        ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load footer settings
async function loadFooterSettings() {
    try {
        const settings = await API.getSettings();
        if (settings.footer) {
            // Update footer contact info if elements exist
            const phoneEl = document.getElementById('footer-phone-display');
            const emailEl = document.getElementById('footer-email-display');
            const instagramEl = document.getElementById('footer-instagram-link');
            const whatsappEl = document.getElementById('footer-whatsapp-link');
            const snapchatEl = document.getElementById('footer-snapchat-link');

            if (phoneEl) phoneEl.textContent = settings.footer.phone || '+966 50 123 4567';
            if (emailEl) emailEl.textContent = settings.footer.email || 'info@antika-store.com';
            if (instagramEl) instagramEl.href = settings.footer.instagram || '#';
            if (whatsappEl) whatsappEl.href = settings.footer.whatsapp || '#';
            if (snapchatEl) snapchatEl.href = settings.footer.snapchat || '#';
        }
    } catch (error) {
        console.error('Error loading footer settings:', error);
    }
}