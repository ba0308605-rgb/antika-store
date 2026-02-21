// 🔄 Auth Sync - يعمل في جميع الصفحات
// يتحقق من حالة تسجيل الدخول كل ثانية

(function() {
    let lastAuthState = localStorage.getItem('antika_user') !== null;
    
    // فحص دوري كل ثانية
    setInterval(() => {
        const currentAuthState = localStorage.getItem('antika_user') !== null;
        
        // إذا تغيرت الحالة
        if (currentAuthState !== lastAuthState) {
            console.log('🔔 Auth state changed:', lastAuthState, '→', currentAuthState);
            lastAuthState = currentAuthState;
            
            // إعادة تحميل الصفحة لتطبيق التغييرات
            window.location.reload();
        }
    }, 1000);
    
    // استقبال رسائل من صفحات أخرى
    if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('auth_sync');
        bc.onmessage = async (event) => {
            if (event.data === 'logout') {
                console.log('📢 Logout received from another page');
                // Wait a bit for Firebase signOut to complete on the source page
                await new Promise(resolve => setTimeout(resolve, 500));
                // حذف البيانات وإعادة التحميل
                localStorage.removeItem('antika_user');
                localStorage.removeItem('antika_token');
                window.location.reload();
            }
        };
    }
})();
