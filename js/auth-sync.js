// 🔄 Auth Sync - يعمل في جميع الصفحات
// ⚠️ الفحص الدوري (setInterval كل ثانية) اتشال بالكامل — كان يسبب حلقة reload لا نهائية:
// Firebase يحتاج جزء من الثانية لتأكيد الجلسة عند كل تحميل صفحة، وهذا التأخير الطبيعي كان
// يُفسَّر خطأً كـ"تسجيل دخول/خروج حقيقي" فيعمل reload، وبعد الـreload يتكرر نفس التأخير الطبيعي
// فيُكتشف "تغيير" من جديد ويعمل reload مرة ثانية... وهكذا بلا توقف.
// المزامنة الصحيحة بين التبويبات موجودة أصلاً بـ js/header.js عبر حدث المتصفح الحقيقي 'storage'
// (يشتغل بس لو التغيير صار بتبويب مختلف، فما يقع بنفس هذا الفخ إطلاقاً).

(function() {
    // نبقي استقبال رسائل تسجيل الخروج عبر BroadcastChannel كطبقة حماية إضافية فقط
    // (بدون أي فحص دوري/polling يسبب مشاكل)
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