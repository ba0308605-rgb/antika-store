// 🌸 Antika Store - Unified Header Component
// يستخدم في جميع الصفحات

class AntikaHeader extends HTMLElement {
    constructor() {
        super();
        this.currentPage = this.getAttribute('data-page') || '';
    }

    connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;
    this.innerHTML = this.getTemplate();
    this.initEventListeners();
    this.loadCategories();
    this.checkAuth();
}

    getTemplate() {
        return `
            <style>
                /* Header Styles */
                antika-header {
                    display: block !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 100 !important;
                    width: 100%;
                    background: white;
                }

                .main-header {
                    background: white;
                    border-bottom: 1px solid #eee;
                    position: relative;
                }

                /* Logo Styles */
                .logo-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .logo-image-container {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid #D6C1A6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                }
                .logo-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .logo-text-container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                .logo-text-main {
                    font-size: 22px;
                    font-weight: 800;
                    color: #D6C1A6;
                    line-height: 1;
                }
                .logo-text-sub {
                    font-size: 10px;
                    color: #999;
                    letter-spacing: 2px;
                    text-transform: lowercase;
                    margin-top: 2px;
                }
                @media (max-width: 768px) {
                    .logo-image-container { width: 40px; height: 40px; }
                    .logo-text-main { font-size: 18px; }
                    .logo-text-sub { font-size: 8px; }
                }

                /* Hamburger Menu */
                .hamburger-lines {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    cursor: pointer;
                    padding: 10px;
                }
                .hamburger-lines span {
                    width: 25px;
                    height: 2px;
                    background: #333;
                    transition: all 0.3s ease;
                }

                /* Mobile Menu */
                .mobile-menu {
                    position: fixed;
                    top: 0;
                    right: -100%;
                    width: 80%;
                    max-width: 350px;
                    height: 100vh;
                    background: white;
                    z-index: 1000;
                    transition: right 0.3s ease;
                    box-shadow: -5px 0 30px rgba(0,0,0,0.2);
                }
                .mobile-menu.open {
                    right: 0;
                }
                .menu-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                .menu-overlay.open {
                    opacity: 1;
                    visibility: visible;
                }

                /* Search Modal */
                .search-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    z-index: 2000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 10vh;
                }
                .search-modal-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                .search-modal-box {
                    background: white;
                    border-radius: 28px;
                    padding: 12px 20px;
                    width: 90%;
                    max-width: 680px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    transform: translateY(-10px);
                    transition: transform 0.3s ease;
                }
                .search-modal-overlay.active .search-modal-box {
                    transform: translateY(0);
                }
                .search-modal-box input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 15px;
                    padding: 10px 0;
                    color: #333;
                }
                .search-modal-box input::placeholder {
                    color: #999;
                }
                .search-modal-box button {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #D6C1A6;
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }
                .search-modal-box button:hover {
                    background: #C4AC8E;
                }
                .search-modal-close {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: white;
                    color: #333;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    font-size: 18px;
                }
                .search-modal-close:hover {
                    background: #f0f0f0;
                }
            </style>

            <!-- Main Header -->
            <header class="main-header">
                <div class="container mx-auto px-4">
                    <div class="flex items-center justify-between h-20">
                        <!-- Right Side: Hamburger Menu -->
                        <div class="hamburger-lines" onclick="toggleMenu()">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                        <!-- Center: Logo -->
                        <a href="index.html" class="absolute left-1/2 transform -translate-x-1/2">
                            <div class="logo-wrapper">
                                <div class="logo-image-container">
                                    <img src="images/logo.jpg" alt="انتيكا استور" class="logo-image">
                                </div>
                                <div class="logo-text-container">
                                    <span class="logo-text-main">انتيكا</span>
                                    <span class="logo-text-sub">antika-store</span>
                                </div>
                            </div>
                        </a>

                        <!-- Left Side: Search, Cart, Login -->
                        <div class="flex items-center gap-4">
                            <!-- Search Icon -->
                            <button onclick="openSearchModal()" class="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-antika-gold transition">
                                <i class="fas fa-search text-lg"></i>
                            </button>

                            <!-- Cart -->
                            <a href="cart.html" class="relative text-gray-600 hover:text-antika-gold transition">
                                <i class="fas fa-shopping-cart text-xl"></i>
                                <span id="cart-count" class="absolute -top-2 -right-2 bg-antika-pink text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold hidden">0</span>
                            </a>

                            <!-- Login (shown when not logged in) -->
                            <a href="login.html" id="login-btn" class="text-gray-600 hover:text-antika-gold transition flex items-center gap-2">
                                <span class="hidden sm:inline text-sm">تسجيل الدخول</span>
                                <i class="fas fa-user text-lg"></i>
                            </a>
                            
                            <!-- User Info (shown when logged in) -->
                            <button id="user-info-btn" class="hidden flex items-center gap-2 text-gray-600 hover:text-antika-gold transition" onclick="showAccountMenu()">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-gray-800 text-sm font-bold" style="background-color: #FFB6C1;" id="user-avatar">
                                    👤
                                </div>
                                <span id="user-name-display" class="hidden sm:inline text-sm font-semibold"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Search Modal -->
            <div id="search-modal" class="search-modal-overlay">
                <button onclick="closeSearchModal()" class="search-modal-close">
                    <i class="fas fa-times"></i>
                </button>
                <div class="search-modal-box" style="flex-direction:column;align-items:stretch;max-width:680px;padding:12px;">
                    <div style="display:flex;align-items:center;gap:12px;width:100%;">
                        <input type="text" id="search-modal-input" placeholder="ابحث عن منتج..." onkeypress="handleSearchModal(event)" style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid #eee;background:#fff;">
                        <button onclick="performSearch()" class="px-3 py-1 bg-antika-gold text-white rounded-lg" style="height:40px;min-width:40px;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                    <div id="search-results" class="search-results-container" style="margin-top:10px;max-height:50vh;overflow:auto;width:100%;border-radius:10px;">
                        <!-- live results inserted here -->
                    </div>
                </div>
            </div>

            <!-- Mobile Menu Overlay -->
            <div class="menu-overlay" id="menu-overlay" onclick="toggleMenu()"></div>

            <!-- Mobile Menu -->
            <div class="mobile-menu" id="mobile-menu">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-8">
                        <h3 class="text-xl font-bold text-antika-gold">القائمة</h3>
                        <button onclick="toggleMenu()" class="text-2xl text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <nav class="space-y-4">
                        <a href="index.html" class="block py-3 border-b border-gray-100 text-gray-800 hover:text-antika-gold font-semibold">الرئيسية</a>
                        <a href="products.html" class="block py-3 border-b border-gray-100 text-gray-800 hover:text-antika-gold">المنتجات</a>
                        <a href="products.html?discount=true" class="block py-3 border-b border-gray-100 text-gray-800 hover:text-antika-gold">العروض</a>
                    </nav>
                    <div class="mt-8">
                        <h4 class="font-bold text-gray-700 mb-4">التصنيفات</h4>
                        <div id="mobile-categories" class="space-y-3">
                            <!-- Categories loaded by JS -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initEventListeners() {
        // Close search modal on backdrop click
        const searchModal = document.getElementById('search-modal');
        if (searchModal) {
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) closeSearchModal();
            });
        }
        
        // 🔄 Listen for logout from other pages via BroadcastChannel
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('auth_channel');
            bc.onmessage = (event) => {
                if (event.data.action === 'logout') {
                    console.log('📢 Received logout message from another page');
                    // Clear localStorage and reload
                    localStorage.removeItem('antika_user');
                    localStorage.removeItem('antika_token');
                    window.location.reload();
                }
            };
        }
        
        // 🔄 Also listen via storage event (for browsers without BroadcastChannel)
        window.addEventListener('storage', (e) => {
            if (e.key === 'antika_user' || e.key === 'antika_token') {
                console.log('🔔 Storage changed, re-checking auth...');
                this.checkAuth();
                // If logged out, reload page to ensure clean state
                if (!localStorage.getItem('antika_user')) {
                    window.location.reload();
                }
            }
        });
        
        // 🔄 Periodic check every 2 seconds
        setInterval(() => {
            this.checkAuth();
        }, 2000);
    }

    async loadCategories() {
    try {
        const container = document.getElementById('mobile-categories');
        if (!container) return;
        if (container.children.length > 0) return;
        const categories = await API.getCategories();

            if (!categories || categories.length === 0) {
                container.innerHTML = '<p class="text-gray-400 text-sm">لا توجد تصنيفات</p>';
                return;
            }

            const mainCats = categories.filter(c => !c.parentId);
            const subCats  = categories.filter(c =>  c.parentId);

            // Fallback: flat list if no hierarchy
            if (mainCats.length === 0) {
                container.innerHTML = categories.map(cat => `
                    <a href="products.html?category=${cat.id}" class="flex items-center gap-3 py-2 text-gray-700 hover:text-antika-pink transition" onclick="toggleMenu()">
                        <span class="text-xl">${cat.icon || '📦'}</span>
                        <span>${cat.name}</span>
                    </a>
                `).join('');
                return;
            }

            container.innerHTML = mainCats.map(cat => {
                const children = subCats.filter(s => s.parentId === cat.id);
                const hasChildren = children.length > 0;
                return '<div class="mobile-cat-group border-b border-gray-100">'
                    + '<div class="flex items-center justify-between py-3 cursor-pointer select-none"'
                    + ' onclick="toggleMobileCatSubs(\'subs-' + cat.id + '\', this)">'
                    + '<div class="flex items-center gap-3 text-gray-700">'
                    + '<span class="text-xl">' + (cat.icon || '📦') + '</span>'
                    + '<span class="font-semibold">' + cat.name + '</span>'
                    + '</div>'
                    + (hasChildren
                        ? '<i class="fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200" id="chevron-' + cat.id + '"></i>'
                        : '<a href="products.html?category=' + cat.id + '" onclick="event.stopPropagation();toggleMenu()" class="text-xs text-antika-gold">عرض</a>')
                    + '</div>'
                    + (hasChildren
                        ? '<div id="subs-' + cat.id + '" class="hidden pb-2 space-y-1 pr-6 border-r-2 border-antika-gold mr-4">'
                          + '<a href="products.html?category=' + cat.id + '" class="flex items-center gap-2 py-1.5 text-sm text-antika-gold font-bold hover:text-antika-pink transition" onclick="toggleMenu()">'
                          + '<i class="fas fa-th text-xs"></i> عرض الكل</a>'
                          + children.map(sub =>
                              '<a href="products.html?category=' + sub.id + '" class="flex items-center gap-2 py-1.5 text-sm text-gray-600 hover:text-antika-pink transition" onclick="toggleMenu()">'
                              + '<span>' + (sub.icon || '•') + '</span>'
                              + '<span>' + sub.name + '</span></a>'
                            ).join('')
                          + '</div>'
                        : '')
                    + '</div>';
            }).join('');

        } catch (error) {
            console.error('Error loading categories:', error);
            const container = document.getElementById('mobile-categories');
            if (container) container.innerHTML = '<p class="text-gray-400 text-sm">خطأ في تحميل التصنيفات</p>';
        }
    }

    checkAuth() {
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('antika_user') || 'null');
        const loginBtn = document.getElementById('login-btn');
        const userInfoBtn = document.getElementById('user-info-btn');
        const userNameDisplay = document.getElementById('user-name-display');
        const userAvatar = document.getElementById('user-avatar');

        if (user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userInfoBtn) userInfoBtn.classList.remove('hidden');
            
            // Display user name
            if (userNameDisplay) {
                userNameDisplay.textContent = user.name || user.displayName || 'المستخدم';
            }
            
            // Display user initial in avatar
            if (userAvatar) {
                const initial = user.name ? user.name.charAt(0).toUpperCase() : '👤';
                userAvatar.textContent = initial;
            }
            
            window.currentUser = user;
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userInfoBtn) userInfoBtn.classList.add('hidden');
        }

        // Update cart count
        this.updateCartCount();
    }

    async updateCartCount() {
        try {
            // Use the same API/session logic used everywhere else in the app.
            let cart = [];
            if (window.API && typeof API.getCart === 'function') {
                cart = await API.getCart();
            } else {
                const response = await fetch('http://localhost:3000/api/cart');
                cart = await response.json();
            }
            const count = (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (item.quantity || 1), 0);
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                if (count > 0) {
                    cartCount.textContent = count > 99 ? '99+' : count;
                    cartCount.classList.remove('hidden');
                } else {
                    cartCount.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }
}

// Register the custom element
customElements.define('antika-header', AntikaHeader);

// ==================== Global Functions ====================

// Toggle subcategories in mobile menu
function toggleMobileCatSubs(subsId, headerEl) {
    const subs = document.getElementById(subsId);
    if (!subs) return;
    const isHidden = subs.classList.contains('hidden');
    // Close all other open subs
    document.querySelectorAll('[id^="subs-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="chevron-"]').forEach(el => {
        el.style.transform = '';
    });
    if (isHidden) {
        subs.classList.remove('hidden');
        const catId = subsId.replace('subs-', '');
        const chevron = document.getElementById('chevron-' + catId);
if (chevron) chevron.style.transform = 'rotate(180deg)';    }
}

// Toggle Mobile Menu
function toggleMenu() {
    document.getElementById('mobile-menu')?.classList.toggle('open');
    document.getElementById('menu-overlay')?.classList.toggle('open');
}

// Search Modal Functions
function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('search-modal-input')?.focus();
        document.body.style.overflow = 'hidden';
        // initialize live search UI when modal opens
        try { setupLiveSearch(); } catch (e) { /* ignore */ }
    }
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function handleSearchModal(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
}

function performSearch() {
    const input = document.getElementById('search-modal-input');
    if (input) {
        const query = input.value.trim();
        if (query) {
            window.location.href = 'products.html?search=' + encodeURIComponent(query);
        }
    }
}

// -------------------------
// Live Search Helpers
// -------------------------
let _searchInitialized = false;
function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

function setupLiveSearch(){
    if (_searchInitialized) return;
    const input = document.getElementById('search-modal-input');
    if (!input) return;
    const handler = debounce(async () => {
        const q = input.value.trim();
        if (!q) { clearSearchResults(); return; }
        try {
            const results = await API.getProducts(null, q);
            renderSearchResults(results.slice(0, 50));
        } catch (e) {
            console.error('Live search error', e);
        }
    }, 220);
    input.addEventListener('input', handler);
    // allow click outside to clear
    const modal = document.getElementById('search-modal');
    if (modal) modal.addEventListener('click', (e)=>{ if (e.target === modal) clearSearchResults(); });
    _searchInitialized = true;
}

function renderSearchResults(products){
    const container = document.getElementById('search-results');
    if (!container) return;
    container.innerHTML = '';
    if (!products || products.length === 0){
        container.innerHTML = '<p class="text-gray-500 p-4 text-center text-sm">لا توجد نتائج</p>';
        return;
    }

    // Header: عدد النتائج + رابط عرض الكل
    const input = document.getElementById('search-modal-input');
    const q = input ? encodeURIComponent(input.value.trim()) : '';
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid #f0f0f0;background:#fafafa;border-radius:10px 10px 0 0;';
    header.innerHTML = '<span style="font-size:12px;color:#999;">' + products.length + ' نتيجة</span>'
        + '<a href="products.html?search=' + q + '" style="font-size:12px;color:#D6C1A6;font-weight:bold;text-decoration:none;">عرض الكل ←</a>';
    container.appendChild(header);

    products.forEach(p=>{
        const id = p._id || p.id || p.guid || '';
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid #f5f5f5;cursor:pointer;transition:background 0.15s;flex-direction:row-reverse;';
        item.onmouseenter = () => item.style.background = '#fdf8f4';
        item.onmouseleave = () => item.style.background = '';
        item.onclick = () => { window.location.href = 'product.html?id=' + encodeURIComponent(id); };

        // Image
        const imgWrap = document.createElement('div');
        imgWrap.style.cssText = 'width:64px;height:64px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#f5f5f5;';
        const img = document.createElement('img');
        img.src = (p.image || (p.images && p.images[0]) || 'images/default-product.jpg');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.onerror = () => { img.src = 'images/default-product.jpg'; };
        imgWrap.appendChild(img);

        // Info
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;text-align:right;';

        const name = document.createElement('div');
        name.style.cssText = 'font-weight:600;color:#333;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;';
        name.textContent = p.name || p.title || '';

        let priceHtml = '';
        if (p.discountPrice && Number(p.discountPrice) < Number(p.price)){
            priceHtml = '<span style="color:#D6C1A6;font-weight:bold;font-size:13px;margin-left:6px;">' + Number(p.discountPrice).toFixed(0) + ' ر.س</span>'
                      + '<span style="color:#ccc;font-size:11px;text-decoration:line-through;">' + Number(p.price).toFixed(0) + ' ر.س</span>';
        } else if (p.price){
            priceHtml = '<span style="color:#D6C1A6;font-weight:bold;font-size:13px;">' + Number(p.price).toFixed(0) + ' ر.س</span>';
        }
        const price = document.createElement('div');
        price.innerHTML = priceHtml;

        info.appendChild(name);
        info.appendChild(price);
        item.appendChild(imgWrap);
        item.appendChild(info);
        container.appendChild(item);
    });
}

function clearSearchResults(){ const c = document.getElementById('search-results'); if (c) c.innerHTML = ''; }

// Account Menu Functions
function showAccountMenu() {
    const user = window.currentUser || JSON.parse(localStorage.getItem('antika_user') || '{}');
    
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
                    <p class="font-bold text-gray-800 text-sm">${user.name || user.displayName || 'المستخدم'}</p>
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
            <a href="notifications.html" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">الإشعارات</p>
                </div>
            </a>
            
            <!-- الطلبات -->
            <a href="orders.html" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
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
            <a href="account.html" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">حسابي</p>
                </div>
            </a>
            
            <!-- عناويني (Saved Addresses) -->
            <a href="addresses.html" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">عناويني</p>
                </div>
            </a>

            <!-- الإعدادات -->
            <a href="settings.html" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
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
            if (!menu.contains(e.target) && e.target.id !== 'user-info-btn' && !e.target.closest('#user-info-btn')) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function showNotifications() {
    window.location.href = 'notifications.html';
}

async function logout() {
    // 📢 Notify all other pages BEFORE clearing localStorage
    if ('BroadcastChannel' in window) {
        const bc1 = new BroadcastChannel('auth_channel');
        const bc2 = new BroadcastChannel('auth_sync');
        bc1.postMessage({ action: 'logout' });
        bc2.postMessage('logout');
        bc1.close();
        bc2.close();
    }
    
    // 🚪 Sign out from Firebase first (CRITICAL!)
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            await firebase.auth().signOut();
            console.log('✅ Firebase signed out');
        }
    } catch (e) {
        console.warn('Firebase signOut error:', e);
    }
    
    // Also call Auth.logout if available
    try {
        if (window.Auth && typeof window.Auth.logout === 'function') {
            await window.Auth.logout();
        }
    } catch (e) {
        console.warn('Auth.logout error:', e);
    }
    
    // حذف جميع بيانات المستخدم
    localStorage.removeItem('antika_user');
    localStorage.removeItem('antika_token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    
    // حذف أي بيانات Firebase إذا وجدت
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('firebase') || key.includes('auth')) {
            localStorage.removeItem(key);
        }
    });
    
    // إعادة تحميل الصفحة
    window.location.href = 'index.html';
}