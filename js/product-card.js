// 🛍️ Antika Product Card - Unified Component
class AntikaProductCard extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    // Get attributes
    get product() {
        return JSON.parse(this.getAttribute('data-product') || '{}');
    }

    get variant() {
        return this.getAttribute('data-variant') || 'default';
    }

    get showEye() {
        return this.getAttribute('data-show-eye') !== 'false';
    }

    render() {
        const product = this.product;
        
        if (!product || !product.id) {
            this.innerHTML = '<p>Invalid product data</p>';
            return;
        }

        const hasDiscount = product.discountPrice && product.discountPrice < product.price;
        const imageUrl = product.images?.[0] || 'https://via.placeholder.com/800x800/D6C1A6/FFFFFF?text=Antika+Store';
        const isNew = product.isNew && new Date(product.newExpiryDate) > new Date();
        const isOutOfStock = product.stock <= 0 || product.isOutOfStock;

        // Badge HTML
        const newBadge = isNew ? `
            <div class="absolute top-4 right-4 bg-antika-pink text-white px-3 py-1 rounded-full text-xs font-bold">جديد</div>
        ` : '';

        // Out of Stock Ribbon - شريط قطري أحمر
        const outOfStockRibbon = isOutOfStock ? `
            <div class="out-of-stock-ribbon">
                نفذت الكمية
            </div>
        ` : '';

        // Eye icon
        const eyeButton = this.showEye ? `
            <button class="eye-icon" onclick="event.stopPropagation(); event.preventDefault(); openQuickView('${product.id}'); return false;" title="معاينة سريعة">
                <i class="fas fa-eye"></i>
            </button>
        ` : '';

        // (Removed wishlist button here — handled in quick-view/product page only)

        // Stock status
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

        // Button text based on variant
        const buttonText = 'أضف للسلة'; // ✅ موحد في كل مكان
        const buttonClass = this.variant === 'compact' 
            ? 'py-2 px-3 text-xs' 
            : 'py-3 px-4 text-sm';

        // Rating
        let ratingHtml = '';
        if (!product.reviews || product.reviews === 0) {
            ratingHtml = '<span class="text-gray-300">☆☆☆☆☆</span><span class="text-gray-400 ml-1">(0)</span>';
        } else {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += i <= product.rating ? '<span class="text-yellow-400">★</span>' : '<span class="text-gray-300">☆</span>';
            }
            ratingHtml = stars + `<span class="text-gray-400 ml-1">(${product.reviews})</span>`;
        }

        this.innerHTML = `
            <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
                <!-- Image Container -->
                <div class="product-image-container relative">
                    <img src="${imageUrl}" alt="${product.name}" class="w-full h-full object-cover">
                    ${newBadge}
                    ${outOfStockRibbon}
                    ${eyeButton}
                </div>

                <!-- Info -->
                <div class="p-4">
                    <h3 class="font-bold text-gray-800 mb-2 line-clamp-2">${product.name}</h3>
                    
                    ${stockHtml}
                    
                    <!-- Rating -->
                    <div class="flex items-center text-xs mb-2">
                        ${ratingHtml}
                    </div>

                    <!-- Price -->
                    <div class="mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-lg font-bold text-antika-gold">${product.discountPrice || product.price} ر.س</span>
                            ${hasDiscount ? `<span class="text-xs text-gray-400 line-through">${product.price} ر.س</span>` : ''}
                        </div>
                    </div>

                    <!-- Button -->
                    <button onclick="event.stopPropagation(); ${isOutOfStock ? 'return false;' : 'handleAddToCart(\'' + product.id + '\')'}" class="add-to-cart-btn w-full ${buttonClass} ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}">
                        <i class="fas fa-shopping-cart ml-2"></i> ${isOutOfStock ? 'نفذت الكمية' : buttonText}
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const btn = this.querySelector('.add-to-cart-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Dispatch event so parent can handle it
                this.dispatchEvent(new CustomEvent('add-to-cart', { 
                    detail: this.product,
                    bubbles: true 
                }));
            });
        }

        // No wishlist button on card; wishlist is handled in product page / quick-view
    }
}

// Register component
customElements.define('antika-product-card', AntikaProductCard);
