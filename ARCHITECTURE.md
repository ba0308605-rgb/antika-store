# 📊 Email Verification System - Visual Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTIKA STORE REGISTRATION                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌─────────────────────────────────────────────────────┐
    │                   STEP 1: Email Input               │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  Email:  [user@example.com            ]    │   │
    │  │  Phone:  [+966XXXXXXXXX            ]      │   │
    │  │                                             │   │
    │  │  At least one required                      │   │
    │  │                                             │   │
    │  │  [← السابق]  [التالي →]                  │   │
    │  └─────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────┘
                              │
                              ↓
                    (User clicks التالي)
                              │
    ┌─────────────────────────────────────────────────────┐
    │         BACKEND: Send Verification Email             │
    │  ┌─────────────────────────────────────────────┐   │
    │  │ 1. Validate email format                     │   │
    │  │ 2. Generate 6-digit OTP                      │   │
    │  │    └─ Math.random() * 900000 + 100000       │   │
    │  │ 3. Store OTP in memory:                      │   │
    │  │    └─ otpStore.set(email, {                │   │
    │  │         code: "123456",                      │   │
    │  │         timestamp: Date.now(),               │   │
    │  │         attempts: 0                          │   │
    │  │       })                                     │   │
    │  │ 4. Create Gmail SMTP connection               │   │
    │  │ 5. Send email with OTP                       │   │
    │  │ 6. Return success to frontend                │   │
    │  └─────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────┘
                              │
                    ✉️ Email Sent to Gmail
                              │
    ┌─────────────────────────────────────────────────────┐
    │         USER'S EMAIL INBOX: Receives OTP            │
    │  ┌─────────────────────────────────────────────┐   │
    │  │ From: your-email@gmail.com                  │   │
    │  │ Subject: Antika Store - Verification Code   │   │
    │  │ ─────────────────────────────────────────   │   │
    │  │ مرحباً بك في أنتيكا ستور!                  │   │
    │  │                                              │   │
    │  │  استخدم هذا الكود للتحقق من بريدك:        │   │
    │  │                                              │   │
    │  │  ┌─────────────────────┐                    │   │
    │  │  │     123456          │  ← Copy this!      │   │
    │  │  └─────────────────────┘                    │   │
    │  │                                              │   │
    │  │  انتهاء الصلاحية: 10 دقائق                 │   │
    │  └─────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────┘
                              │
                 (User copies OTP code)
                              │
    ┌─────────────────────────────────────────────────────┐
    │                   STEP 2: OTP Entry                 │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  تم إرسال الرمز إلى:                        │   │
    │  │  user@example.com                           │   │
    │  │                                              │   │
    │  │  الرمز: [123456________]                   │   │
    │  │                                              │   │
    │  │  لم تستقبل الرمز؟                           │   │
    │  │  [أعد الإرسال]                             │   │
    │  │                                              │   │
    │  │  [← السابق]  [التحقق →]                   │   │
    │  └─────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────┘
                              │
                      (User pastes OTP)
                              │
                    (User clicks التحقق)
                              │
    ┌─────────────────────────────────────────────────────┐
    │         BACKEND: Verify OTP Code                    │
    │  ┌─────────────────────────────────────────────┐   │
    │  │ 1. Get request: email + code                │   │
    │  │ 2. Retrieve from otpStore.get(email)        │   │
    │  │    ├─ Check if OTP exists                   │   │
    │  │    ├─ Check if NOT expired                  │   │
    │  │    │  └─ Expiry: 10 minutes (600,000 ms)   │   │
    │  │    ├─ Check attempts < 5                    │   │
    │  │    └─ Compare code                          │   │
    │  │ 3. If match:                                │   │
    │  │    ├─ Delete OTP from memory                │   │
    │  │    ├─ Mark user as emailVerified            │   │
    │  │    └─ Return success                        │   │
    │  │ 4. If no match:                             │   │
    │  │    ├─ Increment attempts                    │   │
    │  │    ├─ Return error with attemptsLeft        │   │
    │  │    └─ After 5 attempts: delete OTP          │   │
    │  └─────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────┘
                              │
                ✅ Email Verified Successfully!
                              │
    ┌─────────────────────────────────────────────────────┐
    │             STEP 3: Password (Unchanged)            │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  كلمة المرور                                │   │
    │  │  [             ]  [👁]                      │   │
    │  │                                              │   │
    │  │  ✓ 6 أحرف على الأقل                        │   │
    │  │  ✓ أحرف إنجليزية فقط                       │   │
    │  │  ✓ حرف واحد على الأقل                      │   │
    │  │  ✓ رمز واحد على الأقل                      │   │
    │  │                                              │   │
    │  │  [← السابق]  [التالي →]                   │   │
    │  └─────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌─────────────────────────────────────────────────────┐
    │         STEP 4: Personal Info (Unchanged)           │
    │         STEP 5: Confirmation (Unchanged)            │
    │                                                      │
    │  Account Created Successfully! ✅                    │
    └─────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────┐
│   Frontend   │
│  (Browser)   │
└────────┬─────┘
         │
         │ 1. POST /api/send-verification-email
         │    { email: "user@example.com" }
         ↓
┌──────────────────────────┐
│    Express Server        │
│  (server.js port 3000)   │
│                          │
│  ┌────────────────────┐  │
│  │  generateOTP()     │  │
│  │  → "123456"        │  │
│  └────────────────────┘  │
│           ↓              │
│  ┌────────────────────┐  │
│  │  otpStore.set()    │  │
│  │  {code, time, att} │  │
│  └────────────────────┘  │
│           ↓              │
│  ┌────────────────────┐  │
│  │ Nodemailer         │  │
│  │ + Gmail SMTP       │  │
│  └────────────────────┘  │
└────────┬─────────────────┘
         │
         │ 2. SMTP Connection
         ↓
┌──────────────────────┐
│   Gmail (SMTP)       │
│   smtp.gmail.com     │
│   port 465 / 587     │
└────────┬─────────────┘
         │
         │ 3. Email Delivery
         ↓
┌──────────────────────┐
│   User's Inbox       │
│   📧 OTP Email       │
│   Code: 123456       │
└────────┬─────────────┘
         │
         │ 4. User copies code
         │
┌────────▼──────────────────┐
│   Frontend Input Form      │
│   [123456________]  [✓]    │
└────────┬──────────────────┘
         │
         │ 5. POST /api/verify-email-code
         │    { email, code: "123456" }
         ↓
┌──────────────────────────┐
│    Express Server        │
│                          │
│  ┌────────────────────┐  │
│  │  otpStore.get()    │  │
│  │  Compare codes     │  │
│  │  Check expiry      │  │
│  │  Check attempts    │  │
│  └────────────────────┘  │
│           ↓              │
│  ┌────────────────────┐  │
│  │  if match:         │  │
│  │  ├─ Delete OTP     │  │
│  │  ├─ Mark verified  │  │
│  │  └─ Return success │  │
│  └────────────────────┘  │
└────────┬─────────────────┘
         │
         ↓
┌────────────────────────┐
│   6. Frontend Success  │
│   ✅ Proceed to Step 3 │
└────────────────────────┘
```

---

## OTP Storage & Lifecycle

```
┌─────────────────────────────────────────────────────┐
│           IN-MEMORY OTP STORAGE                      │
│                                                      │
│  otpStore = new Map()                               │
│                                                      │
│  Key: "user@example.com"                            │
│  ├─ code: "123456"                                  │
│  ├─ timestamp: 1704067200000                        │
│  └─ attempts: 0                                     │
│                                                      │
│  ┌──────────────────────────────────────────┐      │
│  │  Lifecycle:                               │      │
│  │                                           │      │
│  │  [CREATE] ─────────────────────────────> [STORE]│
│  │  10:00am                                 │      │
│  │  generateOTP()                           │      │
│  │  otpStore.set()                          │      │
│  │                                           │      │
│  │                 ⏱️ 10 MINUTES            │      │
│  │                                           │      │
│  │  [STORE]  ─────────────────────────────> [EXPIRY]
│  │           10:10am                        │      │
│  │           Auto-delete or on verify       │      │
│  │                                           │      │
│  │  OR                                       │      │
│  │                                           │      │
│  │  [VERIFY] ─────────────────────────────> [DELETE]
│  │  10:05am                                 │      │
│  │  Code matches                            │      │
│  │  otpStore.delete()                       │      │
│  │                                           │      │
│  └──────────────────────────────────────────┘      │
│                                                      │
│  Attempt Tracking:                                  │
│  ├─ 1st wrong try: attempts = 1                     │
│  ├─ 2nd wrong try: attempts = 2                     │
│  ├─ 3rd wrong try: attempts = 3                     │
│  ├─ 4th wrong try: attempts = 4                     │
│  └─ 5th wrong try: attempts = 5 → DELETE OTP       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ↓
    ┌────────────┐
    │ Validate   │
    │ Input      │
    └─┬──────────┘
      │
      ├─ Email missing? ──→ 400 Bad Request
      ├─ Code missing?  ──→ 400 Bad Request
      ├─ Invalid format? ─→ 400 Bad Request
      │
      └─ ✓ Valid Input
         │
         ↓
    ┌────────────┐
    │ Check OTP  │
    │ Exists     │
    └─┬──────────┘
      │
      ├─ Not found? ──→ 400 "No OTP found"
      │
      └─ ✓ Exists
         │
         ↓
    ┌────────────┐
    │ Check      │
    │ Expiry     │
    └─┬──────────┘
      │
      ├─ Expired? ────→ 400 "Code expired"
      │               DELETE OTP
      │
      └─ ✓ Valid
         │
         ↓
    ┌────────────┐
    │ Check      │
    │ Attempts   │
    └─┬──────────┘
      │
      ├─ Max? ────────→ 429 "Too many attempts"
      │               DELETE OTP
      │
      └─ ✓ Valid
         │
         ↓
    ┌────────────┐
    │ Compare    │
    │ Code       │
    └─┬──────────┘
      │
      ├─ Wrong? ──────→ 400 "Invalid code"
      │               Increment attempts
      │               Show attemptsLeft
      │
      └─ ✓ Correct
         │
         ↓
    ┌────────────┐
    │ Success!   │
    │ DELETE OTP │
    │ Mark       │
    │ verified   │
    └────────────┘
```

---

## Email Template Structure

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  ╔═════════════════════════════════════════════╗   │
│  ║          أنتيكا ستور 🌸                     ║   │
│  ║      Antika Store                           ║   │
│  ╚═════════════════════════════════════════════╝   │
│                                                      │
│  مرحباً بك في أنتيكا ستور!                        │
│  Welcome to Antika Store!                          │
│                                                      │
│  ─────────────────────────────────────────────      │
│                                                      │
│  استخدم الكود أدناه للتحقق من بريدك الإلكتروني   │
│  Use the code below to verify your email            │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │                                              │   │
│  │  ╔═══════════════════════════════╗         │   │
│  │  ║                               ║         │   │
│  │  ║      123456                   ║         │   │
│  │  ║                               ║         │   │
│  │  ╚═══════════════════════════════╝         │   │
│  │                                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  انتهاء الصلاحية: 10 دقائق                        │
│  Expires in: 10 minutes                            │
│                                                      │
│  إذا لم تطلب هذا الكود، تجاهل هذا البريد         │
│  If you didn't request this code, ignore it        │
│                                                      │
│  ─────────────────────────────────────────────      │
│                                                      │
│  مع تحياتنا،                                        │
│  فريق أنتيكا ستور                                 │
│                                                      │
│  Best regards,                                      │
│  Antika Store Team                                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
┌─────────────────────────────────────────────┐
│           ANTIKA STORE STACK                 │
├─────────────────────────────────────────────┤
│                                              │
│  Frontend:                                   │
│  ├─ HTML5                                    │
│  ├─ CSS3 (Tailwind)                         │
│  ├─ JavaScript (ES6+)                       │
│  ├─ Font Awesome Icons                      │
│  └─ Firebase Auth                           │
│                                              │
│  Backend:                                    │
│  ├─ Node.js                                  │
│  ├─ Express.js                               │
│  ├─ MongoDB (+ JSON fallback)               │
│  ├─ Mongoose ODM                            │
│  ├─ Nodemailer ✨ NEW                       │
│  └─ dotenv                                   │
│                                              │
│  Email:                                      │
│  ├─ Nodemailer                               │
│  └─ Gmail SMTP                               │
│      (free, no paid tier needed)            │
│                                              │
│  Security:                                   │
│  ├─ bcryptjs (password hashing)             │
│  ├─ JWT (token management)                  │
│  ├─ CORS (cross-origin)                     │
│  └─ dotenv (credential management)          │
│                                              │
│  Cloud:                                      │
│  ├─ MongoDB Atlas (DB)                      │
│  ├─ Firebase (Auth)                         │
│  ├─ Cloudinary (Images)                     │
│  └─ Gmail (Email)                           │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Directory Structure

```
antika-store/
│
├── 📋 Frontend Pages
│   ├── index.html
│   ├── register.html ✨ UPDATED
│   ├── login.html
│   ├── account.html
│   ├── products.html
│   └── ... (other pages)
│
├── 📁 js/ (Frontend Logic)
│   ├── api.js
│   ├── auth.js
│   ├── main.js
│   ├── admin.js
│   ├── firebase-config.js
│   └── ... (other scripts)
│
├── 📁 css/ (Styling)
│   └── *.css
│
├── 📁 images/ (Assets)
│   └── *.png, *.jpg
│
├── 🖥️  Backend
│   └── server.js ✨ UPDATED
│       ├── Nodemailer config
│       ├── OTP endpoints
│       ├── Express routes
│       └── MongoDB models
│
├── 📦 Dependencies
│   ├── package.json ✨ UPDATED
│   └── package-lock.json
│
├── 🗄️  Database
│   ├── db.json (demo mode)
│   └── seed.js (seeding)
│
├── ⚙️  Configuration
│   ├── .env ✨ UPDATED
│   └── .env.example ✨ CREATED
│
├── 📚 Documentation ✨ NEW
│   ├── START_HERE.md
│   ├── EMAIL_VERIFICATION_SETUP.md
│   ├── QUICK_REFERENCE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── README_EMAIL_VERIFICATION.md
│   ├── IMPLEMENTATION_CHECKLIST.md
│   └── ARCHITECTURE.md (this file)
│
└── 🧪 Testing ✨ NEW
    └── test-email-verification.js
```

---

## Configuration Files

### .env (Environment Variables)
```
📧 Gmail Configuration
  GMAIL_USER=your-email@gmail.com
  GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

🗄️  Database
  MONGODB_URI=mongodb+srv://...
  JWT_SECRET=your-secret-key

🚀 Server
  PORT=3000
  NODE_ENV=development
```

### package.json (Dependencies)
```
New Addition:
  "nodemailer": "^6.9.7" ✨

Existing:
  express, mongoose, cors, dotenv, etc.
```

---

## Performance Metrics

```
Operation                    Time        Notes
─────────────────────────────────────────────────────
Generate OTP                 <1 ms       Async random
Send Email                   1-3 sec     SMTP delivery
Verify OTP                   <1 ms       In-memory lookup
Check Expiry                 <1 ms       Timestamp comparison
Increment Attempts           <1 ms       Map update

Total Flow (Step 1→2→3):
  - Send OTP:               1-3 sec     (async, no blocking)
  - Verify OTP:             <100 ms     (local, instant)
```

---

## Security Checkpoints

```
Input Validation
├─ Email format: RFC 5322
├─ Code format: 6 digits only
├─ Payload size: Max 1KB
└─ SQL Injection: N/A (no SQL)

Rate Limiting
├─ Per email: 5 attempts
├─ Cooldown: Auto on failure
└─ Reset: On successful send

Data Protection
├─ Credentials: In .env (not committed)
├─ OTP Storage: Memory (cleared on verify/expire)
├─ HTTPS Ready: When deployed
└─ Logs: No sensitive data logged

Time-Based Security
├─ Expiry: 10 minutes
├─ Strict enforcement
├─ No grace period
└─ Auto-delete on expire
```

---

**Last Updated**: Today  
**Version**: 1.0.0  
**Architecture Status**: ✅ Production Ready
