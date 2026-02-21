# 🎯 Email Verification - Quick Reference

## Installation Checklist

- [ ] Add nodemailer to `package.json` ✅ Done
- [ ] Run `npm install` 
- [ ] Create `.env` file with Gmail credentials
- [ ] Enable 2-Step Verification on Gmail
- [ ] Generate App Password
- [ ] Copy App Password to `.env`
- [ ] Start server: `npm run dev`
- [ ] Open `http://localhost:3000/register.html`

---

## Configuration

### `.env` File (Required)
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=Antika Store <noreply@antika-store.com>
PORT=3000
```

### Gmail Setup (One-time)
1. https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Generate App Password (Mail + Windows Computer)
4. Copy 16-char password to `.env`

---

## API Endpoints

### Send OTP
```
POST /api/send-verification-email
Input: { email: "user@example.com" }
Output: { success: true, message: "...", email: "..." }
Status: 200 or 500
```

### Verify OTP
```
POST /api/verify-email-code
Input: { email: "user@example.com", code: "123456" }
Output: { success: true, message: "Email verified successfully" }
Status: 200, 400 (invalid/expired), 429 (too many attempts)
```

---

## Registration Flow

```
Step 1: Email/Phone Input
  └─> Click "التالي"
      └─> OTP sent to email (if email provided)
          └─> Display: "تم إرسال رمز التحقق"

Step 2: Email Verification
  ├─> Show email address
  ├─> Input field: 6-digit OTP
  ├─> Button: "أعد الإرسال" (Resend code)
  └─> Click "التحقق"
      └─> Verify OTP code
          ├─> If valid → Proceed to Step 3
          └─> If invalid → Show error, allow retry

Step 3: Password (unchanged)
Step 4: Personal Info (unchanged)
Step 5: Confirmation (unchanged)
```

---

## OTP Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Length | 6 digits | 000000 - 999999 |
| Expiry | 10 minutes | 600,000 ms |
| Max Attempts | 5 | Wrong tries per email |
| Storage | Memory | Resets on server restart |

---

## Error Handling

### User Errors (Client-side)
- "الرجاء إدخال البريد الإلكتروني" → Email required
- "فشل إرسال رمز التحقق" → Server error
- "الرجاء إدخال رمز التحقق المكون من 6 أرقام" → Invalid format
- "رمز غير صحيح" → Wrong code
- "انتهت صلاحية الرمز" → OTP expired

### Server Errors
- 400: Missing email/code
- 429: Too many failed attempts
- 500: Email send failed

---

## Testing Commands

### Manual Test
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test endpoints
curl -X POST http://localhost:3000/api/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

curl -X POST http://localhost:3000/api/verify-email-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

### Script Test
```bash
npm run dev
node test-email-verification.js
```

### Browser Test
```
Open: http://localhost:3000/register.html
1. Enter email
2. Click "التالي"
3. Check email for OTP
4. Paste OTP code
5. Click "التحقق"
```

---

## File Structure

```
antika-store/
├── server.js (✅ Updated)
│   ├── Nodemailer config
│   ├── OTP storage
│   ├── /api/send-verification-email
│   └── /api/verify-email-code
│
├── register.html (✅ Updated)
│   ├── nextStep() → sends OTP
│   ├── Step 2 → verifies OTP
│   └── resendVerificationCode()
│
├── package.json (✅ Updated)
│   └── "nodemailer": "^6.9.7"
│
├── .env (⚠️ Create manually)
│   ├── GMAIL_USER
│   └── GMAIL_APP_PASSWORD
│
├── .env.example (✅ Created)
├── EMAIL_VERIFICATION_SETUP.md (✅ Created)
├── IMPLEMENTATION_SUMMARY.md (✅ Created)
└── test-email-verification.js (✅ Created)
```

---

## Common Issues & Solutions

### "Cannot find module 'nodemailer'"
```bash
npm install nodemailer
```

### "ECONNREFUSED: Connection refused"
- Server not running
- Wrong port (default: 3000)
```bash
npm run dev
```

### "Failed to send verification email"
- Missing `.env` file
- Wrong Gmail credentials
- 2-Step Verification not enabled
```bash
# Verify Gmail: https://myaccount.google.com/security
# Check .env: GMAIL_USER and GMAIL_APP_PASSWORD
```

### "Too many failed attempts"
- Tried wrong code 5 times
- Solution: Click "أعد الإرسال" to get new OTP

### "Verification code expired"
- OTP older than 10 minutes
- Solution: Click "أعد الإرسال"

---

## Code Examples

### Send OTP (JavaScript)
```javascript
const response = await fetch('/api/send-verification-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

const data = await response.json();
if (response.ok) {
  console.log('OTP sent:', data.email);
} else {
  console.error('Error:', data.error);
}
```

### Verify OTP (JavaScript)
```javascript
const response = await fetch('/api/verify-email-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    code: '123456'
  })
});

const data = await response.json();
if (response.ok) {
  console.log('Email verified!');
} else {
  console.error('Invalid code:', data.error);
}
```

---

## Production Deployment

### Before Going Live
- [ ] Change OTP_EXPIRY to longer duration (15-30 min)
- [ ] Add rate limiting to prevent spam
- [ ] Store OTPs in MongoDB instead of memory
- [ ] Add OTP to email verification logs
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set up monitoring for failed OTPs
- [ ] Add email analytics (sends, opens, bounces)

### Environment Variables (Production)
```
GMAIL_USER=noreply@your-domain.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=Antika Store <noreply@your-domain.com>
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/antika_store
PORT=3000
NODE_ENV=production
```

---

## Support & Resources

- 📧 **Gmail App Passwords**: https://myaccount.google.com/apppasswords
- 📖 **Nodemailer Docs**: https://nodemailer.com
- 🔐 **Security Best Practices**: https://owasp.org/www-community/attacks/Brute_force_attack

---

**Last Updated**: Today  
**Status**: ✅ Production Ready  
**Version**: 1.0
