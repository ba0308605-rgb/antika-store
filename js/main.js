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

// Check login status and update UI - ALWAYS show "تسجيل الدخول"
function checkLoginStatus() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-user text-lg"></i><span class="hidden sm:inline text-sm">تسجيل الدخول</span>';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }
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

        const dropdown = document.getElementById('categories-dropdown');
        if (dropdown) {
            dropdown.innerHTML = categories.map(cat => `
                <a href="products.html?category=${cat.id}" class="block px-4 py-2 hover:bg-antika-lavender transition text-gray-700">
                    ${cat.icon} ${cat.name}
                </a>
            `).join('');
        }

        const grid = document.getElementById('categories-grid');
        if (grid) {
            grid.innerHTML = categories.map(cat => `
                <a href="products.html?category=${cat.id}" class="group">
                    <div class="bg-antika-lavender rounded-2xl p-6 text-center hover:shadow-xl transition transform hover:-translate-y-2 border-2 border-transparent hover:border-antika-pink">
                        <div class="text-5xl mb-4 group-hover:scale-110 transition">${cat.icon}</div>
                        <h3 class="font-bold text-antika-gold text-lg mb-2">${cat.name}</h3>
                        <p class="text-sm text-gray-500">${cat.subcategories ? cat.subcategories.length : 0} تصنيف فرعي</p>
                    </div>
                </a>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// UNIFIED PRODUCT CARD - Used everywhere
function createProductCard(product, options = {}) {
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
        <button onclick="event.stopPropagation(); openQuickView(${product.id})" class="eye-icon" title="نظرة سريعة">
            <i class="fas fa-eye"></i>
        </button>
    ` : '';

    const newBadge = isNew ? `
        <div class="absolute top-4 right-4 bg-antika-pink text-white px-3 py-1 rounded-full text-xs font-bold">جديد</div>
    ` : '';

    return `
        <div class="product-card bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 product-square" onclick="window.location.href='product.html?id=${product.id}'">
            <div class="product-image-container relative">
                <img src="${imageUrl}" alt="${product.name}" class="w-full h-full object-cover">
                ${eyeButton}
                ${newBadge}
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
                    <button onclick="event.stopPropagation(); addToCart(${product.id})" class="add-to-cart-btn">
                        <i class="fas fa-shopping-bag"></i> أضف للسلة
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load featured products
async function loadFeaturedProducts() {
    try {
        const products = await API.getProducts();
        const featured = products.filter(p => p.isFeatured).slice(0, 4);
        
        const container = document.getElementById('featured-products');
        if (!container) return;
        
        if (featured.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center">لا توجد منتجات مميزة</p>';
            return;
        }

        container.innerHTML = featured.map(product => createProductCard(product)).join('');
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

        container.innerHTML = newProducts.map(product => createProductCard(product)).join('');
    } catch (error) {
        console.error('Error loading new products:', error);
    }
}

// Quick View Function
async function openQuickView(productId) {
    try {
        const products = await API.getProducts();
        const product = products.find(p => p.id == productId);
        if (!product) return;

        const hasDiscount = product.discountPrice && product.discountPrice < product.price;
        const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store';

        // Rating for quick view
        let ratingHtml = '';
        if (!product.reviews || product.reviews === 0) {
            ratingHtml = '<span class="text-gray-300">☆☆☆☆☆</span>';
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
            ratingHtml = stars;
        }

        const modalHtml = `
            <div id="quick-view-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                    <button onclick="closeQuickView()" class="absolute top-4 left-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition z-10">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                    <div class="p-6 md:p-8">
                        <div class="grid md:grid-cols-2 gap-8">
                            <div class="rounded-2xl overflow-hidden">
                                <img src="${imageUrl}" alt="${product.name}" class="w-full aspect-square object-cover">
                            </div>
                            <div class="flex flex-col justify-center">
                                <h2 class="text-3xl font-bold text-gray-800 mb-4">${product.name}</h2>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="text-xl">${ratingHtml}</div>
                                    <span class="text-gray-500">(${product.reviews || 0} تقييم)</span>
                                </div>
                                <p class="text-gray-600 mb-6 leading-relaxed line-clamp-3">${product.description}</p>
                                <div class="flex items-center gap-4 mb-6">
                                    ${hasDiscount ? `
                                        <span class="text-gray-400 line-through text-2xl">${product.price} ر.س</span>
                                        <span class="text-antika-pink-dark font-bold text-4xl">${product.discountPrice} ر.س</span>
                                    ` : `
                                        <span class="text-antika-gold font-bold text-4xl">${product.price} ر.س</span>
                                    `}
                                </div>
                                <div class="flex gap-4">
                                    <button onclick="addToCart(${product.id}); closeQuickView();" class="flex-1 bg-antika-gold text-white py-4 rounded-xl font-bold hover:bg-antika-gold-dark transition">
                                        <i class="fas fa-shopping-bag ml-2"></i> أضف للسلة
                                    </button>
                                    <button onclick="window.location.href='product.html?id=${product.id}'" class="px-6 py-4 border-2 border-antika-gold text-antika-gold rounded-xl font-bold hover:bg-antika-gold hover:text-white transition">
                                        التفاصيل
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv);
        document.body.style.overflow = 'hidden';

        document.getElementById('quick-view-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeQuickView();
            }
        });
    } catch (error) {
        console.error('Error opening quick view:', error);
    }
}

// Close Quick View
function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Add to cart
async function addToCart(productId) {
    try {
        const products = await API.getProducts();
        const product = products.find(p => p.id == productId);

        if (product && product.stock > 0) {
            await API.addToCart({
                id: product.id,
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
