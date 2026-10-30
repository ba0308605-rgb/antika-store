// 💬 عرض تعليقات العملاء (تعليقات نفخر بها) — مشترك بين الرئيسية وصفحة "عرض الكل"
// الاستخدام: AntikaTestimonials.render(containerEl, items)  — items من FeedbackAPI.publicList()
(function () {
    'use strict';
    var COLORS = [
        { bg: '#FFF0F5', fg: '#FF69B4' },
        { bg: '#FAF0E6', fg: '#C4AC8E' },
        { bg: '#F3EEFB', fg: '#8B6FD1' },
        { bg: '#EAF6F0', fg: '#3E9C6F' }
    ];
    var LONG_TEXT = 180;

    function ensureStyles() {
        if (document.getElementById('tm-styles')) return;
        var s = document.createElement('style');
        s.id = 'tm-styles';
        s.textContent = [
            '.tm-grid{column-count:1;column-gap:16px}',
            '@media(min-width:640px){.tm-grid{column-count:2}}',
            '@media(min-width:1024px){.tm-grid{column-count:3;column-gap:20px}}',
            '.tm-card{break-inside:avoid;-webkit-column-break-inside:avoid;margin:0 0 16px;background:#fff;border-radius:20px;padding:22px 20px 18px;position:relative;overflow:hidden;box-shadow:0 2px 14px rgba(214,193,166,.28);border:1px solid #f3ece4;opacity:0;transform:translateY(14px);animation:tmIn .55s ease forwards}',
            '.tm-card.tm-featured{border-color:#FFB6C1;box-shadow:0 6px 22px rgba(255,105,180,.16)}',
            '.tm-card::before{content:"\\201D";position:absolute;top:-6px;left:14px;font-size:84px;line-height:1;color:#FFB6C1;opacity:.28;font-family:Georgia,serif;pointer-events:none}',
            '.tm-stars{font-size:18px;line-height:1;margin-bottom:10px;letter-spacing:2px}',
            '.tm-text{font-size:15px;line-height:1.9;color:#374151;margin:0;white-space:pre-wrap;word-break:break-word}',
            '.tm-text.tm-clamp{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}',
            '.tm-more{background:none;border:0;padding:0;margin-top:6px;font-size:13px;font-weight:700;color:#C4AC8E;cursor:pointer;font-family:inherit}',
            '.tm-more:hover{color:#FF69B4}',
            '.tm-foot{display:flex;align-items:center;gap:10px;margin-top:16px;padding-top:14px;border-top:1px dashed #efe6dc}',
            '.tm-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0}',
            '.tm-name{font-weight:700;font-size:14px;color:#1f2937;line-height:1.3}',
            '.tm-city{font-size:12px;color:#9ca3af}',
            '.tm-verified{margin-right:auto;font-size:11px;font-weight:700;color:#3E9C6F;background:#EAF6F0;border-radius:999px;padding:3px 9px;white-space:nowrap}',
            '@keyframes tmIn{to{opacity:1;transform:none}}',
            '@media(prefers-reduced-motion:reduce){.tm-card{animation:none;opacity:1;transform:none}}'
        ].join('');
        document.head.appendChild(s);
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function buildCard(item, idx) {
        var rating = Math.max(0, Math.min(5, Number(item.rating) || 0));
        var card = el('article', 'tm-card' + (item.featured ? ' tm-featured' : ''));
        card.style.animationDelay = (Math.min(idx, 10) * 70) + 'ms';

        var stars = el('div', 'tm-stars');
        stars.setAttribute('aria-label', rating + ' من 5');
        var on = el('span', null, '\u2605'.repeat(rating));
        on.style.color = '#FBBF24';
        var off = el('span', null, '\u2605'.repeat(5 - rating));
        off.style.color = '#E5E7EB';
        stars.appendChild(on); stars.appendChild(off);
        card.appendChild(stars);

        var msg = String(item.message || '');
        var text = el('p', 'tm-text' + (msg.length > LONG_TEXT ? ' tm-clamp' : ''), msg);
        card.appendChild(text);
        if (msg.length > LONG_TEXT) {
            var more = el('button', 'tm-more', 'اقرأ المزيد');
            more.type = 'button';
            more.onclick = function () {
                var clamped = text.classList.toggle('tm-clamp');
                more.textContent = clamped ? 'اقرأ المزيد' : 'عرض أقل';
            };
            card.appendChild(more);
        }

        var name = String(item.name || 'عميل');
        var c = COLORS[idx % COLORS.length];
        var foot = el('div', 'tm-foot');
        var av = el('div', 'tm-avatar', Array.from(name)[0] || '؟');
        av.style.background = c.bg; av.style.color = c.fg;
        var who = el('div');
        who.appendChild(el('div', 'tm-name', name));
        if (item.city) who.appendChild(el('div', 'tm-city', item.city));
        foot.appendChild(av); foot.appendChild(who);
        if (item.verified) foot.appendChild(el('span', 'tm-verified', '\u2713 طلب موثّق'));
        card.appendChild(foot);
        return card;
    }

    function render(container, items) {
        if (!container) return;
        ensureStyles();
        container.innerHTML = '';
        container.classList.add('tm-grid');
        (items || []).forEach(function (it, i) { container.appendChild(buildCard(it, i)); });
    }

    window.AntikaTestimonials = { render: render };
})();
