// ًںŒ¸ Antika Store Admin JavaScript - Fixed Version

let currentEditingProduct = null;
let currentEditingCategory = null;
const ADMIN_TOKEN_KEY = 'antika_admin_token';
const ADMIN_USER_KEY = 'antika_admin_user';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // ًں§¹ Clear old localStorage products to avoid conflicts with server data
    localStorage.removeItem('antika_products');
    localStorage.removeItem('antika_categories');
    console.log('ًں§¹ Cleared old localStorage data');
    checkAdminAuth();
});

// Check admin authentication
async function checkAdminAuth() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (token) {
        try {
            const session = await API.verifyAdminSession();
            if (session?.ok) {
                const existingAdminUser = localStorage.getItem(ADMIN_USER_KEY);
                if (!existingAdminUser) {
                    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({
                        name: 'Admin',
                        username: session.user?.username || 'admin',
                        isAdmin: true,
                        loginTime: new Date().toISOString()
                    }));
                }

                document.getElementById('login-modal').classList.add('hidden');
                document.getElementById('admin-panel').classList.remove('hidden');
                await initAdmin();
                return;
            }
        } catch (e) {
            console.error('Admin session validation failed:', e);
        }
    }

    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
}

// Login handling
document.getElementById('login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ظˆظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±', 'error');
        return;
    }

    try {
        const result = await API.adminLogin(username, password);
        localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({
            ...(result.user || {}),
            isAdmin: true,
            loginTime: new Date().toISOString()
        }));

        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        showNotification('طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ظ†ط¬ط§ط­!');
        await initAdmin();
        return;
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification('ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©!', 'error');
        return;
    }
});

// Logout function
function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    showNotification('طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬');
}

// Initialize admin panel
async function initAdmin() {
    try {
        await updateStats();
        await loadRecentProducts();
        await loadAdminProducts();
        await loadCategoriesTable();
        await loadBulkDiscountProducts();
        await populateCategorySelects();
        await loadSettings();
        await loadFooterPagesSettings();
        await loadAnnouncingSettings();
        await loadOrders(); // طھط­ظ…ظٹظ„ ط§ظ„ط·ظ„ط¨ط§طھ
        console.log('âœ… Admin panel initialized');
    } catch (error) {
        console.error('Error initializing admin:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ظ…ظٹظ„ ظ„ظˆط­ط© ط§ظ„طھط­ظƒظ…', 'error');
    }
}

// ============================================
// NAVIGATION
// ============================================

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('text-antika-pink-dark', 'bg-antika-pink/10', 'font-semibold');
        item.classList.add('text-gray-700');
    });

    if (event && event.currentTarget) {
        event.currentTarget.classList.remove('text-gray-700');
        event.currentTarget.classList.add('text-antika-pink-dark', 'bg-antika-pink/10', 'font-semibold');
    }

    // Load section-specific data
    if (sectionName === 'products') loadAdminProducts();
    if (sectionName === 'categories') loadCategoriesTable();
    if (sectionName === 'bulk-discount') loadBulkDiscountProducts();
    if (sectionName === 'footer-pages') loadFooterPagesSettings();
    if (sectionName === 'announcing') loadAnnouncingSettings();
    if (sectionName === 'orders') loadOrders();
}

// ============================================
// DASHBOARD STATS
// ============================================

async function updateStats() {
    try {
        const products = await API.getProducts();
        const discounted = products.filter(p => p.discountPrice && p.discountPrice < p.price);
        const orders = await API.getOrders ? await API.getOrders() : [];
        
        const statProducts = document.getElementById('stat-products');
        const statDiscounted = document.getElementById('stat-discounted');
        const statOrders = document.getElementById('stat-orders');
        
        if (statProducts) statProducts.textContent = products.length;
        if (statDiscounted) statDiscounted.textContent = discounted.length;
        if (statOrders) statOrders.textContent = orders.length;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function loadRecentProducts() {
    try {
        const products = await API.getProducts();
        const recent = products.slice(-5).reverse();
        const container = document.getElementById('recent-products-list');

        if (!container) return;

        if (recent.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ</p>';
            return;
        }

        container.innerHTML = recent.map(p => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                    <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'}" class="w-12 h-12 rounded-lg object-cover">
                    <div>
                        <div class="font-bold text-gray-800">${p.name}</div>
                        <div class="text-sm text-gray-500">${p.price} ط±.ط³</div>
                    </div>
                </div>
                <span class="text-xs ${p.stock < 5 ? 'text-red-500' : 'text-green-500'}">
                    ظ…ط®ط²ظˆظ†: ${p.stock}
                </span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent products:', error);
    }
}

// ============================================
// ORDERS MANAGEMENT - ط¥ط¯ط§ط±ط© ط§ظ„ط·ظ„ط¨ط§طھ
// ============================================

async function loadOrders() {
    try {
        const orders = await API.getOrders ? await API.getOrders() : [];
        const container = document.getElementById('orders-list');
        
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-shopping-bag text-6xl text-gray-200 mb-4"></i>
                    <p class="text-gray-500">ظ„ط§ طھظˆط¬ط¯ ط·ظ„ط¨ط§طھ ط­ط§ظ„ظٹط§ظ‹</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-4">
                <div class="p-4 border-b border-gray-100 bg-gray-50">
                    <div class="flex justify-between items-center flex-wrap gap-2">
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-gray-800">ط·ظ„ط¨ #${order.id}</span>
                            <span class="text-sm text-gray-500">${order.date}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${getOrderStatusClass(order.status)}">
                            ${getOrderStatusText(order.status)}
                        </span>
                    </div>
                </div>
                <div class="p-4">
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h4 class="font-bold text-gray-700 mb-2">ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ط¹ظ…ظٹظ„</h4>
                            <p class="text-sm text-gray-600"><i class="fas fa-user ml-2 text-antika-gold"></i>${order.customerName}</p>
                            <p class="text-sm text-gray-600"><i class="fas fa-phone ml-2 text-antika-gold"></i>${order.customerPhone}</p>
                            <p class="text-sm text-gray-600"><i class="fas fa-envelope ml-2 text-antika-gold"></i>${order.customerEmail}</p>
                            <p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt ml-2 text-antika-gold"></i>${order.customerAddress}</p>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-700 mb-2">ظ…ظ„ط®طµ ط§ظ„ط·ظ„ط¨</h4>
                            <p class="text-sm text-gray-600">ط¹ط¯ط¯ ط§ظ„ظ…ظ†طھط¬ط§طھ: ${order.items.length}</p>
                            <p class="text-sm text-gray-600">ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹: ${order.paymentMethod}</p>
                            <p class="text-sm text-gray-600">المدينة: ${order.shippingCity || 'غير محددة'}</p>
                            <p class="text-sm text-gray-600">رسوم الشحن: ${Number(order.shippingCost || 0).toFixed(2)} ر.س</p>
                            <p class="text-sm text-gray-600">المدة المتوقعة: ${order.shippingEta || '-'}</p>
                            <p class="font-bold text-antika-gold text-lg mt-2">ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${order.total} ط±.ط³</p>
                        </div>
                    </div>
                    <div class="border-t border-gray-100 pt-4">
                        <h4 class="font-bold text-gray-700 mb-2">ط§ظ„ظ…ظ†طھط¬ط§طھ</h4>
                        <div class="space-y-2">
                            ${order.items.map(item => `
                                <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover">
                                    <div class="flex-1">
                                        <p class="font-semibold text-sm">${item.name}</p>
                                        <p class="text-xs text-gray-500">${item.quantity} أ— ${item.price} ط±.ط³</p>
                                    </div>
                                    <span class="font-bold text-antika-gold">${item.quantity * item.price} ط±.ط³</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="border-t border-gray-100 pt-4 mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                        <button onclick="updateOrderStatus('${order.id}', 'processing')" class="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-sm">
                            ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'shipped')" class="flex-1 bg-yellow-100 text-yellow-600 py-2 rounded-lg hover:bg-yellow-200 transition text-sm">
                            طھظ… ط§ظ„ط´ط­ظ†
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'out_for_delivery')" class="flex-1 bg-orange-100 text-orange-600 py-2 rounded-lg hover:bg-orange-200 transition text-sm">
                            خرج للتوصيل
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'delivered')" class="flex-1 bg-green-100 text-green-600 py-2 rounded-lg hover:bg-green-200 transition text-sm">
                            طھظ… ط§ظ„طھظˆطµظٹظ„
                        </button>
                        <button onclick="deleteOrder('${order.id}')" class="px-4 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-sm">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function getOrderStatusClass(status) {
    const classes = {
        'pending': 'bg-yellow-100 text-yellow-600',
        'processing': 'bg-blue-100 text-blue-600',
        'shipped': 'bg-purple-100 text-purple-600',
        'out_for_delivery': 'bg-orange-100 text-orange-600',
        'delivered': 'bg-green-100 text-green-600',
        'cancelled': 'bg-red-100 text-red-600'
    };
    return classes[status] || 'bg-gray-100 text-gray-600';
}

function getOrderStatusText(status) {
    const texts = {
        'pending': 'ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ط¯ظپط¹',
        'processing': 'ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²',
        'shipped': 'طھظ… ط§ظ„ط´ط­ظ†',
        'out_for_delivery': 'خرج للتوصيل',
        'delivered': 'طھظ… ط§ظ„طھظˆطµظٹظ„',
        'cancelled': 'ظ…ظ„ط؛ظٹ'
    };
    return texts[status] || status;
}

async function updateOrderStatus(orderId, status) {
    try {
        if (API.updateOrderStatus) {
            await API.updateOrderStatus(orderId, status);
            showNotification('طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط·ظ„ط¨ ط¨ظ†ط¬ط§ط­!');
            await loadOrders();
            await updateStats();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط·ظ„ط¨', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ظ‡ط°ط§ ط§ظ„ط·ظ„ط¨طں')) return;
    
    try {
        if (API.deleteOrder) {
            await API.deleteOrder(orderId);
            showNotification('طھظ… ط­ط°ظپ ط§ظ„ط·ظ„ط¨ ط¨ظ†ط¬ط§ط­');
            await loadOrders();
            await updateStats();
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ط°ظپ ط§ظ„ط·ظ„ط¨', 'error');
    }
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

async function loadAdminProducts() {
    try {
        const products = await API.getProducts();
        const categories = await API.getCategories();
        const container = document.getElementById('admin-products-grid');

        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ</p>';
            return;
        }

        container.innerHTML = products.map(product => {
            const productId = product._id || product.id;
            const productCategories = product.categories || (product.category ? [product.category] : []);
            const category = categories.find(c => c.id === productCategories[0]);
            const hasDiscount = product.discountPrice && product.discountPrice < product.price;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store';
            const isNew = product.isNew && product.newExpiryDate && new Date(product.newExpiryDate) > new Date();

            return `
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div class="relative aspect-square">
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    ${hasDiscount ? `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">-${Math.round(product.discountPercentage || 0)}%</div>` : ''}
                    ${isNew ? `<div class="absolute top-2 right-2 bg-antika-pink text-white px-2 py-1 rounded text-xs font-bold">ط¬ط¯ظٹط¯</div>` : ''}
                    ${product.images && product.images.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs"><i class="fas fa-images"></i> ${product.images.length}</div>` : ''}
                </div>
                <div class="p-3">
                    <h4 class="font-bold text-gray-800 text-sm truncate mb-1">${product.name}</h4>
                    <p class="text-xs text-gray-500 mb-2">${category ? category.name : ''}</p>
                    <div class="mb-3">
                        ${hasDiscount ? `
                            <span class="text-gray-400 line-through text-xs">${product.price}</span>
                            <span class="text-antika-pink-dark font-bold text-sm mr-1">${product.discountPrice} ط±.ط³</span>
                        ` : `
                            <span class="text-antika-gold font-bold text-sm">${product.price} ط±.ط³</span>
                        `}
                    </div>
                    <div class="flex gap-2">
                        <button onclick='editProduct(${JSON.stringify(productId)})' class="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-xs">
                            <i class="fas fa-edit"></i> طھط¹ط¯ظٹظ„
                        </button>
                        <button onclick='deleteProduct(${JSON.stringify(productId)})' class="flex-1 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-xs">
                            <i class="fas fa-trash"></i> ط­ط°ظپ
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin products:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ظ…ظٹظ„ ط§ظ„ظ…ظ†طھط¬ط§طھ', 'error');
    }
}

// ============================================
// PRODUCT MODAL
// ============================================

function openProductModal(productId = null) {
    console.log('Opening product modal, productId:', productId);
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');

    if (!modal || !form) {
        console.error('Modal or form not found');
        return;
    }

    // Reset form
    form.reset();
    
    // Reset image preview
    const previewContainer = document.getElementById('images-preview-container');
    const imagesData = document.getElementById('product-images-data');
    if (previewContainer) previewContainer.innerHTML = '';
    if (imagesData) imagesData.value = '[]';
    
    // Reset other fields
    const stockTextContainer = document.getElementById('stock-text-container');
    const newProductDate = document.getElementById('new-product-date');
    const discountDisplay = document.getElementById('discount-display');
    
    if (stockTextContainer) stockTextContainer.classList.add('hidden');
    if (newProductDate) newProductDate.classList.add('hidden');
    if (discountDisplay) discountDisplay.textContent = '';

    // Reset category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    
    // Reset custom features with defaults
    loadCustomFeatures([]);

    currentEditingProduct = null;

    if (productId) {
        loadProductForEdit(productId);
        if (title) title.textContent = 'طھط¹ط¯ظٹظ„ ظ…ظ†طھط¬';
    } else {
        if (title) title.textContent = 'ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ ط¬ط¯ظٹط¯';
    }

    modal.classList.remove('hidden');
}

async function loadProductForEdit(productId) {
    try {
        console.log('Loading product for edit:', productId);
        const product = await API.getProduct(productId);
        if (!product) {
            console.error('Product not found:', productId);
            showNotification('ط§ظ„ظ…ظ†طھط¬ ط؛ظٹط± ظ…ظˆط¬ظˆط¯ (ID: ' + productId + ')', 'error');
            return;
        }
        console.log('Product loaded successfully:', product.name);

        currentEditingProduct = productId;
        
        // Set basic fields
        const nameInput = document.getElementById('product-name');
        const skuInput = document.getElementById('product-sku');
        const originalPriceInput = document.getElementById('product-original-price');
        const salePriceInput = document.getElementById('product-sale-price');
        const stockInput = document.getElementById('product-stock');
        const stockDisplayInput = document.getElementById('stock-display');
        const descriptionInput = document.getElementById('product-description');
        const newInput = document.getElementById('product-new');
        const freeShippingInput = document.getElementById('product-free-shipping');
        
        console.log('ًں“‌ Loading product data:', product);
        if (nameInput) nameInput.value = product.name || '';
        if (skuInput) {
            skuInput.value = product.sku || '';
            console.log('ًں“‌ SKU loaded:', product.sku, 'Input value:', skuInput.value);
        }
        if (originalPriceInput) originalPriceInput.value = product.price || '';
        if (salePriceInput) salePriceInput.value = product.discountPrice || product.price || '';
        if (stockInput) stockInput.value = product.stock || 0;
        if (stockDisplayInput) stockDisplayInput.value = product.stockDisplay || 'number';
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (newInput) newInput.checked = product.isNew || false;
        if (freeShippingInput) {
            freeShippingInput.checked = product.freeShipping !== false;
            console.log('ًں“‌ Free Shipping loaded:', product.freeShipping, 'Input checked:', freeShippingInput.checked);
        }

        calculateDiscount();

        // Stock text
        if (product.stockDisplay === 'text' && product.stockText) {
            const stockTextContainer = document.getElementById('stock-text-container');
            const stockTextInput = document.getElementById('stock-text');
            if (stockTextContainer) stockTextContainer.classList.remove('hidden');
            if (stockTextInput) stockTextInput.value = product.stockText;
        }

        // Categories
        if (product.categories && Array.isArray(product.categories)) {
            product.categories.forEach(catId => {
                const checkbox = document.querySelector(`.category-checkbox[value="${catId}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Images
        if (product.images && product.images.length > 0) {
            const imagesData = document.getElementById('product-images-data');
            if (imagesData) imagesData.value = JSON.stringify(product.images);
            renderImagePreviews(product.images);
        }

        // New product with expiry
        if (product.isNew && product.newExpiryDate) {
            const newProductDate = document.getElementById('new-product-date');
            const newExpiryDate = document.getElementById('new-expiry-date');
            if (newProductDate) newProductDate.classList.remove('hidden');
            if (newExpiryDate) newExpiryDate.value = product.newExpiryDate;
        }

        // ًںŒں Custom Product Features
        console.log('ًں“‌ Product customFeatures from DB:', product.customFeatures);
        loadCustomFeatures(product.customFeatures || []);

    } catch (error) {
        console.error('Error loading product for edit:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬', 'error');
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden');
}

// Image preview functions
function previewMultipleImages(input) {
    const container = document.getElementById('images-preview-container');
    const dataInput = document.getElementById('product-images-data');
    
    if (!container || !dataInput) return;
    
    let currentImages = JSON.parse(dataInput.value || '[]');
    
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentImages.push(e.target.result);
                dataInput.value = JSON.stringify(currentImages);
                renderImagePreviews(currentImages);
            };
            reader.readAsDataURL(file);
        });
    }
}

function renderImagePreviews(images) {
    const container = document.getElementById('images-preview-container');
    if (!container) return;
    
    container.innerHTML = images.map((img, idx) => `
        <div class="relative">
            <img src="${img}" class="w-20 h-20 rounded-lg object-cover border-2 border-gray-200">
            <button type="button" onclick="removeImage(${idx})" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeImage(index) {
    const dataInput = document.getElementById('product-images-data');
    if (!dataInput) return;
    
    let images = JSON.parse(dataInput.value || '[]');
    images.splice(index, 1);
    dataInput.value = JSON.stringify(images);
    renderImagePreviews(images);
}

// Price calculations
function calculateSalePrice() {
    const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || 0;
    const salePriceInput = document.getElementById('product-sale-price');
    
    if (salePriceInput && !salePriceInput.value) {
        salePriceInput.value = originalPrice;
    }
    calculateDiscount();
}

function calculateDiscount() {
    const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || 0;
    const salePrice = parseFloat(document.getElementById('product-sale-price')?.value) || 0;
    const display = document.getElementById('discount-display');
    
    if (!display) return;
    
    if (originalPrice > 0 && salePrice > 0 && salePrice < originalPrice) {
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        display.textContent = `ط®طµظ… ${discount}% (ظˆظپط± ${originalPrice - salePrice} ط±.ط³)`;
    } else {
        display.textContent = '';
    }
}

// Stock display toggle
function toggleStockText() {
    const select = document.getElementById('stock-display');
    const container = document.getElementById('stock-text-container');
    const textInput = document.getElementById('stock-text');
    
    if (!select || !container) return;
    
    if (select.value === 'text') {
        container.classList.remove('hidden');
        if (textInput) textInput.required = true;
    } else {
        container.classList.add('hidden');
        if (textInput) textInput.required = false;
    }
}

// New product date toggle
function toggleNewProductDate() {
    const checkbox = document.getElementById('product-new');
    const dateContainer = document.getElementById('new-product-date');
    const dateInput = document.getElementById('new-expiry-date');
    
    if (!checkbox || !dateContainer) return;
    
    if (checkbox.checked) {
        dateContainer.classList.remove('hidden');
        // Set date to 7 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        if (dateInput) dateInput.value = expiryDate.toISOString().split('T')[0];
    } else {
        dateContainer.classList.add('hidden');
        if (dateInput) dateInput.value = '';
    }
}

// ============================================
// ًںŒں CUSTOM FEATURES MANAGEMENT
// ============================================

function addCustomFeature(value = '') {
    const container = document.getElementById('custom-features-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'custom-feature-row flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" value="${value}" placeholder="ظ…ط«ط§ظ„: ط¬ظˆط¯ط© ط¹ط§ظ„ظٹط© ظˆظ…طھط§ظ†ط©" 
            class="custom-feature-input flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none text-sm">
        <button type="button" onclick="this.closest('.custom-feature-row').remove()" class="text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function getCustomFeatures() {
    const inputs = document.querySelectorAll('.custom-feature-input');
    console.log('ًں”چ Found custom feature inputs:', inputs.length);
    const features = [];
    inputs.forEach((input, index) => {
        const value = input.value.trim();
        console.log(`  Input ${index}:`, value);
        if (value) features.push(value);
    });
    console.log('âœ… Collected features:', features);
    return features;
}

function loadCustomFeatures(features) {
    console.log('ًں“¥ Loading custom features:', features);
    const container = document.getElementById('custom-features-container');
    if (!container) {
        console.error('â‌Œ Custom features container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (features && features.length > 0) {
        console.log('âœ… Loading existing features:', features);
        features.forEach(feature => addCustomFeature(feature));
    } else {
        // Add default empty rows
        console.log('â„¹ï¸ڈ No features found, adding defaults');
        addCustomFeature('ط¬ظˆط¯ط© ط¹ط§ظ„ظٹط© ظˆظ…طھط§ظ†ط©');
        addCustomFeature('طھطµظ…ظٹظ… ط£ظ†ظٹظ‚ ظˆط¹طµط±ظٹ');
        addCustomFeature('ظ…ظ†ط§ط³ط¨ ظ„ظ„ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظٹظˆظ…ظٹ');
        addCustomFeature('ط¶ظ…ط§ظ† ط´ط§ظ…ظ„');
    }
}

// Product form submission
document.getElementById('product-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

    if (selectedCategories.length === 0) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط§ط®طھظٹط§ط± طھطµظ†ظٹظپ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„!', 'error');
        return;
    }

    const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || 0;
    const salePrice = parseFloat(document.getElementById('product-sale-price')?.value) || 0;
    
    const skuValue = document.getElementById('product-sku')?.value || '';
    const freeShippingValue = document.getElementById('product-free-shipping')?.checked || false;
    console.log('ًں”چ SKU:', skuValue);
    console.log('ًں”چ Free Shipping:', freeShippingValue);
    
    const productData = {
        name: document.getElementById('product-name')?.value || '',
        sku: skuValue,
        price: originalPrice,
        categories: selectedCategories,
        stock: parseInt(document.getElementById('product-stock')?.value) || 0,
        stockDisplay: document.getElementById('stock-display')?.value || 'number',
        freeShipping: freeShippingValue,
        description: document.getElementById('product-description')?.value || '',

        images: JSON.parse(document.getElementById('product-images-data')?.value || '[]')
    };
    console.log('ًں“¦ Product Data to save:', productData);

    // Stock text
    if (productData.stockDisplay === 'text') {
        productData.stockText = document.getElementById('stock-text')?.value || 'ظ…طھظˆظپط±';
    }

    // Discount price
    if (salePrice < originalPrice) {
        productData.discountPrice = salePrice;
        productData.discountPercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
    } else {
        productData.discountPrice = null;
        productData.discountPercentage = null;
    }

    // New product with expiry date
    const newCheckbox = document.getElementById('product-new');
    if (newCheckbox && newCheckbox.checked) {
        productData.isNew = true;
        productData.newExpiryDate = document.getElementById('new-expiry-date')?.value || '';
    } else {
        productData.isNew = false;
        productData.newExpiryDate = null;
    }

    // ًںŒں Custom Product Features
    const customFeatures = getCustomFeatures();
    productData.customFeatures = customFeatures; // Always send customFeatures (even if empty)

    try {
        if (currentEditingProduct) {
            await API.updateProduct(currentEditingProduct, productData);
            showNotification('طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­! ًںژ‰');
        } else {
            await API.addProduct(productData);
            showNotification('طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­! ًںژ‰');
        }

        closeProductModal();
        await loadAdminProducts();
        await updateStats();
        await loadRecentProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ظپط¸ ط§ظ„ظ…ظ†طھط¬', 'error');
    }
});

async function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    console.log('ًں—‘ï¸ڈ deleteProduct called with ID:', id, '| Type:', typeof id);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.error('â‌Œ Invalid product ID:', id);
        showNotification('ظ…ط¹ط±ظپ ط§ظ„ظ…ظ†طھط¬ ط؛ظٹط± طµط§ظ„ط­', 'error');
        return;
    }
    
    if (!confirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ظ‡ط°ط§ ط§ظ„ظ…ظ†طھط¬طں')) return;

    try {
        console.log('ًں“¤ Calling API.deleteProduct with ID:', id);
        const result = await API.deleteProduct(id);
        console.log('âœ… Delete API result:', result);
        await loadAdminProducts();
        await updateStats();
        showNotification('طھظ… ط­ط°ظپ ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­');
    } catch (error) {
        console.error('â‌Œ Error deleting product:', error);
        console.error('Error details:', error.message, error.stack);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ط°ظپ ط§ظ„ظ…ظ†طھط¬: ' + error.message, 'error');
    }
}

// ًں§¹ DELETE ALL PRODUCTS
async function deleteAllProducts() {
    if (!confirm('âڑ ï¸ڈ طھط­ط°ظٹط±!\n\nظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ†طھط¬ط§طھطں\n\nظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط، ظ„ط§ ظٹظ…ظƒظ† ط§ظ„طھط±ط§ط¬ط¹ ط¹ظ†ظ‡!')) return;
    
    if (!confirm('طھط£ظƒظٹط¯ ظ†ظ‡ط§ط¦ظٹ:\n\nط³ظٹطھظ… ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ†ظ‡ط§ط¦ظٹط§ظ‹.\nظ‡ظ„ طھط±ظٹط¯ ط§ظ„ظ…طھط§ط¨ط¹ط©طں')) return;

    try {
        console.log('ًں—‘ï¸ڈ Deleting all products...');
        const result = await API.deleteAllProducts();
        console.log('âœ… All products deleted:', result);
        
        // Clear localStorage backup
        localStorage.removeItem('products_backup');
        localStorage.removeItem('antika_products');
        
        await loadAdminProducts();
        await updateStats();
        showNotification(`طھظ… ط­ط°ظپ ${result.count || 'ط¬ظ…ظٹط¹'} ط§ظ„ظ…ظ†طھط¬ط§طھ ط¨ظ†ط¬ط§ط­`);
    } catch (error) {
        console.error('â‌Œ Error deleting all products:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ط°ظپ ط§ظ„ظ…ظ†طھط¬ط§طھ: ' + error.message, 'error');
    }
}

// ============================================
// CATEGORIES MANAGEMENT
// ============================================

async function loadCategoriesTable() {
    try {
        const categories = await API.getCategories();
        const tbody = document.getElementById('categories-table-body');

        if (!tbody) return;

        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">ظ„ط§ طھظˆط¬ط¯ طھطµظ†ظٹظپط§طھ</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(cat => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-6 py-4 text-2xl">${cat.icon || 'ًں“¦'}</td>
                <td class="px-6 py-4 font-semibold">${cat.name}</td>
                <td class="px-6 py-4">
                    ${cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories.map(sub => 
                        `<span class="inline-block bg-gray-100 px-2 py-1 rounded text-sm ml-1">${sub}</span>`
                    ).join('') : '-'}
                </td>
                <td class="px-6 py-4">
                    <button onclick="editCategory('${cat.id}')" class="text-blue-500 hover:text-blue-700 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCategory('${cat.id}')" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    
    if (!modal) return;

    const title = modal.querySelector('h3');

    if (form) form.reset();
    currentEditingCategory = null;

    if (categoryId) {
        loadCategoryForEdit(categoryId);
        if (title) title.textContent = 'طھط¹ط¯ظٹظ„ طھطµظ†ظٹظپ';
    } else {
        if (title) title.textContent = 'ط¥ط¶ط§ظپط© طھطµظ†ظٹظپ';
    }

    modal.classList.remove('hidden');
}

async function loadCategoryForEdit(categoryId) {
    try {
        const categories = await API.getCategories();
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        currentEditingCategory = categoryId;
        
        const iconInput = document.getElementById('category-icon');
        const nameInput = document.getElementById('category-name');
        const subInput = document.getElementById('category-subcategories');
        
        if (iconInput) iconInput.value = category.icon || '';
        if (nameInput) nameInput.value = category.name || '';
        if (subInput) subInput.value = category.subcategories ? category.subcategories.join(', ') : '';
    } catch (error) {
        console.error('Error loading category for edit:', error);
    }
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.add('hidden');
}

document.getElementById('category-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const iconInput = document.getElementById('category-icon');
    const nameInput = document.getElementById('category-name');
    const subInput = document.getElementById('category-subcategories');

    const categoryData = {
        icon: iconInput?.value || 'ًں“¦',
        name: nameInput?.value || '',
        subcategories: subInput?.value ? subInput.value.split(',').map(s => s.trim()).filter(s => s) : []
    };

    if (!categoryData.name) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ط§ط³ظ… ط§ظ„طھطµظ†ظٹظپ', 'error');
        return;
    }

    try {
        if (currentEditingCategory) {
            await API.updateCategory(currentEditingCategory, categoryData);
            showNotification('طھظ… طھط­ط¯ظٹط« ط§ظ„طھطµظ†ظٹظپ ط¨ظ†ط¬ط§ط­! ًںڈ·ï¸ڈ');
        } else {
            await API.addCategory(categoryData);
            showNotification('طھظ… ط¥ط¶ط§ظپط© ط§ظ„طھطµظ†ظٹظپ ط¨ظ†ط¬ط§ط­! ًںڈ·ï¸ڈ');
        }

        closeCategoryModal();
        await loadCategoriesTable();
        await populateCategorySelects();
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ظپط¸ ط§ظ„طھطµظ†ظٹظپ', 'error');
    }
});

async function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (!confirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯طں ط³ظٹطھظ… ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ظ…ط±طھط¨ط·ط© ط¨ظ‡ط°ط§ ط§ظ„طھطµظ†ظٹظپ!')) return;

    try {
        await API.deleteCategory(id);
        await loadCategoriesTable();
        await populateCategorySelects();
        showNotification('طھظ… ط­ط°ظپ ط§ظ„طھطµظ†ظٹظپ ط¨ظ†ط¬ط§ط­');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ط°ظپ ط§ظ„طھطµظ†ظٹظپ', 'error');
    }
}

// Populate category selects in product modal
async function populateCategorySelects() {
    try {
        const categories = await API.getCategories();
        
        // Product categories container
        const container = document.getElementById('product-categories');
        if (container) {
            container.innerHTML = categories.map(cat => `
                <label class="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-2 rounded">
                    <input type="checkbox" value="${cat.id}" class="category-checkbox w-4 h-4 text-antika-pink rounded accent-antika-pink">
                    <span>${cat.icon || 'ًں“¦'} ${cat.name}</span>
                </label>
            `).join('');
        }
        
        // Category filter
        const filter = document.getElementById('product-category-filter');
        if (filter) {
            const currentValue = filter.value;
            filter.innerHTML = '<option value="">ط¬ظ…ظٹط¹ ط§ظ„طھطµظ†ظٹظپط§طھ</option>' + 
                categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
            filter.value = currentValue;
        }
    } catch (error) {
        console.error('Error populating categories:', error);
    }
}

// ============================================
// BULK DISCOUNT
// ============================================

async function loadBulkDiscountProducts() {
    try {
        const products = await API.getProducts();
        const container = document.getElementById('bulk-products-list');

        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ</p>';
            return;
        }

        container.innerHTML = products.map(p => {
            const productId = p._id || p.id;
            return `
            <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="${productId}" class="product-checkbox w-5 h-5 text-antika-pink rounded accent-antika-pink">
                <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'}" class="w-12 h-12 rounded object-cover">
                <div class="flex-1">
                    <div class="font-semibold">${p.name}</div>
                    <div class="text-sm text-gray-500">${p.price} ط±.ط³</div>
                </div>
            </label>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading bulk discount products:', error);
    }
}

async function applyBulkDiscount() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const productIds = Array.from(checkboxes).map(cb => cb.value);

    if (productIds.length === 0) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط§ط®طھظٹط§ط± ظ…ظ†طھط¬ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„!', 'error');
        return;
    }

    const discountType = document.getElementById('bulk-discount-type')?.value || 'percentage';
    const discountValue = parseFloat(document.getElementById('bulk-discount-value')?.value) || 0;
    const endDate = document.getElementById('bulk-discount-end')?.value || null;

    if (!discountValue || discountValue <= 0) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ظ‚ظٹظ…ط© ط®طµظ… طµط­ظٹط­ط©!', 'error');
        return;
    }

    try {
        await API.applyBulkDiscount(productIds, discountType, discountValue, endDate);
        showNotification(`طھظ… طھط·ط¨ظٹظ‚ ط§ظ„ط®طµظ… ط¹ظ„ظ‰ ${productIds.length} ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­! ًںژ‰`);
        await loadBulkDiscountProducts();
        await loadAdminProducts();
    } catch (error) {
        console.error('Error applying bulk discount:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط·ط¨ظٹظ‚ ط§ظ„ط®طµظ…', 'error');
    }
}

// ============================================
// SETTINGS
// ============================================

async function loadSettings() {
    try {
        const settings = await API.getSettings();
        
        // Hero banner
        if (settings.hero) {
            const heroTitle = document.getElementById('hero-title');
            const heroSubtitle = document.getElementById('hero-subtitle');
            const heroColor = document.getElementById('hero-color');
            
            if (heroTitle) heroTitle.value = settings.hero.title || '';
            if (heroSubtitle) heroSubtitle.value = settings.hero.subtitle || '';
            if (heroColor) heroColor.value = settings.hero.color || '#FFB6C1';
        }
        
        // Promo banner
        if (settings.promo) {
            const promoText = document.getElementById('promo-text');
            const promoCode = document.getElementById('promo-code');
            const promoColor = document.getElementById('promo-color');
            
            if (promoText) promoText.value = settings.promo.text || '';
            if (promoCode) promoCode.value = settings.promo.code || '';
            if (promoColor) promoColor.value = settings.promo.color || '#8B4513';
        }
        
        // Footer settings
        if (settings.footer) {
            const footerPhone = document.getElementById('footer-phone');
            const footerEmail = document.getElementById('footer-email');
            const footerInstagram = document.getElementById('footer-instagram');
            const footerWhatsapp = document.getElementById('footer-whatsapp');
            const footerSnapchat = document.getElementById('footer-snapchat');
            
            if (footerPhone) footerPhone.value = settings.footer.phone || '';
            if (footerEmail) footerEmail.value = settings.footer.email || '';
            if (footerInstagram) footerInstagram.value = settings.footer.instagram || '';
            if (footerWhatsapp) footerWhatsap.value = settings.footer.whatsapp || '';
            if (footerSnapchat) footerSnapchat.value = settings.footer.snapchat || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveBannerSettings() {
    const heroTitle = document.getElementById('hero-title')?.value || '';
    const heroSubtitle = document.getElementById('hero-subtitle')?.value || '';
    const heroColor = document.getElementById('hero-color')?.value || '#FFB6C1';

    const settings = {
        hero: { title: heroTitle, subtitle: heroSubtitle, color: heroColor }
    };

    try {
        await API.updateSettings(settings);
        showNotification('طھظ… ط­ظپط¸ ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط¨ط§ظ†ط± ط§ظ„ط±ط¦ظٹط³ظٹ!');
    } catch (error) {
        console.error('Error saving banner settings:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط­ظپط¸', 'error');
    }
}

async function savePromoSettings() {
    const promoText = document.getElementById('promo-text')?.value || '';
    const promoCode = document.getElementById('promo-code')?.value || '';
    const promoColor = document.getElementById('promo-color')?.value || '#8B4513';

    const settings = {
        promo: { text: promoText, code: promoCode, color: promoColor }
    };

    try {
        await API.updateSettings(settings);
        showNotification('طھظ… ط­ظپط¸ ط¥ط¹ط¯ط§ط¯ط§طھ ط¨ط§ظ†ط± ط§ظ„ط¹ط±ظˆط¶!');
    } catch (error) {
        console.error('Error saving promo settings:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط­ظپط¸', 'error');
    }
}

async function saveFooterSettings() {
    const settings = {
        footer: {
            phone: document.getElementById('footer-phone')?.value || '',
            email: document.getElementById('footer-email')?.value || '',
            instagram: document.getElementById('footer-instagram')?.value || '',
            whatsapp: document.getElementById('footer-whatsapp')?.value || '',
            snapchat: document.getElementById('footer-snapchat')?.value || ''
        }
    };

    try {
        await API.updateSettings(settings);
        showNotification('طھظ… ط­ظپط¸ ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظپظˆطھط± ط¨ظ†ط¬ط§ط­!');
    } catch (error) {
        console.error('Error saving footer settings:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط­ظپط¸', 'error');
    }
}

// ============================================
// FOOTER PAGES
// ============================================

async function loadFooterPagesSettings() {
    try {
        const pages = await API.getFooterPages();

        // About page
        if (pages.about) {
            const aboutTitle = document.getElementById('page-about-title');
            const aboutContent = document.getElementById('page-about-content');
            if (aboutTitle) aboutTitle.value = pages.about.title || '';
            if (aboutContent) aboutContent.value = pages.about.content || '';
        }

        // Returns page
        if (pages.returns) {
            const returnsTitle = document.getElementById('page-returns-title');
            const returnsContent = document.getElementById('page-returns-content');
            if (returnsTitle) returnsTitle.value = pages.returns.title || '';
            if (returnsContent) returnsContent.value = pages.returns.content || '';
        }

        // Terms page
        if (pages.terms) {
            const termsTitle = document.getElementById('page-terms-title');
            const termsContent = document.getElementById('page-terms-content');
            if (termsTitle) termsTitle.value = pages.terms.title || '';
            if (termsContent) termsContent.value = pages.terms.content || '';
        }

        // FAQ page
        if (pages.faq) {
            const faqTitle = document.getElementById('page-faq-title');
            const faqContent = document.getElementById('page-faq-content');
            if (faqTitle) faqTitle.value = pages.faq.title || '';
            if (faqContent) faqContent.value = pages.faq.content || '';
        }
    } catch (error) {
        console.error('Error loading footer pages settings:', error);
    }
}

async function savePageSettings(pageId) {
    const titleInput = document.getElementById(`page-${pageId}-title`);
    const contentInput = document.getElementById(`page-${pageId}-content`);

    if (!titleInput || !contentInput) {
        showNotification('ط®ط·ط£: ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط­ظ‚ظˆظ„ ط§ظ„ط¥ط¯ط®ط§ظ„', 'error');
        return;
    }

    const pageData = {
        title: titleInput.value.trim(),
        content: contentInput.value.trim()
    };

    if (!pageData.title) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ط¹ظ†ظˆط§ظ† ط§ظ„طµظپط­ط©', 'error');
        return;
    }

    try {
        await API.updateFooterPage(pageId, pageData);
        showNotification(`طھظ… ط­ظپط¸ طµظپط­ط© "${pageData.title}" ط¨ظ†ط¬ط§ط­! ًں’¾`);
    } catch (error) {
        console.error('Error saving page settings:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط­ظپط¸', 'error');
    }
}

// ============================================
// ANNOUNCING BAR
// ============================================

async function loadAnnouncingSettings() {
    try {
        const settings = await API.getAnnouncingSettings();
        const textInput = document.getElementById('announcing-text');
        const visibleInput = document.getElementById('announcing-visible');
        
        if (textInput && settings.text) {
            textInput.value = settings.text;
        }
        if (visibleInput) {
            visibleInput.checked = settings.isVisible !== false; // default true
        }
    } catch (error) {
        console.error('Error loading announcing settings:', error);
    }
}

async function saveAnnouncingSettings() {
    const textInput = document.getElementById('announcing-text');
    const visibleInput = document.getElementById('announcing-visible');
    
    if (!textInput) return;

    const text = textInput.value.trim();
    const isVisible = visibleInput ? visibleInput.checked : true;
    
    if (!text) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ظ†طµ ط§ظ„ط´ط±ظٹط· ط§ظ„ظ…طھط­ط±ظƒ', 'error');
        return;
    }

    try {
        await API.updateAnnouncingSettings({ text, isVisible });
        showNotification('طھظ… ط­ظپط¸ ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط´ط±ظٹط· ط§ظ„ظ…طھط­ط±ظƒ ط¨ظ†ط¬ط§ط­! ًں“¢');
    } catch (error) {
        console.error('Error saving announcing settings:', error);
        showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط­ظپط¸', 'error');
    }
}

// ============================================
// NOTIFICATION
// ============================================

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce ${
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


// ============================================
// ًںژ¨ ADVANCED VARIANTS SYSTEM
// ============================================

function toggleVariantsSection() {
    const checkbox = document.getElementById('product-has-variants');
    const section = document.getElementById('variants-section');
    if (checkbox && section) {
        section.classList.toggle('hidden', !checkbox.checked);
    }
}

function addVariantOption() {
    const container = document.getElementById('variant-options-container');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'variant-option-row flex gap-2 items-center';
    row.innerHTML = `
        <input type="text" placeholder="ط§ط³ظ… ط§ظ„ط®ط§طµظٹط© (ظ…ط«ط§ظ„: ط§ظ„ظ…ظ‚ط§ط³)" class="variant-option-name flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
        <input type="text" placeholder="ط§ظ„ظ‚ظٹظ… (ظ…ط«ط§ظ„: SطŒ MطŒ LطŒ XL)" class="variant-option-values flex-[2] border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
        <button type="button" onclick="this.closest('.variant-option-row').remove()" class="text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(row);
}

function generateVariants() {
    // Get all variant options
    const optionRows = document.querySelectorAll('.variant-option-row');
    const options = [];
    
    optionRows.forEach(row => {
        const name = row.querySelector('.variant-option-name')?.value.trim();
        const values = row.querySelector('.variant-option-values')?.value.split('طŒ').map(v => v.trim()).filter(v => v);
        
        if (name && values.length > 0) {
            options.push({ name, values });
        }
    });
    
    if (options.length === 0) {
        showNotification('ط§ظ„ط±ط¬ط§ط، ط¥ط¶ط§ظپط© ط®ط§طµظٹط© ظˆط§ط­ط¯ط© ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ ظ…ط¹ ظ‚ظٹظ…ظ‡ط§', 'error');
        return;
    }
    
    // Generate all combinations
    const combinations = generateCombinations(options);
    renderVariantsList(combinations, options);
}

function generateCombinations(options) {
    if (options.length === 0) return [];
    if (options.length === 1) {
        return options[0].values.map(v => [{ name: options[0].name, value: v }]);
    }
    
    const [first, ...rest] = options;
    const restCombinations = generateCombinations(rest);
    
    const result = [];
    first.values.forEach(val => {
        restCombinations.forEach(combo => {
            result.push([{ name: first.name, value: val }, ...combo]);
        });
    });
    
    return result;
}

function renderVariantsList(combinations, options) {
    const container = document.getElementById('variants-list-container');
    if (!container) return;
    
    const basePrice = parseFloat(document.getElementById('product-sale-price')?.value) || 0;
    
    container.innerHTML = combinations.map((combo, index) => {
        const comboLabel = combo.map(c => `${c.name}: ${c.value}`).join(' | ');
        const comboId = combo.map(c => c.value).join('-');
        
        return `
            <div class="variant-item bg-white p-4 rounded-lg border-2 border-gray-200" data-variant-id="${comboId}">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-bold text-antika-pink-dark">${comboLabel}</span>
                    <button type="button" onclick="this.closest('.variant-item').remove()" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">ط§ظ„ط³ط¹ط± (ط§ط®طھظٹط§ط±ظٹ)</label>
                        <input type="number" class="variant-price w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="${basePrice}" min="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">ط§ظ„ظ…ط®ط²ظˆظ†</label>
                        <input type="number" class="variant-stock w-full border border-gray-200 rounded px-2 py-1 text-sm" value="0" min="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">SKU (ط§ط®طھظٹط§ط±ظٹ)</label>
                        <input type="text" class="variant-sku w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="ط±ظ…ط² ط§ظ„ظ…ظ†طھط¬">
                    </div>
                </div>
                <div class="mt-3">
                    <label class="block text-xs text-gray-600 mb-1">طµظˆط± ط§ظ„ظ…طھط؛ظٹط± (ط±ظˆط§ط¨ط· ظ…ظپطµظˆظ„ط© ط¨ظپط§طµظ„ط©)</label>
                    <input type="text" class="variant-images w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg">
                </div>
            </div>
        `;
    }).join('');
}

function getVariantsData() {
    const variantItems = document.querySelectorAll('.variant-item');
    const variants = [];
    
    variantItems.forEach(item => {
        const id = item.dataset.variantId;
        const price = item.querySelector('.variant-price')?.value;
        const stock = item.querySelector('.variant-stock')?.value;
        const sku = item.querySelector('.variant-sku')?.value;
        const images = item.querySelector('.variant-images')?.value.split(',').map(i => i.trim()).filter(i => i);
        
        // Parse options from ID (e.g., "red-S" -> ["red", "S"])
        const options = id.split('-');
        
        variants.push({
            id: id,
            options: options,
            price: price ? parseFloat(price) : null,
            stock: parseInt(stock) || 0,
            sku: sku || '',
            images: images
        });
    });
    
    return variants;
}

function loadVariantsData(product) {
    if (!product.hasVariants) return;
    
    // Check the checkbox
    const checkbox = document.getElementById('product-has-variants');
    if (checkbox) {
        checkbox.checked = true;
        toggleVariantsSection();
    }
    
    // Load variant options
    if (product.variantOptions) {
        const container = document.getElementById('variant-options-container');
        if (container) {
            container.innerHTML = '';
            product.variantOptions.forEach((opt, index) => {
                if (index === 0) {
                    // First option - use existing row
                    const firstRow = container.querySelector('.variant-option-row');
                    if (firstRow) {
                        firstRow.querySelector('.variant-option-name').value = opt.name;
                        firstRow.querySelector('.variant-option-values').value = opt.values.join('طŒ ');
                        return;
                    }
                }
                
                // Add new row
                const row = document.createElement('div');
                row.className = 'variant-option-row flex gap-2 items-center';
                row.innerHTML = `
                    <input type="text" value="${opt.name}" placeholder="ط§ط³ظ… ط§ظ„ط®ط§طµظٹط©" class="variant-option-name flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
                    <input type="text" value="${opt.values.join('طŒ ')}" placeholder="ط§ظ„ظ‚ظٹظ…" class="variant-option-values flex-[2] border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
                    <button type="button" onclick="this.closest('.variant-option-row').remove()" class="text-red-500 hover:text-red-700 p-2">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                container.appendChild(row);
            });
        }
    }
    
    // Load variants
    if (product.variants && product.variants.length > 0) {
        const container = document.getElementById('variants-list-container');
        if (container) {
            container.innerHTML = product.variants.map(variant => {
                const comboLabel = variant.options.map((v, i) => {
                    const optName = product.variantOptions?.[i]?.name || `ط®ط§طµظٹط© ${i+1}`;
                    return `${optName}: ${v}`;
                }).join(' | ');
                
                return `
                    <div class="variant-item bg-white p-4 rounded-lg border-2 border-gray-200" data-variant-id="${variant.id}">
                        <div class="flex justify-between items-center mb-3">
                            <span class="font-bold text-antika-pink-dark">${comboLabel}</span>
                            <button type="button" onclick="this.closest('.variant-item').remove()" class="text-red-500 hover:text-red-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">ط§ظ„ط³ط¹ط± (ط§ط®طھظٹط§ط±ظٹ)</label>
                                <input type="number" class="variant-price w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.price || ''}" placeholder="ط§ظ„ط³ط¹ط± ط§ظ„ط§ظپطھط±ط§ط¶ظٹ" min="0">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">ط§ظ„ظ…ط®ط²ظˆظ†</label>
                                <input type="number" class="variant-stock w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.stock}" min="0">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">SKU (ط§ط®طھظٹط§ط±ظٹ)</label>
                                <input type="text" class="variant-sku w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.sku || ''}" placeholder="ط±ظ…ط² ط§ظ„ظ…ظ†طھط¬">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="block text-xs text-gray-600 mb-1">طµظˆط± ط§ظ„ظ…طھط؛ظٹط± (ط±ظˆط§ط¨ط· ظ…ظپطµظˆظ„ط© ط¨ظپط§طµظ„ط©)</label>
                            <input type="text" class="variant-images w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.images?.join(', ') || ''}" placeholder="ط±ظˆط§ط¨ط· ط§ظ„طµظˆط±">
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Extend loadProductForEdit to handle variants
const originalLoadProductForEdit = loadProductForEdit;
loadProductForEdit = async function(productId) {
    await originalLoadProductForEdit(productId);
    
    try {
        const product = await API.getProduct(productId);
        if (product && product.hasVariants) {
            loadVariantsData(product);
        }
    } catch (error) {
        console.error('Error loading variants:', error);
    }
};

// Extend form submission to include variants data
document.getElementById('product-form')?.addEventListener('submit', async function(e) {
    // Variants data will be added to productData
    const hasVariants = document.getElementById('product-has-variants')?.checked;
    
    if (hasVariants) {
        // Add variants data to the productData object
        // This will be handled by modifying the existing submit handler
        const variants = getVariantsData();
        const optionRows = document.querySelectorAll('.variant-option-row');
        const variantOptions = [];
        
        optionRows.forEach(row => {
            const name = row.querySelector('.variant-option-name')?.value.trim();
            const values = row.querySelector('.variant-option-values')?.value.split('طŒ').map(v => v.trim()).filter(v => v);
            
            if (name && values.length > 0) {
                variantOptions.push({ name, values });
            }
        });
        
        // Store in hidden input or global variable
        window.variantsData = {
            hasVariants: true,
            variantOptions: variantOptions,
            variants: variants
        };
    } else {
        window.variantsData = null;
    }
});

// Modify the existing submit handler to include variants
(function() {
    const form = document.getElementById('product-form');
    if (!form) return;
    
    // Remove existing listener and add new one
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get selected categories
        const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

        if (selectedCategories.length === 0) {
            showNotification('ط§ظ„ط±ط¬ط§ط، ط§ط®طھظٹط§ط± طھطµظ†ظٹظپ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„!', 'error');
            return;
        }

        const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || 0;
        const salePrice = parseFloat(document.getElementById('product-sale-price')?.value) || 0;
        
        const skuValue = document.getElementById('product-sku')?.value || '';
        const freeShippingValue = document.getElementById('product-free-shipping')?.checked || false;
        console.log('ًں”چ SKU (variants):', skuValue);
        console.log('ًں”چ Free Shipping (variants):', freeShippingValue);
        
        const productData = {
            name: document.getElementById('product-name')?.value || '',
            sku: skuValue,
            price: originalPrice,
            categories: selectedCategories,
            stock: parseInt(document.getElementById('product-stock')?.value) || 0,
            stockDisplay: document.getElementById('stock-display')?.value || 'number',
            freeShipping: freeShippingValue,
            description: document.getElementById('product-description')?.value || '',
    
            images: JSON.parse(document.getElementById('product-images-data')?.value || '[]')
        };
        console.log('ًں“¦ Product Data (variants) to save:', productData);

        // Stock text
        if (productData.stockDisplay === 'text') {
            productData.stockText = document.getElementById('stock-text')?.value || 'ظ…طھظˆظپط±';
        }

        // Discount price
        if (salePrice < originalPrice) {
            productData.discountPrice = salePrice;
            productData.discountPercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        } else {
            productData.discountPrice = null;
            productData.discountPercentage = null;
        }

        // New product with expiry date
        const newCheckbox = document.getElementById('product-new');
        if (newCheckbox && newCheckbox.checked) {
            productData.isNew = true;
            productData.newExpiryDate = document.getElementById('new-expiry-date')?.value || '';
        } else {
            productData.isNew = false;
            productData.newExpiryDate = null;
        }

        // ًںŒں Custom Product Features
        const customFeatures = getCustomFeatures();
        productData.customFeatures = customFeatures; // Always send customFeatures (even if empty)

        // ًںژ¨ Variants data
        const hasVariants = document.getElementById('product-has-variants')?.checked;
        if (hasVariants && window.variantsData) {
            productData.hasVariants = true;
            productData.variantOptions = window.variantsData.variantOptions;
            productData.variants = window.variantsData.variants;
        } else {
            productData.hasVariants = false;
            productData.variantOptions = [];
            productData.variants = [];
        }

        try {
            if (currentEditingProduct) {
                await API.updateProduct(currentEditingProduct, productData);
                showNotification('طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­! ًںژ‰');
            } else {
                await API.addProduct(productData);
                showNotification('طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­! ًںژ‰');
            }

            closeProductModal();
            await loadAdminProducts();
            await updateStats();
            await loadRecentProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ظپط¸ ط§ظ„ظ…ظ†طھط¬', 'error');
        }
    });
})();

// ============================================
// CUSTOMER STATISTICS
// ============================================

async function loadCustomerStats() {
    try {
        // Since we don't have a users collection in the backend,
        // we'll analyze localStorage data from registered users
        // In production, this should fetch from API
        
        const stats = {
            gender: { male: 0, female: 0, unknown: 0 },
            age: { under18: 0, age18to25: 0, age26to35: 0, age36to50: 0, over50: 0, unknown: 0 },
            total: 0
        };
        
        // Get current user as sample (in production, fetch all users from API)
        const userData = localStorage.getItem('antika_user');
        if (userData) {
            const user = JSON.parse(userData);
            stats.total = 1;
            
            // Gender stats
            if (user.gender === 'male') {
                stats.gender.male++;
            } else if (user.gender === 'female') {
                stats.gender.female++;
            } else {
                stats.gender.unknown++;
            }
            
            // Age stats
            if (user.birthDate) {
                const birthDate = new Date(user.birthDate);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                
                if (age < 18) {
                    stats.age.under18++;
                } else if (age >= 18 && age <= 25) {
                    stats.age.age18to25++;
                } else if (age >= 26 && age <= 35) {
                    stats.age.age26to35++;
                } else if (age >= 36 && age <= 50) {
                    stats.age.age36to50++;
                } else {
                    stats.age.over50++;
                }
            } else {
                stats.age.unknown++;
            }
        }
        
        // Update Gender Stats UI
        document.getElementById('male-count').textContent = stats.gender.male;
        document.getElementById('female-count').textContent = stats.gender.female;
        document.getElementById('unknown-gender-count').textContent = stats.gender.unknown;
        document.getElementById('total-gender-users').textContent = stats.total;
        
        const malePercent = stats.total > 0 ? (stats.gender.male / stats.total * 100).toFixed(1) : 0;
        const femalePercent = stats.total > 0 ? (stats.gender.female / stats.total * 100).toFixed(1) : 0;
        const unknownGenderPercent = stats.total > 0 ? (stats.gender.unknown / stats.total * 100).toFixed(1) : 0;
        
        document.getElementById('male-percent').textContent = malePercent + '%';
        document.getElementById('female-percent').textContent = femalePercent + '%';
        document.getElementById('unknown-gender-percent').textContent = unknownGenderPercent + '%';
        
        document.getElementById('male-bar').style.width = malePercent + '%';
        document.getElementById('female-bar').style.width = femalePercent + '%';
        document.getElementById('unknown-gender-bar').style.width = unknownGenderPercent + '%';
        
        // Update Age Stats UI
        document.getElementById('under18-count').textContent = stats.age.under18;
        document.getElementById('age18-25-count').textContent = stats.age.age18to25;
        document.getElementById('age26-35-count').textContent = stats.age.age26to35;
        document.getElementById('age36-50-count').textContent = stats.age.age36to50;
        document.getElementById('over50-count').textContent = stats.age.over50;
        document.getElementById('unknown-age-count').textContent = stats.age.unknown;
        
        const maxAge = Math.max(stats.age.under18, stats.age.age18to25, stats.age.age26to35, stats.age.age36to50, stats.age.over50, stats.age.unknown, 1);
        
        document.getElementById('under18-bar').style.width = (stats.age.under18 / maxAge * 100) + '%';
        document.getElementById('age18-25-bar').style.width = (stats.age.age18to25 / maxAge * 100) + '%';
        document.getElementById('age26-35-bar').style.width = (stats.age.age26to35 / maxAge * 100) + '%';
        document.getElementById('age36-50-bar').style.width = (stats.age.age36to50 / maxAge * 100) + '%';
        document.getElementById('over50-bar').style.width = (stats.age.over50 / maxAge * 100) + '%';
        document.getElementById('unknown-age-bar').style.width = (stats.age.unknown / maxAge * 100) + '%';
        
        // Calculate average age
        let totalAge = 0;
        let ageCount = 0;
        if (userData) {
            const user = JSON.parse(userData);
            if (user.birthDate) {
                const birthDate = new Date(user.birthDate);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                totalAge += age;
                ageCount++;
            }
        }
        
        const averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : '-';
        document.getElementById('average-age').textContent = averageAge;
        
    } catch (error) {
        console.error('Error loading customer stats:', error);
    }
}

// Load stats when section is shown
document.addEventListener('DOMContentLoaded', function() {
    // Add observer to load stats when section becomes visible
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            const statsSection = document.getElementById('customer-stats-section');
            if (statsSection && !statsSection.classList.contains('hidden')) {
                loadCustomerStats();
            }
        });
    });
    
    const statsSection = document.getElementById('customer-stats-section');
    if (statsSection) {
        observer.observe(statsSection, { attributes: true, attributeFilter: ['class'] });
    }
});



