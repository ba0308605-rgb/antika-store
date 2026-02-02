// Antika Store Admin JavaScript - Enhanced with Footer Pages Editor

const AdminAPI = {
    login(username, password) {
        if (username === 'BDR-FIRST' && password === 'B1-a2d3e4r5') {
            const adminData = { name: 'Admin', email: username, isAdmin: true };
            localStorage.setItem('antika_token', 'admin-token-' + Date.now());
            localStorage.setItem('antika_user', JSON.stringify(adminData));
            return Promise.resolve({ token: 'admin-token', user: adminData });
        }
        return Promise.reject(new Error('Invalid credentials'));
    },
    async getProducts() { return API.getProducts(); },
    async addProduct(product) { return API.addProduct(product); },
    async updateProduct(id, updates) { return API.updateProduct(id, updates); },
    async deleteProduct(id) { return API.deleteProduct(id); },
    async getCategories() { return API.getCategories(); },
    async addCategory(category) { return API.addCategory(category); },
    async updateCategory(id, updates) { return API.updateCategory(id, updates); },
    async deleteCategory(id) { return API.deleteCategory(id); },
    async getSettings() { return API.getSettings(); },
    async updateSettings(settings) { return API.updateSettings(settings); },
    async getPages() { return API.getPages(); },
    async updatePage(pageId, pageData) { return API.updatePage(pageId, pageData); },
    async applyBulkDiscount(productIds, discountType, discountValue, endDate) {
        return API.applyBulkDiscount(productIds, discountType, discountValue, endDate);
    }
};

let currentEditingProduct = null;
let currentEditingCategory = null;
let currentEditingPage = null;

document.getElementById('login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
        await AdminAPI.login(document.getElementById('username').value, document.getElementById('password').value);
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        await initAdmin();
    } catch (error) {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
});

function logout() {
    localStorage.removeItem('antika_token');
    localStorage.removeItem('antika_user');
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
}

async function initAdmin() {
    await updateStats();
    await loadRecentProducts();
    await loadAdminProducts();
    await loadCategoriesTable();
    await loadBulkDiscountProducts();
    await populateCategorySelects();
    await loadSettings();
    await loadPagesSettings();
    await loadProductFeaturesSettings();
}

function showSection(sectionName) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionName + '-section').classList.remove('hidden');
    if (sectionName === 'products') loadAdminProducts();
    if (sectionName === 'categories') loadCategoriesTable();
    if (sectionName === 'bulk-discount') loadBulkDiscountProducts();
    if (sectionName === 'footer-pages') loadPagesSettings();
    if (sectionName === 'product-features') loadProductFeaturesSettings();
}

async function updateStats() {
    const products = await AdminAPI.getProducts();
    document.getElementById('stat-products').textContent = products.length;
    document.getElementById('stat-discounted').textContent = products.filter(p => p.discountPrice && p.discountPrice < p.price).length;
}

async function loadRecentProducts() {
    const products = await AdminAPI.getProducts();
    const recent = products.slice(-5).reverse();
    const container = document.getElementById('recent-products-list');
    if (!container) return;
    container.innerHTML = recent.length === 0 ? '<p class="text-gray-500 text-center py-4">لا توجد منتجات بعد</p>' :
        recent.map(p => `<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
                <img src="${p.images?.[0] || 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'}" class="w-12 h-12 rounded-lg object-cover">
                <div><div class="font-bold text-gray-800">${p.name}</div><div class="text-sm text-gray-500">${p.price} ر.س</div></div>
            </div>
            <span class="text-xs ${p.stock < 5 ? 'text-red-500' : 'text-green-500'}">مخزون: ${p.stock}</span>
        </div>`).join('');
}

async function loadAdminProducts() {
    const products = await AdminAPI.getProducts();
    const container = document.getElementById('admin-products-grid');
    const categories = await AdminAPI.getCategories();
    if (!container) return;
    if (products.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">لا توجد منتجات. أضف منتج جديد!</p>';
        return;
    }
    container.innerHTML = products.map(product => {
        const category = categories.find(c => c.id === (product.categories?.[0] || product.category));
        const hasDiscount = product.discountPrice && product.discountPrice < product.price;
        const imageUrl = product.images?.[0] || 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store';
        const isNewActive = (product.isNew || product.isNewProduct) && product.newExpiryDate && new Date(product.newExpiryDate) > new Date();
        return `<div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div class="relative aspect-square">
                <img src="${imageUrl}" class="w-full h-full object-cover">
                ${hasDiscount ? `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">-${Math.round(product.discountPercentage || ((product.price - product.discountPrice) / product.price * 100))}%</div>` : ''}
                ${isNewActive ? `<div class="absolute top-2 right-2 bg-antika-pink text-white px-2 py-1 rounded text-xs font-bold">جديد</div>` : ''}
                ${product.images?.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs"><i class="fas fa-images"></i> ${product.images.length}</div>` : ''}
            </div>
            <div class="p-3">
                <h4 class="font-bold text-gray-800 text-sm truncate mb-1">${product.name}</h4>
                <p class="text-xs text-gray-500 mb-2">${category?.name || 'بدون تصنيف'}</p>
                <div class="mb-3">${hasDiscount ? `<span class="text-gray-400 line-through text-xs">${product.price}</span><span class="text-antika-pink-dark font-bold text-sm mr-1">${product.discountPrice} ر.س</span>` : `<span class="text-antika-gold font-bold text-sm">${product.price} ر.س</span>`}</div>
                <div class="flex gap-2">
                    <button onclick="editProduct('${product.id}')" class="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-xs"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteProduct('${product.id}')" class="flex-1 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-xs"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function previewMultipleImages(input) {
    const dataInput = document.getElementById('product-images-data');
    let currentImages = JSON.parse(dataInput.value || '[]');
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => { currentImages.push(e.target.result); dataInput.value = JSON.stringify(currentImages); renderImagePreviews(currentImages); };
            reader.readAsDataURL(file);
        });
    }
}

function renderImagePreviews(images) {
    const container = document.getElementById('images-preview-container');
    if (container) container.innerHTML = images.map((img, idx) => `<div class="relative"><img src="${img}" class="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"><button type="button" onclick="removeImage(${idx})" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"><i class="fas fa-times"></i></button></div>`).join('');
}

function removeImage(index) {
    const dataInput = document.getElementById('product-images-data');
    let images = JSON.parse(dataInput.value || '[]');
    images.splice(index, 1);
    dataInput.value = JSON.stringify(images);
    renderImagePreviews(images);
}

function calculateSalePrice() {
    const originalPrice = parseFloat(document.getElementById('product-original-price').value) || 0;
    const salePriceInput = document.getElementById('product-sale-price');
    if (!salePriceInput.value) salePriceInput.value = originalPrice;
    calculateDiscount();
}

function calculateDiscount() {
    const originalPrice = parseFloat(document.getElementById('product-original-price').value) || 0;
    const salePrice = parseFloat(document.getElementById('product-sale-price').value) || 0;
    const display = document.getElementById('discount-display');
    if (originalPrice > 0 && salePrice > 0 && salePrice < originalPrice) {
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        display.textContent = `خصم ${discount}% (وفر ${originalPrice - salePrice} ر.س)`;
    } else display.textContent = '';
}

function toggleStockText() {
    const select = document.getElementById('stock-display');
    const container = document.getElementById('stock-text-container');
    if (select.value === 'text') { container.classList.remove('hidden'); document.getElementById('stock-text').required = true; }
    else { container.classList.add('hidden'); document.getElementById('stock-text').required = false; }
}

function toggleNewProductDate() {
    const checkbox = document.getElementById('product-new');
    const dateContainer = document.getElementById('new-product-date');
    if (checkbox.checked) {
        dateContainer.classList.remove('hidden');
        const expiryDate = new Date(); expiryDate.setDate(expiryDate.getDate() + 7);
        document.getElementById('new-expiry-date').value = expiryDate.toISOString().split('T')[0];
    } else dateContainer.classList.add('hidden');
}

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    document.getElementById('product-form').reset();
    document.getElementById('images-preview-container').innerHTML = '';
    document.getElementById('product-images-data').value = '[]';
    document.getElementById('stock-text-container').classList.add('hidden');
    document.getElementById('new-product-date').classList.add('hidden');
    document.getElementById('discount-display').textContent = '';
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    // ✅ إعادة تعيين مميزات المنتج
    const freeShippingEl = document.getElementById('feature-freeShipping');
    const easyReturnsEl = document.getElementById('feature-easyReturns');
    const qualityGuaranteeEl = document.getElementById('feature-qualityGuarantee');
    if (freeShippingEl) freeShippingEl.checked = false;
    if (easyReturnsEl) easyReturnsEl.checked = false;
    if (qualityGuaranteeEl) qualityGuaranteeEl.checked = false;
    currentEditingProduct = null;
    if (productId) loadProductForEdit(productId);
    else document.getElementById('modal-title').textContent = 'إضافة منتج جديد';
    modal.classList.remove('hidden');
}

async function loadProductForEdit(productId) {
    const products = await AdminAPI.getProducts();
    const product = products.find(p => p.id == productId);
    if (!product) return;
    currentEditingProduct = productId;
    document.getElementById('modal-title').textContent = 'تعديل منتج';
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-original-price').value = product.price;
    document.getElementById('product-sale-price').value = product.discountPrice || product.price;
    calculateDiscount();
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('stock-display').value = product.stockDisplay || 'number';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-featured').checked = product.isFeatured;
    if (product.stockDisplay === 'text' && product.stockText) {
        document.getElementById('stock-text-container').classList.remove('hidden');
        document.getElementById('stock-text').value = product.stockText;
    }
    const productCategories = product.categories || (product.category ? [product.category] : []);
    productCategories.forEach(catId => { const cb = document.querySelector(`.category-checkbox[value="${catId}"]`); if (cb) cb.checked = true; });
    if (product.images?.length > 0) { document.getElementById('product-images-data').value = JSON.stringify(product.images); renderImagePreviews(product.images); }
    const isNew = product.isNew || product.isNewProduct;
    const expiryDate = product.newExpiryDate || product.productExpiryDate;
    if (isNew && expiryDate && new Date(expiryDate) > new Date()) {
        document.getElementById('product-new').checked = true;
        document.getElementById('new-product-date').classList.remove('hidden');
        document.getElementById('new-expiry-date').value = expiryDate.split('T')[0];
    }
    // ✅ تحميل مميزات المنتج عند التعديل
    if (product.features) {
        const freeShippingEl = document.getElementById('feature-freeShipping');
        const easyReturnsEl = document.getElementById('feature-easyReturns');
        const qualityGuaranteeEl = document.getElementById('feature-qualityGuarantee');
        if (freeShippingEl) freeShippingEl.checked = product.features.freeShipping || false;
        if (easyReturnsEl) easyReturnsEl.checked = product.features.easyReturns || false;
        if (qualityGuaranteeEl) qualityGuaranteeEl.checked = product.features.qualityGuarantee || false;
    }
}

function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); }

document.getElementById('product-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);
    if (selectedCategories.length === 0) { alert('الرجاء اختيار تصنيف واحد على الأقل!'); return; }
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
        images: JSON.parse(document.getElementById('product-images-data').value || '[]'),
        rating: 5, reviews: 0, reviewsList: [],
        // ✅ مميزات المنتج - خاصة بكل منتج
        features: {
            freeShipping: document.getElementById('feature-freeShipping')?.checked || false,
            easyReturns: document.getElementById('feature-easyReturns')?.checked || false,
            qualityGuarantee: document.getElementById('feature-qualityGuarantee')?.checked || false
        }
    };
    if (productData.stockDisplay === 'text') productData.stockText = document.getElementById('stock-text').value || 'متوفر';
    if (salePrice < originalPrice) { productData.discountPrice = salePrice; productData.discountPercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100); }
    else { productData.discountPrice = null; productData.discountPercentage = null; }
    if (document.getElementById('product-new').checked) { productData.isNew = true; productData.newExpiryDate = document.getElementById('new-expiry-date').value; }
    else { productData.isNew = false; productData.newExpiryDate = null; }
    try {
        if (currentEditingProduct) await AdminAPI.updateProduct(currentEditingProduct, productData);
        else await AdminAPI.addProduct(productData);
        closeProductModal();
        await loadAdminProducts();
        await updateStats();
        await loadRecentProducts();
        showNotification('تم حفظ المنتج بنجاح!');
    } catch (error) { showNotification('حدث خطأ أثناء الحفظ', 'error'); }
});

async function editProduct(id) { openProductModal(id); }
async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try { await AdminAPI.deleteProduct(id); await loadAdminProducts(); await updateStats(); showNotification('تم حذف المنتج بنجاح'); }
    catch (error) { showNotification('حدث خطأ أثناء الحذف', 'error'); }
}

async function loadCategoriesTable() {
    const categories = await AdminAPI.getCategories();
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;
    if (categories.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">لا توجد تصنيفات</td></tr>'; return; }
    tbody.innerHTML = categories.map(cat => `<tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="px-6 py-4 text-2xl">${cat.icon || '🏷️'}</td>
        <td class="px-6 py-4 font-semibold">${cat.name}</td>
        <td class="px-6 py-4">${cat.subcategories?.length > 0 ? cat.subcategories.map(sub => `<span class="inline-block bg-gray-100 px-2 py-1 rounded text-sm ml-1">${sub}</span>`).join('') : '-'}</td>
        <td class="px-6 py-4">
            <button onclick="editCategory('${cat.id}')" class="text-blue-500 hover:text-blue-700 mr-3"><i class="fas fa-edit"></i></button>
            <button onclick="deleteCategory('${cat.id}')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
        </td>
    </tr>`).join('');
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    document.getElementById('category-form').reset();
    currentEditingCategory = null;
    if (categoryId) loadCategoryForEdit(categoryId);
    else { const title = modal.querySelector('h3'); if (title) title.textContent = 'إضافة تصنيف'; }
    modal.classList.remove('hidden');
}

async function loadCategoryForEdit(categoryId) {
    const categories = await AdminAPI.getCategories();
    const category = categories.find(c => c.id == categoryId);
    if (!category) return;
    currentEditingCategory = categoryId;
    const title = document.querySelector('#category-modal h3');
    if (title) title.textContent = 'تعديل تصنيف';
    document.getElementById('category-icon').value = category.icon || '';
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-subcategories').value = category.subcategories?.join(', ') || '';
}

function closeCategoryModal() { document.getElementById('category-modal')?.classList.add('hidden'); }

document.getElementById('category-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const categoryData = {
        icon: document.getElementById('category-icon').value || '🏷️',
        name: document.getElementById('category-name').value,
        subcategories: document.getElementById('category-subcategories').value.split(',').map(s => s.trim()).filter(s => s)
    };
    try {
        if (currentEditingCategory) await AdminAPI.updateCategory(currentEditingCategory, categoryData);
        else await AdminAPI.addCategory(categoryData);
        closeCategoryModal();
        await loadCategoriesTable();
        await populateCategorySelects();
        showNotification(currentEditingCategory ? 'تم تعديل التصنيف بنجاح!' : 'تمت إضافة التصنيف بنجاح!');
    } catch (error) { showNotification('حدث خطأ أثناء الحفظ', 'error'); }
});

async function editCategory(id) { openCategoryModal(id); }
async function deleteCategory(id) {
    if (!confirm('هل أنت متأكد؟ سيتم حذف جميع المنتجات المرتبطة بهذا التصنيف!')) return;
    try { await AdminAPI.deleteCategory(id); await loadCategoriesTable(); await populateCategorySelects(); showNotification('تم حذف التصنيف بنجاح'); }
    catch (error) { showNotification('حدث خطأ أثناء الحذف', 'error'); }
}

async function populateCategorySelects() {
    const categories = await AdminAPI.getCategories();
    const filterSelect = document.getElementById('product-category-filter');
    if (filterSelect) filterSelect.innerHTML = '<option value="">جميع التصنيفات</option>' + categories.map(cat => `<option value="${cat.id}">${cat.icon || '🏷️'} ${cat.name}</option>`).join('');
    const categoriesContainer = document.getElementById('product-categories');
    if (categoriesContainer) categoriesContainer.innerHTML = categories.map(cat => `<label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" value="${cat.id}" class="category-checkbox w-5 h-5 text-antika-pink rounded accent-antika-pink"><span class="text-2xl">${cat.icon || '🏷️'}</span><span class="text-gray-700">${cat.name}</span></label>`).join('');
}

async function loadBulkDiscountProducts() {
    const products = await AdminAPI.getProducts();
    const container = document.getElementById('bulk-products-list');
    if (!container) return;
    if (products.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-4">لا توجد منتجات</p>'; return; }
    container.innerHTML = products.map(p => `<label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><input type="checkbox" value="${p.id}" class="product-checkbox w-5 h-5 text-antika-pink rounded accent-antika-pink"><img src="${p.images?.[0] || 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store'}" class="w-12 h-12 rounded object-cover"><div class="flex-1"><div class="font-semibold">${p.name}</div><div class="text-sm text-gray-500">${p.price} ر.س</div></div></label>`).join('');
}

async function applyBulkDiscount() {
    const productIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
    if (productIds.length === 0) { showNotification('الرجاء اختيار منتج واحد على الأقل!', 'error'); return; }
    const discountType = document.getElementById('bulk-discount-type').value;
    const discountValue = parseFloat(document.getElementById('bulk-discount-value').value);
    if (!discountValue || discountValue <= 0) { showNotification('الرجاء إدخال قيمة خصم صحيحة!', 'error'); return; }
    try {
        await AdminAPI.applyBulkDiscount(productIds, discountType, discountValue, document.getElementById('bulk-discount-end').value);
        showNotification(`تم تطبيق الخصم على ${productIds.length} منتج بنجاح!`);
        await loadBulkDiscountProducts();
        await loadAdminProducts();
    } catch (error) { showNotification('حدث خطأ أثناء تطبيق الخصم', 'error'); }
}

async function loadSettings() {
    const settings = await AdminAPI.getSettings();
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
}

async function saveBannerSettings() {
    try { await AdminAPI.updateSettings({ hero: { title: document.getElementById('hero-title').value, subtitle: document.getElementById('hero-subtitle').value, color: document.getElementById('hero-color').value } }); showNotification('تم حفظ إعدادات البانر الرئيسي!'); }
    catch (error) { showNotification('حدث خطأ أثناء الحفظ', 'error'); }
}

async function savePromoSettings() {
    try { await AdminAPI.updateSettings({ promo: { text: document.getElementById('promo-text').value, code: document.getElementById('promo-code').value, color: document.getElementById('promo-color').value } }); showNotification('تم حفظ إعدادات بانر العروض!'); }
    catch (error) { showNotification('حدث خطأ أثناء الحفظ', 'error'); }
}

async function saveFooterSettings() {
    try { 
        // Get values and handle empty strings
        const phone = document.getElementById('footer-phone').value.trim();
        const email = document.getElementById('footer-email').value.trim();
        const instagram = document.getElementById('footer-instagram').value.trim();
        const whatsapp = document.getElementById('footer-whatsapp').value.trim();
        const snapchat = document.getElementById('footer-snapchat').value.trim();
        
        await AdminAPI.updateSettings({ 
            footer: { 
                phone: phone || '',
                email: email || '',
                instagram: instagram || '',
                whatsapp: whatsapp || '',
                snapchat: snapchat || ''
            } 
        }); 
        showNotification('تم حفظ إعدادات الفوتر بنجاح!'); 
    }
    catch (error) { showNotification('حدث خطأ أثناء الحفظ', 'error'); }
}

// Product Features Functions
async function loadProductFeaturesSettings() {
    const settings = await AdminAPI.getSettings();
    if (settings.productFeatures) {
        // Free Shipping
        if (settings.productFeatures.freeShipping) {
            document.getElementById('feature-shipping-enabled').checked = settings.productFeatures.freeShipping.enabled !== false;
            document.getElementById('feature-shipping-text').value = settings.productFeatures.freeShipping.text || 'شحن مجاني';
        }
        // Easy Returns
        if (settings.productFeatures.easyReturns) {
            document.getElementById('feature-returns-enabled').checked = settings.productFeatures.easyReturns.enabled !== false;
            document.getElementById('feature-returns-text').value = settings.productFeatures.easyReturns.text || 'إرجاع سهل';
        }
        // Quality Guarantee
        if (settings.productFeatures.qualityGuarantee) {
            document.getElementById('feature-quality-enabled').checked = settings.productFeatures.qualityGuarantee.enabled !== false;
            document.getElementById('feature-quality-text').value = settings.productFeatures.qualityGuarantee.text || 'ضمان جودة';
        }
    }
}

async function saveProductFeaturesSettings() {
    try {
        const productFeatures = {
            freeShipping: {
                enabled: document.getElementById('feature-shipping-enabled').checked,
                text: document.getElementById('feature-shipping-text').value.trim() || 'شحن مجاني',
                icon: 'fa-truck'
            },
            easyReturns: {
                enabled: document.getElementById('feature-returns-enabled').checked,
                text: document.getElementById('feature-returns-text').value.trim() || 'إرجاع سهل',
                icon: 'fa-undo'
            },
            qualityGuarantee: {
                enabled: document.getElementById('feature-quality-enabled').checked,
                text: document.getElementById('feature-quality-text').value.trim() || 'ضمان جودة',
                icon: 'fa-shield-alt'
            }
        };
        
        await AdminAPI.updateSettings({ productFeatures });
        showNotification('تم حفظ إعدادات ميزات المنتج بنجاح!');
    } catch (error) {
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
}

// Footer Pages Functions
async function loadPagesSettings() {
    const pages = await AdminAPI.getPages();
    
    // Load About page
    if (pages.about) {
        document.getElementById('page-about-title').value = pages.about.title || '';
        document.getElementById('page-about-content').value = stripHtml(pages.about.content) || '';
    }
    
    // Load Returns page
    if (pages.returns) {
        document.getElementById('page-returns-title').value = pages.returns.title || '';
        document.getElementById('page-returns-content').value = stripHtml(pages.returns.content) || '';
    }
    
    // Load Terms page
    if (pages.terms) {
        document.getElementById('page-terms-title').value = pages.terms.title || '';
        document.getElementById('page-terms-content').value = stripHtml(pages.terms.content) || '';
    }
    
    // Load FAQ page
    if (pages.faq) {
        document.getElementById('page-faq-title').value = pages.faq.title || '';
        document.getElementById('page-faq-content').value = stripHtml(pages.faq.content) || '';
    }
}

function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function formatContentToHtml(text) {
    if (!text) return '';
    // Convert newlines to <br> and paragraphs
    return text.split('\n\n').map(p => `<p class="mb-4">${p.replace(/\n/g, '<br>')}</p>`).join('');
}

async function savePageSettings(pageId) {
    try {
        const titleInput = document.getElementById(`page-${pageId}-title`);
        const contentInput = document.getElementById(`page-${pageId}-content`);
        
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim();
        const contentText = contentInput.value.trim();
        
        if (!title) {
            showNotification('الرجاء إدخال عنوان الصفحة', 'error');
            return;
        }
        
        // Convert plain text to HTML with formatting
        const content = formatContentToHtml(contentText);
        
        await AdminAPI.updatePage(pageId, { title, content });
        showNotification(`تم حفظ صفحة "${title}" بنجاح!`);
    } catch (error) {
        showNotification('حدث خطأ أثناء حفظ الصفحة', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce ${type === 'success' ? 'bg-antika-pink text-white' : 'bg-red-500 text-white'}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} ml-2"></i>${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('antika_token');
    const user = localStorage.getItem('antika_user');
    if (token && user) {
        const userData = JSON.parse(user);
        if (userData.isAdmin) {
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
            initAdmin();
        }
    }
});
