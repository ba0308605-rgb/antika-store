// 🌸 Antika Store Admin JavaScript - Enhanced LocalStorage Version

let currentEditingProduct = null;
let currentEditingCategory = null;

// Admin credentials from login.html
const ADMIN_CREDENTIALS = {
    username: 'BDR-FIRST',
    password: 'B1-a2d3e4r5'
};

// Check if admin is already logged in from login.html
document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('antika_user');
    const token = localStorage.getItem('antika_token');

    if (userData && token) {
        const user = JSON.parse(userData);
        if (user.isAdmin) {
            // Admin is already logged in, show admin panel
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
            initAdmin();
        }
    }
});

// Login handling
document.getElementById('login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Generate secure token
        const token = 'admin_' + btoa(Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        localStorage.setItem('antika_token', token);
        localStorage.setItem('antika_user', JSON.stringify({ 
            name: 'المسؤول', 
            email: username, 
            isAdmin: true,
            loginTime: new Date().toISOString()
        }));

        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        initAdmin();
    } else {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
});

function logout() {
    localStorage.removeItem('antika_token');
    localStorage.removeItem('antika_user');
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}
async function initAdmin() {
    await updateStats();
    await loadRecentProducts();
    await loadAdminProducts();
    await loadCategoriesTable();
    await loadBulkDiscountProducts();
    await populateCategorySelects();
    await loadSettings();
}

// Navigation
function showSection(sectionName) {
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });

    document.getElementById(sectionName + '-section').classList.remove('hidden');

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('text-antika-pink-dark', 'bg-antika-pink/10', 'font-semibold');
        item.classList.add('text-gray-700');
    });

    if (event && event.currentTarget) {
        event.currentTarget.classList.remove('text-gray-700');
        event.currentTarget.classList.add('text-antika-pink-dark', 'bg-antika-pink/10', 'font-semibold');
    }

    if (sectionName === 'products') loadAdminProducts();
    if (sectionName === 'categories') loadCategoriesTable();
    if (sectionName === 'bulk-discount') loadBulkDiscountProducts();
}

// Dashboard Stats
async function updateStats() {
    try {
        const products = await API.getProducts();
        document.getElementById('stat-products').textContent = products.length;
        document.getElementById('stat-discounted').textContent = products.filter(p => p.discountPrice).length;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function loadRecentProducts() {
    try {
        const products = await API.getProducts();
        const recent = products.slice(-5).reverse();
        const container = document.getElementById('recent-products-list');

        container.innerHTML = recent.map(p => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                    <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'}" class="w-12 h-12 rounded-lg object-cover">
                    <div>
                        <div class="font-bold text-gray-800">${p.name}</div>
                        <div class="text-sm text-gray-500">${p.price} ر.س</div>
                    </div>
                </div>
                <span class="text-xs ${p.stock < 5 ? 'text-red-500' : 'text-green-500'}">
                    مخزون: ${p.stock}
                </span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent products:', error);
    }
}

// Products Management
async function loadAdminProducts() {
    try {
        const products = await API.getProducts();
        // Check and update new product status
        await checkNewProductExpiry();
        
        const container = document.getElementById('admin-products-grid');
        const categories = await API.getCategories();

        container.innerHTML = products.map(product => {
            const category = categories.find(c => c.id === (product.categories ? product.categories[0] : product.category));
            const hasDiscount = product.discountPrice && product.discountPrice < product.price;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store';
            const isNew = product.isNew && new Date(product.newExpiryDate) > new Date();

            return `
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div class="relative aspect-square">
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    ${hasDiscount ? `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">-${Math.round(product.discountPercentage)}%</div>` : ''}
                    ${isNew ? `<div class="absolute top-2 right-2 bg-antika-pink text-white px-2 py-1 rounded text-xs font-bold">جديد</div>` : ''}
                    ${product.images && product.images.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs"><i class="fas fa-images"></i> ${product.images.length}</div>` : ''}
                </div>
                <div class="p-3">
                    <h4 class="font-bold text-gray-800 text-sm truncate mb-1">${product.name}</h4>
                    <p class="text-xs text-gray-500 mb-2">${category ? category.name : ''}</p>
                    <div class="mb-3">
                        ${hasDiscount ? `
                            <span class="text-gray-400 line-through text-xs">${product.price}</span>
                            <span class="text-antika-pink-dark font-bold text-sm mr-1">${product.discountPrice} ر.س</span>
                        ` : `
                            <span class="text-antika-gold font-bold text-sm">${product.price} ر.س</span>
                        `}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editProduct('${product.id}')" class="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-xs">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button onclick="deleteProduct('${product.id}')" class="flex-1 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-xs">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin products:', error);
    }
}

async function checkNewProductExpiry() {
    const products = await API.getProducts();
    let updated = false;
    const now = new Date();
    
    for (let product of products) {
        if (product.isNew && product.newExpiryDate) {
            if (new Date(product.newExpiryDate) < now) {
                product.isNew = false;
                await API.updateProduct(product.id, { isNew: false });
                updated = true;
            }
        }
    }
    return updated;
}

// Multiple Images Preview
function previewMultipleImages(input) {
    const container = document.getElementById('images-preview-container');
    const dataInput = document.getElementById('product-images-data');
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
    let images = JSON.parse(dataInput.value || '[]');
    images.splice(index, 1);
    dataInput.value = JSON.stringify(images);
    renderImagePreviews(images);
}

// Price Calculations
function calculateSalePrice() {
    const originalPrice = parseFloat(document.getElementById('product-original-price').value) || 0;
    // If no sale price set yet, default to original
    const salePriceInput = document.getElementById('product-sale-price');
    if (!salePriceInput.value) {
        salePriceInput.value = originalPrice;
    }
    calculateDiscount();
}

function calculateDiscount() {
    const originalPrice = parseFloat(document.getElementById('product-original-price').value) || 0;
    const salePrice = parseFloat(document.getElementById('product-sale-price').value) || 0;
    const display = document.getElementById('discount-display');
    
    if (originalPrice > 0 && salePrice > 0 && salePrice < originalPrice) {
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        display.textContent = `خصم ${discount}% (وفر ${originalPrice - salePrice} ر.س)`;
    } else {
        display.textContent = '';
    }
}

// Stock Display Toggle
function toggleStockText() {
    const select = document.getElementById('stock-display');
    const container = document.getElementById('stock-text-container');
    const textInput = document.getElementById('stock-text');
    
    if (select.value === 'text') {
        container.classList.remove('hidden');
        textInput.required = true;
    } else {
        container.classList.add('hidden');
        textInput.required = false;
    }
}

// New Product Date Toggle
function toggleNewProductDate() {
    const checkbox = document.getElementById('product-new');
    const dateContainer = document.getElementById('new-product-date');
    const dateInput = document.getElementById('new-expiry-date');
    
    if (checkbox.checked) {
        dateContainer.classList.remove('hidden');
        // Set date to 7 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        dateInput.value = expiryDate.toISOString().split('T')[0];
    } else {
        dateContainer.classList.add('hidden');
        dateInput.value = '';
    }
}

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');

    form.reset();
    document.getElementById('images-preview-container').innerHTML = '';
    document.getElementById('product-images-data').value = '[]';
    document.getElementById('stock-text-container').classList.add('hidden');
    document.getElementById('new-product-date').classList.add('hidden');
    document.getElementById('discount-display').textContent = '';

    // Reset all category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);

    currentEditingProduct = null;

    if (productId) {
        loadProductForEdit(productId);
    } else {
        title.textContent = 'إضافة منتج جديد';
    }

    modal.classList.remove('hidden');
}

async function loadProductForEdit(productId) {
    try {
        const product = await API.getProduct(productId);
        if (!product) return;

        currentEditingProduct = productId;
        document.getElementById('modal-title').textContent = 'تعديل منتج';
        document.getElementById('product-name').value = product.name;
        
        // Price fields
        document.getElementById('product-original-price').value = product.price;
        document.getElementById('product-sale-price').value = product.discountPrice || product.price;
        calculateDiscount();
        
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('stock-display').value = product.stockDisplay || 'number';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-featured').checked = product.isFeatured;

        // Stock text
        if (product.stockDisplay === 'text' && product.stockText) {
            document.getElementById('stock-text-container').classList.remove('hidden');
            document.getElementById('stock-text').value = product.stockText;
        }

        // Check the product's categories
        if (product.categories) {
            product.categories.forEach(catId => {
                const checkbox = document.querySelector(`.category-checkbox[value="${catId}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Images
        if (product.images && product.images.length > 0) {
            document.getElementById('product-images-data').value = JSON.stringify(product.images);
            renderImagePreviews(product.images);
        }

        // New product with expiry
        if (product.isNew) {
            document.getElementById('product-new').checked = true;
            document.getElementById('new-product-date').classList.remove('hidden');
            document.getElementById('new-expiry-date').value = product.newExpiryDate || '';
        }

    } catch (error) {
        console.error('Error loading product for edit:', error);
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

document.getElementById('product-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

    if (selectedCategories.length === 0) {
        alert('الرجاء اختيار تصنيف واحد على الأقل!');
        return;
    }

    const originalPrice = parseFloat(document.getElementById('product-original-price').value);
    const salePrice = parseFloat(document.getElementById('product-sale-price').value);
    
    const productData = {
        name: document.getElementById('product-name').value,
        price: originalPrice,
        categories: selectedCategories,
        stock: parseInt(document.getElementById('product-stock').value),
        stockDisplay: document.getElementById('stock-display').value,
        description: document.getElementById('product-description').value,
        isFeatured: document.getElementById('product-featured').checked,
        images: JSON.parse(document.getElementById('product-images-data').value || '[]')
    };

    // Stock text
    if (productData.stockDisplay === 'text') {
        productData.stockText = document.getElementById('stock-text').value || 'متوفر';
    }

    // Discount price
    if (salePrice < originalPrice) {
        productData.discountPrice = salePrice;
        productData.discountPercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
    }

    // New product with expiry date
    if (document.getElementById('product-new').checked) {
        productData.isNew = true;
        productData.newExpiryDate = document.getElementById('new-expiry-date').value;
    } else {
        productData.isNew = false;
        productData.newExpiryDate = null;
    }

    try {
        if (currentEditingProduct) {
            await API.updateProduct(currentEditingProduct, productData);
        } else {
            await API.addProduct(productData);
        }

        closeProductModal();
        await loadAdminProducts();
        await updateStats();
        await loadRecentProducts();
        showNotification('تم حفظ المنتج بنجاح! 🎉');
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
});

async function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
        await API.deleteProduct(id);
        await loadAdminProducts();
        await updateStats();
        showNotification('تم حذف المنتج بنجاح');
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('حدث خطأ أثناء الحذف', 'error');
    }
}

// Categories Management
async function loadCategoriesTable() {
    try {
        const categories = await API.getCategories();
        const tbody = document.getElementById('categories-table-body');

        tbody.innerHTML = categories.map(cat => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-6 py-4 text-2xl">${cat.icon}</td>
                <td class="px-6 py-4 font-semibold">${cat.name}</td>
                <td class="px-6 py-4">
                    ${cat.subcategories ? cat.subcategories.map(sub => 
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
    const title = modal.querySelector('h3');

    form.reset();
    currentEditingCategory = null;

    if (categoryId) {
        loadCategoryForEdit(categoryId);
    } else {
        title.textContent = 'إضافة تصنيف';
    }

    modal.classList.remove('hidden');
}

async function loadCategoryForEdit(categoryId) {
    try {
        const categories = await API.getCategories();
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        currentEditingCategory = categoryId;
        document.getElementById('category-icon').value = category.icon;
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-subcategories').value = category.subcategories ? category.subcategories.join(', ') : '';
    } catch (error) {
        console.error('Error loading category for edit:', error);
    }
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.add('hidden');
}

document.getElementById('category-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const categoryData = {
        icon: document.getElementById('category-icon').value,
        name: document.getElementById('category-name').value,
        subcategories: document.getElementById('category-subcategories').value.split(',').map(s => s.trim()).filter(s => s)
    };

    try {
        if (currentEditingCategory) {
            await API.updateCategory(currentEditingCategory, categoryData);
        } else {
            await API.addCategory(categoryData);
        }

        closeCategoryModal();
        await loadCategoriesTable();
        await populateCategorySelects();
        showNotification(currentEditingCategory ? 'تم تعديل التصنيف بنجاح!' : 'تمت إضافة التصنيف بنجاح! 🏷️');
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
});

async function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (!confirm('هل أنت متأكد؟ سيتم حذف جميع المنتجات المرتبطة بهذا التصنيف!')) return;

    try {
        await API.deleteCategory(id);
        await loadCategoriesTable();
        await populateCategorySelects();
        showNotification('تم حذف التصنيف بنجاح');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('حدث خطأ أثناء الحذف', 'error');
    }
}

// Bulk Discount
async function loadBulkDiscountProducts() {
    try {
        const products = await API.getProducts();
        const container = document.getElementById('bulk-products-list');

        container.innerHTML = products.map(p => `
            <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="${p.id}" class="product-checkbox w-5 h-5 text-antika-pink rounded accent-antika-pink">
                <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'}" class="w-12 h-12 rounded object-cover">
                <div class="flex-1">
                    <div class="font-semibold">${p.name}</div>
                    <div class="text-sm text-gray-500">${p.price} ر.س</div>
                </div>
            </label>
        `).join('');
    } catch (error) {
        console.error('Error loading bulk discount products:', error);
    }
}

async function applyBulkDiscount() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const productIds = Array.from(checkboxes).map(cb => cb.value);

    if (productIds.length === 0) {
        showNotification('الرجاء اختيار منتج واحد على الأقل!', 'error');
        return;
    }

    const discountType = document.getElementById('bulk-discount-type').value;
    const discountValue = parseFloat(document.getElementById('bulk-discount-value').value);
    const endDate = document.getElementById('bulk-discount-end').value;

    if (!discountValue || discountValue <= 0) {
        showNotification('الرجاء إدخال قيمة خصم صحيحة!', 'error');
        return;
    }

    try {
        await API.applyBulkDiscount(productIds, discountType, discountValue, endDate);
        showNotification(`تم تطبيق الخصم على ${productIds.length} منتج بنجاح! 🎉`);
        await loadBulkDiscountProducts();
        await loadAdminProducts();
    } catch (error) {
        console.error('Error applying bulk discount:', error);
        showNotification('حدث خطأ أثناء تطبيق الخصم', 'error');
    }
}

// Settings
async function loadSettings() {
    try {
        const settings = await API.getSettings();
        if (settings.hero) {
            document.getElementById('hero-title').value = settings.hero.title || '';
            document.getElementById('hero-subtitle').value = settings.hero.subtitle || '';
            document.getElementById('hero-color').value = settings.hero.color || '#FFB6C1';
        }
        if (settings.promo) {
            document.getElementById('promo-text').value = settings.promo.text || '';
            document.getElementById('promo-code').value = settings.promo.code || '';
            document.getElementById('promo-color').value = settings.promo.color || '#8B4513';
        }
        if (settings.footer) {
            document.getElementById('footer-phone').value = settings.footer.phone || '';
            document.getElementById('footer-email').value = settings.footer.email || '';
            document.getElementById('footer-instagram').value = settings.footer.instagram || '';
            document.getElementById('footer-whatsapp').value = settings.footer.whatsapp || '';
            document.getElementById('footer-snapchat').value = settings.footer.snapchat || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveBannerSettings() {
    const settings = {
        hero: {
            title: document.getElementById('hero-title').value,
            subtitle: document.getElementById('hero-subtitle').value,
            color: document.getElementById('hero-color').value
        }
    };

    try {
        await API.updateSettings(settings);
        showNotification('تم حفظ إعدادات البانر الرئيسي!');
    } catch (error) {
        console.error('Error saving banner settings:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
}

async function savePromoSettings() {
    const settings = {
        promo: {
            text: document.getElementById('promo-text').value,
            code: document.getElementById('promo-code').value,
            color: document.getElementById('promo-color').value
        }
    };

    try {
        await API.updateSettings(settings);
        showNotification('تم حفظ إعدادات بانر العروض!');
    } catch (error) {
        console.error('Error saving promo settings:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
}

async function saveFooterSettings() {
    const settings = {
        footer: {
            phone: document.getElementById('footer-phone').value,
            email: document.getElementById('footer-email').value,
            instagram: document.getElementById('footer-instagram').value,
            whatsapp: document.getElementById('footer-whatsapp').value,
            snapchat: document.getElementById('footer-snapchat').value
        }
    };

    try {
        await API.updateSettings(settings);
        showNotification('تم حفظ إعدادات الفوتر بنجاح!');
    } catch (error) {
        console.error('Error saving footer settings:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
}

// Notification
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