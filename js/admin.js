// 🌸 Antika Store Admin JavaScript - Fixed Version

let currentEditingProduct = null;
let currentEditingCategory = null;
const ADMIN_TOKEN_KEY = 'antika_admin_token';

// تجديد تلقائي للـ session كل 30 دقيقة
setInterval(async () => {
    try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) return;
        const session = await API.verifyAdminSession();
        if (!session?.ok) {
            console.warn('Session expired, redirecting to login');
            window.location.reload();
        }
    } catch(e) {}
}, 30 * 60 * 1000);
const ADMIN_USER_KEY = 'antika_admin_user';

function safeText(value) {
    const text = String(value ?? '');
    if (window.API && typeof API._fixMojibakeText === 'function') {
        return API._fixMojibakeText(text);
    }
    return text;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 🧹 Clear old localStorage products to avoid conflicts with server data
    localStorage.removeItem('antika_products');
    localStorage.removeItem('antika_categories');
    console.log('🧹 Cleared old localStorage data');
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
        showNotification('الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
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
        showNotification('تم تسجيل الدخول بنجاح!');
        await initAdmin();
        return;
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification('اسم المستخدم أو كلمة المرور غير صحيحة!', 'error');
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
    
    showNotification('تم تسجيل الخروج');
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
        if (typeof loadAnnouncingSettings === 'function') await loadAnnouncingSettings();
        await loadOrders(); // تحميل الطلبات
        await loadDashboard(); // تحميل الداشبورد الجديد
        console.log('✅ Admin panel initialized');
    } catch (error) {
        console.error('Error initializing admin:', error);
        showNotification('حدث خطأ أثناء تحميل لوحة التحكم', 'error');
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
    if (sectionName === 'orders') loadOrders();
}

// ============================================
// DASHBOARD - النسخة الجديدة
// ============================================

let salesChartInstance = null;

async function updateStats() {
    await loadDashboard();
}

async function loadRecentProducts() {
    // kept for compatibility - now handled by loadDashboard
}

async function refreshDashboard() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('fa-spin');
    await loadDashboard();
    setTimeout(() => { if (icon) icon.classList.remove('fa-spin'); }, 800);
}

async function loadDashboard() {
    try {
        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
        const el = document.getElementById('dashboard-greeting');
        if (el) el.textContent = `${greet} 👋 — ${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

        const [products, orders] = await Promise.all([
            API.getProducts(),
            API.getOrders ? API.getOrders() : []
        ]);

        // ---- إحصائيات ----
        const discounted = products.filter(p => p.discountPrice && p.discountPrice < p.price);
        const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const pendingOrders = orders.filter(o => ['pending','processing'].includes(o.status)).length;

        // عدد العملاء الفريدين
        const uniqueCustomers = new Set(orders.map(o => o.customerEmail).filter(Boolean)).size;

        _setEl('stat-revenue', revenue.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
        _setEl('stat-orders', orders.length);
        _setEl('stat-orders-sub', `${pendingOrders} قيد المعالجة`);
        _setEl('stat-products', products.length);
        _setEl('stat-discounted-sub', `${discounted.length} منتج مخفض`);
        _setEl('stat-customers', uniqueCustomers || '—');

        // ---- تنبيهات ذكية ----
        renderAlerts(products, orders);

        // ---- رسم بياني ----
        renderSalesChart(orders);

        // ---- أكثر المنتجات مبيعاً ----
        renderTopProducts(orders, products);

        // ---- آخر الطلبات ----
        renderRecentOrders(orders);

    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderAlerts(products, orders) {
    const container = document.getElementById('dashboard-alerts');
    if (!container) return;
    const alerts = [];

    // منتجات على وشك النفاد
    const lowStock = products.filter(p => p.stock !== undefined && p.stock <= 3 && p.stock >= 0);
    if (lowStock.length > 0) {
        alerts.push(`
            <div class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                <i class="fas fa-exclamation-triangle text-red-500"></i>
                <span class="text-red-700 font-medium">تنبيه مخزون:</span>
                <span class="text-red-600">${lowStock.length} منتج على وشك النفاد — ${lowStock.slice(0,3).map(p => safeText(p.name)).join('، ')}</span>
                <button onclick="showSection('products')" class="mr-auto text-red-500 hover:text-red-700 text-xs underline">عرض المنتجات</button>
            </div>
        `);
    }

    // طلبات جديدة بانتظار المعالجة
    const newOrders = orders.filter(o => o.status === 'pending').length;
    if (newOrders > 0) {
        alerts.push(`
            <div class="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <i class="fas fa-bell text-amber-500"></i>
                <span class="text-amber-700 font-medium">طلبات جديدة:</span>
                <span class="text-amber-600">${newOrders} طلب بانتظار المعالجة</span>
                <button onclick="showSection('orders')" class="mr-auto text-amber-600 hover:text-amber-800 text-xs underline">عرض الطلبات</button>
            </div>
        `);
    }

    container.innerHTML = alerts.join('');
}

function renderSalesChart(orders) {
    const canvas = document.getElementById('salesChart');
    const emptyEl = document.getElementById('chart-empty');
    if (!canvas) return;

    // آخر 7 أيام
    const days = [];
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
        labels.push(d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }));
    }

    const data = days.map(day => {
        return orders
            .filter(o => {
                const od = new Date(o.createdAt || o.date || 0).toISOString().split('T')[0];
                return od === day;
            })
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    });

    const hasData = data.some(v => v > 0);
    if (!hasData) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    canvas.style.display = '';
    if (emptyEl) emptyEl.classList.add('hidden');

    if (salesChartInstance) salesChartInstance.destroy();

    salesChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'المبيعات',
                data,
                fill: true,
                backgroundColor: 'rgba(214,193,166,0.15)',
                borderColor: '#D6C1A6',
                borderWidth: 2.5,
                pointBackgroundColor: '#D6C1A6',
                pointRadius: 4,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Tahoma' }, color: '#9ca3af' } },
                y: { grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Tahoma' }, color: '#9ca3af' }, beginAtZero: true }
            }
        }
    });
}

function renderTopProducts(orders, products) {
    const container = document.getElementById('top-products-list');
    if (!container) return;

    // احتساب أكثر المنتجات مبيعاً
    const salesMap = {};
    orders.forEach(order => {
        (order.items || []).forEach(item => {
            const id = String(item.productId || item.id || item.name || '');
            if (!id) return;
            salesMap[id] = (salesMap[id] || 0) + (Number(item.quantity) || 1);
        });
    });

    // دمج مع بيانات المنتجات
    const ranked = products
        .map(p => ({ ...p, sold: salesMap[String(p._id || p.id || p.name)] || 0 }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

    if (ranked.every(p => p.sold === 0)) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">لا توجد بيانات مبيعات بعد</p>';
        return;
    }

    const maxSold = Math.max(...ranked.map(p => p.sold), 1);

    container.innerHTML = ranked.map((p, i) => `
        <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-gray-300 w-4">${i + 1}</span>
            <img src="${p.images?.[0] || 'https://via.placeholder.com/40x40/D6C1A6/fff?text=A'}"
                 class="w-9 h-9 rounded-lg object-cover flex-shrink-0" onerror="this.src='https://via.placeholder.com/40x40/D6C1A6/fff?text=A'">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate">${safeText(p.name)}</p>
                <div class="h-1.5 bg-gray-100 rounded-full mt-1">
                    <div class="h-1.5 bg-antika-gold rounded-full" style="width:${Math.round((p.sold / maxSold) * 100)}%"></div>
                </div>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0">${p.sold > 0 ? p.sold + ' مبيع' : '—'}</span>
        </div>
    `).join('');
}

function renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders-list');
    if (!container) return;

    const recent = [...orders].reverse().slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center py-6">لا توجد طلبات بعد</p>';
        return;
    }

    const statusMap = {
        pending: ['قيد الانتظار', 'bg-amber-100 text-amber-700'],
        processing: ['قيد المعالجة', 'bg-blue-100 text-blue-700'],
        shipped: ['تم الشحن', 'bg-purple-100 text-purple-700'],
        out_for_delivery: ['جاري التوصيل', 'bg-orange-100 text-orange-700'],
        delivered: ['تم التوصيل', 'bg-green-100 text-green-700'],
        cancelled: ['ملغي', 'bg-red-100 text-red-700'],
    };

    container.innerHTML = `
        <table class="w-full text-sm">
            <thead>
                <tr class="text-gray-400 text-xs border-b">
                    <th class="text-right pb-3 font-medium">رقم الطلب</th>
                    <th class="text-right pb-3 font-medium">العميل</th>
                    <th class="text-right pb-3 font-medium hidden md:table-cell">التاريخ</th>
                    <th class="text-right pb-3 font-medium">المبلغ</th>
                    <th class="text-right pb-3 font-medium">الحالة</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
                ${recent.map(o => {
                    const [statusText, statusClass] = statusMap[o.status] || ['غير معروف', 'bg-gray-100 text-gray-500'];
                    const date = new Date(o.createdAt || o.date || Date.now()).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
                    const customer = o.customerName || o.customerEmail?.split('@')[0] || 'عميل';
                    const orderId = String(o.id || o._id || '').slice(-6) || '——';
                    return `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="py-3 font-mono text-gray-500 text-xs">#${orderId}</td>
                            <td class="py-3 text-gray-700 font-medium">${customer}</td>
                            <td class="py-3 text-gray-400 hidden md:table-cell">${date}</td>
                            <td class="py-3 text-antika-gold font-bold">${Number(o.total || 0).toLocaleString('ar-SA')} ر.س</td>
                            <td class="py-3"><span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// ORDERS MANAGEMENT - إدارة الطلبات
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
                    <p class="text-gray-500">لا توجد طلبات حالياً</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => {
            const orderId = order._id || order.id;
            const orderDate = order.date ? new Date(order.date).toLocaleString('ar-SA') : '-';
            return `
            <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-4">
                <div class="p-4 border-b border-gray-100 bg-gray-50">
                    <div class="flex justify-between items-center flex-wrap gap-2">
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-gray-800">طلب #${orderId}</span>
                            <span class="text-sm text-gray-500">${orderDate}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${getOrderStatusClass(order.status)}">
                            ${getOrderStatusText(order.status)}
                        </span>
                    </div>
                </div>
                <div class="p-4">
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h4 class="font-bold text-gray-700 mb-2">معلومات العميل</h4>
                            <p class="text-sm text-gray-600"><i class="fas fa-user ml-2 text-antika-gold"></i>${order.customerName}</p>
                            <p class="text-sm text-gray-600"><i class="fas fa-phone ml-2 text-antika-gold"></i>${order.customerPhone}</p>
                            <p class="text-sm text-gray-600"><i class="fas fa-envelope ml-2 text-antika-gold"></i>${safeText(order.customerEmail)}</p>
                            <p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt ml-2 text-antika-gold"></i>${safeText(order.customerAddress)}</p>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-700 mb-2">ملخص الطلب</h4>
                            <p class="text-sm text-gray-600">عدد المنتجات: ${order.items.length}</p>
                            <p class="text-sm text-gray-600">طريقة الدفع: ${order.paymentMethod}</p>
                            <p class="text-sm text-gray-600">المدينة: ${order.shippingCity || 'غير محددة'}</p>
                            <p class="text-sm text-gray-600">رسوم الشحن: ${Number(order.shippingCost || 0).toFixed(2)} ر.س</p>
                            <p class="text-sm text-gray-600">المدة المتوقعة: ${order.shippingEta || '-'}</p>
                            <p class="text-sm text-gray-600">تتبع OTO: ${order.otoTrackingNumber || '-'}</p>
                            <p class="text-sm text-gray-600">مرجع OTO: ${order.otoOrderId || '-'}</p>
                            <p class="font-bold text-antika-gold text-lg mt-2">الإجمالي: ${order.total} ر.س</p>
                        </div>
                    </div>
                    <div class="border-t border-gray-100 pt-4">
                        <h4 class="font-bold text-gray-700 mb-2">المنتجات</h4>
                        <div class="space-y-2">
                            ${order.items.map(item => `
                                <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover">
                                    <div class="flex-1">
                                        <p class="font-semibold text-sm">${item.name}</p>
                                        <p class="text-xs text-gray-500">${item.quantity} × ${item.price} ر.س</p>
                                    </div>
                                    <span class="font-bold text-antika-gold">${item.quantity * item.price} ر.س</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="border-t border-gray-100 pt-4 mt-4 grid grid-cols-2 md:grid-cols-6 gap-2">
                        <button onclick="updateOrderStatus('${orderId}', 'processing')" class="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-sm">
                            قيد التجهيز
                        </button>
                        <button onclick="updateOrderStatus('${orderId}', 'shipped')" class="flex-1 bg-yellow-100 text-yellow-600 py-2 rounded-lg hover:bg-yellow-200 transition text-sm">
                            تم الشحن
                        </button>
                        <button onclick="updateOrderStatus('${orderId}', 'out_for_delivery')" class="flex-1 bg-orange-100 text-orange-600 py-2 rounded-lg hover:bg-orange-200 transition text-sm">
                            خرج للتوصيل
                        </button>
                        <button onclick="updateOrderStatus('${orderId}', 'delivered')" class="flex-1 bg-green-100 text-green-600 py-2 rounded-lg hover:bg-green-200 transition text-sm">
                            تم التوصيل
                        </button>
                        <button onclick="createOtoShipment('${orderId}')" class="px-4 bg-indigo-100 text-indigo-700 py-2 rounded-lg hover:bg-indigo-200 transition text-sm">
                            شحنة OTO
                        </button>
                        <button onclick="deleteOrder('${orderId}')" class="px-4 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-sm">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
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
        'pending': 'بانتظار الدفع',
        'processing': 'قيد التجهيز',
        'shipped': 'تم الشحن',
        'out_for_delivery': 'خرج للتوصيل',
        'delivered': 'تم التوصيل',
        'cancelled': 'ملغي'
    };
    return texts[status] || status;
}

async function updateOrderStatus(orderId, status) {
    try {
        if (API.updateOrderStatus) {
            await API.updateOrderStatus(orderId, status);
            showNotification('تم تحديث حالة الطلب بنجاح!');
            await loadOrders();
            await updateStats();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('حدث خطأ أثناء تحديث حالة الطلب', 'error');
    }
}

async function createOtoShipment(orderId) {
    try {
        if (!confirm('إنشاء شحنة OTO لهذا الطلب؟')) return;
        const result = await API.createOtoShipment(orderId);
        showNotification(result?.message || 'تم إنشاء شحنة OTO بنجاح');
        await loadOrders();
    } catch (error) {
        console.error('Error creating OTO shipment:', error);
        showNotification(error.message || 'فشل إنشاء شحنة OTO', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    
    try {
        if (API.deleteOrder) {
            await API.deleteOrder(orderId);
            showNotification('تم حذف الطلب بنجاح');
            await loadOrders();
            await updateStats();
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('حدث خطأ أثناء حذف الطلب', 'error');
    }
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

let _allAdminProducts = [];
let _allAdminCategories = [];
let _activeQuickFilters = new Set();
let _selectedCategoryIds = new Set();

// ---- فلاتر سريعة ----
function toggleQuickFilter(key) {
    if (_activeQuickFilters.has(key)) {
        _activeQuickFilters.delete(key);
        document.getElementById('qf-' + key)?.classList.remove('border-antika-pink', 'bg-antika-pink/10', 'text-antika-pink-dark');
    } else {
        _activeQuickFilters.add(key);
        document.getElementById('qf-' + key)?.classList.add('border-antika-pink', 'bg-antika-pink/10', 'text-antika-pink-dark');
    }
    renderAdminProducts();
}

function clearAllFilters() {
    _activeQuickFilters.clear();
    _selectedCategoryIds.clear();
    document.querySelectorAll('.quick-filter-btn').forEach(b => {
        b.classList.remove('border-antika-pink', 'bg-antika-pink/10', 'text-antika-pink-dark');
    });
    document.querySelectorAll('.cat-cb').forEach(cb => cb.checked = false);
    document.getElementById('cat-filter-label').textContent = 'جميع التصنيفات';
    document.getElementById('product-search').value = '';
    renderAdminProducts();
}

function toggleCategoryDropdown() {
    const dd = document.getElementById('cat-filter-dropdown');
    dd.classList.toggle('hidden');
}

function toggleCatFilter(catId, catName) {
    if (_selectedCategoryIds.has(catId)) {
        _selectedCategoryIds.delete(catId);
    } else {
        _selectedCategoryIds.add(catId);
    }
    const count = _selectedCategoryIds.size;
    const label = document.getElementById('cat-filter-label');
    if (label) label.textContent = count === 0 ? 'جميع التصنيفات' : count + ' تصنيف محدد';
    renderAdminProducts();
}

function buildCategoryDropdown(categories) {
    const container = document.getElementById('cat-filter-dropdown');
    if (!container) return;
    const mainCats = categories.filter(c => !c.parentId);
    const subCats  = categories.filter(c =>  c.parentId);
    let html = '';
    mainCats.forEach(main => {
        const children = subCats.filter(s => s.parentId === main.id);
        if (children.length > 0) {
            html += `<p class="w-full text-xs font-bold text-gray-400 mt-2 mb-1">${safeText(main.name)}</p>`;
            children.forEach(sub => {
                html += `<label class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-gray-200 text-sm cursor-pointer hover:border-antika-pink transition">
                    <input type="checkbox" class="cat-cb" value="${sub.id}" onchange="toggleCatFilter('${sub.id}', '${safeText(sub.name)}')">
                    ${safeText(sub.name)}
                </label>`;
            });
        } else {
            html += `<label class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-gray-200 text-sm cursor-pointer hover:border-antika-pink transition">
                <input type="checkbox" class="cat-cb" value="${main.id}" onchange="toggleCatFilter('${main.id}', '${safeText(main.name)}')">
                ${safeText(main.name)}
            </label>`;
        }
    });
    container.innerHTML = html;
}

async function loadAdminProducts() {
    try {
        const [products, categories] = await Promise.all([API.getProducts(), API.getCategories()]);
        _allAdminProducts = products;
        _allAdminCategories = categories;

        buildCategoryDropdown(categories);

        // ربط البحث
        const searchEl = document.getElementById('product-search');
        if (searchEl && !searchEl._bound) {
            searchEl._bound = true;
            searchEl.addEventListener('input', renderAdminProducts);
        }

        // إغلاق الـ dropdown عند الضغط خارجه
        document.addEventListener('click', function(e) {
            const dd = document.getElementById('cat-filter-dropdown');
            if (dd && !dd.classList.contains('hidden') && !e.target.closest('#cat-filter-dropdown') && !e.target.closest('[onclick="toggleCategoryDropdown()"]')) {
                dd.classList.add('hidden');
            }
        }, { once: false });

        renderAdminProducts();
    } catch (error) {
        console.error('Error loading admin products:', error);
        showNotification('حدث خطأ أثناء تحميل المنتجات', 'error');
    }
}

function renderAdminProducts() {
    const container = document.getElementById('admin-products-grid');
    if (!container) return;

    const searchVal = (document.getElementById('product-search')?.value || '').trim().toLowerCase();
    const products = _allAdminProducts;
    const categories = _allAdminCategories;
    let filtered = products;

    // تصفية بالتصنيفات المحددة
    if (_selectedCategoryIds.size > 0) {
        filtered = filtered.filter(product => {
            const productCategories = product.categories || (product.category ? [product.category] : []);
            return productCategories.some(cid => _selectedCategoryIds.has(String(cid)));
        });
    }

    // فلاتر سريعة
    if (_activeQuickFilters.has('new')) {
        filtered = filtered.filter(p => p.isNew && p.newExpiryDate && new Date(p.newExpiryDate) > new Date());
    }
    if (_activeQuickFilters.has('discount')) {
        filtered = filtered.filter(p => p.discountPrice && p.discountPrice < p.price);
    }
    if (_activeQuickFilters.has('freeShip')) {
        filtered = filtered.filter(p => p.freeShipping === true);
    }
    if (_activeQuickFilters.has('lowStock')) {
        filtered = filtered.filter(p => p.stock !== undefined && p.stock <= 3);
    }

    // بحث نصي
    if (searchVal) {
        filtered = filtered.filter(p =>
            safeText(p.name).toLowerCase().includes(searchVal) ||
            String(p.price || '').includes(searchVal)
        );
    }

    // عداد
    const countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = filtered.length < products.length ? `${filtered.length} من أصل ${products.length} منتج` : `${products.length} منتج`;

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">لا توجد منتجات مطابقة</p>';
        return;
    }

    container.innerHTML = filtered.map(product => {
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
                    ${isNew ? `<div class="absolute top-2 right-2 bg-antika-pink text-white px-2 py-1 rounded text-xs font-bold">جديد</div>` : ''}
                    ${product.images && product.images.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs"><i class="fas fa-images"></i> ${product.images.length}</div>` : ''}
                </div>
                <div class="p-3">
                    <h4 class="font-bold text-gray-800 text-sm truncate mb-1">${safeText(product.name)}</h4>
                    <p class="text-xs text-gray-500 mb-2">${category ? safeText(category.name) : ''}</p>
                    <div class="mb-3">
                        ${hasDiscount ? `
                            <span class="text-gray-400 line-through text-xs">${product.price}</span>
                            <span class="text-antika-pink-dark font-bold text-sm mr-1">${product.discountPrice} ر.س</span>
                        ` : `
                            <span class="text-antika-gold font-bold text-sm">${product.price} ر.س</span>
                        `}
                    </div>
                    <div class="flex gap-2 mb-2">
                        <button onclick='editProduct(${JSON.stringify(productId)})' class="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-xs">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button onclick='deleteProduct(${JSON.stringify(productId)})' class="flex-1 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-xs">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                    <button onclick='openProductReviews(${JSON.stringify(productId)}, ${JSON.stringify(product.name)})' class="w-full bg-amber-50 text-amber-700 py-2 rounded-lg hover:bg-amber-100 transition text-xs font-bold border border-amber-200">
                        <i class="fas fa-comments ml-1"></i> التعليقات
                    </button>
                </div>
            </div>
            `;
        }).join('');
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

    // امسح المسودة عند فتح منتج جديد
    if (!productId) localStorage.removeItem('antika_product_draft');

    if (productId) {
        if (title) title.textContent = 'تعديل منتج';
        modal.classList.remove('hidden');
        // انتظر تحميل التصنيفات أولاً ثم حمّل بيانات المنتج
        populateCategorySelects().then(() => loadProductForEdit(productId));
    } else {
        if (title) title.textContent = 'إضافة منتج جديد';
        modal.classList.remove('hidden');
        populateCategorySelects();
    }
}

async function loadProductForEdit(productId) {
    try {
        console.log('Loading product for edit:', productId);
        const product = await API.getProduct(productId);
        if (!product) {
            console.error('Product not found:', productId);
            showNotification('المنتج غير موجود (ID: ' + productId + ')', 'error');
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
        
        console.log('📝 Loading product data:', product);
        if (nameInput) nameInput.value = product.name || '';
        if (skuInput) {
            skuInput.value = product.sku || '';
            console.log('📝 SKU loaded:', product.sku, 'Input value:', skuInput.value);
        }
        if (originalPriceInput) originalPriceInput.value = product.price || '';
        if (salePriceInput) salePriceInput.value = product.discountPrice || product.price || '';
        if (stockInput) stockInput.value = product.stock || 0;
        if (stockDisplayInput) stockDisplayInput.value = product.stockDisplay || 'number';
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (newInput) newInput.checked = product.isNew || false;
        if (freeShippingInput) {
            freeShippingInput.checked = product.freeShipping !== false;
            console.log('📝 Free Shipping loaded:', product.freeShipping, 'Input checked:', freeShippingInput.checked);
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

        // 🌟 Custom Product Features
        console.log('📝 Product customFeatures from DB:', product.customFeatures);
        loadCustomFeatures(product.customFeatures || []);

    } catch (error) {
        console.error('Error loading product for edit:', error);
        showNotification('حدث خطأ أثناء تحميل بيانات المنتج', 'error');
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden');
}

// Image preview functions
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function previewMultipleImages(input) {
    const container = document.getElementById('images-preview-container');
    const dataInput = document.getElementById('product-images-data');
    
    if (!container || !dataInput) return;
    
    let currentImages = JSON.parse(dataInput.value || '[]');
    
    if (input.files && input.files.length > 0) {
        const isMobile = window.innerWidth < 768;
        const maxWidth = isMobile ? 1200 : 1600;
        const quality = isMobile ? 0.75 : 0.85;

        for (const file of Array.from(input.files)) {
            try {
                const compressed = await compressImage(file, maxWidth, quality);
                currentImages.push(compressed);
                dataInput.value = JSON.stringify(currentImages);
                renderImagePreviews(currentImages);
            } catch(e) {
                console.error('Error compressing image:', e);
            }
        }
    }
}

function renderImagePreviews(images) {
    const container = document.getElementById('images-preview-container');
    if (!container) return;

    container.innerHTML = images.map((img, idx) => `
        <div class="relative image-drag-item" 
             draggable="true" 
             data-idx="${idx}"
             style="cursor:grab; transition: transform 0.2s, opacity 0.2s;">
            <img src="${img}" class="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 pointer-events-none">
            <button type="button" onclick="removeImage(${idx})" 
                    class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                    style="cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
            <div class="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-center rounded-b-lg" 
                 style="font-size:10px; padding:2px;">
                ${idx === 0 ? 'رئيسية' : idx + 1}
            </div>
        </div>
    `).join('');

    // تفعيل Drag & Drop
    initImageDragDrop(container);
}

function initImageDragDrop(container) {
    const items = container.querySelectorAll('.image-drag-item');
    let dragSrc = null;

    items.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            dragSrc = this;
            this.style.opacity = '0.4';
            this.style.transform = 'scale(0.95)';
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            items.forEach(i => i.style.border = '');
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (this !== dragSrc) {
                this.style.border = '2px dashed #D6C1A6';
                this.style.transform = 'scale(1.05)';
            }
        });

        item.addEventListener('dragleave', function() {
            this.style.border = '';
            this.style.transform = 'scale(1)';
        });

        item.addEventListener('drop', function(e) {
            e.preventDefault();
            if (this === dragSrc) return;

            this.style.border = '';
            this.style.transform = 'scale(1)';

            const fromIdx = parseInt(dragSrc.dataset.idx);
            const toIdx = parseInt(this.dataset.idx);

            const dataInput = document.getElementById('product-images-data');
            if (!dataInput) return;

            let imgs = JSON.parse(dataInput.value || '[]');
            const moved = imgs.splice(fromIdx, 1)[0];
            imgs.splice(toIdx, 0, moved);

            dataInput.value = JSON.stringify(imgs);
            renderImagePreviews(imgs);
        });
    });
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
        display.textContent = `خصم ${discount}% (وفر ${originalPrice - salePrice} ر.س)`;
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
// 🌟 CUSTOM FEATURES MANAGEMENT
// ============================================

function addCustomFeature(value = '') {
    const container = document.getElementById('custom-features-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'custom-feature-row flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" value="${value}" placeholder="مثال: جودة عالية ومتانة" 
            class="custom-feature-input flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none text-sm"
            dir="auto" inputmode="text">
        <button type="button" onclick="this.closest('.custom-feature-row').remove()" class="text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Smart Paste — توزيع الأسطر على مربعات
    const input = div.querySelector('.custom-feature-input');
    input.addEventListener('paste', function(e) {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const lines = text.split(/\n/).map(l => l.replace(/^[\s•\-\*\.\d]+/, '').trim()).filter(Boolean);
        if (lines.length > 1) {
            e.preventDefault();
            lines.forEach((line, i) => {
                if (i === 0) {
                    this.value = line;
                } else {
                    addCustomFeature(line);
                }
            });
        }
    });
    container.appendChild(div);
}

function getCustomFeatures() {
    const inputs = document.querySelectorAll('.custom-feature-input');
    console.log('🔍 Found custom feature inputs:', inputs.length);
    const features = [];
    inputs.forEach((input, index) => {
        const value = input.value.trim();
        console.log(`  Input ${index}:`, value);
        if (value) features.push(value);
    });
    console.log('✅ Collected features:', features);
    return features;
}

function loadCustomFeatures(features) {
    console.log('📥 Loading custom features:', features);
    const container = document.getElementById('custom-features-container');
    if (!container) {
        console.error('❌ Custom features container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (features && features.length > 0) {
        console.log('✅ Loading existing features:', features);
        features.forEach(feature => addCustomFeature(feature));
    } else {
        // Add default empty rows
        console.log('ℹ️ No features found, adding defaults');
        addCustomFeature('جودة عالية ومتانة');
        addCustomFeature('تصميم أنيق وعصري');
        addCustomFeature('مناسب للاستخدام اليومي');
        addCustomFeature('ضمان شامل');
    }
}

// Product form submission
document.getElementById('product-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

    if (selectedCategories.length === 0) {
        showNotification('الرجاء اختيار تصنيف واحد على الأقل!', 'error');
        return;
    }

    const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || 0;
    const salePrice = parseFloat(document.getElementById('product-sale-price')?.value) || 0;
    
    const skuValue = document.getElementById('product-sku')?.value || '';
    const freeShippingValue = document.getElementById('product-free-shipping')?.checked || false;
    console.log('🔍 SKU:', skuValue);
    console.log('🔍 Free Shipping:', freeShippingValue);
    
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
    console.log('📦 Product Data to save:', productData);

    // Stock text
    if (productData.stockDisplay === 'text') {
        productData.stockText = document.getElementById('stock-text')?.value || 'متوفر';
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

    // 🌟 Custom Product Features
    const customFeatures = getCustomFeatures();
    productData.customFeatures = customFeatures;

    try {
        if (currentEditingProduct) {
            await API.updateProduct(currentEditingProduct, productData);
            hideWaitToast(); showNotification('تم تحديث المنتج بنجاح! 🎉');
        } else {
            await API.addProduct(productData);
            hideWaitToast(); showNotification('تم إضافة المنتج بنجاح! 🎉');
        }

        closeProductModal();
        await loadAdminProducts();
        await updateStats();
        await loadRecentProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        hideWaitToast();
        const errMsg = error?.message || 'حدث خطأ أثناء حفظ المنتج';
        showNotification(errMsg, 'error');
    }
});

async function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    console.log('🗑️ deleteProduct called with ID:', id, '| Type:', typeof id);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.error('❌ Invalid product ID:', id);
        showNotification('معرف المنتج غير صالح', 'error');
        return;
    }
    
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
        console.log('📤 Calling API.deleteProduct with ID:', id);
        const result = await API.deleteProduct(id);
        console.log('✅ Delete API result:', result);
        await loadAdminProducts();
        await updateStats();
        showNotification('تم حذف المنتج بنجاح');
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        console.error('Error details:', error.message, error.stack);
        showNotification('حدث خطأ أثناء حذف المنتج: ' + error.message, 'error');
    }
}

// 🧹 DELETE ALL PRODUCTS
async function deleteAllProducts() {
    if (!confirm('⚠️ تحذير!\n\nهل أنت متأكد من حذف جميع المنتجات؟\n\nهذا الإجراء لا يمكن التراجع عنه!')) return;
    
    if (!confirm('تأكيد نهائي:\n\nسيتم حذف جميع المنتجات نهائياً.\nهل تريد المتابعة؟')) return;

    try {
        console.log('🗑️ Deleting all products...');
        const result = await API.deleteAllProducts();
        console.log('✅ All products deleted:', result);
        
        // Clear localStorage backup
        localStorage.removeItem('products_backup');
        localStorage.removeItem('antika_products');
        
        await loadAdminProducts();
        await updateStats();
        showNotification(`تم حذف ${result.count || 'جميع'} المنتجات بنجاح`);
    } catch (error) {
        console.error('❌ Error deleting all products:', error);
        showNotification('حدث خطأ أثناء حذف المنتجات: ' + error.message, 'error');
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
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">لا توجد تصنيفات</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(cat => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-6 py-4 text-2xl">${cat.icon || '📦'}</td>
                <td class="px-6 py-4 font-semibold">${safeText(cat.name)}</td>
                <td class="px-6 py-4">
                    ${cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories.map(sub => 
                        `<span class="inline-block bg-gray-100 px-2 py-1 rounded text-sm ml-1">${safeText(sub)}</span>`
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
        if (title) title.textContent = 'تعديل تصنيف';
    } else {
        if (title) title.textContent = 'إضافة تصنيف';
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

// category-form submit handled in admin.html

// editCategory handled in admin.html

async function deleteCategory(id) {
    if (!confirm('هل أنت متأكد؟ سيتم حذف جميع المنتجات المرتبطة بهذا التصنيف!')) return;

    try {
        await API.deleteCategory(id);
        await loadCategoriesTable();
        await populateCategorySelects();
        showNotification('تم حذف التصنيف بنجاح');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('حدث خطأ أثناء حذف التصنيف', 'error');
    }
}

// Populate category selects in product modal
async function populateCategorySelects() {
    try {
        const categories = await API.getCategories();
        
        // Product categories container — hierarchical
        const container = document.getElementById('product-categories');
        if (container) {
            const mainCats = categories.filter(c => !c.parentId);
            const subCats  = categories.filter(c =>  c.parentId);

            if (mainCats.length === 0) {
                container.innerHTML = categories.map(cat => `
                    <label class="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-2 rounded">
                        <input type="checkbox" value="${cat.id}" class="category-checkbox w-4 h-4 accent-antika-pink rounded">
                        <span>${cat.icon || '📦'} ${safeText(cat.name)}</span>
                    </label>
                `).join('');
            } else {
                container.innerHTML = mainCats.map(main => {
                    const children = subCats.filter(s => s.parentId === main.id);
                    return '<div class="mb-2">'
                        + '<div class="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide py-1 px-1 select-none">'
                        + '<span>' + (main.icon && (main.icon.startsWith('http') || main.icon.startsWith('data:')) ? '<img src="' + main.icon + '" style="width:20px;height:20px;object-fit:contain;display:inline">' : (main.icon || '📦')) + '</span>'
                        + '<span>' + safeText(main.name) + '</span>'
                        + '</div>'
                        + (children.length > 0
                            ? children.map(sub =>
                                '<label class="flex items-center gap-2 py-1 pr-4 cursor-pointer hover:bg-gray-50 rounded">'
                                + '<input type="checkbox" value="' + sub.id + '" class="category-checkbox w-4 h-4 accent-pink-400 rounded">'
                                + '<span class="text-sm">' + (sub.icon && (sub.icon.startsWith('http') || sub.icon.startsWith('data:')) ? '<img src="' + sub.icon + '" style="width:18px;height:18px;object-fit:contain;display:inline">' : (sub.icon || '')) + ' ' + safeText(sub.name) + '</span>'
                                + '</label>'
                              ).join('')
                            : '<label class="flex items-center gap-2 py-1 pr-4 cursor-pointer hover:bg-gray-50 rounded">'
                              + '<input type="checkbox" value="' + main.id + '" class="category-checkbox w-4 h-4 accent-pink-400 rounded">'
                              + '<span class="text-sm">' + safeText(main.name) + '</span>'
                              + '</label>'
                          )
                        + '</div>';
                }).join('');
            }
        }
        
        // Category filter dropdown
        const filter = document.getElementById('product-category-filter');
        if (filter) {
            const currentValue = filter.value;
            const mainCats = categories.filter(c => !c.parentId);
            const subCats  = categories.filter(c =>  c.parentId);
            let options = '<option value="">جميع التصنيفات</option>';
            if (mainCats.length > 0) {
                mainCats.forEach(main => {
                    const children = subCats.filter(s => s.parentId === main.id);
                    options += '<option value="' + main.id + '" disabled style="font-weight:bold;color:#888;">— ' + safeText(main.name) + '</option>';
                    if (children.length > 0) {
                        children.forEach(sub => {
                            options += '<option value="' + sub.id + '">　' + safeText(sub.name) + '</option>';
                        });
                    } else {
                        options += '<option value="' + main.id + '_sel">　' + safeText(main.name) + '</option>';
                    }
                });
            } else {
                options += categories.map(cat => '<option value="' + cat.id + '">' + safeText(cat.name) + '</option>').join('');
            }
            filter.innerHTML = options;
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
            container.innerHTML = '<p class="text-gray-500 text-center py-4">لا توجد منتجات</p>';
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
                    <div class="text-sm text-gray-500">${p.price} ر.س</div>
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
        showNotification('الرجاء اختيار منتج واحد على الأقل!', 'error');
        return;
    }

    const discountType = document.getElementById('bulk-discount-type')?.value || 'percentage';
    const discountValue = parseFloat(document.getElementById('bulk-discount-value')?.value) || 0;
    const endDate = document.getElementById('bulk-discount-end')?.value || null;

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
            const footerTiktok = document.getElementById('footer-tiktok');
            const footerTwitter = document.getElementById('footer-twitter');

            if (footerPhone) footerPhone.value = settings.footer.phone || '';
            if (footerEmail) footerEmail.value = settings.footer.email || '';
            if (footerInstagram) footerInstagram.value = settings.footer.instagram || '';
            if (footerWhatsapp) footerWhatsapp.value = settings.footer.whatsapp || '';
            if (footerSnapchat) footerSnapchat.value = settings.footer.snapchat || '';
            if (footerTiktok) footerTiktok.value = settings.footer.tiktok || '';
            if (footerTwitter) footerTwitter.value = settings.footer.twitter || '';
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
        showNotification('تم حفظ إعدادات البانر الرئيسي!');
    } catch (error) {
        console.error('Error saving banner settings:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
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
        showNotification('تم حفظ إعدادات بانر العروض!');
    } catch (error) {
        console.error('Error saving promo settings:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
}

async function saveFooterSettings() {
    const settings = {
        footer: {
            phone: document.getElementById('footer-phone')?.value || '',
            email: document.getElementById('footer-email')?.value || '',
            instagram: document.getElementById('footer-instagram')?.value || '',
            whatsapp: document.getElementById('footer-whatsapp')?.value || '',
            snapchat: document.getElementById('footer-snapchat')?.value || '',
            tiktok: document.getElementById('footer-tiktok')?.value || '',
            twitter: document.getElementById('footer-twitter')?.value || ''
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

// ============================================
// FOOTER PAGES
// ============================================

async function loadFooterPagesSettings() {
    try {
        const pages = await API.getFooterPages();

        function setContent(el, value) {
            if (!el) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value || '';
            else el.innerHTML = value || '';
        }

        if (pages.about) {
            setContent(document.getElementById('page-about-title'), pages.about.title);
            setContent(document.getElementById('page-about-content'), pages.about.content);
        }
        if (pages.returns) {
            setContent(document.getElementById('page-returns-title'), pages.returns.title);
            setContent(document.getElementById('page-returns-content'), pages.returns.content);
        }
        if (pages.terms) {
            setContent(document.getElementById('page-terms-title'), pages.terms.title);
            setContent(document.getElementById('page-terms-content'), pages.terms.content);
        }
        if (pages.faq) {
            setContent(document.getElementById('page-faq-title'), pages.faq.title);
            setContent(document.getElementById('page-faq-content'), pages.faq.content);
        }
        if (pages.shipping) {
            setContent(document.getElementById('page-shipping-title'), pages.shipping.title);
            setContent(document.getElementById('page-shipping-content'), pages.shipping.content);
        }
        if (pages.cancellation) {
            setContent(document.getElementById('page-cancellation-title'), pages.cancellation.title);
            setContent(document.getElementById('page-cancellation-content'), pages.cancellation.content);
        }
        if (pages.privacy) {
            setContent(document.getElementById('page-privacy-title'), pages.privacy.title);
            setContent(document.getElementById('page-privacy-content'), pages.privacy.content);
        }
    } catch (error) {
        console.error('Error loading footer pages settings:', error);
    }
}

async function savePageSettings(pageId) {
    const titleInput = document.getElementById(`page-${pageId}-title`);
    const contentInput = document.getElementById(`page-${pageId}-content`);

    if (!titleInput || !contentInput) {
        showNotification('خطأ: لم يتم العثور على حقول الإدخال', 'error');
        return;
    }

    // contenteditable div يستخدم innerHTML، textarea يستخدم value
    const pageData = {
        title: titleInput.value.trim(),
        content: (contentInput.tagName === 'TEXTAREA' ? contentInput.value : contentInput.innerHTML).trim()
    };

    if (!pageData.title) {
        showNotification('الرجاء إدخال عنوان الصفحة', 'error');
        return;
    }

    try {
        await API.updateFooterPage(pageId, pageData);
        showNotification(`تم حفظ صفحة "${pageData.title}" بنجاح! 💾`);
    } catch (error) {
        console.error('Error saving page settings:', error);
        showNotification('حدث خطأ أثناء الحفظ', 'error');
    }
}

// ============================================
// ANNOUNCING BAR
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
// 🎨 ADVANCED VARIANTS SYSTEM
// ============================================

// ============================================
// RELATED PRODUCTS (من نفس الموديل)
// ============================================

function toggleRelatedSection() {
    const cb = document.getElementById('product-has-related');
    const section = document.getElementById('related-section');
    if (cb && section) section.classList.toggle('hidden', !cb.checked);
}

let _relatedSelectedIds = [];

function searchRelatedProducts(query) {
    const resultsEl = document.getElementById('related-search-results');
    if (!resultsEl) return;

    if (!query || query.length < 2) {
        resultsEl.classList.add('hidden');
        return;
    }

    const q = query.toLowerCase();
    const matches = _allAdminProducts
        .filter(p => {
            const id = String(p._id || p.id);
            if (currentEditingProduct && id === String(currentEditingProduct)) return false;
            if (_relatedSelectedIds.includes(id)) return false;
            return safeText(p.name).toLowerCase().includes(q);
        })
        .slice(0, 8);

    if (matches.length === 0) {
        resultsEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">لا توجد نتائج</p>';
    } else {
        // نستخدم data-* بدل onclick لتجنب مشكلة الـ apostrophe في الأسماء
        resultsEl.innerHTML = matches.map(p => {
            const img = p.images?.[0] || '';
            const id = String(p._id || p.id);
            return `<div data-rid="${id}" data-rimg="${img}" data-rprice="${p.price || 0}"
                class="related-result-item flex items-center gap-2 p-2 hover:bg-antika-gold/10 rounded-lg cursor-pointer transition">
                <img src="${img || 'https://via.placeholder.com/32'}" class="w-8 h-8 rounded object-cover flex-shrink-0" onerror="this.src='https://via.placeholder.com/32'">
                <span class="text-sm text-gray-700 flex-1 truncate">${safeText(p.name)}</span>
                <span class="text-xs text-antika-gold">${p.price} ر.س</span>
            </div>`;
        }).join('');

        // ربط الكليك بعد الـ render
        resultsEl.querySelectorAll('.related-result-item').forEach((el, i) => {
            el.addEventListener('click', () => {
                addRelatedProduct(el.dataset.rid, matches[i].name, el.dataset.rimg, el.dataset.rprice);
            });
        });
    }
    resultsEl.classList.remove('hidden');
}

function addRelatedProduct(id, name, img, price) {
    if (_relatedSelectedIds.includes(id)) return;
    _relatedSelectedIds.push(id);
    updateRelatedIdsInput();

    const emptyMsg = document.getElementById('related-empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const list = document.getElementById('related-selected-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 bg-antika-gold/10 rounded-lg p-2';
    item.dataset.relatedId = id;

    const safeImg = img || 'https://via.placeholder.com/32';
    item.innerHTML = `
        <img src="${safeImg}" class="w-8 h-8 rounded object-cover flex-shrink-0" onerror="this.src='https://via.placeholder.com/32'">
        <span class="text-sm text-gray-700 flex-1 truncate"></span>
        <span class="text-xs text-antika-gold ml-2">${price} ر.س</span>
        <button type="button" class="related-remove-btn text-red-400 hover:text-red-600 flex-shrink-0">
            <i class="fas fa-times text-xs"></i>
        </button>`;

    // نضع الاسم بـ textContent لتجنب أي مشكلة XSS أو apostrophe
    item.querySelector('span.flex-1').textContent = name;
    item.querySelector('.related-remove-btn').addEventListener('click', () => removeRelatedProduct(id, item));

    list.appendChild(item);

    const input = document.getElementById('related-search-input');
    if (input) input.value = '';
    document.getElementById('related-search-results')?.classList.add('hidden');
}

function removeRelatedProduct(id, btn) {
    _relatedSelectedIds = _relatedSelectedIds.filter(x => x !== id);
    updateRelatedIdsInput();
    btn.closest('[data-related-id]')?.remove();

    const list = document.getElementById('related-selected-list');
    if (list && list.children.length === 0) {
        list.innerHTML = '<p class="text-xs text-gray-400 text-center py-2" id="related-empty-msg">لم يتم ربط أي منتج بعد</p>';
    }
}

function updateRelatedIdsInput() {
    const input = document.getElementById('product-related-ids');
    if (input) input.value = JSON.stringify(_relatedSelectedIds);
}

function loadRelatedData(product) {
    _relatedSelectedIds = [];
    const list = document.getElementById('related-selected-list');
    if (list) list.innerHTML = '<p class="text-xs text-gray-400 text-center py-2" id="related-empty-msg">لم يتم ربط أي منتج بعد</p>';

    if (!product.relatedProductIds || product.relatedProductIds.length === 0) return;

    const cb = document.getElementById('product-has-related');
    if (cb) { cb.checked = true; toggleRelatedSection(); }

    product.relatedProductIds.forEach(rid => {
        const p = _allAdminProducts.find(x => String(x._id || x.id) === String(rid));
        if (p) {
            const img = p.images?.[0] || '';
            addRelatedProduct(String(rid), safeText(p.name), img, p.price || 0);
        }
    });
}

// دوال المتغيرات القديمة (kept for compatibility, no-ops)
function toggleVariantsSection() {}
function addVariantOption() {
    const container = document.getElementById('variant-options-container');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'variant-option-row flex gap-2 items-center';
    row.innerHTML = `
        <input type="text" placeholder="اسم الخاصية (مثال: المقاس)" class="variant-option-name flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
        <input type="text" placeholder="القيم (مثال: S، M، L، XL)" class="variant-option-values flex-[2] border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
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
        const values = row.querySelector('.variant-option-values')?.value.split('،').map(v => v.trim()).filter(v => v);
        
        if (name && values.length > 0) {
            options.push({ name, values });
        }
    });
    
    if (options.length === 0) {
        showNotification('الرجاء إضافة خاصية واحدة على الأقل مع قيمها', 'error');
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
                        <label class="block text-xs text-gray-600 mb-1">السعر (اختياري)</label>
                        <input type="number" class="variant-price w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="${basePrice}" min="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">المخزون</label>
                        <input type="number" class="variant-stock w-full border border-gray-200 rounded px-2 py-1 text-sm" value="0" min="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">SKU (اختياري)</label>
                        <input type="text" class="variant-sku w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="رمز المنتج">
                    </div>
                </div>
                <div class="mt-3">
                    <label class="block text-xs text-gray-600 mb-1">صور المتغير (روابط مفصولة بفاصلة)</label>
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
                        firstRow.querySelector('.variant-option-values').value = opt.values.join('، ');
                        return;
                    }
                }
                
                // Add new row
                const row = document.createElement('div');
                row.className = 'variant-option-row flex gap-2 items-center';
                row.innerHTML = `
                    <input type="text" value="${opt.name}" placeholder="اسم الخاصية" class="variant-option-name flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
                    <input type="text" value="${opt.values.join('، ')}" placeholder="القيم" class="variant-option-values flex-[2] border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-antika-pink focus:outline-none">
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
                    const optName = product.variantOptions?.[i]?.name || `خاصية ${i+1}`;
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
                                <label class="block text-xs text-gray-600 mb-1">السعر (اختياري)</label>
                                <input type="number" class="variant-price w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.price || ''}" placeholder="السعر الافتراضي" min="0">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">المخزون</label>
                                <input type="number" class="variant-stock w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.stock}" min="0">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">SKU (اختياري)</label>
                                <input type="text" class="variant-sku w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.sku || ''}" placeholder="رمز المنتج">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="block text-xs text-gray-600 mb-1">صور المتغير (روابط مفصولة بفاصلة)</label>
                            <input type="text" class="variant-images w-full border border-gray-200 rounded px-2 py-1 text-sm" value="${variant.images?.join(', ') || ''}" placeholder="روابط الصور">
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Extend loadProductForEdit to handle related products
const originalLoadProductForEdit = loadProductForEdit;
loadProductForEdit = async function(productId) {
    _relatedSelectedIds = [];
    await originalLoadProductForEdit(productId);
    try {
        const product = await API.getProduct(productId);
        if (product) loadRelatedData(product);
    } catch (error) {
        console.error('Error loading related products:', error);
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
            const values = row.querySelector('.variant-option-values')?.value.split('،').map(v => v.trim()).filter(v => v);
            
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
            showNotification('الرجاء اختيار تصنيف واحد على الأقل!', 'error');
            return;
        }

        const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || 0;
        const salePrice = parseFloat(document.getElementById('product-sale-price')?.value) || 0;
        
        const skuValue = document.getElementById('product-sku')?.value || '';
        const freeShippingValue = document.getElementById('product-free-shipping')?.checked || false;
        console.log('🔍 SKU (variants):', skuValue);
        console.log('🔍 Free Shipping (variants):', freeShippingValue);
        
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
        console.log('📦 Product Data (variants) to save:', productData);

        // Stock text
        if (productData.stockDisplay === 'text') {
            productData.stockText = document.getElementById('stock-text')?.value || 'متوفر';
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

        // 🌟 Custom Product Features
        const customFeatures = getCustomFeatures();
        productData.customFeatures = customFeatures; // Always send customFeatures (even if empty)

        // 🔗 Related products (من نفس الموديل)
        const hasRelated = document.getElementById('product-has-related')?.checked;
        if (hasRelated && _relatedSelectedIds.length > 0) {
            productData.relatedProductIds = _relatedSelectedIds;
        } else {
            productData.relatedProductIds = [];
        }

        try {
            if (currentEditingProduct) {
                await API.updateProduct(currentEditingProduct, productData);
                hideWaitToast(); showNotification('تم تحديث المنتج بنجاح! 🎉');
            } else {
                await API.addProduct(productData);
                hideWaitToast(); showNotification('تم إضافة المنتج بنجاح! 🎉');
            }

            closeProductModal();
            await loadAdminProducts();
            await updateStats();
            await loadRecentProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            hideWaitToast();
        const errMsg = error?.message || 'حدث خطأ أثناء حفظ المنتج';
        showNotification(errMsg, 'error');
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


// ============================================
// REVIEWS MANAGEMENT
// ============================================

let currentReviewData = null;

function starsHtmlAdmin(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= rating
            ? '<i class="fas fa-star" style="color:#f59e0b"></i>'
            : '<i class="far fa-star" style="color:#ddd"></i>';
    }
    return html;
}

async function loadAllReviews() {
    const container = document.getElementById('reviews-table-container');
    const filter = document.getElementById('reviews-filter')?.value || 'all';
    if (!container) return;

    container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-4xl mb-3 block"></i>جاري التحميل...</div>';

    try {
        // جلب كل المنتجات أولاً
        const products = await API.getProducts();
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-comments text-5xl mb-3 block"></i>لا توجد منتجات</div>';
            return;
        }

        // جلب تعليقات كل منتج
        let allReviews = [];
        for (const p of products) {
            try {
                const pid = p._id || p.id;
                const data = await fetch('/api/products/' + pid + '/reviews').then(r => r.json());
                if (data.reviews && data.reviews.length > 0) {
                    data.reviews.forEach(function(r) {
                        allReviews.push({ ...r, productName: p.name, productId: pid });
                    });
                }
            } catch(e) {}
        }

        // فلتر حسب التقييم
        if (filter !== 'all') {
            allReviews = allReviews.filter(function(r) { return r.rating === Number(filter); });
        }

        // ترتيب من الأحدث
        allReviews.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

        // إحصائيات
        renderReviewsStats(allReviews);

        if (allReviews.length === 0) {
            container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-comments text-5xl mb-3 block"></i>لا توجد تعليقات</div>';
            return;
        }

        // تخزين التعليقات في متغير عام للوصول منه عند الضغط
        window.adminReviewsList = allReviews;

        // جدول التعليقات
        let html = '<div class="overflow-x-auto">'
            + '<table class="w-full text-sm">'
            + '<thead><tr class="bg-gray-50 border-b border-gray-100">'
            + '<th class="px-4 py-3 text-right font-bold text-gray-600">المعلق</th>'
            + '<th class="px-4 py-3 text-right font-bold text-gray-600">المنتج</th>'
            + '<th class="px-4 py-3 text-right font-bold text-gray-600">التقييم</th>'
            + '<th class="px-4 py-3 text-right font-bold text-gray-600">التعليق</th>'
            + '<th class="px-4 py-3 text-right font-bold text-gray-600">التاريخ</th>'
            + '<th class="px-4 py-3 text-center font-bold text-gray-600">إجراء</th>'
            + '</tr></thead>'
            + '<tbody>';

        allReviews.forEach(function(r, idx) {
            const date = new Date(r.createdAt).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
            const shortComment = r.comment.length > 50 ? r.comment.substring(0, 50) + '...' : r.comment;
            const ratingColor = r.rating >= 4 ? 'text-green-600' : r.rating === 3 ? 'text-yellow-600' : 'text-red-500';

            html += '<tr class="border-b border-gray-50 hover:bg-gray-50 transition">'
                + '<td class="px-4 py-3"><div class="font-semibold text-gray-800">' + r.userName + '</div>'
                + (r.userEmail ? '<div class="text-xs text-gray-400">' + r.userEmail + '</div>' : '') + '</td>'
                + '<td class="px-4 py-3 text-gray-600 text-xs max-w-32">' + r.productName + '</td>'
                + '<td class="px-4 py-3"><span class="' + ratingColor + ' font-bold">' + r.rating + ' ★</span></td>'
                + '<td class="px-4 py-3 text-gray-600 text-xs">' + shortComment + '</td>'
                + '<td class="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">' + date + '</td>'
                + '<td class="px-4 py-3 text-center">'
                + '<div class="flex gap-2 justify-center">'
                + '<button onclick="openReviewModal(window.adminReviewsList[' + idx + '])" class="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-200 transition text-xs"><i class="fas fa-eye"></i></button>'
                + '<button onclick="confirmDeleteReview(window.adminReviewsList[' + idx + ']._id)" class="bg-red-100 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200 transition text-xs"><i class="fas fa-trash"></i></button>'
                + '</div></td>'
                + '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

    } catch(e) {
        console.error('Error loading reviews:', e);
        container.innerHTML = '<div class="text-center py-12 text-red-400">حدث خطأ أثناء تحميل التعليقات</div>';
    }
}

function renderReviewsStats(reviews) {
    const container = document.getElementById('reviews-stats-row');
    if (!container) return;

    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce(function(s, r) { return s + r.rating; }, 0) / total).toFixed(1) : 0;
    const positive = reviews.filter(function(r) { return r.rating >= 4; }).length;
    const negative = reviews.filter(function(r) { return r.rating <= 2; }).length;

    container.innerHTML = [
        { label: 'إجمالي التعليقات', value: total, icon: 'fa-comments', color: 'blue' },
        { label: 'متوسط التقييم', value: avg + ' ★', icon: 'fa-star', color: 'yellow' },
        { label: 'تعليقات إيجابية', value: positive, icon: 'fa-thumbs-up', color: 'green' },
        { label: 'تعليقات سلبية', value: negative, icon: 'fa-thumbs-down', color: 'red' },
    ].map(function(s) {
        return '<div class="bg-white rounded-2xl shadow p-4 flex items-center gap-4">'
            + '<div class="w-12 h-12 rounded-full bg-' + s.color + '-100 flex items-center justify-center text-' + s.color + '-600">'
            + '<i class="fas ' + s.icon + '"></i></div>'
            + '<div><p class="text-gray-500 text-xs">' + s.label + '</p>'
            + '<p class="text-2xl font-bold text-gray-800">' + s.value + '</p></div>'
            + '</div>';
    }).join('');
}

async function openReviewModal(review) {
    currentReviewData = review;

    // بيانات التعليق الأساسية
    document.getElementById('modal-reviewer-name').textContent = review.userName || '-';
    document.getElementById('modal-reviewer-email').textContent = review.userEmail || 'غير محدد';
    document.getElementById('modal-review-date').textContent = new Date(review.createdAt).toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
    document.getElementById('modal-product-name').textContent = review.productName || '-';
    document.getElementById('modal-review-stars').innerHTML = starsHtmlAdmin(review.rating);
    document.getElementById('modal-review-comment').textContent = review.comment;

    // تحميل معلومات المستخدم الكاملة
    const userInfoEl = document.getElementById('modal-user-full-info');
    if (userInfoEl) {
        userInfoEl.innerHTML = '<p class="text-gray-400 text-sm text-center py-2"><i class="fas fa-spinner fa-spin ml-2"></i>جاري التحميل...</p>';
    }

    document.getElementById('review-detail-modal').classList.remove('hidden');

    if (!review.userEmail) {
        if (userInfoEl) userInfoEl.innerHTML = '<p class="text-gray-400 text-sm text-center py-2">لا يوجد إيميل مرتبط بهذا التعليق</p>';
        return;
    }

    try {
        const token = localStorage.getItem('antika_admin_token');
        const res = await fetch('/api/admin/user-info/' + encodeURIComponent(review.userEmail), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (!data.found || !data.user) {
            if (userInfoEl) userInfoEl.innerHTML = '<p class="text-gray-400 text-sm text-center py-2">⚠️ المستخدم غير مسجل في المتجر (علّق كزائر)</p>';
            return;
        }

        const u = data.user;
        const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' }) : 'غير محدد';

        let html = '<div class="space-y-2">'
            + '<p class="text-sm text-gray-700"><i class="fas fa-user ml-2 text-antika-gold"></i><strong>الاسم:</strong> ' + (u.name || '-') + '</p>'
            + '<p class="text-sm text-gray-700"><i class="fas fa-envelope ml-2 text-antika-gold"></i><strong>الإيميل:</strong> ' + (u.email || '-') + '</p>'
            + '<p class="text-sm text-gray-700"><i class="fas fa-phone ml-2 text-antika-gold"></i><strong>الجوال:</strong> ' + (u.phone || 'غير محدد') + '</p>'
            + '<p class="text-sm text-gray-700"><i class="fas fa-calendar ml-2 text-antika-gold"></i><strong>تاريخ التسجيل:</strong> ' + regDate + '</p>'
            + '<p class="text-sm text-gray-700"><i class="fas fa-shopping-bag ml-2 text-antika-gold"></i><strong>عدد الطلبات:</strong> ' + data.ordersCount + '</p>'
            + '<p class="text-sm text-gray-700"><i class="fas fa-coins ml-2 text-antika-gold"></i><strong>إجمالي المشتريات:</strong> ' + Number(data.totalSpent || 0).toFixed(2) + ' ر.س</p>';

        // العناوين المحفوظة
        if (u.addresses && u.addresses.length > 0) {
            html += '<div class="mt-3 pt-3 border-t border-gray-100">'
                + '<p class="text-sm font-bold text-gray-700 mb-2"><i class="fas fa-map-marker-alt ml-2 text-antika-gold"></i>العناوين المحفوظة:</p>'
                + u.addresses.map(function(a) {
                    return '<div class="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mb-1">'
                        + '<span class="font-semibold">' + (a.label || 'عنوان') + ':</span> ' + (a.address || '-')
                        + (a.location && a.location.lat ? ' <span class="text-blue-400 mr-1"><i class="fas fa-map-pin"></i> موقع محفوظ</span>' : '')
                        + '</div>';
                }).join('')
                + '</div>';
        }

        html += '</div>';
        if (userInfoEl) userInfoEl.innerHTML = html;

    } catch(e) {
        if (userInfoEl) userInfoEl.innerHTML = '<p class="text-red-400 text-sm text-center py-2">حدث خطأ أثناء تحميل المعلومات</p>';
    }
}

function closeReviewModal() {
    document.getElementById('review-detail-modal').classList.add('hidden');
    currentReviewData = null;
}

async function deleteReviewFromModal() {
    if (!currentReviewData) return;
    await confirmDeleteReview(currentReviewData._id);
    closeReviewModal();
}

async function confirmDeleteReview(reviewId) {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    try {
        const token = localStorage.getItem('antika_admin_token');
        const res = await fetch('/api/reviews/' + reviewId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('فشل الحذف');
        showNotification('تم حذف التعليق بنجاح');
        await loadAllReviews();
    } catch(e) {
        showNotification('حدث خطأ أثناء الحذف', 'error');
    }
}
// ============================================
// PRODUCT REVIEWS MODAL
// ============================================

async function openProductReviews(productId, productName) {
    const modal = document.getElementById('product-reviews-modal');
    const title = document.getElementById('product-reviews-title');
    const container = document.getElementById('product-reviews-list');
    if (!modal || !container) return;

    title.textContent = '💬 تعليقات: ' + (productName || '');
    container.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';
    modal.classList.remove('hidden');

    try {
        const data = await fetch('/api/products/' + productId + '/reviews').then(r => r.json());
        const reviews = data.reviews || [];

        if (reviews.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-gray-400"><i class="fas fa-comments text-4xl mb-3 block"></i>لا توجد تعليقات على هذا المنتج</div>';
            return;
        }

        container.innerHTML = reviews.map(function(r, idx) {
            const stars = Array.from({length:5}, function(_,i) {
                return '<i class="fas fa-star ' + (i < r.rating ? 'text-yellow-400' : 'text-gray-200') + ' text-xs"></i>';
            }).join('');
            const date = new Date(r.createdAt).toLocaleDateString('ar-SA', {year:'numeric', month:'long', day:'numeric'});
            const ratingColor = r.rating <= 2 ? 'border-red-200 bg-red-50' : r.rating === 3 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50';

            return '<div class="border rounded-xl p-4 mb-3 ' + ratingColor + '">'
                + '<div class="flex justify-between items-start mb-2">'
                +   '<div>'
                +     '<p class="font-bold text-gray-800 text-sm">' + (r.userName || '-') + '</p>'
                +     '<p class="text-xs text-gray-500">' + (r.userEmail || 'بدون إيميل') + '</p>'
                +   '</div>'
                +   '<div class="flex flex-col items-end gap-1">'
                +     '<div>' + stars + '</div>'
                +     '<p class="text-xs text-gray-400">' + date + '</p>'
                +   '</div>'
                + '</div>'
                + '<p class="text-gray-700 text-sm leading-relaxed mb-3">' + (r.comment || '') + '</p>'
                + '<div class="flex gap-2">'
                +   '<button data-ridx="' + idx + '" onclick="openReviewModal(window._productReviews[this.dataset.ridx])" class="flex-1 bg-blue-100 text-blue-600 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition"><i class="fas fa-eye ml-1"></i>تفاصيل المستخدم</button>'
                +   '<button data-rid="' + r._id + '" data-pid="' + productId + '" onclick="confirmDeleteReviewInProduct(this.dataset.rid, this.dataset.pid)" class="flex-1 bg-red-100 text-red-500 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition"><i class="fas fa-trash ml-1"></i>حذف</button>'
                + '</div>'
                + '</div>';
        }).join('');

        window._productReviews = reviews;

    } catch(e) {
        container.innerHTML = '<div class="text-center py-8 text-red-400">حدث خطأ أثناء تحميل التعليقات</div>';
    }
}

function closeProductReviewsModal() {
    document.getElementById('product-reviews-modal')?.classList.add('hidden');
}

async function confirmDeleteReviewInProduct(reviewId, productId, productName) {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    try {
        const token = localStorage.getItem('antika_admin_token');
        const res = await fetch('/api/reviews/' + reviewId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('فشل الحذف');
        showNotification('تم حذف التعليق بنجاح');
        openProductReviews(productId, productName);
    } catch(e) {
        showNotification('حدث خطأ أثناء الحذف', 'error');
    }
}
// ====================================================
// AUTO-SAVE لنموذج المنتج
// ====================================================
(function() {
    const DRAFT_KEY = 'antika_product_draft';
    
    function saveDraft() {
        const fields = ['product-name', 'product-description', 'product-price', 
                       'product-original-price', 'product-stock', 'product-sku'];
        const draft = {};
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) draft[id] = el.value;
        });
        // حفظ التصنيفات المختارة
        const cats = document.querySelectorAll('input[name="category"]:checked');
        draft['categories'] = Array.from(cats).map(c => c.value);
        
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
    
    function restoreDraft() {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            Object.keys(draft).forEach(id => {
                if (id === 'categories') return;
                const el = document.getElementById(id);
                if (el && draft[id]) el.value = draft[id];
            });
            if (draft.categories && draft.categories.length > 0) {
                setTimeout(() => {
                    draft.categories.forEach(val => {
                        const cb = document.querySelector(`input[name="category"][value="${val}"]`);
                        if (cb) cb.checked = true;
                    });
                }, 1000);
            }
            showToast('✅ تم استعادة المسودة المحفوظة');
        } catch(e) {}
    }
    
    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    // بدء الـ auto-save كل 30 ثانية
    let autoSaveInterval = null;
    
    function startAutoSave() {
        if (autoSaveInterval) return;
        autoSaveInterval = setInterval(() => {
            const nameEl = document.getElementById('product-name');
            if (nameEl && nameEl.value.trim()) {
                saveDraft();
            }
        }, 30000);
    }
    
    function stopAutoSave() {
        if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
        clearDraft();
    }

    // مراقبة فتح قسم المنتجات
    const observer = new MutationObserver(() => {
        const section = document.getElementById('products-section');
        const form = document.getElementById('product-form');
        if (section && !section.classList.contains('hidden') && form) {
            startAutoSave();
            // استعادة المسودة لو موجودة
            if (localStorage.getItem(DRAFT_KEY)) {
                restoreDraft();
            }
        }
    });
    
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

    // امسح المسودة بعد الحفظ الناجح
    document.addEventListener('click', function(e) {
        if (e.target && e.target.textContent && 
            (e.target.textContent.includes('حفظ المنتج') || e.target.textContent.includes('إضافة المنتج'))) {
            setTimeout(() => {
                const successToast = document.querySelector('.toast');
                if (successToast && successToast.textContent.includes('تم')) {
                    stopAutoSave();
                }
            }, 2000);
        }
    });

    // مكّن استعادة المسودة عند تحميل الصفحة
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (localStorage.getItem(DRAFT_KEY)) {
                const section = document.getElementById('products-section');
                if (section && !section.classList.contains('hidden')) {
                    restoreDraft();
                }
            }
        }, 1500);
    });
    
    window.clearProductDraft = clearDraft;
})();