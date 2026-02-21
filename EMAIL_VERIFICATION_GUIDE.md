# 📧 دليل التحقق من البريد الإلكتروني والهاتف

## 1️⃣ **التحقق من البريد الإلكتروني (Email Verification)**

### **الخيار 1: Firebase Built-in Verification (الأسهل)**
Firebase توفر طريقة مدمجة للتحقق من البريد الإلكتروني:

```javascript
// في js/auth.js - بعد التسجيل
async userRegister(name, email, password, phone = '', originalEmail = null) {
    const userCredential = await firebase.auth()
        .createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // إرسال رسالة التحقق
    await user.sendEmailVerification();
    
    // إخبار المستخدم
    alert('تم إرسال رسالة تحقق إلى بريدك الإلكتروني. يرجى التحقق من البريد.');
    
    // حفظ حالة المستخدم (غير موثق حتى التحقق)
    // ...
}
```

### **الخيار 2: Custom Email Verification (المتقدم)**
إرسال رسالة بريد مخصصة من الخادم:

```javascript
// في server.js
app.post('/api/send-verification-email', async (req, res) => {
    const { email } = req.body;
    
    // توليد رمز التحقق
    const verificationCode = generateRandomCode(6);
    
    // حفظ الرمز مؤقتاً (مع انتهاء صلاحيته بعد 15 دقيقة)
    const verification = {
        email: email,
        code: verificationCode,
        expiresAt: Date.now() + 15 * 60 * 1000
    };
    
    // حفظ في قاعدة البيانات أو Redis
    
    // إرسال البريد
    await sendEmail({
        to: email,
        subject: 'رمز التحقق من انتيكا استور',
        body: `رمز التحقق الخاص بك: ${verificationCode}`
    });
    
    res.json({ success: true });
});

// التحقق من الرمز
app.post('/api/verify-email', async (req, res) => {
    const { email, code } = req.body;
    
    // البحث عن الرمز
    const verification = getVerification(email);
    
    if (!verification || verification.code !== code || verification.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'رمز غير صحيح أو منتهي الصلاحية' });
    }
    
    // تحديث حالة المستخدم
    await User.findOneAndUpdate(
        { email },
        { emailVerified: true, verificationCode: null }
    );
    
    res.json({ success: true, message: 'تم التحقق من البريد بنجاح' });
});
```

---

## 2️⃣ **التحقق من رقم الهاتف (Phone Verification)**

### **الخيار 1: Firebase Phone Authentication**
Firebase توفر OTP عبر SMS:

```javascript
// تسجيل الدخول عبر الهاتف
async phoneLogin(phoneNumber) {
    const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');
    
    const confirmationResult = await firebase.auth()
        .signInWithPhoneNumber(phoneNumber, appVerifier);
    
    // المستخدم يدخل الرمز من الرسالة النصية
    const code = prompt('أدخل الرمز المرسل إلى جوالك');
    
    const result = await confirmationResult.confirm(code);
    
    // المستخدم تم التحقق منه
    return result.user;
}
```

### **الخيار 2: Custom OTP عبر Twilio**
خدمة إرسال SMS:

```javascript
// في server.js
const twilio = require('twilio');
const twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);

app.post('/api/send-phone-otp', async (req, res) => {
    const { phone } = req.body;
    
    // توليد رمز عشوائي
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // حفظ OTP مؤقتاً
    await storeOTP(phone, otp, 5 * 60 * 1000); // ينتهي بعد 5 دقائق
    
    // إرسال الرسالة النصية
    await twilioClient.messages.create({
        body: `رمز التحقق من انتيكا استور: ${otp}`,
        from: TWILIO_PHONE_NUMBER,
        to: '+966' + phone
    });
    
    res.json({ success: true });
});

app.post('/api/verify-phone-otp', async (req, res) => {
    const { phone, otp } = req.body;
    
    // التحقق من الرمز
    if (!verifyOTP(phone, otp)) {
        return res.status(400).json({ error: 'رمز غير صحيح' });
    }
    
    // تحديث حالة المستخدم
    await User.findOneAndUpdate(
        { phone },
        { phoneVerified: true }
    );
    
    res.json({ success: true });
});
```

---

## 3️⃣ **ربط البريد والهاتف بحسابي**

### **الحالة الأولى: تسجيل ببريد إلكتروني**
```
1. المستخدم يدخل: الاسم + البريد + الجوال + كلمة المرور
2. نرسل رسالة تحقق إلى البريد
3. بعد التحقق: يُسمح له بإكمال الملف الشخصي (الاسم الأخير، تاريخ الميلاد، الجنس)
4. البيانات تُحفظ في account.html تلقائياً
```

### **الحالة الثانية: تسجيل برقم جوال فقط**
```
1. المستخدم يدخل: الجوال + كلمة المرور
2. نرسل رمز OTP إلى الجوال
3. بعد التحقق: يطلب البريد الإلكتروني (اختياري) + بقية البيانات
4. كل شيء يُحفظ بـ localStorage ثم يُعرض في account.html
```

### **الحالة الثالثة: تسجيل دخول عبر Google**
```
1. المستخدم ينقر "تسجيل الدخول بـ Google"
2. Firebase يتحقق من البريد تلقائياً
3. إذا كان أول مرة: نطلب الاسم الأول + اختياري (اسم أخير) + تاريخ ميلاد + جنس
4. البيانات تُحفظ في account.html
```

---

## 4️⃣ **خطوات التطبيق العملية**

### **الخطوة 1: حفظ حالة التحقق في localStorage**
```javascript
// بعد التحقق بنجاح
const user = {
    ...user,
    emailVerified: true,
    phoneVerified: true,
    verifiedAt: new Date().toISOString()
};
localStorage.setItem('antika_user', JSON.stringify(user));
```

### **الخطوة 2: عرض حالة التحقق في account.html**
```html
<!-- في account.html -->
<div id="verification-status">
    <p><i class="fas fa-check-circle text-green-600"></i> البريد الإلكتروني: تم التحقق</p>
    <p><i class="fas fa-check-circle text-green-600"></i> رقم الجوال: تم التحقق</p>
</div>
```

### **الخطوة 3: إعادة إرسال رسالة التحقق**
```javascript
async function resendVerificationEmail() {
    const user = Auth.getCurrentUser();
    if (user && user.email) {
        await fetch('/api/send-verification-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
        });
        showNotification('تم إرسال رسالة التحقق إلى بريدك');
    }
}
```

---

## 5️⃣ **الملخص: الربط بين الصفحتين**

```
login.html (إنشاء حساب)
    ↓
يحفظ: name, email, phone, password, birthDate, gender
    ↓
localStorage.setItem('antika_user', JSON.stringify(userData))
    ↓
account.html
    ↓
يقرأ: localStorage.getItem('antika_user')
    ↓
يعرض: جميع البيانات تلقائياً في الحقول
    ↓
عند الحفظ: يُحدّث localStorage والخادم والـ Firebase
```

---

## 🔐 **نصائح الأمان**

1. ❌ **لا تحفظ كلمات المرور في localStorage**
   - Firefox و Chrome يخزنانها بشكل آمن تلقائياً

2. ✅ **استخدم HTTPS دائماً** للاتصالات الحساسة

3. ✅ **انتهاء صلاحية OTP** بعد 5-15 دقيقة

4. ✅ **حد أقصى من محاولات التحقق** (3-5 محاولات فقط)

5. ✅ **تسجيل محاولات الدخول الفاشلة**

---

## 📱 **خدمات SMS الموصى بها**

| الخدمة | الملايين الشهرية | اللغة العربية |
|-------|-----------------|-------------|
| Twilio | ✅ | ✅ |
| AWS SNS | ✅ | ✅ |
| Nexmo/Vonage | ✅ | ✅ |

---

## 🚀 **الخطوة التالية**

هل تريد:
1. ✅ ربط البيانات بين login.html و account.html (تمّت)
2. ✅ التحقق من البريد الإلكتروني
3. ✅ التحقق من رقم الهاتف عبر OTP
4. ✅ تحسين تجربة إنشاء الحساب على خطوات متعددة

اختر الأولويات!
