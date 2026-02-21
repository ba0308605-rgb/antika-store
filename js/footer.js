// 🌸 Antika Store - Unified Footer Component
// يستخدم في جميع الصفحات

class AntikaFooter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = this.getTemplate();
    }

    getTemplate() {
        return `
            <footer class="bg-antika-gold text-white py-12" style="background-color: #D6C1A6;">
                <div class="container mx-auto px-4">
                    <div class="grid md:grid-cols-4 gap-8">
                        <!-- Logo & Description -->
                        <div>
                            <div class="text-center mb-4">
                                <div class="text-3xl font-bold text-white" style="font-family: serif;">antika</div>
                                <div class="text-xs text-white/70 tracking-widest">أنتيكا</div>
                            </div>
                            <p class="text-white/90 leading-relaxed text-center">وجهتك الأولى للديكور والأثاث المنزلي الفاخر.</p>
                        </div>
                        
                        <!-- Quick Links -->
                        <div>
                            <h4 class="font-bold mb-4 text-white">روابط سريعة</h4>
                            <ul class="space-y-2 text-white/90">
                                <li><a href="index.html" class="hover:text-white transition">الرئيسية</a></li>
                                <li><a href="products.html" class="hover:text-white transition">المنتجات</a></li>
                                <li><a href="wishlist.html" class="hover:text-white transition">المفضلة</a></li>
                            </ul>
                        </div>
                        
                        <!-- Customer Service -->
                        <div>
                            <h4 class="font-bold mb-4 text-white">خدمة العملاء</h4>
                            <ul class="space-y-2 text-white/90">
                                <li><a href="pages.html?page=faq" class="hover:text-white transition">الأسئلة الشائعة</a></li>
                                <li><a href="pages.html?page=returns" class="hover:text-white transition">سياسة الإرجاع</a></li>
                            </ul>
                        </div>
                        
                        <!-- About -->
                        <div>
                            <h4 class="font-bold mb-4 text-white">عن المتجر</h4>
                            <ul class="space-y-2 text-white/90">
                                <li><a href="pages.html?page=about" class="hover:text-white transition">من نحن</a></li>
                                <li><a href="pages.html?page=terms" class="hover:text-white transition">الشروط والأحكام</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Copyright -->
                    <div class="border-t border-white/30 mt-8 pt-8 text-center text-white/90">
                        <p>© 2025 انتيكا استور. جميع الحقوق محفوظة.</p>
                    </div>
                </div>
            </footer>
        `;
    }
}

// Register the custom element
customElements.define('antika-footer', AntikaFooter);
