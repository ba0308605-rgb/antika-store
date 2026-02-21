# 📧 Email Verification Setup Guide

## Overview
The registration flow now includes real email verification using **Nodemailer** + **Gmail SMTP** (completely free).

### What's New:
- ✅ **Step 2 in Registration**: Email verification with 6-digit OTP
- ✅ **Send OTP**: Click "Next" on Step 1 → OTP sent to your email
- ✅ **Verify OTP**: Enter the 6-digit code on Step 2
- ✅ **Free Service**: Uses Gmail's free SMTP (no paid accounts needed)

---

## Setup Instructions

### 1. Create a `.env` File
Create a new file named `.env` in your project root (same folder as `server.js`):

```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=Antika Store <noreply@antika-store.com>
MONGODB_URI=mongodb://localhost:27017/antika_store
PORT=3000
```

### 2. Get Gmail App Password (IMPORTANT!)
You need a **16-character App Password**, not your regular Gmail password:

**Steps:**
1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go back to **Security** → Scroll down to find **App passwords**
4. Select:
   - App: **Mail**
   - Device: **Windows Computer** (or your device)
5. Click **Generate**
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
7. **Remove spaces** and paste into `.env` as `GMAIL_APP_PASSWORD`

Example:
```
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Server
```bash
npm run dev
# or
node server.js
```

You should see:
```
🚀 Server running on port 3000
📡 API available at http://localhost:3000/api
```

---

## Testing the Email Verification Flow

### Test Steps:

1. **Open [http://localhost:3000/register.html](http://localhost:3000/register.html)**

2. **Step 1: Email/Phone**
   - Enter: `test@example.com`
   - Click **التالي** (Next)
   - Check that you see: ✅ "تم إرسال رمز التحقق إلى بريدك الإلكتروني"

3. **Check Gmail Inbox**
   - Open your email inbox
   - Look for an email from "Antika Store"
   - Copy the 6-digit OTP code
   - Email looks like:
     ```
     Subject: Antika Store - Email Verification Code
     Body: [Code displayed: 123456]
     ```

4. **Step 2: Verify OTP**
   - Paste the 6-digit code into the OTP field
   - Click **التحقق** (Verify)
   - Check that you see: ✅ "تم التحقق من بريدك بنجاح!"

5. **Continue Registration**
   - Steps 3-5 will continue as normal
   - Complete registration

---

## API Endpoints Added

### 1. Send Verification Email
**POST** `/api/send-verification-email`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification code sent to email",
  "email": "user@example.com"
}
```

**Response (Error):**
```json
{
  "error": "Failed to send verification email"
}
```

---

### 2. Verify OTP Code
**POST** `/api/verify-email-code`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "email": "user@example.com"
}
```

**Response (Error - Invalid Code):**
```json
{
  "error": "Invalid verification code. Please try again.",
  "attemptsLeft": 3
}
```

**Response (Error - Expired):**
```json
{
  "error": "Verification code expired. Request a new one."
}
```

---

## Configuration Details

### OTP Settings:
- **OTP Length**: 6 digits (000000 - 999999)
- **Expiry Time**: 10 minutes
- **Max Attempts**: 5 failed attempts before requiring new OTP
- **Storage**: In-memory (resets if server restarts)

### Email Template:
The OTP email includes:
- Antika Store header (Arabic/English support)
- Clear OTP display (large, easy to copy)
- Expiry warning (10 minutes)
- Professional Arabic styling

---

## Troubleshooting

### ❌ "Failed to send verification email"
**Causes:**
- `GMAIL_USER` or `GMAIL_APP_PASSWORD` missing in `.env`
- Gmail credentials incorrect
- 2-Step Verification not enabled on Gmail account

**Solution:**
1. Check `.env` file exists and has correct credentials
2. Verify 2-Step Verification is enabled: [https://myaccount.google.com/security](https://myaccount.google.com/security)
3. Regenerate App Password and update `.env`
4. Restart server

### ❌ "Verification code expired"
- OTP codes expire after **10 minutes**
- Click "أعد الإرسال" (Resend) to get a new code

### ❌ "Too many failed attempts"
- Maximum 5 incorrect guesses per email
- Click "أعد الإرسال" (Resend) to reset attempts

### ❌ Server won't start
```bash
# Check if port 3000 is already in use
netstat -ano | findstr :3000

# If in use, either:
# 1. Change PORT in .env
# 2. Kill the existing process
```

---

## Code Changes Summary

### Files Modified:
1. **package.json** — Added `nodemailer: ^6.9.7`
2. **server.js** — Added:
   - Nodemailer import + Gmail SMTP config
   - OTP storage + helper functions
   - `/api/send-verification-email` endpoint
   - `/api/verify-email-code` endpoint

3. **register.html** — Updated:
   - `nextStep()` function to handle email verification
   - Step 1 → Step 2 triggers OTP sending
   - Step 2 → Step 3 validates OTP code

4. **.env.example** — Created reference template

---

## Next Steps (Optional Enhancements)

- [ ] Add rate limiting to prevent OTP spam
- [ ] Add SMS verification as alternative to email
- [ ] Store OTP codes in MongoDB instead of memory
- [ ] Add resend button cooldown (prevent too frequent requests)
- [ ] Add email verification status to user profile
- [ ] Add OTP code to server logs for debugging

---

## Support

For issues or questions:
1. Check server console output: `npm run dev`
2. Check browser console: Right-click → Inspect → Console tab
3. Verify `.env` file settings
4. Test Gmail credentials directly at https://myaccount.google.com

---

**Last Updated**: Today
**Status**: ✅ Ready for use
