// 🔍 QUICK VIEW - معاينة سريعة للمنتج (متقدمة)
async function openQuickView(productId) {
    console.log('🔍 Opening quick view for product:', productId);
    
    try {
        const products = await API.getProducts();
        const product = products.find(p => (p.id || p._id) == productId);
        
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }

        const images = product.images || ['https://via.placeholder.com/400x400/D6C1A6/FFFFFF?text=No+Image'];
        const price = product.discountPrice || product.price;
        const originalPrice = product.price;
        const hasDiscount = product.discountPrice && product.discountPrice < product.price;
        
        // بناء HTML المعاينة - تصميم متقدم
        const quickViewHTML = `
            <div id="quick-view-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            " onclick="if(event.target.id === 'quick-view-overlay') closeQuickView()">
                <div style="
                    background: white;
                    border-radius: 20px;
                    max-width: 900px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    position: relative;
                    animation: slideUp 0.3s ease;
                " onclick="event.stopPropagation()">
                    <!-- زر الإغلاق على مستوى الـ overlay (خارج المحتوى) -->
                    <button id="qv-overlay-close" onclick="closeQuickView()" style="
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        width: 44px;
                        height: 44px;
                        background: white;
                        border: none;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
                        z-index: 80;
                    " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">✕</button>

                    <!-- الصور على اليمين -->
                    <div style="
                        background: #f5f5f5;
                        position: relative;
                        border-radius: 20px 0 0 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                    ">
                        <!-- الصورة الرئيسية -->
                        <img id="qv-main-image" src="${images[0]}" alt="${product.name}" style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            animation: fadeIn 0.3s ease;
                        ">
                        
                        <!-- الأسهم للتنقل - نظهرها دائماً (مع تعطيلها لو كانت صورة واحدة) -->
                        <!-- معكوس: نجعل زر اليسار ينقلك للصورة التالية وزر اليمين للصورة السابقة -->
                        <button id="qv-prev-btn" onclick="quickViewNextImage('${productId}')" style="
                            position: absolute;
                            left: 18px;
                            top: 50%;
                            transform: translateY(-50%);
                            width: 52px;
                            height: 52px;
                            background: rgba(255,255,255,0.95);
                            border: none;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            transition: all 0.15s;
                            box-shadow: 0 10px 26px rgba(0,0,0,0.22);
                            z-index: 120;
                        " onmouseover="this.style.background='white'" onmouseout="this.style.background='rgba(255,255,255,0.95)'"><span style="line-height:0;">›</span>
                        </button>
                        <button id="qv-next-btn" onclick="quickViewPrevImage('${productId}')" style="
                            position: absolute;
                            right: 18px;
                            top: 50%;
                            transform: translateY(-50%);
                            width: 52px;
                            height: 52px;
                            background: rgba(255,255,255,0.95);
                            border: none;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            transition: all 0.15s;
                            box-shadow: 0 10px 26px rgba(0,0,0,0.22);
                            z-index: 120;
                        " onmouseover="this.style.background='white'" onmouseout="this.style.background='rgba(255,255,255,0.95)'"><span style="line-height:0;">‹</span>
                        </button>

                        <!-- مؤشر الصور -->
                        <div id="qv-image-counter-wrap" style="
                            position: absolute;
                            bottom: 15px;
                            color: #666;
                            background: white;
                            padding: 5px 15px;
                            border-radius: 20px;
                            font-size: 12px;
                            z-index: 60;
                        ">
                            <span id="qv-image-counter">1</span> / ${images.length}
                        </div>

                        <!-- أيقونات المشاركة والإعجاب داخل منطقة الصورة أعلى يسار -->
                        <div style="
                            position: absolute;
                            top: 12px;
                            left: 12px;
                            z-index: 150;
                        ">

                            <button id="qv-heart-btn" class="qv-heart-btn" style="
                                width: 44px;
                                height: 44px;
                                border: 2px solid #ececec;
                                background: white;
                                border-radius: 50%;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 16px;
                                transition: all 0.22s ease;
                                box-shadow: 0 8px 24px rgba(0,0,0,0.16);
                            " title="إضافة للمفضلة" onclick="toggleWishlist('${product.id}')">
                                <i id="qv-heart-icon" class="far fa-heart" style="color: #7d7d7d;"></i>
                            </button>
                        </div>

                        
                    </div>

                    <!-- التفاصيل على اليسار -->
                    <div style="
                        padding: 30px;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                    ">

                        <!-- الاسم (مع مسافة علويّة كافية) -->
                            <h2 style="
                                font-size: 22px;
                                font-weight: bold;
                                margin-top: 8px;
                                margin-bottom: 15px;
                                color: #333;
                                padding-top: 24px;
                            ">${product.name}</h2>

                        <!-- الوصف -->
                        <p style="
                            color: #666;
                            font-size: 13px;
                            line-height: 1.6;
                            margin-bottom: 20px;
                        ">${product.description || 'منتج عالي الجودة'}</p>

                        <!-- السعر والخصم -->
                        <div style="margin-bottom: 20px;">
                            ${hasDiscount ? `
                                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 5px;">
                                    <span style="font-size: 26px; font-weight: bold; color: #c41e3a;">
                                        ${price} ر.س
                                    </span>
                                    <span style="font-size: 14px; color: #999; text-decoration: line-through;">
                                        ${originalPrice} ر.س
                                    </span>
                                </div>
                                <span style="color: #c41e3a; font-size: 12px; font-weight: bold;">
                                    توفير: ${Math.round(((originalPrice - price) / originalPrice) * 100)}%
                                </span>
                            ` : `
                                <div style="font-size: 26px; font-weight: bold; color: #D6C1A6;">
                                    ${price} ر.س
                                </div>
                            `}
                        </div>

                        <!-- المخزون والحالة -->
                        <div style="margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 10px;">
                            ${product.stock > 0 ? `
                                <div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">
                                    ✓ متوفر الآن
                                </div>
                                <div style="font-size: 12px; color: #666;">
                                    ${product.stock} قطعة متاحة
                                </div>
                            ` : `
                                <div style="color: #f44336; font-weight: bold;">
                                    ✗ نفذت الكمية
                                </div>
                            `}
                        </div>

                        <!-- الكمية والسعر -->
                        <div style="margin-bottom: 20px;">
                            <div style="margin-bottom: 10px; color: #666; font-size: 14px; font-weight: bold;">
                                الكمية
                            </div>
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                margin-bottom: 10px;
                            ">
                                <button onclick="qvDecreaseQty()" style="
                                    width: 36px;
                                    height: 36px;
                                    border: 1px solid #ddd;
                                    background: white;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 18px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.borderColor='#D6C1A6'" onmouseout="this.style.borderColor='#ddd'">
                                    −
                                </button>
                                <input id="qv-quantity" type="number" value="1" min="1" style="
                                    width: 50px;
                                    text-align: center;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    padding: 8px;
                                    font-size: 16px;
                                " onchange="this.value = Math.max(1, parseInt(this.value) || 1)">
                                <button onclick="qvIncreaseQty()" style="
                                    width: 36px;
                                    height: 36px;
                                    border: 1px solid #ddd;
                                    background: white;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 18px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.borderColor='#D6C1A6'" onmouseout="this.style.borderColor='#ddd'">
                                    +
                                </button>
                            </div>
                            <div style="
                                text-align: right;
                                font-size: 14px;
                                color: #666;
                                font-weight: bold;
                            ">
                                السعر: <span id="qv-total-price">${price}</span> ر.س
                            </div>
                        </div>

                        <!-- الأزرار -->
                        <div style="display: flex; gap: 12px;">
                            <button onclick="qvAddToCart('${product.id}'); closeQuickView();" style="
                                flex: 1;
                                background: #6B5E3F;
                                color: white;
                                padding: 14px;
                                border: none;
                                border-radius: 8px;
                                font-size: 16px;
                                font-weight: bold;
                                cursor: pointer;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='#5a4e34'" onmouseout="this.style.background='#6B5E3F'">
                                🛒 أضف للسلة
                            </button>
                            <button onclick="window.location.href='product.html?id=${product.id}'; closeQuickView();" style="
                                flex: 1;
                                background: white;
                                color: #6B5E3F;
                                padding: 14px;
                                border: 2px solid #6B5E3F;
                                border-radius: 8px;
                                font-size: 16px;
                                font-weight: bold;
                                cursor: pointer;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                                📋 التفاصيل
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                #quick-view-overlay {
                    -webkit-animation: fadeIn 0.3s ease;
                }
                .qv-heart-btn.qv-heart-active {
                    border-color: rgba(231, 76, 60, 0.22) !important;
                    background: #fff6f6 !important;
                    box-shadow: 0 10px 26px rgba(231, 76, 60, 0.2) !important;
                }
            </style>
        `;

        // إضافة المعاينة للصفحة
        const container = document.createElement('div');
        container.innerHTML = quickViewHTML;
        document.body.appendChild(container);
        document.body.style.overflow = 'hidden';

        // Enhance wishlist button to match product page style and interactions
        const heartBtn = document.getElementById('qv-heart-btn');
        const heartIconElem = document.getElementById('qv-heart-icon');
        if (heartBtn) {
            heartBtn.style.position = 'absolute';
            heartBtn.style.top = '12px';
            heartBtn.style.left = '12px';
            heartBtn.style.width = '44px';
            heartBtn.style.height = '44px';
            heartBtn.style.background = 'white';
            heartBtn.style.borderRadius = '50%';
            heartBtn.style.display = 'flex';
            heartBtn.style.alignItems = 'center';
            heartBtn.style.justifyContent = 'center';
            heartBtn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
            heartBtn.style.cursor = 'pointer';
            heartBtn.style.transition = 'transform 0.15s ease, background 0.15s ease, color 0.15s ease';

            heartBtn.addEventListener('mouseenter', () => {
                heartBtn.style.transform = 'scale(1.06)';
                if (heartIconElem && !heartIconElem.classList.contains('fas')) heartIconElem.style.color = '#ef4444';
            });
            heartBtn.addEventListener('mouseleave', () => {
                heartBtn.style.transform = 'scale(1)';
                if (heartIconElem && !heartIconElem.classList.contains('fas')) heartIconElem.style.color = '#7d7d7d';
            });

            // Sync initial heart state from local wishlist
            try {
                const localUser = JSON.parse(localStorage.getItem('antika_user') || '{}');
                const authUser = (window.Auth && typeof Auth.getCurrentUser === 'function') ? Auth.getCurrentUser() : (window.Auth ? Auth.currentUser : null);
                const wishlistScope = String(
                    (authUser && (authUser.uid || authUser.email))
                    || localUser.uid
                    || localUser.email
                    || 'guest'
                ).toLowerCase();
                const wishlistKey = `wishlist_${wishlistScope}`;
                const localWishlist = JSON.parse(localStorage.getItem(wishlistKey) || '[]').map(String);
                if (localWishlist.includes(String(product.id))) {
                    if (heartIconElem) {
                        heartIconElem.classList.remove('far');
                        heartIconElem.classList.add('fas');
                        heartIconElem.style.color = '#e74c3c';
                    }
                    heartBtn.classList.add('qv-heart-active');
                }
                // Fallback: if not in local, check remote wishlist and sync local copy
                else if (window.Auth && typeof Auth.getWishlist === 'function' && authUser) {
                    Auth.getWishlist().then((remote) => {
                        const exists = Array.isArray(remote) && remote.some(item => String(item.productId || item.id) === String(product.id));
                        if (!exists) return;
                        const merged = Array.from(new Set([...(localWishlist || []), String(product.id)]));
                        localStorage.setItem(wishlistKey, JSON.stringify(merged));
                        if (heartIconElem) {
                            heartIconElem.classList.remove('far');
                            heartIconElem.classList.add('fas');
                            heartIconElem.style.color = '#e53935';
                        }
                        heartBtn.classList.add('qv-heart-active');
                    }).catch(() => {});
                }
            } catch (e) { }
        }
        
        // تحديث سعر الكمية
        const qtyInput = document.getElementById('qv-quantity');
        qtyInput.addEventListener('change', updateQVPrice);
        
        // حفظ صور المنتج الحالية
        window.currentQVProduct = {
            id: product.id,
            images: images,
            price: price,
            currentImageIndex: 0
        };

        // تعطيل الأزرار إذا كانت صورة واحدة فقط
        const prevBtn = document.getElementById('qv-prev-btn');
        const nextBtn = document.getElementById('qv-next-btn');
        const imgCounterWrap = document.getElementById('qv-image-counter-wrap');
        if (images.length <= 1) {
            if (prevBtn) { prevBtn.style.opacity = '0.6'; prevBtn.style.pointerEvents = 'none'; }
            if (nextBtn) { nextBtn.style.opacity = '0.6'; nextBtn.style.pointerEvents = 'none'; }
            if (imgCounterWrap) imgCounterWrap.style.display = 'none';
        }

        // تعيين العداد الظاهر
        const counter = document.getElementById('qv-image-counter');
        if (counter) counter.textContent = '1';

        console.log('✅ Quick view opened successfully');
    } catch (error) {
        console.error('❌ Error opening quick view:', error);
        alert('خطأ في فتح المعاينة');
    }
}

// تحديث السعر حسب الكمية
function updateQVPrice() {
    if (!window.currentQVProduct) return;
    const qty = parseInt(document.getElementById('qv-quantity').value) || 1;
    const totalPrice = (window.currentQVProduct.price * qty).toFixed(2);
    document.getElementById('qv-total-price').textContent = totalPrice;
}

// زيادة الكمية
function qvIncreaseQty() {
    const qtyInput = document.getElementById('qv-quantity');
    qtyInput.value = parseInt(qtyInput.value) + 1;
    updateQVPrice();
}

// تقليل الكمية
function qvDecreaseQty() {
    const qtyInput = document.getElementById('qv-quantity');
    const qty = Math.max(1, parseInt(qtyInput.value) - 1);
    qtyInput.value = qty;
    updateQVPrice();
}

// الصورة السابقة
function quickViewPrevImage(productId) {
    if (!window.currentQVProduct) return;
    window.currentQVProduct.currentImageIndex = (window.currentQVProduct.currentImageIndex - 1 + window.currentQVProduct.images.length) % window.currentQVProduct.images.length;
    const img = document.getElementById('qv-main-image');
    img.style.animation = 'none';
    setTimeout(() => {
        img.src = window.currentQVProduct.images[window.currentQVProduct.currentImageIndex];
        img.style.animation = 'fadeIn 0.3s ease';
    }, 10);
    document.getElementById('qv-image-counter').textContent = window.currentQVProduct.currentImageIndex + 1;
}

// الصورة التالية
function quickViewNextImage(productId) {
    if (!window.currentQVProduct) return;
    window.currentQVProduct.currentImageIndex = (window.currentQVProduct.currentImageIndex + 1) % window.currentQVProduct.images.length;
    const img = document.getElementById('qv-main-image');
    img.style.animation = 'none';
    setTimeout(() => {
        img.src = window.currentQVProduct.images[window.currentQVProduct.currentImageIndex];
        img.style.animation = 'fadeIn 0.3s ease';
    }, 10);
    document.getElementById('qv-image-counter').textContent = window.currentQVProduct.currentImageIndex + 1;
}

// إضافة للسلة من المعاينة
async function qvAddToCart(productId) {
    const authUser = (window.Auth && typeof Auth.getCurrentUser === 'function') ? Auth.getCurrentUser() : (window.Auth ? Auth.currentUser : null);
    if (!authUser) {
        showToast('Please login first to add items to cart', 'error');
        return;
    }
    const qty = parseInt(document.getElementById('qv-quantity').value) || 1;
    for (let i = 0; i < qty; i++) {
        await addToCart(productId);
    }
}

// إغلاق المعاينة
function closeQuickView() {
    console.log('🔒 Closing quick view');
    const overlay = document.getElementById('quick-view-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = 'auto';
    }
    window.currentQVProduct = null;
}

// إضافة/إزالة من المفضلة مع تحديث الأيقونة
async function toggleWishlist(productId) {
    const authUser = (window.Auth && typeof Auth.getCurrentUser === 'function') ? Auth.getCurrentUser() : (window.Auth ? Auth.currentUser : null);
    if (!authUser) {
        showToast('Please login first to add items to wishlist', 'error');
        return;
    }

    const heartIcon = document.getElementById('qv-heart-icon');
    const heartBtn = document.getElementById('qv-heart-btn');
    const isFilled = heartIcon && heartIcon.classList.contains('fas');

    function getWishlistStorageKey() {
        try {
            const localUser = JSON.parse(localStorage.getItem('antika_user') || '{}');
            const user = (window.Auth && typeof Auth.getCurrentUser === 'function') ? Auth.getCurrentUser() : (window.Auth ? Auth.currentUser : null);
            const scope = String(
                (user && (user.uid || user.email))
                || localUser.uid
                || localUser.email
                || 'guest'
            ).toLowerCase();
            return `wishlist_${scope}`;
        } catch (e) {
            return 'wishlist_guest';
        }
    }

    function getLocalWishlist() {
        try { return JSON.parse(localStorage.getItem(getWishlistStorageKey()) || '[]').map(String); }
        catch (e) { return []; }
    }
    function saveLocalWishlist(list) {
        localStorage.setItem(getWishlistStorageKey(), JSON.stringify(Array.from(new Set(list.map(String)))));
    }
    function addLocalWishlist(id) {
        const list = getLocalWishlist();
        if (!list.includes(String(id))) list.push(String(id));
        saveLocalWishlist(list);
    }
    function removeLocalWishlist(id) {
        const list = getLocalWishlist().filter(x => x !== String(id));
        saveLocalWishlist(list);
    }

    function animateHeart(icon, isAdding = true) {
        try {
            if (!icon) return;

            const hostBtn = icon.closest('button');
            if (hostBtn) {
                hostBtn.animate(
                    [
                        { transform: 'scale(1)' },
                        { transform: 'scale(1.07)' },
                        { transform: 'scale(1)' }
                    ],
                    { duration: 240, easing: 'ease-out' }
                );
            }

            icon.animate([
                { transform: 'scale(1) rotate(0deg)' },
                { transform: `scale(${isAdding ? 1.35 : 1.2}) rotate(${isAdding ? -10 : 8}deg)` },
                { transform: 'scale(1) rotate(0deg)' }
            ], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });

            if (isAdding && hostBtn) {
                hostBtn.style.position = hostBtn.style.position || 'relative';
                const ring = document.createElement('span');
                ring.style.position = 'absolute';
                ring.style.inset = '8px';
                ring.style.border = '2px solid rgba(231, 76, 60, 0.35)';
                ring.style.borderRadius = '50%';
                ring.style.pointerEvents = 'none';
                ring.style.transform = 'scale(0.6)';
                ring.style.opacity = '0.95';
                hostBtn.appendChild(ring);
                ring.animate(
                    [
                        { transform: 'scale(0.6)', opacity: 0.95 },
                        { transform: 'scale(1.55)', opacity: 0 }
                    ],
                    { duration: 420, easing: 'ease-out' }
                );
                setTimeout(() => ring.remove(), 430);
            }
        } catch (e) { }
    }

    function markHeartActive(active) {
        if (!heartIcon) return;
        heartIcon.classList.toggle('fas', !!active);
        heartIcon.classList.toggle('far', !active);
        heartIcon.style.color = active ? '#e53935' : '#7d7d7d';
        if (heartBtn) heartBtn.classList.toggle('qv-heart-active', !!active);
    }

    try {
        if (isFilled) {
            if (typeof Auth.removeFromWishlist === 'function') {
                const res = await Auth.removeFromWishlist(productId);
                if (res.success) {
                    removeLocalWishlist(productId);
                    markHeartActive(false);
                    animateHeart(heartIcon, false);
                    showToast('Removed from wishlist', 'info');
                } else {
                    showToast(res.error || 'Failed to remove item', 'error');
                }
            } else {
                showToast('Wishlist service is unavailable', 'error');
            }
        } else {
            const res = await Auth.addToWishlist(productId);
            let existsRemotely = false;
            if (!res.success && typeof Auth.getWishlist === 'function') {
                try {
                    const remote = await Auth.getWishlist();
                    existsRemotely = Array.isArray(remote) && remote.some(item => String(item.productId || item.id) === String(productId));
                } catch (e) {}
            }
            if (res.success || existsRemotely) {
                addLocalWishlist(productId);
                markHeartActive(true);
                animateHeart(heartIcon, true);
                showToast('Added to wishlist', 'success');
            } else {
                showToast(res.error || 'Failed to add to wishlist', 'error');
            }
        }
    } catch (err) {
        console.error('Wishlist toggle error:', err);
        const msg = err && err.message ? err.message : String(err);
        showToast('Action failed: ' + msg, 'error');
    }
}

// Toast helper: message (string), type = 'success'|'error'|'info'
function showToast(message, type = 'success') {
    try {
        // Reuse existing toast container if present
        let container = document.getElementById('site-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'site-toast-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            container.style.zIndex = 20000;
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '8px';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.padding = '10px 16px';
        toast.style.borderRadius = '8px';
        toast.style.color = '#fff';
        toast.style.fontSize = '14px';
        toast.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
        toast.style.maxWidth = '90%';
        toast.style.textAlign = 'center';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 220ms ease, transform 220ms ease';

        if (type === 'success') {
            toast.style.background = '#27ae60';
        } else if (type === 'error') {
            toast.style.background = '#c0392b';
        } else {
            toast.style.background = '#2c3e50';
        }

        container.appendChild(toast);

        // Trigger show
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Auto remove after 2.5s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    } catch (e) {
        console.warn('Toast failed', e);
    }
}

