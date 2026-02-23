// Announcement Bar Component - Unified Version
class AntikaAnnouncementBar extends HTMLElement {
    constructor() {
        super();
        this.defaultText = ' Œ›Ì÷«  ÊŒ’Ê„«   ’· ≈·Ï 50% Ê Ê’Ì· „Ã«‰Ì ·Ã„Ì⁄ „œ‰ «·„„·ﬂ…';
        this.text = this.defaultText;
        this.isVisible = true;
    }

    getApiBase() {
        return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : '/api';
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async connectedCallback() {
        // Avoid visual flicker while fetching settings.
        this.style.display = 'none';
        await this.loadSettings();

        if (!this.isVisible) {
            this.innerHTML = '';
            this.style.display = 'none';
            return;
        }

        this.render();
        this.style.display = 'block';
    }

    async loadSettings() {
        try {
            const res = await fetch(`${this.getApiBase()}/announcing?t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            this.text = (typeof data.text === 'string' && data.text.trim()) ? data.text.trim() : this.defaultText;
            this.isVisible = data.isVisible !== false;
        } catch (e) {
            // Keep safe fallback so the store does not break.
            this.text = this.defaultText;
            this.isVisible = true;
            console.error('Announcement bar fallback mode:', e.message);
        }
    }

    render() {
        const item = `${this.escapeHtml(this.text)} \u2022 `;
        const content = item.repeat(70);

        this.innerHTML = `
            <style>
                .announcement-bar {
                    width: 100%;
                    overflow: hidden;
                    background: #D6C1A6;
                    color: #fff;
                    padding: 10px 0;
                    font-size: 14px;
                    line-height: 1;
                }
                .announcement-track {
                    display: inline-block;
                    white-space: nowrap;
                    animation: announcement-scroll 60s linear infinite;
                    font-family: 'Tajawal', sans-serif;
                    will-change: transform;
                }
                @keyframes announcement-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @media (max-width: 768px) {
                    .announcement-bar { font-size: 12px; padding: 8px 0; }
                }
            </style>
            <div class="announcement-bar" role="status" aria-label="Store announcements">
                <div class="announcement-track">${content}${content}</div>
            </div>
        `;
    }
}

if (!customElements.get('antika-announcement-bar')) {
    customElements.define('antika-announcement-bar', AntikaAnnouncementBar);
}