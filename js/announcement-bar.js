// Announcement Bar Component - Unified Version

class AntikaAnnouncementBar extends HTMLElement {
    constructor() {
        super();
        this.text = 'تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة';
        this.isVisible = true;
        console.log('📢 Announcement bar: Constructor called');
    }

    async connectedCallback() {
        console.log('📢 Announcement bar: Connected to DOM');
        await this.loadSettings();
        
        console.log('📢 Announcement bar: isVisible =', this.isVisible);
        
        if (!this.isVisible) {
            console.log('📢 Announcement bar: Hiding (isVisible = false)');
            this.style.display = 'none';
            return;
        }
        
        this.render();
        console.log('📢 Announcement bar: Rendered');
    }

    async loadSettings() {
        try {
            const res = await fetch(`http://localhost:3000/api/announcing?t=${Date.now()}`);
            const data = await res.json();
            
            if (data.text) this.text = data.text;
            this.isVisible = data.isVisible !== false;
            
            console.log('📢 Announcement bar settings loaded:', { 
                isVisible: this.isVisible, 
                text: this.text 
            });
        } catch (e) {
            console.error('📢 Announcement bar error:', e);
            console.log('Using default announcement settings');
        }
    }

    render() {
        const item = this.text + ' ❖ ';
        const content = item.repeat(100);
        
        this.innerHTML = `
            <style>
                .announcement-bar {
                    width: 100%;
                    overflow: hidden;
                    background: #D6C1A6;
                    color: white;
                    padding: 10px 0;
                    font-size: 14px;
                }
                .announcement-track {
                    display: inline-block;
                    white-space: nowrap;
                    animation: announcement-scroll 60s linear infinite;
                    font-family: 'Tajawal', sans-serif;
                }
                @keyframes announcement-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @media(max-width:768px){
                    .announcement-bar { font-size: 12px; padding: 8px 0; }
                }
            </style>
            <div class="announcement-bar">
                <div class="announcement-track">${content}${content}</div>
            </div>
        `;
    }
}

// Register
customElements.define('antika-announcement-bar', AntikaAnnouncementBar);
console.log('📢 Announcement bar component registered');
