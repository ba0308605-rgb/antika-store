// 🌸 Antika Store Server - Firestore Backend
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const admin = require('firebase-admin');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

// ============================================
// STARTUP ENV VALIDATION — يوقف السيرفر فورًا لو أي متغير مطلوب ناقص
// ============================================
const REQUIRED_ENV_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'JWT_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
];
const missingEnvVars = REQUIRED_ENV_VARS.filter(key => !process.env[key] || !String(process.env[key]).trim());
if (missingEnvVars.length > 0) {
  console.error('❌ خطأ فادح: متغيرات البيئة التالية مطلوبة وغير موجودة، السيرفر لن يعمل بدونها:');
  missingEnvVars.forEach(key => console.error('   - ' + key));
  console.error('يرجى إضافتها في ملف .env محليًا، أو في إعدادات منصة الاستضافة قبل إعادة المحاولة.');
  process.exit(1);
}

// ============================================
// FIREBASE ADMIN INIT
// ============================================
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/" + encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
console.log('✅ Firebase Admin initialized');

// ============================================
// CLOUDINARY
// ============================================
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(base64Image, folder = 'antika') {
  try {
    if (!base64Image || !base64Image.startsWith('data:')) return base64Image;
    const result = await cloudinary.uploader.upload(base64Image, { folder, resource_type: 'image', quality: 'auto', fetch_format: 'auto' });
    return result.secure_url;
  } catch (err) { console.error('Cloudinary upload error:', err.message); return base64Image; }
}

async function deleteFromCloudinary(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    await cloudinary.uploader.destroy(folder + '/' + filename);
  } catch (err) { console.error('Cloudinary delete error:', err.message); }
}

// ============================================
// CONFIG
// ============================================
const app = express();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN_TTL = process.env.ADMIN_TOKEN_TTL || '8h';
const GOOGLE_MAPS_API_KEY = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
const GOOGLE_GEOCODING_KEY = (process.env.GOOGLE_GEOCODING_KEY || '').trim();
const OTO_API_BASE_URL = (process.env.OTO_API_BASE_URL || 'https://api.tryoto.com/rest/v2').trim();
// ⚠️ OTO ما يستخدم مفتاح API ثابت — يستخدم refresh_token دائم (تجيبه مرة وحدة من لوحة OTO: Settings → API Integrations → Connect)
// وتستبدله كل ساعة بـ access_token مؤقت عبر POST /rest/v2/refreshToken. الكاش تحت يسوي هذا تلقائيًا فما تحتاج تحدّث أي متغير بيئة يدويًا كل ساعة.
const OTO_REFRESH_TOKEN = (process.env.OTO_REFRESH_TOKEN || process.env.OTO_API_TOKEN || '').trim();
const OTO_PICKUP_LOCATION_CODE = (process.env.OTO_PICKUP_LOCATION_CODE || '').trim();
const OTO_DEFAULT_DELIVERY_OPTION_ID = (process.env.OTO_DEFAULT_DELIVERY_OPTION_ID || '').trim();
const OTO_ORDER_PREFIX = (process.env.OTO_ORDER_PREFIX || 'ANTIKA').trim();
const OTO_WEBHOOK_AUTH_KEY = (process.env.OTO_WEBHOOK_AUTH_KEY || '').trim();
const COD_SURCHARGE_SAR = Number(process.env.COD_SURCHARGE_SAR || 17);
// 🔄 عدد الأيام المسموح بها للعميل يطلب استرجاع منتج بعد تاريخ التوصيل (اتفاق: 3 أيام، بدون استبدال)
const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS || 3);
const MOYASAR_SECRET_KEY = (process.env.MOYASAR_SECRET_KEY || '').trim();
const MOYASAR_PUBLISHABLE_KEY = (process.env.MOYASAR_PUBLISHABLE_KEY || '').trim();
const FIREBASE_API_KEY = (process.env.FIREBASE_API_KEY || '').trim();
const otpStore = new Map();
const OTP_EXPIRY = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// ============================================
// HELPERS
// ============================================
function generateOTP() { return crypto.randomInt(100000, 1000000).toString(); }
function isOTOConfigured() { return Boolean(OTO_REFRESH_TOKEN && OTO_PICKUP_LOCATION_CODE); }
// 🔁 كاش access_token بالذاكرة — OTO يعطيه صلاحية ساعة وحدة بس، فنجدده تلقائيًا قبل ما ينتهي بـ5 دقايق أمان
let _otoAccessTokenCache = { token: '', expiresAt: 0 };
async function getOTOAccessToken() {
  if (_otoAccessTokenCache.token && Date.now() < _otoAccessTokenCache.expiresAt) return _otoAccessTokenCache.token;
  if (!OTO_REFRESH_TOKEN) throw new Error('OTO_REFRESH_TOKEN \u063a\u064a\u0631 \u0645\u0636\u0628\u0648\u0637');
  const url = OTO_API_BASE_URL.replace(/\/$/, '') + '/refreshToken';
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: OTO_REFRESH_TOKEN }) });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = {}; }
  if (!response.ok || !data.access_token) { const err = new Error((data && data.message) || 'OTO refreshToken failed'); err.status = response.status || 500; throw err; }
  _otoAccessTokenCache = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return _otoAccessTokenCache.token;
}
function sanitizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('966')) return digits;
  if (digits.startsWith('0')) return '966' + digits.slice(1);
  return digits;
}
// 🔒 تحقق صارم من صحة رقم جوال سعودي: 9 أرقام تبدأ بـ5 بعد تجريده من 0/966/+966 الاختيارية
function isValidSaudiPhone(raw) {
  let digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.startsWith('966')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^5\d{8}$/.test(digits);
}
function mapOTOStatusToOrderStatus(status, dcStatus) {
  const s = ((status || '') + ' ' + (dcStatus || '')).toLowerCase();
  if (s.includes('deliver')) return 'delivered';
  if (s.includes('return') || s.includes('cancel') || s.includes('failed')) return 'cancelled';
  if (s.includes('outfordelivery') || s.includes('out_for_delivery')) return 'out_for_delivery';
  if (s.includes('shipped') || s.includes('picked') || s.includes('in_transit')) return 'shipped';
  return 'processing';
}
function stripUndefinedDeep(value) {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep).filter(v => v !== undefined);
  if (value && typeof value === 'object') { const out = {}; Object.keys(value).forEach(k => { const c = stripUndefinedDeep(value[k]); if (c !== undefined) out[k] = c; }); return out; }
  return value === undefined ? undefined : value;
}
function getOrderStatusTextAr(status) {
  const map = { pending: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629', confirming_availability: '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0648\u0641\u0631 + \u0627\u062d\u062a\u0633\u0627\u0628 \u0627\u0644\u0634\u062d\u0646', awaiting_shipping_payment: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639', processing: '\u0642\u064a\u062f \u0627\u0644\u062a\u062c\u0647\u064a\u0632', shipped: '\u062a\u0645 \u0627\u0644\u0634\u062d\u0646', out_for_delivery: '\u062e\u0631\u062c \u0644\u0644\u062a\u0648\u0635\u064a\u0644', delivered: '\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645', cancelled: '\u0645\u0644\u063a\u064a' };
  return map[String(status || '').trim()] || String(status || '');
}
function generateOrderCode(orderId, date) {
  const d = date instanceof Date ? date : new Date();
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  return 'ANT-' + y + m + dd + '-' + String(orderId || '').slice(-6).toUpperCase();
}
// ⚠️ generateOrderCode أصبحت غير مستخدمة (كانت تولّد كود ثانوي "كود التتبع" بدون فائدة حقيقية، وكانت تسبب لخبطة مع رقم الطلب الحقيقي orderNumber ومع رقم تتبع الشحن الفعلي dcTrackingNumber) — أبقيناها معرّفة فقط تحسبًا لأي كود قديم يستدعيها، بدون أي استخدام فعلي جديد.
// رقم طلب تسلسلي ثابت (يبدأ من 1000) — لا يتغيّر أبداً حتى لو حُذفت طلبات لاحقاً، عكس الترقيم المحسوب بالفرونت
async function getNextOrderNumber() {
  const counterRef = db.collection('counters').doc('orders');
  return await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    const current = doc.exists ? Number(doc.data().value || 0) : 0;
    const next = current + 1;
    t.set(counterRef, { value: next }, { merge: true });
    return next;
  });
}
function docsToArr(snapshot) { return snapshot.docs.map(d => Object.assign({ id: d.id }, d.data())); }

// يولّد رقم موديل (SKU) تلقائي وفريد لقسم معيّن بطريقة آمنة (transaction) تمنع تكرار الرقم حتى لو حصل حفظ متزامن
async function generateSkuForCategory(categoryId) {
  let catRef = db.collection('categories').doc(String(categoryId));
  let catDoc = await catRef.get();
  if (!catDoc.exists) {
    const snap = await db.collection('categories').where('id', '==', categoryId).limit(1).get();
    if (snap.empty) return null;
    catRef = snap.docs[0].ref;
  }
  return db.runTransaction(async (tx) => {
    const freshDoc = await tx.get(catRef);
    if (!freshDoc.exists) return null;
    const data = freshDoc.data() || {};
    const prefix = (data.skuPrefix || 'GEN').toString().trim().toUpperCase();
    const next = (Number(data.lastSkuNumber) || 0) + 1;
    const sku = prefix + '-' + String(next).padStart(4, '0');
    tx.update(catRef, { lastSkuNumber: next });
    return sku;
  });
}
function normalizeCartRef(value) { return value == null ? '' : String(value).trim(); }
function getSessionId(req) { return req.headers['x-session-id'] || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }

async function sendEmailViaResend({ to, subject, html }) {
  if (!RESEND_API_KEY) { console.log('[EMAIL DEV] To:' + to); return { devMode: true }; }
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Antika Store <onboarding@resend.dev>', to, subject, html }) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Resend error'); }
  return res.json();
}

async function sendOrderCustomerNotification(order, { title, message, subject } = {}) {
  const toEmail = String((order && order.customerEmail) || '').trim();
  if (!toEmail || !toEmail.includes('@')) return { sent: false };
  // 📧 نستخدم رقم الطلب الحقيقي (orderNumber) بعنوان الإيميل بدل أي كود ثانوي — نفس الرقم اللي يشوفه العميل بكل مكان، بدون أي لخبطة
  const orderRef = (order && order.orderNumber) ? String(order.orderNumber) : String((order && order.id) || '');
  const safeSubject = subject || ('\u062a\u062d\u062f\u064a\u062b \u0637\u0644\u0628\u0643 ' + (orderRef ? '#' + orderRef : '')).trim();
  const safeTitle = title || '\u062a\u062d\u062f\u064a\u062b \u062c\u062f\u064a\u062f \u0639\u0644\u0649 \u0637\u0644\u0628\u0643';
  const safeMessage = message || ('\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628: ' + getOrderStatusTextAr(order && order.status));
  // \u0625\u0634\u0639\u0627\u0631 \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 (\u064a\u063a\u0630\u064a \u0627\u0644\u062c\u0631\u0633 \u0641\u0648\u0642 \u0623\u064a\u0642\u0648\u0646\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062a)
  try {
    await db.collection('notifications').add({
      ownerEmail: toEmail.toLowerCase(),
      orderId: String((order && order.id) || (order && order._id) || ''),
      type: 'order',
      title: safeTitle,
      message: safeMessage,
      read: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (ie) { console.error('In-app notification error:', ie.message); }
  const html = '<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;"><h2>' + safeTitle + '</h2><p>' + safeMessage + '</p><p>\u0634\u0643\u0631\u0627\u064b \u0644\u062a\u0633\u0648\u0642\u0643 \u0645\u0646 \u0645\u062a\u062c\u0631 \u0623\u0646\u062a\u064a\u0643\u0627.</p></div>';
  try { const r = await sendEmailViaResend({ to: toEmail, subject: safeSubject, html }); if (r.devMode) return { sent: true, devMode: true }; } catch (e) { console.error('[EMAIL ERROR]', e.message); throw e; }
  return { sent: true };
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Admin authentication required' });
  try { const p = jwt.verify(auth.slice(7).trim(), JWT_SECRET); if (p.role !== 'admin') return res.status(403).json({ error: 'Admin privileges required' }); req.admin = p; next(); }
  catch (e) { return res.status(401).json({ error: 'Invalid or expired admin token' }); }
}

async function callOTO(path, payload) {
  const accessToken = await getOTOAccessToken();
  const url = OTO_API_BASE_URL.replace(/\/$/, '') + '/' + String(path || '').replace(/^\//, '');
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken }, body: JSON.stringify(payload) });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  if (!response.ok) { const err = new Error((data && data.message) || 'OTO request failed'); err.status = response.status; err.details = data; throw err; }
  return data;
}

// 🛡️ Railway خلف بروكسي: نحتاجه عشان حدّ المحاولات يقرأ IP العميل الحقيقي
app.set('trust proxy', 1);
// 🛡️ ترويسات الحماية (CSP مقفل عن قصد لأن الموقع يستخدم سكربتات خارجية وخرائط جوجل)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));
const makeLimiter = (windowMs, limit, message) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });
const adminLoginLimiter = makeLimiter(15 * 60 * 1000, 10, 'محاولات كثيرة، حاول بعد 15 دقيقة');
const otpSendLimiter = makeLimiter(60 * 60 * 1000, 10, 'طلبات كثيرة لرمز التحقق، حاول لاحقاً');
const otpVerifyLimiter = makeLimiter(15 * 60 * 1000, 30, 'محاولات كثيرة، حاول لاحقاً');
const couponLimiter = makeLimiter(60 * 1000, 30, 'طلبات كثيرة، حاول بعد قليل');
const orderCreateLimiter = makeLimiter(60 * 60 * 1000, 30, 'طلبات كثيرة من نفس الشبكة، حاول لاحقاً');
const geocodeLimiter = makeLimiter(60 * 1000, 30, 'طلبات كثيرة، حاول بعد قليل');
// مقارنة آمنة ضد هجمات التوقيت
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
// 🔒 أخطاء السيرفر: الأدمن يشوف التفاصيل، العميل يشوف رسالة عامة (والتفاصيل تنسجل بالـ logs)
function serverError(req, res, err) {
  console.error('[SERVER ERROR]', req.method, req.path, err && err.message);
  return res.status(500).json({ error: (req && req.admin) ? err.message : 'حدث خطأ بالسيرفر، حاول مرة أخرى' });
}

// ============================================
// 🔐 هوية العميل: توكن Firebase يجي بالترويسة x-user-token (يضيفه الفرونت تلقائياً)
// ============================================
const REQUIRE_VERIFIED_EMAIL = String(process.env.REQUIRE_VERIFIED_EMAIL || '').toLowerCase() === 'true';
function safeDecode(v) { try { return decodeURIComponent(String(v || '')); } catch (_) { return ''; } }
async function identifyRequester(req) {
  // 1) أدمن (JWT حق السيرفر)
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try { const p = jwt.verify(auth.slice(7).trim(), JWT_SECRET); if (p && p.role === 'admin') return { isAdmin: true, admin: p }; } catch (_) {}
  }
  // 2) عميل (توكن Firebase)
  const t = String(req.headers['x-user-token'] || '').trim();
  if (!t) return null;
  try {
    const d = await admin.auth().verifyIdToken(t);
    const email = String(d.email || '').trim().toLowerCase();
    if (!email) return null;
    if (REQUIRE_VERIFIED_EMAIL && !d.email_verified) {
      const v = await db.collection('verified_emails').doc(email).get();
      if (!v.exists) return null;
    }
    return { email, uid: d.uid };
  } catch (_) { return null; }
}
// يسمح فقط لصاحب الإيميل (أو الأدمن). optional: لو الإيميل فاضي يمرّ (تعليق زائر مثلاً)
function requireOwnEmail(getEmail, opts) {
  const optional = !!(opts && opts.optional);
  return async (req, res, next) => {
    try {
      const target = String(getEmail(req) || '').trim().toLowerCase();
      const who = await identifyRequester(req);
      if (who && who.isAdmin) { req.admin = who.admin; return next(); }
      if (optional && !target) return next();
      if (!who) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
      if (!target || target !== who.email) return res.status(403).json({ error: 'غير مصرح بهذا الإجراء' });
      req.user = who; return next();
    } catch (e) { return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' }); }
  };
}
async function requireUser(req, res, next) {
  const who = await identifyRequester(req);
  if (!who) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  if (who.isAdmin) { req.admin = who.admin; return next(); }
  req.user = who; return next();
}
async function ownsNotification(req, res, next) {
  try {
    if (req.admin) return next();
    const d = await db.collection('notifications').doc(req.params.id).get();
    if (!d.exists) return res.status(404).json({ error: 'الإشعار غير موجود' });
    if (String(d.data().ownerEmail || '').trim().toLowerCase() !== req.user.email) return res.status(403).json({ error: 'غير مصرح بهذا الإجراء' });
    return next();
  } catch (e) { return serverError(req, res, e); }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MAINTENANCE MODE
let maintenanceMode = false;
let maintenanceKey = process.env.MAINTENANCE_KEY || crypto.randomBytes(16).toString('hex');

// Load maintenance state from Firestore on startup
(async () => {
  try {
    const doc = await db.collection('settings').doc('maintenance').get();
    if (doc.exists) {
      maintenanceMode = doc.data().enabled || false;
      maintenanceKey = doc.data().key || maintenanceKey;
    }
  } catch (e) {}
})();

app.use((req, res, next) => {
  // Skip for API calls, admin, and static assets
  const isApi = req.path.startsWith('/api/');
  const isAdmin = req.path.startsWith('/admin');
  const isAsset = req.path.match(/\.(css|js|png|jpg|jpeg|webp|ico|svg|woff|woff2|ttf)$/);
  if (!maintenanceMode || isApi || isAdmin || isAsset) return next();
  // Allow access with secret key
  if (req.query.key && req.query.key === maintenanceKey) {
    res.cookie('maintenance_bypass', maintenanceKey, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
    return next();
  }
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/maintenance_bypass=([^;]+)/);
  if (match && decodeURIComponent(match[1]) === maintenanceKey) return next();
  // Show maintenance page
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>أنتيكا ستور - تحت الصيانة</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #fdf6f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; padding: 40px 20px; max-width: 500px; }
    .logo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    h1 { color: #8B6F5E; font-size: 28px; margin-bottom: 16px; }
    p { color: #999; font-size: 16px; line-height: 1.8; }
    .icon { font-size: 60px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <img src="/images/logo.jpg" alt="أنتيكا ستور" class="logo" onerror="this.style.display='none'">
    <div class="icon">🛠️</div>
    <h1>المتجر تحت الصيانة</h1>
    <p>نعمل على تحسين تجربتك<br>سنعود قريباً بشكل أفضل ✨</p>
  </div>
</body>
</html>`);
});

app.use(express.static('.'));

// ADMIN AUTH
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (!safeEqual(username, ADMIN_USERNAME) || !safeEqual(password, ADMIN_PASSWORD)) return res.status(401).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ role: 'admin', username: ADMIN_USERNAME, type: 'admin' }, JWT_SECRET, { expiresIn: ADMIN_TOKEN_TTL });
  return res.json({ token, user: { name: 'Admin', username: ADMIN_USERNAME, isAdmin: true } });
});
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ ok: true, user: { username: req.admin.username, isAdmin: true } }));

// MAINTENANCE API
app.get('/api/admin/maintenance', requireAdmin, (req, res) => {
  res.json({ enabled: maintenanceMode, key: maintenanceKey });
});

app.post('/api/admin/maintenance', requireAdmin, async (req, res) => {
  const { enabled, key } = req.body;
  if (typeof enabled === 'boolean') maintenanceMode = enabled;
  if (key && key.trim().length >= 4) maintenanceKey = key.trim();
  try {
    await db.collection('settings').doc('maintenance').set({ enabled: maintenanceMode, key: maintenanceKey });
  } catch (e) {}
  res.json({ enabled: maintenanceMode, key: maintenanceKey });
});

// PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, featured, discount } = req.query;
    const snapshot = await db.collection('products').get();
    let products = docsToArr(snapshot);
    if (category) products = products.filter(p => (p.categories || []).includes(category) || p.category === category);
    if (featured === 'true') products = products.filter(p => p.isFeatured);
    if (discount === 'true') products = products.filter(p => p.discountPrice && p.discountPrice < p.price);
    if (search) { const s = search.toLowerCase(); products = products.filter(p => (p.name || '').toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s)); }
    products.sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    res.json(products);
  } catch (err) { serverError(req, res, err); }
});
app.get('/api/products/:id', async (req, res) => {
  try { const doc = await db.collection('products').doc(req.params.id).get(); if (!doc.exists) return res.status(404).json({ error: 'Product not found' }); res.json(Object.assign({ id: doc.id }, doc.data())); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    // توليد رقم الموديل (SKU) تلقائياً من القسم لو الفرونت طلب ذلك (autoGenerated) — مضمون التفرد عبر عداد القسم
    let generatedSku = null;
    if (req.body.skuAutoGenerated === true && req.body.skuCategoryId) {
      generatedSku = await generateSkuForCategory(req.body.skuCategoryId);
    }
    delete req.body.skuAutoGenerated;
    delete req.body.skuCategoryId;

    // 🔒 قفل نهائي: أي رمز (تلقائي أو يدوي) يُرفض لو مستخدم بمنتج ثاني فعلاً — بدون استثناء
    const sku = (generatedSku || req.body.sku || '').trim();
    if (sku) {
      const existing = await db.collection('products').where('sku', '==', sku).limit(1).get();
      if (!existing.empty) {
        return res.status(409).json({ error: 'رقم الموديل (SKU) مستخدم مسبقاً بمنتج آخر، يرجى اختيار رقم مختلف' });
      }
    }
    req.body.sku = sku;
    if (req.body.images && req.body.images.length > 0) req.body.images = await Promise.all(req.body.images.map(img => uploadToCloudinary(img, 'antika/products')));
    const ref = await db.collection('products').add(Object.assign({}, req.body, { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    const newId = ref.id;

    // ربط تلقائي في الاتجاهين عند إضافة منتج جديد
    const relatedIds = Array.isArray(req.body.relatedProductIds) ? req.body.relatedProductIds : [];
    if (relatedIds.length > 0) {
      await Promise.all(relatedIds.map(async (relId) => {
        try {
          const relDoc = await db.collection('products').doc(relId).get();
          if (!relDoc.exists) return;
          const relData = relDoc.data();
          const relList = Array.isArray(relData.relatedProductIds) ? relData.relatedProductIds : [];
          if (!relList.includes(newId)) {
            await relDoc.ref.update({ relatedProductIds: [...relList, newId] });
          }
        } catch(e) {}
      }));
    }

    const doc = await ref.get();
    res.json(Object.assign({ id: ref.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    // توليد رقم موديل جديد تلقائياً لو الفرونت طلب ذلك (زر "توليد رمز جديد" أو تغيير القسم الأساسي)
    if (req.body.skuAutoGenerated === true && req.body.skuCategoryId) {
      const generatedSku = await generateSkuForCategory(req.body.skuCategoryId);
      if (generatedSku) req.body.sku = generatedSku;
    }
    delete req.body.skuAutoGenerated;
    delete req.body.skuCategoryId;

    // 🔒 قفل نهائي: أي رمز (تلقائي أو يدوي) يُرفض لو مستخدم بمنتج ثاني غير هذا المنتج نفسه
    if (req.body.sku) {
      const skuTrimmed = String(req.body.sku).trim();
      req.body.sku = skuTrimmed;
      if (skuTrimmed) {
        const existing = await db.collection('products').where('sku', '==', skuTrimmed).limit(1).get();
        if (!existing.empty && existing.docs[0].id !== req.params.id) {
          return res.status(409).json({ error: 'رقم الموديل (SKU) مستخدم مسبقاً بمنتج آخر، يرجى اختيار رقم مختلف' });
        }
      }
    }

    if (req.body.images && req.body.images.length > 0) req.body.images = await Promise.all(req.body.images.map(img => uploadToCloudinary(img, 'antika/products')));
    await db.collection('products').doc(req.params.id).update(Object.assign({}, req.body, { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));

    // ربط تلقائي في الاتجاهين — كل منتج مرتبط يضاف هذا المنتج في قائمته
    const currentId = req.params.id;
    const newRelated = Array.isArray(req.body.relatedProductIds) ? req.body.relatedProductIds : [];
    if (newRelated.length > 0) {
      await Promise.all(newRelated.map(async (relId) => {
        try {
          const relDoc = await db.collection('products').doc(relId).get();
          if (!relDoc.exists) return;
          const relData = relDoc.data();
          const relList = Array.isArray(relData.relatedProductIds) ? relData.relatedProductIds : [];
          if (!relList.includes(currentId)) {
            await relDoc.ref.update({ relatedProductIds: [...relList, currentId] });
          }
        } catch(e) { /* تجاهل الخطأ لو منتج مش موجود */ }
      }));
    }

    const doc = await db.collection('products').doc(req.params.id).get();
    res.json(Object.assign({ id: doc.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try { await db.collection('products').doc(req.params.id).delete(); res.json({ message: 'Product deleted successfully' }); }
  catch (err) { serverError(req, res, err); }
});
app.delete('/api/products', requireAdmin, async (req, res) => {
  try { const s = await db.collection('products').get(); const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); res.json({ message: 'All products deleted', count: s.size }); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/products/bulk-discount', requireAdmin, async (req, res) => {
  try {
    const { productIds, discountType, discountValue } = req.body;
    const batch = db.batch();
    for (const id of productIds) {
      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists) continue;
      const p = doc.data();
      let dp = p.price, pct = 0;
      if (discountType === 'percentage') { dp = Math.round(p.price * (1 - discountValue / 100)); pct = discountValue; }
      else if (discountType === 'fixed') { dp = Math.max(0, p.price - discountValue); pct = Math.round((discountValue / p.price) * 100); }
      else if (discountType === 'newPrice') { dp = discountValue; pct = Math.round(((p.price - discountValue) / p.price) * 100); }
      batch.update(doc.ref, { discountPrice: dp, discountPercentage: pct, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    await batch.commit();
    res.json({ message: 'Bulk discount applied' });
  } catch (err) { serverError(req, res, err); }
});
app.get('/api/users/stats', requireAdmin, (req, res) => res.json({ genderStats: { male: 0, female: 0, unknown: 0 }, ageStats: { under18: 0, age18to25: 0, age26to35: 0, age36to50: 0, over50: 0, unknown: 0 }, totalUsers: 0 }));

// CATEGORIES
app.get('/api/categories', async (req, res) => {
  try { let s; try { s = await db.collection('categories').orderBy('sortOrder').get(); } catch (e) { s = await db.collection('categories').get(); } res.json(docsToArr(s)); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    if (!req.body.id) { const sn = (req.body.name || 'cat').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''); req.body.id = sn + '-' + Date.now(); }
    if (req.body.icon && req.body.icon.startsWith('data:')) req.body.icon = await uploadToCloudinary(req.body.icon, 'antika/categories');
    // رمز اختصار SKU — يُستخدم لتوليد رقم موديل المنتجات تلقائياً بهذا القسم (للأقسام الرئيسية فقط)
    if (req.body.skuPrefix) req.body.skuPrefix = String(req.body.skuPrefix).trim().toUpperCase().slice(0, 6);
    const ref = await db.collection('categories').add(Object.assign({}, req.body, { sortOrder: req.body.sortOrder || 0, lastSkuNumber: 0 }));
    const doc = await ref.get();
    res.json(Object.assign({ id: ref.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    if (req.body.icon && req.body.icon.startsWith('data:')) req.body.icon = await uploadToCloudinary(req.body.icon, 'antika/categories');
    const u = {};
    if (req.body.name !== undefined) u.name = req.body.name;
    if (req.body.icon !== undefined) u.icon = req.body.icon;
    if (Object.prototype.hasOwnProperty.call(req.body, 'parentId')) u.parentId = req.body.parentId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'skuPrefix')) u.skuPrefix = req.body.skuPrefix ? String(req.body.skuPrefix).trim().toUpperCase().slice(0, 6) : '';
    let docRef = db.collection('categories').doc(req.params.id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const snap = await db.collection('categories').where('id', '==', req.params.id).get();
      if (snap.empty) return res.status(404).json({ error: 'Category not found' });
      docRef = snap.docs[0].ref;
    }
    await docRef.update(u);
    const updated = await docRef.get();
    res.json(Object.assign({ id: updated.id }, updated.data()));
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const reqId = req.params.id;
    // Try by Firestore document ID first
    let docRef = db.collection('categories').doc(reqId);
    let doc = await docRef.get();
    // If not found, try by custom 'id' field
    if (!doc.exists) {
      const snap = await db.collection('categories').where('id', '==', reqId).get();
      if (snap.empty) return res.status(404).json({ error: 'Category not found' });
      docRef = snap.docs[0].ref;
      doc = snap.docs[0];
    }
    const catId = doc.data().id || reqId;
    await docRef.delete();
    // Delete children
    const ch = await db.collection('categories').where('parentId', '==', catId).get();
    if (!ch.empty) { const b = db.batch(); ch.docs.forEach(d => b.delete(d.ref)); await b.commit(); }
    res.json({ message: 'Category deleted' });
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/categories', requireAdmin, async (req, res) => {
  try { const s = await db.collection('categories').get(); const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); res.json({ message: 'All categories deleted', count: s.size }); }
  catch (err) { serverError(req, res, err); }
});
// معاينة رقم الموديل (SKU) القادم لقسم معيّن — بدون حجزه (المعاينة فقط، الحجز الفعلي يحصل عند حفظ المنتج)
app.get('/api/categories/:id/preview-sku', requireAdmin, async (req, res) => {
  try {
    const reqId = req.params.id;
    let docRef = db.collection('categories').doc(reqId);
    let doc = await docRef.get();
    if (!doc.exists) {
      const snap = await db.collection('categories').where('id', '==', reqId).limit(1).get();
      if (snap.empty) return res.status(404).json({ error: 'Category not found' });
      docRef = snap.docs[0].ref;
      doc = snap.docs[0];
    }
    const data = doc.data() || {};
    const prefix = (data.skuPrefix || 'GEN').toString().trim().toUpperCase();
    const next = (Number(data.lastSkuNumber) || 0) + 1;
    const sku = prefix + '-' + String(next).padStart(4, '0');
    res.json({ prefix, nextNumber: next, sku, categoryDocId: docRef.id });
  } catch (err) { serverError(req, res, err); }
});
app.post('/api/categories/reorder', requireAdmin, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds required' });
    const b = db.batch();
    orderedIds.forEach(item => b.update(db.collection('categories').doc(item.id), { sortOrder: Number(item.sortOrder) }));
    await b.commit();
    res.json({ success: true });
  } catch (err) { serverError(req, res, err); }
});

// COUPONS
app.get('/api/coupons', requireAdmin, async (req, res) => {
  try { let s; try { s = await db.collection('coupons').orderBy('createdAt', 'desc').get(); } catch (e) { s = await db.collection('coupons').get(); } res.json(docsToArr(s)); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/coupons', requireAdmin, async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, perUser, active, expiresAt } = req.body;
    if (!code || !type || value == null) return res.status(400).json({ error: '\u0628\u064a\u0627\u0646\u0627\u062a \u0646\u0627\u0642\u0635\u0629' });
    const uc = code.toUpperCase().trim();
    const ex = await db.collection('coupons').where('code', '==', uc).get();
    if (!ex.empty) return res.status(400).json({ error: '\u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062f \u0645\u0648\u062c\u0648\u062f \u0645\u0633\u0628\u0642\u0627\u064b' });
    const ref = await db.collection('coupons').add({ code: uc, type, value, minOrder: minOrder || 0, maxUses: maxUses || 0, usedCount: 0, perUser: !!perUser, active: active !== false, expiresAt: expiresAt || null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const doc = await ref.get();
    res.json(Object.assign({ id: ref.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/coupons/:id', requireAdmin, async (req, res) => {
  try { await db.collection('coupons').doc(req.params.id).update(req.body); const doc = await db.collection('coupons').doc(req.params.id).get(); res.json(Object.assign({ id: doc.id }, doc.data())); }
  catch (err) { serverError(req, res, err); }
});
app.delete('/api/coupons/:id', requireAdmin, async (req, res) => {
  try { await db.collection('coupons').doc(req.params.id).delete(); res.json({ message: '\u062a\u0645 \u0627\u0644\u062d\u0630\u0641' }); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/coupons/validate', couponLimiter, async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ error: '\u0623\u062f\u062e\u0644 \u0631\u0645\u0632 \u0627\u0644\u0643\u0648\u0628\u0648\u0646' });
    const s = await db.collection('coupons').where('code', '==', code.toUpperCase().trim()).where('active', '==', true).get();
    if (s.empty) return res.status(404).json({ error: '\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d' });
    const c = Object.assign({ id: s.docs[0].id }, s.docs[0].data());
    if (c.expiresAt && new Date() > new Date(c.expiresAt)) return res.status(400).json({ error: '\u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u0628\u0648\u0646' });
    if (c.minOrder > 0 && Number(orderTotal) < c.minOrder) return res.status(400).json({ error: '\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u064a\u0634\u062a\u0631\u0637 \u0637\u0644\u0628 \u0644\u0627 \u064a\u0642\u0644 \u0639\u0646 ' + c.minOrder + ' \u0631.\u0633' });
    if (c.maxUses > 0 && c.usedCount >= c.maxUses) return res.status(400).json({ error: '\u062a\u0645 \u0627\u0633\u062a\u0646\u0641\u0627\u0630 \u0639\u062f\u062f \u0645\u0631\u0627\u062a \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u0628\u0648\u0646' });
    const discount = c.type === 'percent' ? Math.round(Number(orderTotal) * (c.value / 100) * 100) / 100 : Math.min(c.value, Number(orderTotal));
    res.json({ valid: true, code: c.code, type: c.type, value: c.value, discount, label: c.type === 'percent' ? '\u062e\u0635\u0645 ' + c.value + '%' : '\u062e\u0635\u0645 ' + c.value + ' \u0631.\u0633', minOrder: c.minOrder });
  } catch (err) { serverError(req, res, err); }
});
// 🔒 احتساب استخدام الكوبون صار داخل إنشاء الطلب (POST /api/orders). نُبقي الراوت فقط لتوافق الفرونت القديم ولا يغيّر شي.
app.post('/api/coupons/use', (req, res) => res.json({ ok: true }));

// CART
app.get('/api/cart', async (req, res) => {
  try { const sid = getSessionId(req); const doc = await db.collection('carts').doc(sid).get(); res.json(doc.exists ? (doc.data().items || []) : []); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/cart', async (req, res) => {
  try {
    const sid = getSessionId(req);
    const { productId, name, price, image, quantity = 1 } = req.body;
    const pid = normalizeCartRef(productId);
    if (!pid || pid === 'undefined') return res.status(400).json({ error: 'Invalid productId' });
    const ref = db.collection('carts').doc(sid);
    const doc = await ref.get();
    let items = doc.exists ? (doc.data().items || []) : [];
    const idx = items.findIndex(i => normalizeCartRef(i.productId) === pid);
    if (idx >= 0) items[idx].quantity += Math.floor(Number(quantity)) || 1;
    else items.push({ productId: pid, name: String(name || ''), price: Number(price) || 0, image: String(image || ''), quantity: Math.floor(Number(quantity)) || 1 });
    await ref.set({ items, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json(items);
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/cart/:productId', async (req, res) => {
  try {
    const sid = getSessionId(req);
    const { quantity } = req.body;
    const pid = normalizeCartRef(req.params.productId);
    const ref = db.collection('carts').doc(sid);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Cart not found' });
    let items = doc.data().items || [];
    const qty = Math.floor(Number(quantity));
    if (qty <= 0) items = items.filter(i => normalizeCartRef(i.productId) !== pid);
    else { const idx = items.findIndex(i => normalizeCartRef(i.productId) === pid); if (idx >= 0) items[idx].quantity = qty; }
    await ref.update({ items, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json(items);
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/cart/:productId', async (req, res) => {
  try {
    const sid = getSessionId(req);
    const pid = normalizeCartRef(req.params.productId);
    const ref = db.collection('carts').doc(sid);
    const doc = await ref.get();
    if (!doc.exists) return res.json([]);
    const items = (doc.data().items || []).filter(i => normalizeCartRef(i.productId) !== pid);
    await ref.update({ items, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json(items);
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/cart', async (req, res) => {
  try { const sid = getSessionId(req); await db.collection('carts').doc(sid).set({ items: [], updatedAt: admin.firestore.FieldValue.serverTimestamp() }); res.json({ message: 'Cart cleared' }); }
  catch (err) { serverError(req, res, err); }
});

// ============================================
// STOCK RETURN ON CANCELLATION — إرجاع المخزون بدقة عند إلغاء أي طلب
// ============================================
// يرجّع كل قطعة محفوظة داخل الطلب (order.items) إلى مخزون منتجها الأصلي عبر Firestore Transaction واحدة،
// عشان نضمن دقة الأرقام حتى لو صار تزامن (concurrency) مع طلبات أو تعديلات ثانية بنفس اللحظة.
// أي extraOrderUpdates (مثل تغيير status) تُكتب على وثيقة الطلب ضمن نفس الـ Transaction لضمان الذرية (atomicity).
// رقم مرتجع/إشعار إلغاء تسلسلي ثابت (يبدأ من 1) — منفصل عن ترقيم الطلبات، ويبقى مربوطاً برقم الطلب الأصلي
async function getNextReturnNumber() {
  const counterRef = db.collection('counters').doc('returns');
  return await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    const current = doc.exists ? Number(doc.data().value || 0) : 0;
    const next = current + 1;
    t.set(counterRef, { value: next }, { merge: true });
    return next;
  });
}

async function restoreOrderStock(ref, order, extraOrderUpdates) {
  // 🔒 حماية من الإرجاع المضاعف: لو الطلب سبق ورجّعنا مخزونه، لا نكرر العملية أبداً
  if (order && order.stockReturned) {
    if (extraOrderUpdates && Object.keys(extraOrderUpdates).length) await ref.update(extraOrderUpdates);
    return { alreadyReturned: true, success: true, restored: [], failed: [] };
  }
  // 🔢 رقم مرتجع ثابت يُولَّد مرة واحدة فقط لهذا الطلب، ويبقى مرتبطاً برقم الطلب الأصلي دايماً
  if (!order || !order.returnNumber) {
    const returnNumber = await getNextReturnNumber();
    extraOrderUpdates = Object.assign({}, extraOrderUpdates, { returnNumber });
  }
  const items = Array.isArray(order && order.items) ? order.items : [];
  const qtyByProduct = {};
  const nameByProduct = {};
  for (const it of items) {
    const pid = it && it.productId ? String(it.productId) : '';
    const qty = Number(it && it.quantity) || 0;
    if (!pid || qty <= 0) continue;
    qtyByProduct[pid] = (qtyByProduct[pid] || 0) + qty;
    if (!nameByProduct[pid]) nameByProduct[pid] = String((it && it.name) || '');
  }
  const productIds = Object.keys(qtyByProduct);

  const txResult = await db.runTransaction(async (t) => {
    const restored = [];
    const failed = [];
    // ⚠️ كل قراءات الـ Transaction يجب أن تحصل قبل أي كتابة (متطلب Firestore) — لذا نجمع القراءات أولاً بالكامل
    const refs = productIds.map(pid => db.collection('products').doc(pid));
    const snaps = [];
    for (const r of refs) snaps.push(await t.get(r));
    snaps.forEach((snap, i) => {
      const pid = productIds[i];
      const qty = qtyByProduct[pid];
      if (!snap.exists) {
        // المنتج محذوف نهائياً من المخزون (مثلاً: كانت آخر قطعة وحذفه الأدمن يدوياً) — لا يمكن إرجاع تلقائي آمن
        failed.push({ productId: pid, name: nameByProduct[pid] || '', quantity: qty, reason: 'product_not_found' });
        return;
      }
      const data = snap.data() || {};
      const currentStock = Number.isFinite(Number(data.stock)) ? Number(data.stock) : 0;
      const newStock = currentStock + qty;
      t.update(snap.ref, { stock: newStock });
      restored.push({ productId: pid, name: data.name || nameByProduct[pid] || '', quantity: qty, stockBefore: currentStock, stockAfter: newStock });
    });

    const hasNoItems = items.length === 0 || productIds.length === 0;
    // ✅ النجاح المؤكد يُشترط فيه: وجود منتجات فعلاً بالطلب + نجاح إرجاع كل قطعة منها بدون استثناء واحد
    const success = !hasNoItems && failed.length === 0;
    const nowIso = new Date().toISOString();
    const stockReturnLog = stripUndefinedDeep({
      attemptedAt: nowIso,
      success,
      restoredItems: restored,
      failedItems: failed,
      note: hasNoItems ? 'الطلب لا يحتوي على منتجات مرتبطة بالمخزون' : null
    });
    const orderUpdates = Object.assign({}, extraOrderUpdates || {}, {
      stockReturnAttempted: true,
      stockReturned: success,
      stockReturnedAt: nowIso,
      stockReturnLog
    });
    t.update(ref, orderUpdates);
    return { success, restored, failed, hasNoItems };
  });

  // 📋 سجل تدقيق دائم بكولكشن منفصل — يبقى موجوداً حتى لو الطلب نفسه انحذف لاحقاً من الأدمن
  try {
    await db.collection('stock_return_logs').add(stripUndefinedDeep({
      orderId: ref.id,
      orderNumber: (order && order.orderNumber) || null,
      customerEmail: (order && order.customerEmail) || null,
      success: txResult.success,
      restoredItems: txResult.restored,
      failedItems: txResult.failed,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }));
  } catch (le) { console.error('Stock return log error:', le.message); }

  return txResult;
}

// ORDERS
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    let s;
    try { s = await db.collection('orders').orderBy('date', 'desc').get(); } catch (e) { s = await db.collection('orders').get(); }
    // 🔒 نستبعد الطلبات اللي "حذفها" الأدمن (soft delete) — الطلب يفضل موجود بالكامل عند العميل رغم اختفائه من هنا
    res.json(docsToArr(s).filter(o => !o.adminDeleted));
  }
  catch (err) { serverError(req, res, err); }
});
// \u062c\u0644\u0628 \u0637\u0644\u0628\u0627\u062a \u0639\u0645\u064a\u0644 \u0645\u0639\u064a\u0646 (\u0628\u062f\u0648\u0646 \u0635\u0644\u0627\u062d\u064a\u0629 \u0623\u062f\u0645\u0646) \u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647 \u0641\u064a \u0635\u0641\u062d\u0629 "\u0637\u0644\u0628\u0627\u062a\u064a"
app.get('/api/orders/customer', requireOwnEmail(r => r.query.email), async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.json([]);
    let s;
    try { s = await db.collection('orders').where('customerEmail', '==', email).orderBy('date', 'desc').get(); }
    catch (e) { s = await db.collection('orders').where('customerEmail', '==', email).get(); }
    res.json(docsToArr(s));
  } catch (err) { serverError(req, res, err); }
});
app.get('/api/orders/:id', requireAdmin, async (req, res) => {
  try { const doc = await db.collection('orders').doc(req.params.id).get(); if (!doc.exists) return res.status(404).json({ error: 'Order not found' }); res.json(Object.assign({ id: doc.id }, doc.data())); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/orders', orderCreateLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    // 🔒 قائمة بيضاء: نقبل فقط بيانات العميل من الفرونت — السعر/الإجمالي/الحالة/الدفع كلها يحسبها السيرفر
    const CUSTOMER_FIELDS = ['customerName','customerPhone','customerEmail','customerAddress','customerCity','customerDistrict','customerStreet','customerBuilding','customerPostal','customerLandmark','customerAltPhone'];
    const payload = {};
    CUSTOMER_FIELDS.forEach(k => { if (body[k] != null) payload[k] = String(body[k]).trim().slice(0, 500); });
    if (payload.customerEmail) payload.customerEmail = payload.customerEmail.toLowerCase();
    // 🔒 إجبارية الموقع الجغرافي: لا يُقبل أي طلب بدون إحداثيات صالحة (يمنع التلاعب من الفرونت)
    const rawLat = body.lat != null ? body.lat : (body.location && Array.isArray(body.location.coordinates) ? body.location.coordinates[1] : undefined);
    const rawLng = body.lng != null ? body.lng : (body.location && Array.isArray(body.location.coordinates) ? body.location.coordinates[0] : undefined);
    const numLat = Number(rawLat);
    const numLng = Number(rawLng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng) || (numLat === 0 && numLng === 0)) {
      return res.status(400).json({ error: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0628\u062f\u0648\u0646 \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0642\u0639 \u0635\u0627\u0644\u062d \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629' });
    }
    payload.lat = numLat;
    payload.lng = numLng;
    payload.location = { type: 'Point', coordinates: [numLng, numLat] };
    // 🔒 إجبارية رقم جوال سعودي صحيح: لا يُقبل أي طلب برقم ناقص أو غير صالح (يمنع التلاعب من الفرونت)
    if (!isValidSaudiPhone(payload.customerPhone)) {
      return res.status(400).json({ error: '\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u060c \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0633\u0639\u0648\u062f\u064a \u0645\u0643\u0648\u0646 \u0645\u0646 9 \u0623\u0631\u0642\u0627\u0645 \u0648\u064a\u0628\u062f\u0623 \u0628\u0640 5' });
    }
    const pm = ['cash', 'unpaid'].includes(String(body.paymentMethod || '').toLowerCase()) ? String(body.paymentMethod).toLowerCase() : 'unpaid';
    payload.codFee = pm === 'cash' ? COD_SURCHARGE_SAR : 0;
    payload.paymentMethod = pm;

    // 🔒 التسعير من السيرفر: نقرأ الأسعار من المنتجات نفسها ونتجاهل أي سعر أو إجمالي يجي من العميل
    const ENFORCE_STOCK_AT_ORDER = true; // false = يقبل الطلب حتى لو الكمية أكبر من المخزون (تأكيد التوفر يدوي)
    const badReq = (msg) => { const e = new Error(msg); e.status = 400; return e; };
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0 || rawItems.length > 50) throw badReq('السلة فارغة أو غير صالحة');
    const qtyBy = {}; const clientImg = {};
    for (const it of rawItems) {
      const pid = String((it && it.productId) || '').trim();
      const qty = Math.floor(Number(it && it.quantity));
      if (!pid || pid.includes('/') || !Number.isFinite(qty) || qty < 1 || qty > 100) throw badReq('بيانات المنتجات غير صالحة');
      qtyBy[pid] = (qtyBy[pid] || 0) + qty;
      if (!clientImg[pid]) clientImg[pid] = String((it && it.image) || '').slice(0, 500);
    }
    const pids = Object.keys(qtyBy);
    const reservedStock = []; // للتراجع لو فشل إنشاء الطلب
    const orderItems = await db.runTransaction(async (t) => {
      reservedStock.length = 0; // الـ Transaction ممكن يُعاد تشغيله عند التزاحم
      const snaps = [];
      for (const pid of pids) snaps.push(await t.get(db.collection('products').doc(pid)));
      const lines = [];
      snaps.forEach((snap, idx) => {
        const pid = pids[idx]; const qty = qtyBy[pid];
        if (!snap.exists) throw badReq('أحد المنتجات لم يعد متوفراً في المتجر');
        const d = snap.data() || {};
        const base = Number(d.price); const dp = Number(d.discountPrice);
        if (!Number.isFinite(base) || base <= 0) throw badReq('تعذر تحديد سعر أحد المنتجات');
        const unit = (Number.isFinite(dp) && dp > 0 && dp < base) ? dp : base;
        const stock = Number(d.stock);
        if (d.stock != null && Number.isFinite(stock)) {
          if (ENFORCE_STOCK_AT_ORDER && qty > stock) throw badReq('الكمية المطلوبة من "' + (d.name || 'المنتج') + '" غير متوفرة حالياً (المتوفر: ' + Math.max(0, stock) + ')');
          t.update(snap.ref, { stock: Math.max(0, stock - qty) });
          reservedStock.push({ ref: snap.ref, qty });
        }
        lines.push({ productId: pid, name: String(d.name || ''), price: unit, image: (Array.isArray(d.images) && d.images[0]) || d.image || clientImg[pid] || '', quantity: qty });
      });
      return lines;
    });
    const round2 = (n) => Math.round(n * 100) / 100;
    const subTotal = round2(orderItems.reduce((a, l) => a + l.price * l.quantity, 0));
    // 🔒 الكوبون يُتحقق منه ويُحسب من السيرفر
    let discount = 0; let appliedCouponRef = null; let appliedCouponCode = null;
    const rawCoupon = String(body.couponCode || '').toUpperCase().trim();
    try {
      if (rawCoupon) {
        const cs = await db.collection('coupons').where('code', '==', rawCoupon).where('active', '==', true).limit(1).get();
        if (cs.empty) throw badReq('الكوبون غير صالح');
        const c = cs.docs[0].data();
        if (c.expiresAt && new Date() > new Date(c.expiresAt)) throw badReq('انتهت صلاحية هذا الكوبون');
        if (c.minOrder > 0 && subTotal < c.minOrder) throw badReq('الكوبون يشترط طلب لا يقل عن ' + c.minOrder + ' ر.س');
        if (c.maxUses > 0 && c.usedCount >= c.maxUses) throw badReq('تم استنفاذ عدد مرات استخدام هذا الكوبون');
        discount = c.type === 'percent' ? subTotal * (Number(c.value) / 100) : Number(c.value);
        if (!Number.isFinite(discount) || discount < 0) discount = 0;
        discount = round2(Math.min(discount, subTotal));
        appliedCouponRef = cs.docs[0].ref; appliedCouponCode = rawCoupon;
      }
    } catch (ce) {
      for (const r of reservedStock) { try { await r.ref.update({ stock: admin.firestore.FieldValue.increment(r.qty) }); } catch (_) {} }
      throw ce;
    }
    payload.items = orderItems;
    payload.subTotal = subTotal;
    payload.discount = discount;
    payload.couponCode = appliedCouponCode;
    payload.total = round2(Math.max(0, subTotal - discount));
    // كل طلب جديد يبدأ تلقائياً بحالة "تأكيد التوفر + احتساب الشحن" بدون أي إجراء من الأدمن
    payload.status = 'confirming_availability';
    payload.isPaid = false;
    payload.date = admin.firestore.FieldValue.serverTimestamp();
    payload.statusTimeline = [{ status: payload.status, title: '\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0637\u0644\u0628', message: '\u0627\u0633\u062a\u0644\u0645\u0646\u0627 \u0637\u0644\u0628\u0643 \u0628\u0646\u062c\u0627\u062d.', source: 'system', at: new Date().toISOString() }];
    let ref;
    try {
      payload.orderNumber = await getNextOrderNumber();
      ref = await db.collection('orders').add(payload);
    } catch (oe) {
      for (const r of reservedStock) { try { await r.ref.update({ stock: admin.firestore.FieldValue.increment(r.qty) }); } catch (_) {} }
      throw oe;
    }
    if (appliedCouponRef) { try { await appliedCouponRef.update({ usedCount: admin.firestore.FieldValue.increment(1) }); } catch (ue) { console.error('Coupon usage error:', ue.message); } }
    if (!payload.orderCode) { /* 🗑️ توليد orderCode أُلغي — رقم الطلب الحقيقي orderNumber (أعلاه) هو المرجع الوحيد المعروض للعميل من الآن */ }
    // (خصم المخزون صار داخل Transaction أعلاه)
    const doc = await ref.get();
    const order = Object.assign({ id: ref.id }, doc.data());
    try { const nr = await sendOrderCustomerNotification(order, { title: '\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643' }); if (nr.sent) await ref.update({ customerNotifiedAt: new Date().toISOString() }); } catch (ne) { console.error('Notify error:', ne.message); }
    res.json(order);
  } catch (err) { if (!err.status) console.error('Create order error:', err); res.status(err.status || 500).json({ error: err.status ? err.message : 'تعذر إنشاء الطلب، حاول مرة أخرى' }); }
});
app.put('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    const order = Object.assign({ id: doc.id }, doc.data());
    const allowed = ['status','shippingCarrier','trackingNumber','trackingUrl','shipmentReference','shippingMethod','shippingMethodLabel','shippingCity','shippingRegion','shippingEta','shippingCost','shippingBaseFee','shippingMethodExtraFee','codFee','paymentMethod','otoTrackingNumber','otoAwbUrl','otoStatus','otoDcStatus',
      // 🚚 إدخال يدوي لرقم تتبع شركة الشحن الحقيقية ومرجع OTO لما الأدمن ينشئ الشحنة بنفسه مباشرة من لوحة OTO (بدون المرور بزر الإنشاء التلقائي)
      'dcTrackingNumber','deliveryCompany','otoTrackingUrl','otoOrderId',
      'total','weight','awaitingPaymentSince','isPaid','paidAt'];
    const updates = {};
    const before = { status: String(order.status || ''), trackingNumber: String(order.trackingNumber || '') };
    for (const field of allowed) { if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== undefined) updates[field] = req.body[field]; }
    const nextStatus = String(updates.status || order.status || 'processing');
    // 🔒 قفل صارم على مستوى السيرفر: لا يمكن الانتقال لمرحلة التجهيز أو ما بعدها قبل تأكيد الدفع
    const LOCKED_STATUSES = ['processing', 'shipped', 'out_for_delivery', 'delivered'];
    const PRE_PAYMENT_STATUSES = ['confirming_availability', 'awaiting_shipping_payment'];
    if (LOCKED_STATUSES.includes(nextStatus) && PRE_PAYMENT_STATUSES.includes(order.status) && !order.isPaid && !updates.isPaid) {
      return res.status(400).json({ error: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0646\u0642\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0642\u0628\u0644 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639' });
    }
    updates.status = nextStatus;
    const statusChanged = before.status !== nextStatus;
    const trackingChanged = before.trackingNumber !== String(updates.trackingNumber || order.trackingNumber || '');
    // 🔒 سبب الإلغاء إجباري لما الأدمن يلغي طلب — يضمن شفافية واضحة للعميل عن سبب الإلغاء
    if (statusChanged && nextStatus === 'cancelled') {
      const cancelReason = String((req.body && req.body.cancelReason) || '').trim();
      if (!cancelReason) return res.status(400).json({ error: '\u064a\u062c\u0628 \u0643\u062a\u0627\u0628\u0629 \u0633\u0628\u0628 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0642\u0628\u0644 \u0627\u0644\u062a\u0623\u0643\u064a\u062f' });
      updates.cancelReason = cancelReason;
      updates.cancelledBy = 'admin';
    }
    if (statusChanged) {
      if (nextStatus === 'shipped' && !order.shippedAt) updates.shippedAt = new Date().toISOString();
      if (nextStatus === 'out_for_delivery' && !order.outForDeliveryAt) updates.outForDeliveryAt = new Date().toISOString();
      if (nextStatus === 'delivered' && !order.deliveredAt) updates.deliveredAt = new Date().toISOString();
      const tl = order.statusTimeline || [];
      const tlMessage = nextStatus === 'cancelled'
        ? '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u2014 \u0627\u0644\u0633\u0628\u0628: ' + updates.cancelReason
        : '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 \u0625\u0644\u0649: ' + getOrderStatusTextAr(nextStatus);
      tl.push({ status: nextStatus, title: '\u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628', message: tlMessage, source: 'admin', at: new Date().toISOString() });
      updates.statusTimeline = tl;
    }
    // 🔁 إلغاء الطلب من الأدمن = إرجاع تلقائي وآمن للمخزون (ضمن نفس Transaction تحديث الحالة، ولا يتكرر لو سبق إرجاعه)
    let stockResult = null;
    if (statusChanged && nextStatus === 'cancelled') {
      stockResult = await restoreOrderStock(ref, order, updates);
    } else {
      await ref.update(updates);
    }
    if (statusChanged || trackingChanged) { try { const uo = Object.assign({}, order, updates); const nr = await sendOrderCustomerNotification(uo, { title: statusChanged ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628: ' + getOrderStatusTextAr(nextStatus) : '\u062a\u062d\u062f\u064a\u062b \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062d\u0646\u0629' }); if (nr.sent) await ref.update({ customerNotifiedAt: new Date().toISOString() }); } catch (ne) { console.error('Notify error:', ne.message); } }
    const ud = await ref.get();
    res.json({ success: true, notificationSent: statusChanged || trackingChanged, stockReturned: stockResult ? stockResult.success : undefined, stockReturnFailed: stockResult ? stockResult.failed : undefined, order: Object.assign({ id: ud.id }, ud.data()) });
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: '\u0627\u0644\u0637\u0644\u0628 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const order = Object.assign({ id: doc.id }, doc.data());
    // 🔒 لا يمكن حذف الطلب إلا بعد إلغائه أولاً (سواء من العميل أو الأدمن)
    if (order.status !== 'cancelled') {
      return res.status(400).json({ error: '\u064a\u062c\u0628 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0623\u0648\u0644\u0627\u064b \u0642\u0628\u0644 \u062d\u0630\u0641\u0647 \u0646\u0647\u0627\u0626\u064a\u0627\u064b' });
    }
    let stockResult = null;
    // 🛡️ شبكة أمان: لو لأي سبب المخزون ما ارتجع وقت الإلغاء، نرجّعه هنا قبل الحذف
    if (!order.stockReturned) {
      try { stockResult = await restoreOrderStock(ref, order, {}); }
      catch (se) { console.error('Stock restore before delete error:', se.message); }
    }
    // 🔀 حذف من عند الأدمن فقط (soft delete) — الطلب يبقى موجوداً بالكامل عند العميل، مستقل تماماً عن قرار الأدمن
    await ref.update({ adminDeleted: true, adminDeletedAt: new Date().toISOString() });
    res.json({ message: 'Order deleted (admin view only)', stockReturned: stockResult ? stockResult.success : undefined, stockReturnFailed: stockResult ? stockResult.failed : undefined });
  } catch (err) { serverError(req, res, err); }
});
// \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0637\u0631\u0641 \u0627\u0644\u0639\u0645\u064a\u0644 \u0642\u0628\u0644 \u0627\u0644\u062f\u0641\u0639 \u0641\u0642\u0637 (\u0644\u0627 \u064a\u062d\u0630\u0641 \u0627\u0644\u0637\u0644\u0628\u060c \u0641\u0642\u0637 \u064a\u062e\u0641\u064a\u0647 \u0639\u0646 \u0627\u0644\u0639\u0645\u064a\u0644 \u0648\u064a\u0638\u0647\u0631 \u0644\u0644\u0623\u062f\u0645\u0646 \u0623\u0646 \u0627\u0644\u0639\u0645\u064a\u0644 \u0623\u0644\u063a\u0627\u0647)
app.post('/api/orders/:id/cancel', requireOwnEmail(r => r.body && r.body.customerEmail), async (req, res) => {
  try {
    const { customerEmail, reason } = req.body || {};
    const cancelReason = String(reason || '').trim();
    // 🔒 سبب الإلغاء إجباري — يمنع إلغاء طلب بدون توضيح السبب للطرفين
    if (!cancelReason) return res.status(400).json({ error: '\u064a\u0631\u062c\u0649 \u0643\u062a\u0627\u0628\u0629 \u0633\u0628\u0628 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628' });
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: '\u0627\u0644\u0637\u0644\u0628 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const order = doc.data();
    const email = String(customerEmail || '').trim().toLowerCase();
    if (!email || email !== String(order.customerEmail || '').trim().toLowerCase()) {
      return res.status(403).json({ error: '\u063a\u064a\u0631 \u0645\u0635\u0631\u062d \u0628\u0625\u0644\u063a\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628' });
    }
    if (order.isPaid) return res.status(400).json({ error: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0625\u0644\u063a\u0627\u0621 \u0637\u0644\u0628 \u062a\u0645 \u062f\u0641\u0639\u0647\u060c \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062f\u0639\u0645' });
    const cancellableStatuses = ['confirming_availability', 'awaiting_shipping_payment'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ error: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0645\u0631\u062d\u0644\u0629' });
    }
    const tl = order.statusTimeline || [];
    tl.push({ status: 'cancelled', title: '\u0625\u0644\u063a\u0627\u0621 \u0645\u0646 \u0627\u0644\u0639\u0645\u064a\u0644', message: '\u0642\u0627\u0645 \u0627\u0644\u0639\u0645\u064a\u0644 \u0628\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0642\u0628\u0644 \u0627\u0644\u062f\u0641\u0639 \u2014 \u0627\u0644\u0633\u0628\u0628: ' + cancelReason, source: 'customer', at: new Date().toISOString() });
    // 🔁 إرجاع كل قطعة بالطلب لمخزون منتجها الأصلي (Transaction آمنة + سجل تدقيق) — لا يُحذف الطلب، فقط يُعلَّم ويُرجَّع مخزونه
    // 🔒 لازم status تتحول فعلياً لـ 'cancelled' هنا (نفس ما يصير بإلغاء الأدمن) — وإلا يفضل الطلب "غير ملغي" رسمياً
    // ويمنع زر الحذف بالأدمن من الفتح، ويرفضه راوت الحذف نفسه رغم ظهور علامة "ألغاه العميل"
    const stockResult = await restoreOrderStock(ref, order, { status: 'cancelled', customerCancelled: true, customerCancelledAt: new Date().toISOString(), cancelReason, cancelledBy: 'customer', statusTimeline: tl });
    res.json({ success: true, stockReturned: stockResult.success, stockReturnFailed: stockResult.failed || [] });
  } catch (err) { serverError(req, res, err); }
});
// 🙈 العميل يخفي طلباً ملغياً من قائمته الخاصة فقط — لا يمس سجل الطلب بالأدمن إطلاقاً (تحكم مستقل تماماً عن الأدمن)
app.post('/api/orders/:id/hide-for-customer', requireOwnEmail(r => r.body && r.body.customerEmail), async (req, res) => {
  try {
    const { customerEmail } = req.body || {};
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: '\u0627\u0644\u0637\u0644\u0628 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const order = doc.data();
    const email = String(customerEmail || '').trim().toLowerCase();
    if (!email || email !== String(order.customerEmail || '').trim().toLowerCase()) {
      return res.status(403).json({ error: '\u063a\u064a\u0631 \u0645\u0635\u0631\u062d \u0628\u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621' });
    }
    if (order.status !== 'cancelled') {
      return res.status(400).json({ error: '\u064a\u0645\u0643\u0646 \u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0644\u063a\u0627\u0629 \u0641\u0642\u0637' });
    }
    await ref.update({ customerHidden: true, customerHiddenAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { serverError(req, res, err); }
});
// ===== 🔄 نظام طلب استرجاع منتج (3 أيام من تاريخ التوصيل، بدون استبدال) =====
function canRequestReturn(order) {
  if (order.status !== 'delivered') return { ok: false, error: 'يمكن طلب الاسترجاع فقط بعد توصيل الطلب' };
  if (!order.deliveredAt) return { ok: false, error: 'تاريخ التوصيل غير مسجل لهذا الطلب، تواصل معنا مباشرة' };
  const deliveredMs = new Date(order.deliveredAt).getTime();
  if (!Number.isFinite(deliveredMs)) return { ok: false, error: 'تاريخ التوصيل غير صالح' };
  const daysPassed = (Date.now() - deliveredMs) / (1000 * 60 * 60 * 24);
  if (daysPassed > RETURN_WINDOW_DAYS) return { ok: false, error: `انتهت فترة الاسترجاع (${RETURN_WINDOW_DAYS} أيام من تاريخ التوصيل)` };
  const existing = order.returnRequest;
  if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
    return { ok: false, error: 'يوجد طلب استرجاع مسجل مسبقاً لهذا الطلب' };
  }
  return { ok: true };
}
// 👤 العميل يطلب استرجاع منتج معين من طلب تم توصيله (خلال المدة المسموحة فقط)
app.post('/api/orders/:id/return-request', requireOwnEmail(r => r.body && r.body.customerEmail), async (req, res) => {
  try {
    const { customerEmail, itemIndex, quantity, reason } = req.body || {};
    const returnReason = String(reason || '').trim();
    if (!returnReason) return res.status(400).json({ error: 'يرجى كتابة سبب الاسترجاع' });
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'الطلب غير موجود' });
    const order = doc.data();
    const email = String(customerEmail || '').trim().toLowerCase();
    if (!email || email !== String(order.customerEmail || '').trim().toLowerCase()) {
      return res.status(403).json({ error: 'غير مصرح بهذا الإجراء' });
    }
    const check = canRequestReturn(order);
    if (!check.ok) return res.status(400).json({ error: check.error });
    const items = Array.isArray(order.items) ? order.items : [];
    const idx = Number(itemIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= items.length) return res.status(400).json({ error: 'منتج غير صالح' });
    const item = items[idx];
    const maxQty = Number(item.quantity || 1);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return res.status(400).json({ error: 'الكمية غير صالحة' });
    const returnRequest = {
      status: 'pending',
      itemIndex: idx,
      itemName: item.name || item.title || 'منتج',
      quantity: qty,
      reason: returnReason,
      requestedAt: new Date().toISOString(),
      decidedAt: null,
      decisionNote: null
    };
    const tl = order.statusTimeline || [];
    tl.push({ status: 'return_requested', title: 'طلب استرجاع منتج', message: `طلب العميل استرجاع "${returnRequest.itemName}" (الكمية: ${qty}) — السبب: ${returnReason}`, source: 'customer', at: returnRequest.requestedAt });
    await ref.update({ returnRequest, statusTimeline: tl });
    res.json({ success: true, returnRequest });
  } catch (err) { serverError(req, res, err); }
});
// 🛠️ الأدمن يوافق أو يرفض طلب استرجاع معلّق
app.put('/api/orders/:id/return-request', requireAdmin, async (req, res) => {
  try {
    const { action, decisionNote } = req.body || {};
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'إجراء غير صالح' });
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'الطلب غير موجود' });
    const order = doc.data();
    if (!order.returnRequest || order.returnRequest.status !== 'pending') {
      return res.status(400).json({ error: 'لا يوجد طلب استرجاع بانتظار المراجعة لهذا الطلب' });
    }
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const note = String(decisionNote || '').trim() || null;
    const updatedReturnRequest = Object.assign({}, order.returnRequest, { status: newStatus, decidedAt: new Date().toISOString(), decisionNote: note });
    const tl = order.statusTimeline || [];
    tl.push({
      status: newStatus === 'approved' ? 'return_approved' : 'return_rejected',
      title: newStatus === 'approved' ? 'تمت الموافقة على طلب الاسترجاع' : 'تم رفض طلب الاسترجاع',
      message: note || '',
      source: 'admin',
      at: updatedReturnRequest.decidedAt
    });
    await ref.update({ returnRequest: updatedReturnRequest, statusTimeline: tl });
    try {
      await sendOrderCustomerNotification(Object.assign({ id: ref.id }, order), {
        title: newStatus === 'approved' ? 'تمت الموافقة على طلب الاسترجاع' : 'تم رفض طلب الاسترجاع',
        message: newStatus === 'approved'
          ? `تمت الموافقة على استرجاع "${updatedReturnRequest.itemName}". سيتم التواصل معك لترتيب استلام المنتج.`
          : `نأسف، تم رفض طلب استرجاع "${updatedReturnRequest.itemName}"${note ? ' — السبب: ' + note : ''}.`
      });
    } catch (ne) { console.error('Return notify error:', ne.message); }
    res.json({ success: true, returnRequest: updatedReturnRequest });
  } catch (err) { serverError(req, res, err); }
});

app.get('/api/cancel-reasons', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('cancel_reasons').orderBy('createdAt', 'asc').get();
    res.json(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
  } catch (err) { serverError(req, res, err); }
});
app.post('/api/cancel-reasons', requireAdmin, async (req, res) => {
  try {
    const text = String((req.body && req.body.text) || '').trim();
    if (!text) return res.status(400).json({ error: '\u0627\u0644\u0646\u0635 \u0645\u0637\u0644\u0648\u0628' });
    const dup = await db.collection('cancel_reasons').where('text', '==', text).get();
    if (!dup.empty) return res.json(Object.assign({ id: dup.docs[0].id }, dup.docs[0].data()));
    const ref = await db.collection('cancel_reasons').add({ text, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const doc = await ref.get();
    res.json(Object.assign({ id: ref.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/cancel-reasons/:id', requireAdmin, async (req, res) => {
  try { await db.collection('cancel_reasons').doc(req.params.id).delete(); res.json({ success: true }); }
  catch (err) { serverError(req, res, err); }
});
app.post('/api/orders/:id/create-shipment', requireAdmin, async (req, res) => {
  try {
    if (!isOTOConfigured()) return res.status(400).json({ error: 'OTO not configured' });
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    const order = Object.assign({ id: doc.id }, doc.data());
    if (order.otoOrderId) return res.json({ success: true, order });
    const cod = String(order.paymentMethod || '').toLowerCase() === 'cash';
    const genId = OTO_ORDER_PREFIX + '-' + order.id;
    const payload = stripUndefinedDeep({ orderId: genId, createShipment: true, pickupLocationCode: OTO_PICKUP_LOCATION_CODE, payment_method: cod ? 'cod' : 'paid', amount: Number(order.total || 0), amount_due: cod ? Number(order.total || 0) : 0, currency: 'SAR', packageWeight: 1, customer: { name: String(order.customerName || '').trim(), mobile: sanitizePhone(order.customerPhone), email: String(order.customerEmail || '').trim(), country: 'SA', city: String(order.shippingCity || '').trim() || 'Riyadh', district: String(order.customerDistrict || '').trim(), street: String(order.customerStreet || '').trim(), buildingNo: String(order.customerBuilding || '').trim(), postcode: String(order.customerPostal || '').trim(), address: String(order.customerAddress || '').trim(),
      // 🎯 إحداثيات GPS الدقيقة (عندنا إجبارية على كل طلب) — أسماء الحقول lat/lon مطابقة تمامًا لتوثيق OTO الرسمي (مو lng)
      // بدونها OTO يعتمد على النص فقط، وهذا سبب ضعف الدقة اللي كان يحصل بالإدخال اليدوي بلوحة OTO
      lat: (order.lat !== undefined && order.lat !== null) ? Number(order.lat) : undefined,
      lon: (order.lng !== undefined && order.lng !== null) ? Number(order.lng) : undefined }, items: (order.items || []).map((item, i) => ({ productId: String(item.productId || 'item-' + i), name: String(item.name || 'Item'), price: Number(item.price || 0), rowTotal: Number(item.price || 0) * Number(item.quantity || 1), quantity: Number(item.quantity || 1), sku: String(item.productId || 'SKU-' + i) })) });
    const otoResult = await callOTO('createOrder', payload);
    const updates = {
      otoOrderId: String((otoResult && otoResult.orderId) || genId),
      otoTrackingNumber: String((otoResult && otoResult.trackingNumber) || ''), // مرجع OTO الداخلي (للاستخدام الإداري فقط، ما يُعرض للعميل)
      // 🚚 الرقم الحقيقي الصادر من شركة الشحن الفعلية نفسها — هذا اللي يشتغل على موقع الشركة (أرامكس/سمسا/إلخ) مباشرة
      dcTrackingNumber: String((otoResult && otoResult.dcTrackingNumber) || ''),
      deliveryCompany: String((otoResult && otoResult.deliveryCompany) || ''),
      otoAwbUrl: String((otoResult && otoResult.printAWBURL) || ''), // رابط طباعة بوليصة الشحن (للأدمن)
      otoTrackingUrl: String((otoResult && otoResult.trackingUrl) || ''), // رابط تتبع فعلي من شركة الشحن (للعميل)
      otoStatus: String((otoResult && otoResult.status) || 'shipmentCreated'),
      status: mapOTOStatusToOrderStatus(String((otoResult && otoResult.status) || ''), ''),
      shippingCarrier: 'OTO'
    };
    await ref.update(updates);
    const ud = await ref.get();
    return res.json({ success: true, oto: otoResult, order: Object.assign({ id: ud.id }, ud.data()) });
  } catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
});
app.post('/api/oto/webhook', async (req, res) => {
  try {
    if (!OTO_WEBHOOK_AUTH_KEY) return res.status(503).json({ error: 'Webhook not configured' });
    { const ac = [req.headers.authorization, req.headers['x-oto-key'], req.headers['x-api-key']].filter(Boolean).map(v => String(v).replace(/^Bearer\s+/i, '').trim()); if (!ac.includes(OTO_WEBHOOK_AUTH_KEY)) return res.status(401).json({ error: 'Unauthorized' }); }
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let count = 0;
    for (const ev of events) {
      const oid = String((ev && ev.orderId) || (ev && ev.order_id) || '').trim();
      if (!oid) continue;
      const s = await db.collection('orders').where('otoOrderId', '==', oid).get();
      if (s.empty) continue;
      const st = String((ev && ev.status) || '').trim();
      // 🚚 الويبهوك ممكن يجيب/يحدّث رقم شركة الشحن الحقيقي واسمها لو ما كانت متوفرة وقت الإنشاء (بعض الشركات تتأخر بتوليد رقمها)
      const webhookUpdates = { otoStatus: st, status: mapOTOStatusToOrderStatus(st, ''), otoLastWebhookAt: new Date().toISOString() };
      if (ev && ev.dcTrackingNumber) webhookUpdates.dcTrackingNumber = String(ev.dcTrackingNumber);
      if (ev && ev.deliveryCompany) webhookUpdates.deliveryCompany = String(ev.deliveryCompany);
      if (ev && ev.trackingUrl) webhookUpdates.otoTrackingUrl = String(ev.trackingUrl);
      await s.docs[0].ref.update(webhookUpdates);
      count++;
    }
    return res.json({ success: true, updatedCount: count });
  } catch (err) { return serverError(req, res, err); }
});

// SETTINGS
app.get('/api/settings', async (req, res) => {
  try { const s = await db.collection('settings').get(); const r = {}; s.docs.forEach(d => { r[d.data().key] = d.data().value; }); res.json(r); }
  catch (err) { serverError(req, res, err); }
});
app.put('/api/settings', requireAdmin, async (req, res) => {
  try { for (const [key, value] of Object.entries(req.body)) { const s = await db.collection('settings').where('key', '==', key).get(); if (s.empty) await db.collection('settings').add({ key, value }); else await s.docs[0].ref.update({ value }); } res.json({ message: 'Settings updated' }); }
  catch (err) { serverError(req, res, err); }
});
app.get('/api/announcing', async (req, res) => {
  try { const s = await db.collection('settings').where('key', '==', 'announcing').get(); if (s.empty) return res.json({ text: '\u0634\u062d\u0646 \u0645\u062c\u0627\u0646\u064a', isVisible: true }); const d = s.docs[0].data(); res.json({ text: (d.value && d.value.text) || '\u0634\u062d\u0646 \u0645\u062c\u0627\u0646\u064a', isVisible: (d.value && d.value.isVisible) !== false }); }
  catch (err) { serverError(req, res, err); }
});
app.put('/api/announcing', requireAdmin, async (req, res) => {
  try {
    const { text, isVisible } = req.body;
    const s = await db.collection('settings').where('key', '==', 'announcing').get();
    const cv = s.empty ? {} : (s.docs[0].data().value || {});
    const nv = { text: text !== undefined ? text : cv.text, isVisible: isVisible !== undefined ? isVisible : (cv.isVisible !== false) };
    if (s.empty) await db.collection('settings').add({ key: 'announcing', value: nv }); else await s.docs[0].ref.update({ value: nv });
    res.json({ message: 'Announcing settings updated' });
  } catch (err) { serverError(req, res, err); }
});

// USERS
app.get('/api/users/:email', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try { const email = decodeURIComponent(req.params.email).toLowerCase(); const s = await db.collection('mongo_users').where('email', '==', email).get(); if (s.empty) return res.json({}); res.json(Object.assign({ id: s.docs[0].id }, s.docs[0].data())); }
  catch (err) { serverError(req, res, err); }
});
app.put('/api/users/:email', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const { name, phone } = req.body;
    const s = await db.collection('mongo_users').where('email', '==', email).get();
    if (s.empty) { const ref = await db.collection('mongo_users').add({ email, name: name || '', phone: phone || '', addresses: [], createdAt: admin.firestore.FieldValue.serverTimestamp() }); const doc = await ref.get(); return res.json(Object.assign({ id: ref.id }, doc.data())); }
    else { await s.docs[0].ref.update({ name: name || '', phone: phone || '' }); const doc = await s.docs[0].ref.get(); return res.json(Object.assign({ id: doc.id }, doc.data())); }
  } catch (err) { serverError(req, res, err); }
});
// 🔒 تغيير البريد الإلكتروني الفعلي لسجل المستخدم — يُستدعى فقط بعد تأكيد رمز التحقق بنجاح (/api/verify-email-code)
// يحافظ على نفس السجل (العناوين، الموقع المحفوظ) لكن تحت البريد الإلكتروني الجديد، ويمنع تكرار بريد مستخدم بحساب آخر
app.post('/api/users/:email/change-email', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try {
    const oldEmail = decodeURIComponent(req.params.email).toLowerCase();
    const newEmail = String((req.body && req.body.newEmail) || '').trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(newEmail)) {
      return res.status(400).json({ error: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0627\u0644\u062c\u062f\u064a\u062f \u063a\u064a\u0631 \u0635\u0627\u0644\u062d' });
    }
    if (newEmail === oldEmail) return res.json({ success: true, unchanged: true });
    const dup = await db.collection('mongo_users').where('email', '==', newEmail).get();
    if (!dup.empty) return res.status(409).json({ error: '\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0628\u062d\u0633\u0627\u0628 \u0622\u062e\u0631' });
    const s = await db.collection('mongo_users').where('email', '==', oldEmail).get();
    if (s.empty) {
      const ref = await db.collection('mongo_users').add({ email: newEmail, name: '', phone: '', addresses: [], createdAt: admin.firestore.FieldValue.serverTimestamp() });
      const doc = await ref.get();
      return res.json({ success: true, user: Object.assign({ id: ref.id }, doc.data()) });
    }
    await s.docs[0].ref.update({ email: newEmail, emailChangedAt: new Date().toISOString(), previousEmail: oldEmail });
    const doc = await s.docs[0].ref.get();
    res.json({ success: true, user: Object.assign({ id: doc.id }, doc.data()) });
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/users/:email', requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const us = await db.collection('mongo_users').where('email', '==', email).get();
    const os = await db.collection('orders').where('customerEmail', '==', email).get();
    const b = db.batch(); us.docs.forEach(d => b.delete(d.ref)); os.docs.forEach(d => b.delete(d.ref)); await b.commit();
    return res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/users/:email/addresses', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const allowed = ['label','address','location','lat','lng','city','district','street','building','postal','region','regionKey','isDefault'];
    const entry = {};
    allowed.forEach(k => { if (req.body[k] !== undefined && req.body[k] !== null) entry[k] = req.body[k]; });
    if (!entry.label) entry.label = 'عنوان';
    const s = await db.collection('mongo_users').where('email', '==', email).get();
    if (s.empty) { const ref = await db.collection('mongo_users').add({ email, name: '', phone: '', addresses: [entry], createdAt: admin.firestore.FieldValue.serverTimestamp() }); const doc = await ref.get(); return res.json(Object.assign({ id: ref.id }, doc.data())); }
    else { const u = s.docs[0]; const addrs = u.data().addresses || []; addrs.push(entry); await u.ref.update({ addresses: addrs }); const doc = await u.ref.get(); return res.json(Object.assign({ id: doc.id }, doc.data())); }
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/users/:email/addresses/:idx', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const idx = parseInt(req.params.idx);
    const allowed2 = ['label','address','location','lat','lng','city','district','street','building','postal','region','regionKey','isDefault'];
    const entry2 = {};
    allowed2.forEach(k => { if (req.body[k] !== undefined && req.body[k] !== null) entry2[k] = req.body[k]; });
    if (!entry2.label) entry2.label = 'عنوان';
    const s = await db.collection('mongo_users').where('email', '==', email).get();
    if (s.empty) return res.status(404).json({ error: 'User not found' });
    const addrs = s.docs[0].data().addresses || [];
    if (!addrs[idx]) return res.status(404).json({ error: 'Address not found' });
    addrs[idx] = entry2;
    await s.docs[0].ref.update({ addresses: addrs });
    const doc = await s.docs[0].ref.get();
    res.json(Object.assign({ id: doc.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/users/:email/addresses/:idx', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const idx = parseInt(req.params.idx);
    const s = await db.collection('mongo_users').where('email', '==', email).get();
    if (s.empty) return res.status(404).json({ error: 'User not found' });
    const addrs = s.docs[0].data().addresses || [];
    if (!addrs[idx]) return res.status(404).json({ error: 'Address not found' });
    addrs.splice(idx, 1);
    await s.docs[0].ref.update({ addresses: addrs });
    const doc = await s.docs[0].ref.get();
    res.json(Object.assign({ id: doc.id }, doc.data()));
  } catch (err) { serverError(req, res, err); }
});
app.get('/api/users/:email/location', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try { const email = decodeURIComponent(req.params.email).toLowerCase(); const s = await db.collection('mongo_users').where('email', '==', email).get(); if (s.empty) return res.json({ location: null, label: '\u0645\u0648\u0642\u0639\u064a' }); const d = s.docs[0].data(); res.json({ location: d.defaultLocation || null, label: d.locationLabel || '\u0645\u0648\u0642\u0639\u064a' }); }
  catch (err) { serverError(req, res, err); }
});
app.put('/api/users/:email/location', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const { lat, lng, label = '\u0645\u0648\u0642\u0639\u064a' } = req.body;
    const s = await db.collection('mongo_users').where('email', '==', email).get();
    if (s.empty) await db.collection('mongo_users').add({ email, name: '', phone: '', addresses: [], defaultLocation: { lat, lng }, locationLabel: label, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    else await s.docs[0].ref.update({ defaultLocation: { lat, lng }, locationLabel: label });
    res.json({ success: true, location: { lat, lng }, label });
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/users/:email/location', requireOwnEmail(r => safeDecode(r.params.email)), async (req, res) => {
  try { const email = decodeURIComponent(req.params.email).toLowerCase(); const s = await db.collection('mongo_users').where('email', '==', email).get(); if (!s.empty) await s.docs[0].ref.update({ defaultLocation: null, locationLabel: '\u0645\u0648\u0642\u0639\u064a' }); res.json({ success: true }); }
  catch (err) { serverError(req, res, err); }
});

// EMAIL VERIFICATION
app.post('/api/send-verification-email', otpSendLimiter, async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!email || !email.includes('@') || email.length > 200) return res.status(400).json({ error: 'Valid email required' });
    const prev = otpStore.get(email);
    if (prev && Date.now() - prev.timestamp < 60 * 1000) return res.status(429).json({ error: 'انتظر دقيقة قبل طلب رمز جديد' });
    const otp = generateOTP();
    otpStore.set(email, { code: otp, timestamp: Date.now(), attempts: 0 });
    const html = '<div style="font-family:Arial;direction:rtl;text-align:right;background:#f5f5f5;padding:20px;border-radius:8px"><div style="background:white;padding:30px;border-radius:8px"><h2 style="color:#c93c7f">\u0623\u0646\u062a\u064a\u0643\u0627 \u0633\u062a\u0648\u0631</h2><p>\u0643\u0648\u062f \u0627\u0644\u062a\u062d\u0642\u0642:</p><div style="background:#f9f9f9;padding:20px;text-align:center;border:2px solid #c93c7f;margin:20px 0"><p style="font-size:32px;font-weight:bold;color:#c93c7f;letter-spacing:5px;margin:0">' + otp + '</p></div><p style="color:#999;font-size:12px">\u0635\u0644\u0627\u062d\u064a\u0629: 10 \u062f\u0642\u0627\u0626\u0642</p></div></div>';
    try { const r = await sendEmailViaResend({ to: email, subject: 'Antika Store - Email Verification Code', html }); if (r.devMode) { console.log('DEV OTP for ' + email + ': ' + otp); return res.json({ success: true, message: 'dev mode', email }); } return res.json({ success: true, message: 'Verification code sent', email }); }
    catch (e) { return res.status(500).json({ error: 'Failed to send email', details: e.message }); }
  } catch (err) { serverError(req, res, err); }
});
app.post('/api/verify-email-code', otpVerifyLimiter, async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const code = String((req.body && req.body.code) || '').trim();
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const stored = otpStore.get(email);
    if (!stored) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
    if (Date.now() - stored.timestamp > OTP_EXPIRY) { otpStore.delete(email); return res.status(400).json({ error: 'Code expired.' }); }
    if (stored.attempts >= MAX_OTP_ATTEMPTS) { otpStore.delete(email); return res.status(429).json({ error: 'Too many attempts.' }); }
    if (stored.code !== code) { stored.attempts++; return res.status(400).json({ error: 'Invalid code.', attemptsLeft: MAX_OTP_ATTEMPTS - stored.attempts }); }
    otpStore.delete(email);
    try { await db.collection('verified_emails').doc(email).set({ verifiedAt: new Date().toISOString() }); } catch (ve) { console.error('verified_emails write error:', ve.message); }
    res.json({ success: true, message: 'Email verified', email });
  } catch (err) { serverError(req, res, err); }
});

// BANNERS
app.get('/api/banners', async (req, res) => {
  try {
    const keys = ['banner_hero', 'banner_2', 'banner_3', 'banner_4'];
    const s = await db.collection('settings').where('key', 'in', keys).get();
    const r = {}; keys.forEach(k => { r[k] = { image: '', height: 400, active: true }; });
    s.docs.forEach(d => { r[d.data().key] = d.data().value; });
    res.json(r);
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/banners/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const allowed = ['banner_hero', 'banner_2', 'banner_3', 'banner_4'];
    if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid banner key' });
    const { image, height, heightMobile, active } = req.body;
    const s = await db.collection('settings').where('key', '==', key).get();
    const oldImg = s.empty ? '' : ((s.docs[0].data().value && s.docs[0].data().value.image) || '');
    let newImg;
    if (image === '__DELETE__') { await deleteFromCloudinary(oldImg); newImg = ''; }
    else if (image && image.startsWith('data:')) { newImg = await uploadToCloudinary(image, 'antika/banners'); }
    else { newImg = image || oldImg; }
    const value = { image: newImg, height: height !== undefined ? height : 400, heightMobile: heightMobile !== undefined ? heightMobile : 220, active: active !== false };
    if (s.empty) await db.collection('settings').add({ key, value }); else await s.docs[0].ref.update({ value });
    res.json({ success: true, banner: value });
  } catch (err) { serverError(req, res, err); }
});

// PAGES
app.get('/api/pages', async (req, res) => {
  try { const keys = ['about', 'returns', 'terms', 'faq', 'shipping', 'cancellation', 'privacy']; const s = await db.collection('settings').where('key', 'in', keys).get(); const r = {}; s.docs.forEach(d => { r[d.data().key] = d.data().value; }); res.json(r); }
  catch (err) { serverError(req, res, err); }
});
app.put('/api/pages/:pageId', requireAdmin, async (req, res) => {
  try { const { pageId } = req.params; const { title, content } = req.body; const s = await db.collection('settings').where('key', '==', pageId).get(); if (s.empty) await db.collection('settings').add({ key: pageId, value: { title, content } }); else await s.docs[0].ref.update({ value: { title, content } }); res.json({ message: 'Page updated', page: { title, content } }); }
  catch (err) { serverError(req, res, err); }
});

// ADMIN USER INFO
app.get('/api/admin/user-info/:email', requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    const us = await db.collection('mongo_users').where('email', '==', email).get();
    let os; try { os = await db.collection('orders').where('customerEmail', '==', email).orderBy('date', 'desc').limit(10).get(); } catch (e) { os = await db.collection('orders').where('customerEmail', '==', email).get(); }
    let rs; try { rs = await db.collection('reviews').where('userEmail', '==', email).orderBy('createdAt', 'desc').limit(20).get(); } catch (e) { rs = await db.collection('reviews').where('userEmail', '==', email).get(); }
    const user = us.empty ? null : Object.assign({ id: us.docs[0].id }, us.docs[0].data());
    const orders = docsToArr(os); const reviews = docsToArr(rs);
    if (!user && orders.length === 0) return res.json({ found: false, email, orders: [], reviews: [] });
    res.json({ found: true, user, orders, ordersCount: orders.length, totalSpent: orders.reduce((s, o) => s + (o.total || 0), 0), reviews });
  } catch (err) { serverError(req, res, err); }
});

// REVIEWS
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    let s; try { s = await db.collection('reviews').where('productId', '==', req.params.id).orderBy('createdAt', 'desc').get(); } catch (e) { s = await db.collection('reviews').where('productId', '==', req.params.id).get(); }
    const reviews = docsToArr(s);
    const avg = reviews.length > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0;
    res.json({ reviews, avgRating: avg, count: reviews.length });
  } catch (err) { serverError(req, res, err); }
});
app.post('/api/products/:id/reviews', requireOwnEmail(r => r.body && r.body.userEmail, { optional: true }), async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userEmail, rating, comment } = req.body || {};
    if (!userName || !rating || !comment) return res.status(400).json({ error: '\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u0645\u0637\u0644\u0648\u0628\u0629' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: '\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0628\u064a\u0646 1 \u0648 5' });
    if (userEmail && userEmail.trim()) { const ex = await db.collection('reviews').where('productId', '==', id).where('userEmail', '==', userEmail.trim()).get(); if (!ex.empty) return res.status(400).json({ error: '\u0644\u0642\u062f \u0643\u062a\u0628\u062a \u062a\u0639\u0644\u064a\u0642\u0627\u064b \u0645\u0633\u0628\u0642\u0627\u064b', reviewId: ex.docs[0].id }); }
    const ref = await db.collection('reviews').add({ productId: id, userName: userName.trim(), userEmail: (userEmail || '').trim(), rating: Number(rating), comment: comment.trim(), likes: [], createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const all = await db.collection('reviews').where('productId', '==', id).get();
    const avg = all.docs.reduce((s, d) => s + d.data().rating, 0) / all.size;
    await db.collection('products').doc(id).update({ rating: Math.round(avg * 10) / 10, reviews: all.size });
    const doc = await ref.get();
    res.json({ success: true, review: Object.assign({ id: ref.id }, doc.data()) });
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/reviews/:reviewId/user', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648\u0644\u0627\u064b' });
    const idToken = auth.slice(7).trim();
    if (!FIREBASE_API_KEY) return res.status(500).json({ error: 'Firebase API Key \u063a\u064a\u0631 \u0645\u0636\u0628\u0648\u0637' });
    let verifiedEmail = '';
    try { const vr = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }); const vd = await vr.json(); if (!vr.ok || !vd.users || !vd.users.length) return res.status(401).json({ error: '\u062c\u0644\u0633\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629' }); verifiedEmail = vd.users[0].email || ''; } catch (e) { return res.status(401).json({ error: '\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0642\u0642' }); }
    const { rating, comment } = req.body || {};
    if (!rating || !comment) return res.status(400).json({ error: '\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u0645\u0637\u0644\u0648\u0628\u0627\u0646' });
    const rr = db.collection('reviews').doc(req.params.reviewId);
    const rd = await rr.get();
    if (!rd.exists) return res.status(404).json({ error: '\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const rv = rd.data();
    if (!rv.userEmail || rv.userEmail.toLowerCase() !== verifiedEmail.toLowerCase()) return res.status(403).json({ error: '\u063a\u064a\u0631 \u0645\u0635\u0631\u062d \u0644\u0643' });
    await rr.update({ rating: Number(rating), comment: comment.trim() });
    const all = await db.collection('reviews').where('productId', '==', rv.productId).get();
    await db.collection('products').doc(rv.productId).update({ rating: Math.round((all.docs.reduce((s, d) => s + d.data().rating, 0) / all.size) * 10) / 10 });
    const ud = await rr.get();
    res.json({ success: true, review: Object.assign({ id: ud.id }, ud.data()) });
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/reviews/:reviewId/user', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' });
    const idToken = auth.slice(7).trim();
    if (!FIREBASE_API_KEY) return res.status(500).json({ error: 'Firebase API Key \u063a\u064a\u0631 \u0645\u0636\u0628\u0648\u0637' });
    let verifiedEmail = '';
    try { const vr = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }); const vd = await vr.json(); if (!vr.ok || !vd.users || !vd.users.length) return res.status(401).json({ error: '\u062c\u0644\u0633\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629' }); verifiedEmail = vd.users[0].email || ''; } catch (e) { return res.status(401).json({ error: '\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0642\u0642' }); }
    const rr = db.collection('reviews').doc(req.params.reviewId);
    const rd = await rr.get();
    if (!rd.exists) return res.status(404).json({ error: '\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const rv = rd.data();
    if (!rv.userEmail || rv.userEmail.toLowerCase() !== verifiedEmail.toLowerCase()) return res.status(403).json({ error: '\u063a\u064a\u0631 \u0645\u0635\u0631\u062d \u0644\u0643' });
    await rr.delete();
    const all = await db.collection('reviews').where('productId', '==', rv.productId).get();
    const avg = all.size > 0 ? all.docs.reduce((s, d) => s + d.data().rating, 0) / all.size : 5;
    await db.collection('products').doc(rv.productId).update({ rating: Math.round(avg * 10) / 10, reviews: all.size });
    res.json({ success: true });
  } catch (err) { serverError(req, res, err); }
});
app.delete('/api/reviews/:reviewId', requireAdmin, async (req, res) => {
  try {
    const rr = db.collection('reviews').doc(req.params.reviewId);
    const rd = await rr.get();
    if (!rd.exists) return res.status(404).json({ error: '\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const rv = rd.data();
    await rr.delete();
    const all = await db.collection('reviews').where('productId', '==', rv.productId).get();
    const avg = all.size > 0 ? all.docs.reduce((s, d) => s + d.data().rating, 0) / all.size : 5;
    await db.collection('products').doc(rv.productId).update({ rating: Math.round(avg * 10) / 10, reviews: all.size });
    res.json({ success: true });
  } catch (err) { serverError(req, res, err); }
});

// LIKES & NOTIFICATIONS
app.post('/api/reviews/:reviewId/like', requireOwnEmail(r => r.body && r.body.userEmail), async (req, res) => {
  try {
    const { userEmail } = req.body || {};
    if (!userEmail) return res.status(400).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0644\u0625\u0639\u062c\u0627\u0628' });
    const rr = db.collection('reviews').doc(req.params.reviewId);
    const rd = await rr.get();
    if (!rd.exists) return res.status(404).json({ error: '\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
    const rv = rd.data();
    const likes = rv.likes || [];
    const alreadyLiked = likes.includes(userEmail);
    if (alreadyLiked) await rr.update({ likes: likes.filter(e => e !== userEmail) });
    else {
      await rr.update({ likes: [...likes, userEmail] });
      if (rv.userEmail && rv.userEmail !== userEmail) {
        const totalLikes = likes.length + 1;
        const pd = await db.collection('products').doc(rv.productId).get();
        const productName = pd.exists ? pd.data().name : '';
        const ns = await db.collection('notifications').where('ownerEmail', '==', rv.userEmail).where('reviewId', '==', req.params.reviewId).get();
        if (ns.empty) await db.collection('notifications').add({ ownerEmail: rv.userEmail, reviewId: req.params.reviewId, productId: rv.productId, productName, comment: rv.comment, newLikes: 1, totalLikes, read: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        else await ns.docs[0].ref.update({ newLikes: admin.firestore.FieldValue.increment(1), totalLikes, read: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
    const ud = await rr.get();
    res.json({ success: true, liked: !alreadyLiked, totalLikes: (ud.data().likes || []).length });
  } catch (err) { serverError(req, res, err); }
});
app.get('/api/notifications', requireOwnEmail(r => r.query.email), async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: '\u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0645\u0637\u0644\u0648\u0628' });
    let s; try { s = await db.collection('notifications').where('ownerEmail', '==', email).orderBy('updatedAt', 'desc').limit(50).get(); } catch (e) { s = await db.collection('notifications').where('ownerEmail', '==', email).get(); }
    const notifications = docsToArr(s);
    const unreadCount = notifications.filter(n => !n.read).length;
    const orderUnreadCount = notifications.filter(n => !n.read && n.type === 'order').length;
    res.json({ notifications, unreadCount, orderUnreadCount });
  } catch (err) { serverError(req, res, err); }
});
app.put('/api/notifications/read-all', requireOwnEmail(r => r.body && r.body.email), async (req, res) => {
  try {
    const { email, type } = req.body || {};
    if (!email) return res.status(400).json({ error: '\u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0645\u0637\u0644\u0648\u0628' });
    let q = db.collection('notifications').where('ownerEmail', '==', email).where('read', '==', false);
    const s = await q.get();
    const b = db.batch();
    s.docs.forEach(d => { if (!type || d.data().type === type) b.update(d.ref, { read: true, newLikes: 0 }); });
    await b.commit();
    res.json({ success: true });
  } catch (err) { serverError(req, res, err); }
});
// تعليم إشعار واحد بعينه كمقروء (لما العميل يفتحه لحاله) — بدون التأثير على باقي الإشعارات غير المقروءة
app.put('/api/notifications/:id/read', requireUser, ownsNotification, async (req, res) => {
  try {
    await db.collection('notifications').doc(req.params.id).update({ read: true, newLikes: 0 });
    res.json({ success: true });
  } catch (err) { serverError(req, res, err); }
});
// \u062d\u0630\u0641 \u0643\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0646\u0648\u0639 \u0645\u0639\u064a\u0646 \u0644\u0639\u0645\u064a\u0644 \u0645\u0639\u064a\u0646 (\u064a\u0633\u062a\u062e\u062f\u0645 \u0639\u0646\u062f \u0641\u062a\u062d \u0635\u0641\u062d\u0629 \u0637\u0644\u0628\u0627\u062a\u064a \u0644\u0645\u0633\u062d \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0637\u0644\u0628\u0627\u062a)
// ملاحظة: لازم هذا الراوت يسبق راوت /:id العام، وإلا Express بيطابق /:id اول ويعتبر by-type/by-order قيمة id
app.delete('/api/notifications/by-type', requireOwnEmail(r => r.query.email), async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    const type = String(req.query.type || '').trim();
    if (!email || !type) return res.status(400).json({ error: '\u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0648\u0627\u0644\u0646\u0648\u0639 \u0645\u0637\u0644\u0648\u0628\u0627\u0646' });
    const s = await db.collection('notifications').where('ownerEmail', '==', email).where('type', '==', type).get();
    const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit();
    res.json({ success: true, deleted: s.size });
  } catch (err) { serverError(req, res, err); }
});
// حذف الإشعارات المرتبطة بطلب معيّن فقط لعميل معين (يستخدم عند فتح تفاصيل طلب محدد)
app.delete('/api/notifications/by-order', requireOwnEmail(r => r.query.email), async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    const orderId = String(req.query.orderId || '').trim();
    if (!email || !orderId) return res.status(400).json({ error: '\u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0648\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0645\u0637\u0644\u0648\u0628\u0627\u0646' });
    const s = await db.collection('notifications').where('ownerEmail', '==', email).where('orderId', '==', orderId).get();
    const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit();
    res.json({ success: true, deleted: s.size });
  } catch (err) { serverError(req, res, err); }
});
// \u062d\u0630\u0641 \u0625\u0634\u0639\u0627\u0631 \u0648\u0627\u062d\u062f (\u0632\u0631 X \u0641\u064a \u0635\u0641\u062d\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a) — لازم يبقى بالآخر لأنه راوت عام يطابق أي قيمة
app.delete('/api/notifications/:id', requireUser, ownsNotification, async (req, res) => {
  try { await db.collection('notifications').doc(req.params.id).delete(); res.json({ success: true }); }
  catch (err) { serverError(req, res, err); }
});

// MAPS & PAYMENT
app.get('/api/maps/config', (req, res) => { const e = Boolean(GOOGLE_MAPS_API_KEY); res.json({ provider: e ? 'google' : 'leaflet', googleMapsEnabled: e, googleMapsApiKey: e ? GOOGLE_MAPS_API_KEY : '' }); });

app.get('/api/maps/geocode', geocodeLimiter, async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const geocodeKey = GOOGLE_GEOCODING_KEY || GOOGLE_MAPS_API_KEY;
    if (!geocodeKey) return res.status(503).json({ error: 'Maps API not configured' });
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ar&region=SA&key=${geocodeKey}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Geocoding failed' });
    }
});
app.get('/api/payment/config', (req, res) => { res.json({ publishableKey: MOYASAR_PUBLISHABLE_KEY || '', enabled: Boolean(MOYASAR_PUBLISHABLE_KEY) }); });
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { paymentId, orderId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: 'paymentId \u0645\u0637\u0644\u0648\u0628' });
    if (!MOYASAR_SECRET_KEY) return res.status(500).json({ error: 'Moyasar \u063a\u064a\u0631 \u0645\u064f\u0639\u062f' });
    const mr = await fetch('https://api.moyasar.com/v1/payments/' + paymentId, { headers: { 'Authorization': 'Basic ' + Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64') } });
    if (!mr.ok) return res.status(400).json({ error: '\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u062f\u0641\u0639\u0629' });
    const payment = await mr.json();
    if (payment.status !== 'paid') return res.status(400).json({ error: '\u0627\u0644\u062f\u0641\u0639\u0629 \u0644\u0645 \u062a\u0643\u062a\u0645\u0644', status: payment.status });
    if (orderId) {
      const ref = db.collection('orders').doc(orderId);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
      const order = doc.data();
      // \u0627\u0644\u062a\u0623\u0643\u062f \u0623\u0646 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062f\u0641\u0648\u0639 \u064a\u0637\u0627\u0628\u0642 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0637\u0644\u0628 \u0641\u0639\u0644\u064a\u0627\u064b (\u0628\u0627\u0644\u0647\u0644\u0644\u0627\u0644\u0627\u062a)
      const expectedHalalas = Math.round(Number(order.total || 0) * 100);
      const paidHalalas = Number(payment.amount || 0);
      if (paidHalalas !== expectedHalalas) {
        console.error('Payment amount mismatch for order ' + orderId + ': paid=' + paidHalalas + ' expected=' + expectedHalalas);
        return res.status(400).json({ error: '\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062f\u0641\u0648\u0639 \u0644\u0627 \u064a\u0637\u0627\u0628\u0642 \u0642\u064a\u0645\u0629 \u0627\u0644\u0637\u0644\u0628. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062f\u0639\u0645.' });
      }
      const updates = { paymentMethod: 'online', paymentId, status: 'processing', isPaid: true, paidAt: new Date().toISOString() };
      const tl = order.statusTimeline || [];
      tl.push({ status: 'processing', title: '\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u062f\u0641\u0639\u0629', message: '\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639 \u0648\u0628\u062f\u0621 \u0627\u0644\u062a\u062c\u0647\u064a\u0632', source: 'system', at: new Date().toISOString() });
      updates.statusTimeline = tl;
      try { await ref.update(updates); } catch (e) { console.warn('Could not update order:', e.message); }
      try {
        const uo = Object.assign({}, order, updates, { id: orderId });
        await sendOrderCustomerNotification(uo, { title: '\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639', message: '\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u062f\u0641\u0639\u062a\u0643 \u0648\u0637\u0644\u0628\u0643 \u0627\u0644\u0622\u0646 \u0642\u064a\u062f \u0627\u0644\u062a\u062c\u0647\u064a\u0632' });
      } catch (ne) { console.error('Notify error (payment verify):', ne.message); }
    }
    return res.json({ success: true, payment });
  } catch (err) { serverError(req, res, err); }
});


// STATUS
app.get('/api/status', async (req, res) => {
  try { const ps = await db.collection('products').get(); const cs = await db.collection('categories').get(); res.json({ firebase: 'connected', productCount: ps.size, categoryCount: cs.size, timestamp: new Date().toISOString() }); }
  catch (err) { res.json({ firebase: 'error', error: err.message, timestamp: new Date().toISOString() }); }
});

// INIT DATA
async function initData() {
  try {
    const cs = await db.collection('categories').get();
    if (cs.empty) {
      const cats = [
        { id: 'candles', name: '\u0634\u0645\u0648\u0639 \u0645\u0646\u0632\u0644\u064a\u0629', icon: '\uD83D\uDD6F\uFE0F', parentId: null, sortOrder: 0 },
        { id: 'candles-aromatic', name: '\u0634\u0645\u0648\u0639 \u0639\u0637\u0631\u064a\u0629', icon: '\uD83C\uDF38', parentId: 'candles', sortOrder: 1 },
        { id: 'candles-decor', name: '\u0634\u0645\u0648\u0639 \u0632\u064a\u0646\u0629', icon: '\u2728', parentId: 'candles', sortOrder: 2 },
        { id: 'furniture', name: '\u0623\u062b\u0627\u062b', icon: '\uD83E\uDE91', parentId: null, sortOrder: 4 },
        { id: 'decor', name: '\u062f\u064a\u0643\u0648\u0631 \u062c\u062f\u0627\u0631\u064a', icon: '\uD83D\uDDBC\uFE0F', parentId: null, sortOrder: 8 },
        { id: 'tools', name: '\u0623\u062f\u0648\u0627\u062a \u0645\u0646\u0632\u0644\u064a\u0629', icon: '\uD83C\uDFFA', parentId: null, sortOrder: 12 },
      ];
      const b = db.batch(); cats.forEach(c => b.set(db.collection('categories').doc(), c)); await b.commit();
      console.log('\u2705 Default categories created');
    }
    const as = await db.collection('settings').where('key', '==', 'announcing').get();
    if (as.empty) { await db.collection('settings').add({ key: 'announcing', value: { text: '\uD83D\uDE9A \u062a\u062e\u0641\u064a\u0636\u0627\u062a \u0648\u062e\u0635\u0648\u0645\u0627\u062a \u062a\u0635\u0644 \u0625\u0644\u0649 50% \u0648\u062a\u0648\u0635\u064a\u0644 \u0645\u062c\u0627\u0646\u064a', isVisible: true } }); console.log('\u2705 Default announcing created'); }
  } catch (err) { console.error('Error initializing data:', err); }
}

// إلغاء تلقائي للطلبات اللي ما دفع عليها العميل خلال 24 ساعة من إرسال السعر النهائي
async function autoCancelUnpaidOrders() {
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const s = await db.collection('orders').where('status', '==', 'awaiting_shipping_payment').get();
    if (s.empty) return;
    for (const doc of s.docs) {
      const order = doc.data();
      if (order.isPaid) continue;
      const since = order.awaitingPaymentSince ? new Date(order.awaitingPaymentSince).getTime() : null;
      if (!since || since > cutoff) continue;
      const tl = order.statusTimeline || [];
      tl.push({ status: 'cancelled', title: '\u0625\u0644\u063a\u0627\u0621 \u062a\u0644\u0642\u0627\u0626\u064a', message: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0644\u0639\u062f\u0645 \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062f\u0641\u0639 \u062e\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629', source: 'system', at: new Date().toISOString() });
      await doc.ref.update({ status: 'cancelled', statusTimeline: tl, cancelReason: 'payment_timeout', cancelledBy: 'system' });
      try {
        const uo = Object.assign({}, order, { status: 'cancelled' });
        const nr = await sendOrderCustomerNotification(uo, { title: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0637\u0644\u0628\u0643', message: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0637\u0644\u0628\u0643 \u0644\u0639\u062f\u0645 \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062f\u0641\u0639 \u062e\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629 \u0645\u0646 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a.' });
        if (nr.sent) await doc.ref.update({ customerNotifiedAt: new Date().toISOString() });
      } catch (ne) { console.error('Notify error (auto-cancel):', ne.message); }
      console.log('\u23f0 Auto-cancelled unpaid order:', doc.id);
    }
  } catch (err) { console.error('autoCancelUnpaidOrders error:', err.message); }
}

async function cleanupOldCarts() {
  try { const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); const s = await db.collection('carts').where('updatedAt', '<', cutoff).get(); if (!s.empty) { const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); console.log('\uD83E\uDDF9 Cleaned ' + s.size + ' old carts'); } }
  catch (err) { console.error('Cart cleanup error:', err.message); }
}

setInterval(cleanupOldCarts, 14 * 24 * 60 * 60 * 1000);
setTimeout(cleanupOldCarts, 60 * 1000);
setInterval(autoCancelUnpaidOrders, 15 * 60 * 1000);
setTimeout(autoCancelUnpaidOrders, 90 * 1000);

// SITEMAP & ROBOTS
app.get('/sitemap.xml', async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = docsToArr(snapshot);
    let urls = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://antika-store.shop/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://antika-store.shop/products.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    for (const product of products) {
      const lastmod = product.updatedAt && product.updatedAt.toDate
        ? product.updatedAt.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      urls += `
  <url>
    <loc>https://antika-store.shop/product.html?id=${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
    urls += `\n</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(urls);
  } catch (err) { res.status(500).send('Error generating sitemap'); }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: https://antika-store.shop/sitemap.xml`);
});


// Clean URL routes
const path = require('path');
const pages = ['product', 'products', 'cart', 'account', 'login', 'register', 'orders', 'wishlist', 'settings', 'notifications', 'addresses', 'pages', 'admin', 'location', 'map'];
pages.forEach(page => {
  app.get('/' + page, (req, res) => {
    res.sendFile(path.join(__dirname, page + '.html'));
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log('\uD83D\uDE80 Server running on port ' + PORT);
  await initData();
});