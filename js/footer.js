// 🌸 Antika Store - Unified Footer Component

class AntikaFooter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.ensureStickyFooterLayout();
        this.render();
    }

    ensureStickyFooterLayout() {
        const body = document.body;
        if (!body) return;
        body.style.minHeight = '100vh';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        const main = document.querySelector('main');
        if (main) {
            main.style.flex = '1 0 auto';
        } else {
            let candidate = this.previousElementSibling;
            while (candidate && (candidate.tagName === 'SCRIPT' || candidate.tagName === 'STYLE')) {
                candidate = candidate.previousElementSibling;
            }
            if (candidate) candidate.style.flex = '1 0 auto';
        }
        this.style.marginTop = 'auto';
        this.style.display = 'block';
        this.style.width = '100%';
    }

    async render() {
        // Show footer immediately with defaults
        this.innerHTML = this.getTemplate({});

        // Then fetch settings and update
        try {
            const res = await fetch('/api/settings');
            const settings = await res.json();
            this.innerHTML = this.getTemplate(settings);
        } catch (e) {
            // Keep defaults
        }
    }

    getTemplate(settings = {}) {
        const footer = settings.footer || {};
        const phone = footer.phone || '';
        const email = footer.email || '';
        const whatsapp = footer.whatsapp || '';
        const instagram = footer.instagram || '';
        const snapchat = footer.snapchat || '';
        const tiktok = footer.tiktok || '';
        const twitter = footer.twitter || '';

        // Social icons
        const socials = [
            { key: instagram, icon: 'fab fa-instagram', label: 'Instagram', color: '#E1306C' },
            { key: snapchat, icon: 'fab fa-snapchat', label: 'Snapchat', color: '#FFFC00' },
            { key: whatsapp, icon: 'fab fa-whatsapp', label: 'WhatsApp', color: '#25D366' },
            { key: tiktok, icon: 'fab fa-tiktok', label: 'TikTok', color: '#ffffff' },
            { key: twitter, icon: 'fab fa-x-twitter', label: 'X', color: '#ffffff' },
        ].filter(s => s.key);

        const socialsHTML = socials.length ? `
            <div class="flex gap-3 justify-center md:justify-start mt-4 flex-wrap">
                ${socials.map(s => `
                    <a href="${s.key}" target="_blank" rel="noopener"
                        class="w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-110"
                        style="background: rgba(255,255,255,0.15);"
                        title="${s.label}">
                        <i class="${s.icon} text-lg" style="color:${s.color}"></i>
                    </a>
                `).join('')}
            </div>
        ` : '';

        // Contact info
        const contactItems = [
            phone ? `<a href="tel:${phone}" class="flex items-center gap-2 text-white/90 hover:text-white transition text-sm"><i class="fas fa-phone-alt w-4 text-center"></i> ${phone}</a>` : '',
            email ? `<a href="mailto:${email}" class="flex items-center gap-2 text-white/90 hover:text-white transition text-sm"><i class="fas fa-envelope w-4 text-center"></i> ${email}</a>` : '',
            whatsapp ? `<a href="${whatsapp}" target="_blank" class="flex items-center gap-2 text-white/90 hover:text-white transition text-sm"><i class="fab fa-whatsapp w-4 text-center"></i> واتساب</a>` : '',
        ].filter(Boolean);

        const contactHTML = contactItems.length ? `
            <div>
                <h4 class="font-bold mb-4 text-white">تواصل معنا</h4>
                <div class="space-y-3">
                    ${contactItems.join('')}
                </div>
                ${socialsHTML}
            </div>
        ` : `
            <div>
                <h4 class="font-bold mb-4 text-white">تواصل معنا</h4>
                ${socialsHTML}
            </div>
        `;

        const hasContact = contactItems.length || socials.length;

        return `
            <footer style="background-color: #D6C1A6;" class="text-white py-12">
                <div class="container mx-auto px-4">
                    <div class="grid grid-cols-2 ${hasContact ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-8">

                        <!-- Logo & Description -->
                        <div class="col-span-2 md:col-span-1">
                            <div class="text-center md:text-right mb-4">
                                <div class="text-3xl font-bold text-white" style="font-family: serif;">antika</div>
                                <div class="text-xs text-white/70 tracking-widest">أنتيكا</div>
                            </div>
                            <p class="text-white/90 leading-relaxed text-center md:text-right text-sm">
                                وجهتك الأولى للديكور والأثاث المنزلي الفاخر.
                            </p>
                        </div>

                        <!-- Quick Links -->
                        <div>
                            <h4 class="font-bold mb-4 text-white">روابط سريعة</h4>
                            <ul class="space-y-2 text-white/90 text-sm">
                                <li><a href="index.html" class="hover:text-white transition">الرئيسية</a></li>
                                <li><a href="products.html" class="hover:text-white transition">المنتجات</a></li>
                                <li><a href="products.html?discount=true" class="hover:text-white transition">🔥 العروض</a></li>
                                <li><a href="products.html?new=true" class="hover:text-white transition">✨ وصل حديثاً</a></li>
                                <li><a href="wishlist.html" class="hover:text-white transition">المفضلة</a></li>
                            </ul>
                        </div>

                        <!-- Customer Service -->
                        <div>
                            <h4 class="font-bold mb-4 text-white">خدمة العملاء</h4>
                            <ul class="space-y-2 text-white/90 text-sm">
                                <li><a href="pages.html?page=faq" class="hover:text-white transition">الأسئلة الشائعة</a></li>
                                <li><a href="pages.html?page=returns" class="hover:text-white transition">سياسة الإرجاع</a></li>
                                <li><a href="pages.html?page=about" class="hover:text-white transition">من نحن</a></li>
                                <li><a href="pages.html?page=terms" class="hover:text-white transition">الشروط والأحكام</a></li>
                            </ul>
                        </div>

                        <!-- Contact -->
                        ${hasContact ? contactHTML : ''}

                    </div>

                    <!-- Divider & Copyright -->
                    <div class="border-t border-white/30 mt-8 pt-8 text-center text-white/80 text-sm">
                        <p>© 2025 انتيكا استور. جميع الحقوق محفوظة.</p>
                    </div>
                </div>
            </footer>
        `;
    }
}

customElements.define('antika-footer', AntikaFooter);