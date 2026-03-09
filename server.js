// 🌸 Antika Store Server - MongoDB Backend
// Local server for products, categories, cart, and orders

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
mongoose.set('bufferCommands', false);

// 📧 Email Configuration (Gmail SMTP with Nodemailer)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'your-email@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
  }
});

// In-memory OTP storage (email -> {code, timestamp, attempts})
const otpStore = new Map();
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'BDR-FIRST';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'B1-a2d3e4r5';
const ADMIN_TOKEN_TTL = process.env.ADMIN_TOKEN_TTL || '8h';
const GOOGLE_MAPS_API_KEY = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
const OTO_API_BASE_URL = (process.env.OTO_API_BASE_URL || 'https://api.tryoto.com/rest/v2').trim();
const OTO_API_TOKEN = (process.env.OTO_API_TOKEN || '').trim();
const OTO_PICKUP_LOCATION_CODE = (process.env.OTO_PICKUP_LOCATION_CODE || '').trim();
const OTO_DEFAULT_DELIVERY_OPTION_ID = (process.env.OTO_DEFAULT_DELIVERY_OPTION_ID || '').trim();
const OTO_ORDER_PREFIX = (process.env.OTO_ORDER_PREFIX || 'ANTIKA').trim();
const OTO_WEBHOOK_AUTH_KEY = (process.env.OTO_WEBHOOK_AUTH_KEY || '').trim();
const COD_SURCHARGE_SAR = Number(process.env.COD_SURCHARGE_SAR || 17);
const MOYASAR_SECRET_KEY = (process.env.MOYASAR_SECRET_KEY || '').trim();
const MOYASAR_PUBLISHABLE_KEY = (process.env.MOYASAR_PUBLISHABLE_KEY || '').trim();

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is missing; using insecure fallback secret. Set JWT_SECRET in production.');
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn('⚠️ ADMIN_USERNAME/ADMIN_PASSWORD missing; using default admin credentials. Set both in production.');
}

// Helper: Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check MongoDB connection status
let mongoConnected = false;
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function requireMongo(res, action = 'Operation') {
  if (isMongoConnected()) return true;
  res.status(503).json({
    error: `${action} unavailable: MongoDB is disconnected.`,
    mongodb: 'disconnected'
  });
  return false;
}

function getAdminToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

function requireAdmin(req, res, next) {
  const token = getAdminToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

// Helper function to find product by ID (supports both ObjectId and custom id)
async function findByIdOrCustom(Model, id) {
  let doc = null;
  
  // Try MongoDB ObjectId first (only if format is valid)
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    try {
      doc = await Model.findById(id);
    } catch (e) {
      // Invalid ObjectId format, continue to try other methods
      console.log('   ObjectId lookup failed, trying id field...');
    }
  }
  
  // If not found, try by custom 'id' field
  if (!doc) {
    doc = await Model.findOne({ id: id });
  }
  
  return doc;
}

// Repair common Arabic mojibake that may be stored in old DB records.
function repairArabicMojibakeText(value) {
  if (typeof value !== 'string' || !value) return value;

  const pairMap = {
    'ط§': 'ا', 'ط¢': 'آ', 'ط£': 'أ', 'ط¥': 'إ', 'ط¦': 'ئ', 'ط¤': 'ؤ',
    'ط¨': 'ب', 'ط©': 'ة', 'طھ': 'ت', 'ط«': 'ث', 'ط¬': 'ج', 'ط­': 'ح', 'ط®': 'خ',
    'ط¯': 'د', 'ط°': 'ذ', 'ط±': 'ر', 'ط²': 'ز', 'ط³': 'س', 'ط´': 'ش',
    'طµ': 'ص', 'ط¶': 'ض', 'ط·': 'ط', 'ط¸': 'ظ', 'ط¹': 'ع', 'ط؛': 'غ',
    'ط': 'ف', 'ط‚': 'ق', 'طƒ': 'ك', 'ط„': 'ل', 'ط…': 'م', 'ط†': 'ن',
    'ط‡': 'ه', 'طˆ': 'و', 'ط‰': 'ى', 'طٹ': 'ي',
    'ظپ': 'ف', 'ظ‚': 'ق', 'ظƒ': 'ك', 'ظ„': 'ل', 'ظ…': 'م', 'ظ†': 'ن',
    'ظ‡': 'ه', 'ظˆ': 'و', 'ظ‰': 'ى', 'ظٹ': 'ي',
    'ط،': '،', 'ط›': '؛', 'طں': '؟',
    'أ—': '×',
    'âڑ ️': '⚠️', 'âڑ ï¸ڈ': '⚠️', 'âœ…': '✅', 'â‌Œ': '❌', 'â„¹ï¸ڈ': 'ℹ️', 'â„¹️': 'ℹ️'
  };

  let text = value;
  Object.keys(pairMap).forEach((k) => {
    if (text.includes(k)) text = text.split(k).join(pairMap[k]);
  });

  if (/(?:ط.|ظ.){2,}/.test(text)) {
    text = text.replace(/ط.|ظ./g, (m) => pairMap[m] || m);
  }

  return text;
}

function repairArabicMojibakeDeep(value) {
  if (typeof value === 'string') return repairArabicMojibakeText(value);
  if (Array.isArray(value)) return value.map(repairArabicMojibakeDeep);

  // Convert mongoose documents to plain objects first.
  if (value && typeof value === 'object' && typeof value.toObject === 'function') {
    return repairArabicMojibakeDeep(value.toObject({ virtuals: false, getters: false }));
  }

  // Keep date values untouched.
  if (value instanceof Date) return value;

  // Preserve ObjectId values.
  if (value && typeof value === 'object' && (value._bsontype === 'ObjectId' || typeof value.toHexString === 'function')) {
    return typeof value.toHexString === 'function' ? value.toHexString() : String(value);
  }

  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((k) => {
      out[k] = repairArabicMojibakeDeep(value[k]);
    });
    return out;
  }
  return value;
}

function isOTOConfigured() {
  return Boolean(OTO_API_TOKEN && OTO_PICKUP_LOCATION_CODE);
}

function sanitizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('966')) return digits;
  if (digits.startsWith('0')) return `966${digits.slice(1)}`;
  return digits;
}

function mapOTOStatusToOrderStatus(status = '', dcStatus = '') {
  const s = `${status} ${dcStatus}`.toLowerCase();
  if (s.includes('deliver')) return 'delivered';
  if (s.includes('return') || s.includes('cancel') || s.includes('failed')) return 'cancelled';
  if (s.includes('outfordelivery') || s.includes('out_for_delivery') || s.includes('shipmentprocessing')) return 'out_for_delivery';
  if (s.includes('shipped') || s.includes('picked') || s.includes('in_transit') || s.includes('intransit')) return 'shipped';
  return 'processing';
}

function stripUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep).filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((k) => {
      const cleaned = stripUndefinedDeep(value[k]);
      if (cleaned !== undefined) out[k] = cleaned;
    });
    return out;
  }
  return value === undefined ? undefined : value;
}

function getOTOHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OTO_API_TOKEN}`
  };
}

async function callOTO(path, payload) {
  const url = `${OTO_API_BASE_URL.replace(/\/$/, '')}/${String(path || '').replace(/^\//, '')}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getOTOHeaders(),
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(data?.message || data?.error || 'OTO request failed');
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

function formatSar(value) {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'} ر.س`;
}

function getOrderStatusTextAr(status = '') {
  const map = {
    pending: 'بانتظار المراجعة',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    out_for_delivery: 'خرج للتوصيل',
    delivered: 'تم التسليم',
    cancelled: 'ملغي'
  };
  return map[String(status || '').trim()] || String(status || 'قيد المعالجة');
}

function generateOrderCode(orderId, date = new Date()) {
  const safeDate = date instanceof Date ? date : new Date();
  const y = safeDate.getFullYear();
  const m = String(safeDate.getMonth() + 1).padStart(2, '0');
  const d = String(safeDate.getDate()).padStart(2, '0');
  const suffix = String(orderId || '').slice(-6).toUpperCase();
  return `ANT-${y}${m}${d}-${suffix || '000000'}`;
}

function appendOrderTimeline(order, { status = '', title = '', message = '', source = 'system', at = new Date() } = {}) {
  const entry = {
    status: String(status || order?.status || '').trim(),
    title: String(title || '').trim(),
    message: String(message || '').trim(),
    source: String(source || 'system').trim(),
    at: at instanceof Date ? at : new Date()
  };

  if (!Array.isArray(order.statusTimeline)) {
    order.statusTimeline = [];
  }

  order.statusTimeline.push(entry);
  if (order.statusTimeline.length > 50) {
    order.statusTimeline = order.statusTimeline.slice(-50);
  }
}

async function sendOrderCustomerNotification(order, { title = '', message = '', subject = '' } = {}) {
  const toEmail = String(order?.customerEmail || '').trim();
  if (!toEmail || !toEmail.includes('@')) {
    return { sent: false, reason: 'missing-email' };
  }

  const trackingNumber = String(order?.trackingNumber || order?.otoTrackingNumber || '').trim();
  const trackingUrl = String(order?.trackingUrl || order?.otoAwbUrl || '').trim();
  const carrier = String(order?.shippingCarrier || '').trim();
  const orderCode = String(order?.orderCode || order?._id || '').trim();

  const safeSubject = subject || `تحديث طلبك ${orderCode ? `#${orderCode}` : ''}`.trim();
  const safeTitle = title || 'تحديث جديد على طلبك';
  const safeMessage = message || `حالة الطلب الحالية: ${getOrderStatusTextAr(order?.status)}`;

  const html = `
    <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1f2937">
      <h2 style="margin:0 0 12px;color:#8B6F47;">${safeTitle}</h2>
      <p style="margin:0 0 10px;">${safeMessage}</p>
      <p style="margin:0 0 6px;"><strong>رقم الطلب:</strong> ${orderCode || '-'}</p>
      <p style="margin:0 0 6px;"><strong>الحالة:</strong> ${getOrderStatusTextAr(order?.status)}</p>
      <p style="margin:0 0 6px;"><strong>شركة الشحن:</strong> ${carrier || '-'}</p>
      <p style="margin:0 0 6px;"><strong>رقم التتبع:</strong> ${trackingNumber || '-'}</p>
      ${trackingUrl ? `<p style="margin:0 0 6px;"><a href="${trackingUrl}" target="_blank" rel="noopener">رابط تتبع الشحنة</a></p>` : ''}
      <p style="margin-top:14px;color:#6b7280;">شكراً لتسوقك من متجر أنتيكا.</p>
    </div>
  `;

  const gmailUser = process.env.GMAIL_USER || '';
  const gmailPass = process.env.GMAIL_APP_PASSWORD || '';
  const isPlaceholderCreds = gmailUser.includes('your-email') || gmailPass.includes('your-app-password') || !gmailUser || !gmailPass;
  if (isPlaceholderCreds) {
    console.log(`[ORDER NOTIFY DEV] ${toEmail} | ${safeSubject} | ${safeMessage}`);
    return { sent: true, devMode: true };
  }

  await emailTransporter.sendMail({
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: safeSubject,
    html
  });

  return { sent: true, devMode: false };
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment.');
  process.exit(1);
}
console.log('🔌 Attempting to connect to MongoDB:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    mongoConnected = true;
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    mongoConnected = false;
  });

// Monitor connection events
mongoose.connection.on('connected', async () => {
  console.log('🟢 MongoDB connection established');
  mongoConnected = true;
  
  // Show database stats
  try {
    await initData();

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections in database:', collections.map(c => c.name).join(', '));
    
    const productCount = await Product.countDocuments();
    console.log('📦 Products count:', productCount);
  } catch (e) {
    console.log('⚠️ Could not fetch database stats');
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('🔴 MongoDB connection lost');
  mongoConnected = false;
});

// ============================================
// SCHEMAS (نماذج البيانات)
// ============================================

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  discountPrice: { type: Number, default: null },
  discountPercentage: { type: Number, default: null },
  categories: [{ type: String }],
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
  stockDisplay: { type: String, default: 'number' },
  stockText: { type: String, default: '' },
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  isNew: { type: Boolean, default: false },
  newExpiryDate: { type: Date, default: null },
  isFeatured: { type: Boolean, default: false },
  freeShipping: { type: Boolean, default: true },
  features: {
    freeShipping: { type: Boolean, default: false },
    easyReturns: { type: Boolean, default: false },
    qualityGuarantee: { type: Boolean, default: false }
  },
  // 🌟 Custom Product Features
  customFeatures: [{ type: String }],
  // 🎨 Advanced Variants System
  hasVariants: { type: Boolean, default: false },
  variantOptions: [{
    name: { type: String, required: true }, // مثل: اللون، المقاس
    values: [{ type: String }] // مثل: أحمر، أزرق، S، M، L
  }],
  variants: [{
    id: { type: String, required: true }, // معرف فريد للمتغير
    options: [{ type: String }], // القيم المختارة ["أحمر", "S"]
    price: { type: Number, default: null }, // سعر خاص (اختياري)
    stock: { type: Number, default: 0 }, // مخزون هذا المتغير
    sku: { type: String, default: '' }, // رمز SKU
    images: [{ type: String }] // صور خاصة بالمتغير
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { suppressReservedKeysWarning: true });

// Category Schema
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: '📦' },
  subcategories: [{ type: String }]
});

// Cart Schema (Session-based)
const cartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  items: [{
    productId: String,
    name: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 }
  }],
  updatedAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String, required: true },
  orderCode: { type: String, default: '' },
  shippingCity: { type: String, default: '' },
  shippingCityId: { type: String, default: '' },
  shippingRegion: { type: String, default: '' },
  shippingEta: { type: String, default: '' },
  shippingMethod: { type: String, default: 'standard' },
  shippingMethodLabel: { type: String, default: '' },
  shippingCost: { type: Number, default: 0 },
  shippingBaseFee: { type: Number, default: 0 },
  shippingMethodExtraFee: { type: Number, default: 0 },
  shippingCarrier: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },
  shipmentReference: { type: String, default: '' },
  codFee: { type: Number, default: 0 },
  // 📍 GeoJSON location for maps integration
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [34.5, 31.5] } // [longitude, latitude] per GeoJSON spec
  },
  items: [{
    productId: String,
    name: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 }
  }],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'processing'
  },
  paymentMethod: { type: String, default: 'cash' },
  paymentId: { type: String, default: '' },
  statusTimeline: [{
    status: { type: String, default: '' },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    source: { type: String, default: 'system' },
    at: { type: Date, default: Date.now }
  }],
  shippedAt: { type: Date, default: null },
  outForDeliveryAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  customerNotifiedAt: { type: Date, default: null },
  otoOrderId: { type: String, default: '' },
  otoShipmentId: { type: String, default: '' },
  otoTrackingNumber: { type: String, default: '' },
  otoAwbUrl: { type: String, default: '' },
  otoStatus: { type: String, default: '' },
  otoDcStatus: { type: String, default: '' },
  otoLastWebhookAt: { type: Date, default: null },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// Settings Schema
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed
});

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);
const Settings = mongoose.model('Settings', settingsSchema);

// User Schema (for saved addresses)
const userSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  // addresses stored with optional location { lat, lng }
  addresses: [{
    label: { type: String, default: '' },
    address: { type: String, default: '' },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }],
  // Saved default location (for one-tap checkout)
  defaultLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  locationLabel: { type: String, default: 'موقعي' }, // label like "المنزل"
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get or create session ID
function getSessionId(req) {
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  return sessionId;
}

function normalizeCartRef(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function findCartItemByRef(items, itemRef) {
  const ref = normalizeCartRef(itemRef);
  if (!ref || !Array.isArray(items)) return null;

  return items.find((item) => {
    const itemId = normalizeCartRef(item && item._id);
    const productId = normalizeCartRef(item && item.productId);
    return itemId === ref || productId === ref;
  }) || null;
}

// ============================================
// ADMIN AUTH ROUTES
// ============================================

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { role: 'admin', username: ADMIN_USERNAME, type: 'admin' },
    JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_TTL }
  );

  return res.json({
    token,
    user: {
      name: 'Admin',
      username: ADMIN_USERNAME,
      isAdmin: true
    }
  });
});

app.get('/api/admin/session', requireAdmin, (req, res) => {
  res.json({
    ok: true,
    user: {
      username: req.admin.username,
      isAdmin: true
    }
  });
});

// ============================================
// PRODUCTS ROUTES
// ============================================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    if (!requireMongo(res, 'Products fetch')) return;

    
    const { category, search, featured, discount } = req.query;
    let query = {};
    
    // Support both 'category' (old) and 'categories' (new) fields
    if (category) {
      query.$or = [
        { categories: category },
        { category: category }
      ];
    }
    if (featured === 'true') query.isFeatured = true;
    if (discount === 'true') {
      query.discountPrice = { $type: 'number', $ne: null };
      query.$expr = { $lt: ["$discountPrice", "$price"] };
    }
    if (search) {
      const searchQuery = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchQuery }];
        delete query.$or;
      } else {
        query.$or = searchQuery;
      }
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(repairArabicMojibakeDeep(products));
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    if (!requireMongo(res, 'Product fetch')) return;

    const { id } = req.params;
    console.log('🔍 Looking for product with ID:', id);
    
    
    // Try to find by _id (support both ObjectId and string)
    let product = null;
    try {
      product = await Product.findById(id);
    } catch (e) {
      // If findById fails (e.g., invalid ObjectId format), try findOne
      product = await Product.findOne({ _id: id });
    }
    
    // If not found, try searching in id field
    if (!product) {
      product = await Product.findOne({ id: id });
    }
    
    if (!product) {
      console.log('❌ Product not found with ID:', id);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('✅ Product found:', product.name);
    res.json(repairArabicMojibakeDeep(product));
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Product create')) return;

    
    const product = new Product(req.body);
    await product.save();
    res.json(repairArabicMojibakeDeep(product));
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete user and related data (orders) by email
app.delete('/api/users/:email', requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();

    
    // MongoDB mode
    await Order.deleteMany({ customerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
    await User.deleteOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });

    return res.json({ success: true, message: 'User and related orders removed' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update product
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Product update')) return;

    const { id } = req.params;
    console.log('📝 Updating product with ID:', id);
    
    
    req.body.updatedAt = new Date();
    
    // Try to find and update by _id first
    let product = await Product.findByIdAndUpdate(id, req.body, { new: true });
    
    // If not found, try by id field
    if (!product) {
      product = await Product.findOneAndUpdate(
        { id: id },
        req.body,
        { new: true }
      );
    }
    
    if (!product) {
      console.log('❌ Product not found for update with ID:', id);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('✅ Product updated:', product.name);
    res.json(repairArabicMojibakeDeep(product));
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product (supports both MongoDB ObjectId and numeric id)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Product delete')) return;

    let product;
    const rawId = req.params.id;
    const id = rawId.trim();
    
    console.log('🗑️ Delete request for product ID:', id, '| Length:', id.length);
    
    
    // Try to find product first to see what type of ID it has
    const foundProduct = await findByIdOrCustom(Product, id);
    if (foundProduct) {
      // Found it - now delete using the correct method
      const foundId = foundProduct._id || foundProduct.id;
      console.log('   Found product with ID:', foundId);
      
      // Check if it's a MongoDB ObjectId or custom id
      if (foundProduct._id && foundProduct._id.toString().match(/^[0-9a-fA-F]{24}$/)) {
        product = await Product.findByIdAndDelete(foundProduct._id);
      } else {
        product = await Product.findOneAndDelete({ id: foundProduct.id || id });
      }
      
      if (product) {
        console.log('   ✅ Deleted from MongoDB');
        return res.json({ message: 'Product deleted successfully' });
      }
    }
    
    console.log('   ❌ Product not found');
    return res.status(404).json({ error: 'Product not found' });
    
  } catch (err) {
    console.error('❌ Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🧹 DELETE ALL PRODUCTS - Admin only
app.delete('/api/products', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Delete all products')) return;
    const result = await Product.deleteMany({});
    return res.json({ message: 'All products deleted successfully', count: result.deletedCount });
  } catch (err) {
    console.error('❌ Error deleting all products:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk discount
app.post('/api/products/bulk-discount', requireAdmin, async (req, res) => {
  try {
    const { productIds, discountType, discountValue, endDate } = req.body;
    
    for (const id of productIds) {
      const product = await Product.findById(id);
      if (!product) continue;
      
      let discountPrice = product.price;
      let discountPercentage = 0;
      
      if (discountType === 'percentage') {
        discountPrice = Math.round(product.price * (1 - discountValue / 100));
        discountPercentage = discountValue;
      } else if (discountType === 'fixed') {
        discountPrice = Math.max(0, product.price - discountValue);
        discountPercentage = Math.round((discountValue / product.price) * 100);
      } else if (discountType === 'newPrice') {
        discountPrice = discountValue;
        discountPercentage = Math.round(((product.price - discountValue) / product.price) * 100);
      }
      
      product.discountPrice = discountPrice;
      product.discountPercentage = discountPercentage;
      product.updatedAt = new Date();
      
      await product.save();
    }
    
    res.json({ message: 'Bulk discount applied' });
  } catch (err) {
    console.error('Error applying bulk discount:', err);
    res.status(500).json({ error: err.message });
  }
});

// User Statistics API
app.get('/api/users/stats', requireAdmin, async (req, res) => {
  try {
    
    // For now, return sample data structure
    // In production, this would query a User collection
    res.json({
      genderStats: { male: 0, female: 0, unknown: 0 },
      ageStats: { under18: 0, age18to25: 0, age26to35: 0, age36to50: 0, over50: 0, unknown: 0 },
      totalUsers: 0
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CATEGORIES ROUTES
// ============================================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    
    const categories = await Category.find();
    res.json(repairArabicMojibakeDeep(categories));
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create category
app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.json(repairArabicMojibakeDeep(category));
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update category
app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(repairArabicMojibakeDeep(category));
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete category
app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CART ROUTES
// ============================================

// Get cart
app.get('/api/cart', async (req, res) => {
  try {
    if (!requireMongo(res, 'Cart fetch')) return;

    const sessionId = getSessionId(req);
    let cart = await Cart.findOne({ sessionId });
    
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
      await cart.save();
    }
    
    res.json(repairArabicMojibakeDeep(cart.items));
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add to cart
app.post('/api/cart', async (req, res) => {
  try {
    if (!requireMongo(res, 'Cart add')) return;

    const sessionId = getSessionId(req);
    const { productId, name, price, image, quantity = 1 } = req.body;
    const normalizedProductId = normalizeCartRef(productId);
    const normalizedName = String(name || '').trim();
    const normalizedImage = String(image || '').trim();
    const normalizedPrice = Number(price);
    const normalizedQuantity = Number(quantity);

    if (!normalizedProductId || normalizedProductId === 'undefined' || normalizedProductId === 'null') {
      return res.status(400).json({ error: 'Invalid productId for cart item' });
    }
    
    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
    }
    
    const existingItem = cart.items.find(item => normalizeCartRef(item.productId) === normalizedProductId);
    if (existingItem) {
      existingItem.quantity += Number.isFinite(normalizedQuantity) && normalizedQuantity > 0 ? Math.floor(normalizedQuantity) : 1;
    } else {
      cart.items.push({
        productId: normalizedProductId,
        name: normalizedName,
        price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
        image: normalizedImage,
        quantity: Number.isFinite(normalizedQuantity) && normalizedQuantity > 0 ? Math.floor(normalizedQuantity) : 1
      });
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    
    res.json(repairArabicMojibakeDeep(cart.items));
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update cart item
app.put('/api/cart/:productId', async (req, res) => {
  try {
    if (!requireMongo(res, 'Cart update')) return;

    const sessionId = getSessionId(req);
    const { quantity } = req.body;
    const itemRef = normalizeCartRef(req.params.productId);
    const normalizedQuantity = Math.floor(Number(quantity));

    if (!itemRef) {
      return res.status(400).json({ error: 'Cart item reference is required' });
    }
    if (!Number.isFinite(normalizedQuantity)) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    
    const item = findCartItemByRef(cart.items, itemRef);
    if (item) {
      item.quantity = normalizedQuantity;
      if (normalizedQuantity <= 0) {
        const targetItemId = normalizeCartRef(item._id);
        const targetProductId = normalizeCartRef(item.productId);
        cart.items = cart.items.filter((entry) => {
          const sameItemId = targetItemId && normalizeCartRef(entry._id) === targetItemId;
          const sameProductId = !targetItemId && targetProductId && normalizeCartRef(entry.productId) === targetProductId;
          return !(sameItemId || sameProductId);
        });
      }
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    
    res.json(repairArabicMojibakeDeep(cart.items));
  } catch (err) {
    console.error('Error updating cart item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete cart item
app.delete('/api/cart/:productId', async (req, res) => {
  try {
    if (!requireMongo(res, 'Cart delete item')) return;

    const sessionId = getSessionId(req);
    const itemRef = normalizeCartRef(req.params.productId);
    if (!itemRef) {
      return res.status(400).json({ error: 'Cart item reference is required' });
    }
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const item = findCartItemByRef(cart.items, itemRef);
    if (!item) {
      return res.json(repairArabicMojibakeDeep(cart.items));
    }

    const targetItemId = normalizeCartRef(item._id);
    const targetProductId = normalizeCartRef(item.productId);
    cart.items = cart.items.filter((entry) => {
      const sameItemId = targetItemId && normalizeCartRef(entry._id) === targetItemId;
      const sameProductId = !targetItemId && targetProductId && normalizeCartRef(entry.productId) === targetProductId;
      return !(sameItemId || sameProductId);
    });
    cart.updatedAt = new Date();
    await cart.save();
    
    res.json(repairArabicMojibakeDeep(cart.items));
  } catch (err) {
    console.error('Error removing from cart:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear cart
app.delete('/api/cart', async (req, res) => {
  try {
    if (!requireMongo(res, 'Cart clear')) return;

    const sessionId = getSessionId(req);
    await Cart.findOneAndUpdate({ sessionId }, { items: [], updatedAt: new Date() });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('Error clearing cart:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ORDERS ROUTES
// ============================================

// Get all orders
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Orders fetch')) return;

    const orders = await Order.find().sort({ date: -1 });
    res.json(repairArabicMojibakeDeep(orders));
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single order
app.get('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Order fetch')) return;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(repairArabicMojibakeDeep(order));
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    if (!requireMongo(res, 'Order create')) return;

    const payload = { ...(req.body || {}) };
    const paymentMethod = String(payload.paymentMethod || 'cash').toLowerCase();
    const codFeeInput = Number(payload.codFee);
    payload.codFee = Number.isFinite(codFeeInput) ? codFeeInput : (paymentMethod === 'cash' ? COD_SURCHARGE_SAR : 0);
    payload.paymentMethod = paymentMethod;
    payload.status = String(payload.status || 'processing').trim() || 'processing';

    const order = new Order(payload);
    if (!order.orderCode) {
      order.orderCode = generateOrderCode(order._id, order.date || new Date());
    }
    appendOrderTimeline(order, {
      status: order.status,
      title: 'تم استلام الطلب',
      message: `استلمنا طلبك بنجاح. حالة الطلب الحالية: ${getOrderStatusTextAr(order.status)}`,
      source: 'system'
    });
    await order.save();

    try {
      const notifyResult = await sendOrderCustomerNotification(order, {
        title: 'تم استلام طلبك',
        message: `رقم طلبك ${order.orderCode}. سنقوم بتجهيزه وإشعارك بكل خطوة.`
      });
      if (notifyResult.sent) {
        order.customerNotifiedAt = new Date();
        await order.save();
      }
    } catch (notifyErr) {
      console.error('Order create notification failed:', notifyErr.message);
    }

    res.json(repairArabicMojibakeDeep(order));
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update order
app.put('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Order update')) return;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const allowedFields = [
      'status',
      'shippingCarrier',
      'trackingNumber',
      'trackingUrl',
      'shipmentReference',
      'shippingMethod',
      'shippingMethodLabel',
      'shippingCity',
      'shippingRegion',
      'shippingEta',
      'shippingCost',
      'shippingBaseFee',
      'shippingMethodExtraFee',
      'codFee',
      'paymentMethod',
      'otoTrackingNumber',
      'otoAwbUrl',
      'otoStatus',
      'otoDcStatus'
    ];

    const before = {
      status: String(order.status || ''),
      shippingCarrier: String(order.shippingCarrier || ''),
      trackingNumber: String(order.trackingNumber || order.otoTrackingNumber || ''),
      trackingUrl: String(order.trackingUrl || order.otoAwbUrl || '')
    };

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    }

    const nextStatus = String(order.status || '').trim() || 'processing';
    order.status = nextStatus;

    const after = {
      status: String(order.status || ''),
      shippingCarrier: String(order.shippingCarrier || ''),
      trackingNumber: String(order.trackingNumber || order.otoTrackingNumber || ''),
      trackingUrl: String(order.trackingUrl || order.otoAwbUrl || '')
    };

    const statusChanged = before.status !== after.status;
    const trackingChanged = before.trackingNumber !== after.trackingNumber || before.trackingUrl !== after.trackingUrl;
    const carrierChanged = before.shippingCarrier !== after.shippingCarrier;
    const manualNote = String(req.body?.note || '').trim();

    if (statusChanged) {
      if (after.status === 'shipped' && !order.shippedAt) order.shippedAt = new Date();
      if (after.status === 'out_for_delivery' && !order.outForDeliveryAt) order.outForDeliveryAt = new Date();
      if (after.status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();

      appendOrderTimeline(order, {
        status: after.status,
        title: 'تحديث حالة الطلب',
        message: `تم تحديث حالة الطلب إلى: ${getOrderStatusTextAr(after.status)}`,
        source: 'admin'
      });
    }

    if (trackingChanged || carrierChanged) {
      appendOrderTimeline(order, {
        status: after.status,
        title: 'تحديث بيانات الشحنة',
        message: `شركة الشحن: ${after.shippingCarrier || '-'} | رقم التتبع: ${after.trackingNumber || '-'}`,
        source: 'admin'
      });
    }

    if (manualNote) {
      appendOrderTimeline(order, {
        status: after.status,
        title: 'ملاحظة على الطلب',
        message: manualNote,
        source: 'admin'
      });
    }

    await order.save();

    let notificationSent = false;
    if (statusChanged || trackingChanged || carrierChanged || manualNote) {
      try {
        const notifyResult = await sendOrderCustomerNotification(order, {
          title: statusChanged ? `حالة الطلب: ${getOrderStatusTextAr(after.status)}` : 'تحديث على بيانات الشحنة',
          message: manualNote || `شركة الشحن: ${after.shippingCarrier || '-'} | رقم التتبع: ${after.trackingNumber || '-'}`
        });
        if (notifyResult.sent) {
          notificationSent = true;
          order.customerNotifiedAt = new Date();
          await order.save();
        }
      } catch (notifyErr) {
        console.error('Order update notification failed:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      notificationSent,
      order: repairArabicMojibakeDeep(order)
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create OTO shipment from order (admin only)
app.post('/api/orders/:id/create-shipment', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Create OTO shipment')) return;

    if (!isOTOConfigured()) {
      return res.status(400).json({
        error: 'OTO integration is not configured. Set OTO_API_TOKEN and OTO_PICKUP_LOCATION_CODE in environment.'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.otoOrderId) {
      return res.json({
        success: true,
        message: 'Shipment already linked to this order.',
        order: repairArabicMojibakeDeep(order)
      });
    }

    const deliveryOptionId = String(req.body?.deliveryOptionId || OTO_DEFAULT_DELIVERY_OPTION_ID || '').trim();
    const packageWeight = Number(req.body?.packageWeight || 1);
    const cod = String(order.paymentMethod || '').toLowerCase() === 'cash';
    const generatedOtoOrderId = `${OTO_ORDER_PREFIX}-${String(order._id)}`;

    const [lat, lng] = Array.isArray(order.location?.coordinates)
      ? [Number(order.location.coordinates[1]), Number(order.location.coordinates[0])]
      : [undefined, undefined];

    const payload = stripUndefinedDeep({
      orderId: generatedOtoOrderId,
      createShipment: true,
      pickupLocationCode: OTO_PICKUP_LOCATION_CODE,
      payment_method: cod ? 'cod' : 'paid',
      amount: Number(order.total || 0),
      amount_due: cod ? Number(order.total || 0) : 0,
      currency: 'SAR',
      packageWeight: Number.isFinite(packageWeight) && packageWeight > 0 ? packageWeight : 1,
      deliveryOptionId: deliveryOptionId || undefined,
      customer: {
        name: String(order.customerName || '').trim(),
        mobile: sanitizePhone(order.customerPhone),
        email: String(order.customerEmail || '').trim(),
        country: 'SA',
        city: String(order.shippingCity || '').trim() || 'Riyadh',
        district: String(order.shippingRegion || '').trim() || undefined,
        address1: String(order.customerAddress || '').trim(),
        latitude: Number.isFinite(lat) ? lat : undefined,
        longitude: Number.isFinite(lng) ? lng : undefined
      },
      items: (order.items || []).map((item, idx) => ({
        productId: String(item.productId || `item-${idx + 1}`),
        name: String(item.name || `Item ${idx + 1}`),
        price: Number(item.price || 0),
        rowTotal: Number(item.price || 0) * Number(item.quantity || 1),
        quantity: Number(item.quantity || 1),
        sku: String(item.productId || `SKU-${idx + 1}`)
      })),
      metadata: {
        source: 'antika-store',
        orderMongoId: String(order._id)
      }
    });

    const otoResult = await callOTO('createOrder', payload);

    order.otoOrderId = String(otoResult?.orderId || otoResult?.order?.orderId || generatedOtoOrderId);
    order.otoShipmentId = String(otoResult?.shipmentId || otoResult?.shipment?.shipmentId || otoResult?.shipment?.id || '');
    order.otoTrackingNumber = String(
      otoResult?.trackingNumber ||
      otoResult?.shipment?.trackingNumber ||
      otoResult?.awbNumber ||
      ''
    );
    order.otoAwbUrl = String(
      otoResult?.printAWBURL ||
      otoResult?.shipment?.printAWBURL ||
      otoResult?.awbUrl ||
      ''
    );
    order.otoStatus = String(otoResult?.status || 'shipmentCreated');
    order.otoDcStatus = String(otoResult?.dcStatus || '');
    order.status = mapOTOStatusToOrderStatus(order.otoStatus, order.otoDcStatus);
    if (!order.shippingCarrier) order.shippingCarrier = 'OTO';
    if (order.otoTrackingNumber && !order.trackingNumber) order.trackingNumber = order.otoTrackingNumber;
    if (order.otoAwbUrl && !order.trackingUrl) order.trackingUrl = order.otoAwbUrl;
    if (order.status === 'shipped' && !order.shippedAt) order.shippedAt = new Date();
    if (order.status === 'out_for_delivery' && !order.outForDeliveryAt) order.outForDeliveryAt = new Date();
    if (order.status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();
    appendOrderTimeline(order, {
      status: order.status,
      title: 'تم إنشاء شحنة',
      message: `تم إنشاء الشحنة بنجاح عبر OTO. رقم التتبع: ${order.trackingNumber || '-'}`,
      source: 'system'
    });
    await order.save();

    try {
      const notifyResult = await sendOrderCustomerNotification(order, {
        title: 'تم إنشاء شحنتك',
        message: `شركة الشحن: ${order.shippingCarrier || 'OTO'} | رقم التتبع: ${order.trackingNumber || '-'}`
      });
      if (notifyResult.sent) {
        order.customerNotifiedAt = new Date();
        await order.save();
      }
    } catch (notifyErr) {
      console.error('OTO create shipment notification failed:', notifyErr.message);
    }

    return res.json({
      success: true,
      message: 'OTO shipment created successfully',
      oto: otoResult,
      order: repairArabicMojibakeDeep(order)
    });
  } catch (err) {
    console.error('Error creating OTO shipment:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Failed to create OTO shipment',
      details: err.details || null
    });
  }
});

// OTO webhook endpoint to sync shipment status back to store.
app.post('/api/oto/webhook', async (req, res) => {
  try {
    if (!requireMongo(res, 'OTO webhook')) return;

    if (OTO_WEBHOOK_AUTH_KEY) {
      const authCandidates = [
        req.headers.authorization,
        req.headers['x-authorization'],
        req.headers['x-oto-key'],
        req.headers['x-api-key']
      ]
        .filter(Boolean)
        .map(v => String(v).replace(/^Bearer\s+/i, '').trim());

      if (!authCandidates.includes(OTO_WEBHOOK_AUTH_KEY)) {
        return res.status(401).json({ error: 'Unauthorized webhook key' });
      }
    }

    const incoming = req.body;
    const events = Array.isArray(incoming)
      ? incoming
      : Array.isArray(incoming?.data)
        ? incoming.data
        : [incoming];

    let updatedCount = 0;
    const updatedIds = [];

    for (const eventRaw of events) {
      const event = eventRaw?.data && typeof eventRaw.data === 'object' ? eventRaw.data : eventRaw;
      if (!event || typeof event !== 'object') continue;

      const otoOrderId = String(event.orderId || event.order_id || event.reference || '').trim();
      if (!otoOrderId) continue;

      const order = await Order.findOne({ otoOrderId });
      if (!order) continue;

      const otoStatus = String(event.status || event.orderStatus || event.shipmentStatus || '').trim();
      const otoDcStatus = String(event.dcStatus || event.dc_status || '').trim();
      const trackingNumber = String(event.trackingNumber || event.awbNumber || event.airwayBill || '').trim();
      const awbUrl = String(event.printAWBURL || event.awbUrl || event.labelUrl || '').trim();

      const previousStatus = String(order.status || '');
      const previousTracking = String(order.trackingNumber || order.otoTrackingNumber || '');

      order.otoStatus = otoStatus || order.otoStatus;
      order.otoDcStatus = otoDcStatus || order.otoDcStatus;
      order.otoTrackingNumber = trackingNumber || order.otoTrackingNumber;
      order.otoAwbUrl = awbUrl || order.otoAwbUrl;
      order.otoLastWebhookAt = new Date();
      order.status = mapOTOStatusToOrderStatus(order.otoStatus, order.otoDcStatus);
      order.shippingCarrier = order.shippingCarrier || 'OTO';
      if (order.otoTrackingNumber) order.trackingNumber = order.otoTrackingNumber;
      if (order.otoAwbUrl) order.trackingUrl = order.otoAwbUrl;
      if (order.status === 'shipped' && !order.shippedAt) order.shippedAt = new Date();
      if (order.status === 'out_for_delivery' && !order.outForDeliveryAt) order.outForDeliveryAt = new Date();
      if (order.status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();

      const statusChanged = previousStatus !== String(order.status || '');
      const trackingChanged = previousTracking !== String(order.trackingNumber || '');
      if (statusChanged || trackingChanged) {
        appendOrderTimeline(order, {
          status: order.status,
          title: 'تحديث تلقائي من شركة الشحن',
          message: `الحالة: ${getOrderStatusTextAr(order.status)} | رقم التتبع: ${order.trackingNumber || '-'}`,
          source: 'oto-webhook'
        });
      }
      await order.save();

      if (statusChanged || trackingChanged) {
        try {
          const notifyResult = await sendOrderCustomerNotification(order, {
            title: `تحديث الشحنة: ${getOrderStatusTextAr(order.status)}`,
            message: `تم تحديث شحنتك تلقائياً من شركة الشحن. رقم التتبع: ${order.trackingNumber || '-'}`
          });
          if (notifyResult.sent) {
            order.customerNotifiedAt = new Date();
            await order.save();
          }
        } catch (notifyErr) {
          console.error('OTO webhook notification failed:', notifyErr.message);
        }
      }

      updatedCount += 1;
      updatedIds.push(String(order._id));
    }

    return res.json({ success: true, updatedCount, updatedIds });
  } catch (err) {
    console.error('Error handling OTO webhook:', err);
    return res.status(500).json({ error: err.message || 'Webhook processing failed' });
  }
});

// Delete order
app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Order delete')) return;

    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SETTINGS ROUTES
// ============================================

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    if (!requireMongo(res, 'Settings fetch')) return;

    const settings = await Settings.find();
    const result = {};
    settings.forEach(s => {
        result[s.key] = s.value;
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update settings
app.put('/api/settings', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Settings update')) return;

    for (const [key, value] of Object.entries(req.body)) {
      await Settings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true }
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get announcing text
app.get('/api/announcing', async (req, res) => {
  try {
    if (!requireMongo(res, 'Announcing fetch')) return;

    const setting = await Settings.findOne({ key: 'announcing' });
    res.json({ 
      text: setting?.value?.text || '🚚 تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة',
      isVisible: setting?.value?.isVisible !== false // default true
    });
  } catch (err) {
    console.error('Error fetching announcing text:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update announcing text
app.put('/api/announcing', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Announcing update')) return;

    const { text, isVisible } = req.body;
    const updateData = { key: 'announcing' };
    
    // Get current value first
    const current = await Settings.findOne({ key: 'announcing' });
    const currentValue = current?.value || {};
    
    updateData.value = {
      text: text !== undefined ? text : currentValue.text,
      isVisible: isVisible !== undefined ? isVisible : (currentValue.isVisible !== false)
    };
    
    await Settings.findOneAndUpdate(
      { key: 'announcing' },
      updateData,
      { upsert: true }
    );
    res.json({ message: 'Announcing settings updated' });
  } catch (err) {
    console.error('Error updating announcing text:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// USERS & ADDRESSES (synchronization for frontend)
// ============================================

// Get user by email (URL-encoded email)
app.get('/api/users/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    
    const user = await User.findOne({ email: email });
    res.json(user || {});
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upsert basic user info (name, phone, email)
app.put('/api/users/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const { name, phone } = req.body;

    
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { name: name || '', phone: phone || '' } },
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (err) {
    console.error('Error upserting user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add address for user
app.post('/api/users/:email/addresses', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const { label, address, location } = req.body;

    
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name: '', phone: '', addresses: [] });
    }
    user.addresses = user.addresses || [];
    user.addresses.push({ label, address, location });
    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Error adding address:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update specific address by index
app.put('/api/users/:email/addresses/:idx', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const idx = parseInt(req.params.idx);
    const { label, address, location } = req.body;

    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.addresses || !user.addresses[idx]) return res.status(404).json({ error: 'Address not found' });
    user.addresses[idx] = { label, address, location };
    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Error updating address:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete address by index
app.delete('/api/users/:email/addresses/:idx', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const idx = parseInt(req.params.idx);

    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.addresses || !user.addresses[idx]) return res.status(404).json({ error: 'Address not found' });
    user.addresses.splice(idx,1);
    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📧 Send OTP to email
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Generate OTP
    const otp = generateOTP();
    const timestamp = Date.now();
    
    // Store OTP (email -> {code, timestamp, attempts})
    otpStore.set(email, { code: otp, timestamp, attempts: 0 });

    // Send email with OTP
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@antika-store.com',
      to: email,
      subject: 'Antika Store - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #c93c7f; margin: 0 0 20px 0;">أنتيكا ستور</h2>
            <p style="color: #333; font-size: 16px; margin: 10px 0;">مرحباً بك في أنتيكا ستور!</p>
            <p style="color: #666; font-size: 14px; margin: 10px 0;">استخدم الكود أدناه للتحقق من بريدك الإلكتروني:</p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; border: 2px solid #c93c7f;">
              <p style="font-size: 32px; font-weight: bold; color: #c93c7f; letter-spacing: 5px; margin: 0;">${otp}</p>
            </div>
            <p style="color: #999; font-size: 12px; margin: 20px 0;">انتهاء الصلاحية: 10 دقائق</p>
            <p style="color: #999; font-size: 12px; margin: 10px 0;">إذا لم تطلب هذا الكود، تجاهل هذا البريد.</p>
          </div>
        </div>
      `
    };

    // Development fallback: if Gmail credentials are not configured,
    // log the OTP to the server console and return a dev response so
    // developers can test verification without SMTP.
    const gmailUser = (process.env.GMAIL_USER || '').toLowerCase();
    const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').toLowerCase();
    const isPlaceholderCreds = gmailUser.includes('your-email') || gmailPass.includes('your-app-password') || !gmailUser || !gmailPass;

    if (isPlaceholderCreds) {
      console.log(`DEV MODE: Verification OTP for ${email} is ${otp}`);
      // Return OTP in response only when not running in production (safe for local dev)
      const devResponse = { success: true, message: 'Verification code logged on server (dev mode)', email };
      if ((process.env.NODE_ENV || 'development') !== 'production') devResponse.otp = otp;
      return res.json(devResponse);
    }

    emailTransporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Email send error:', error);
        return res.status(500).json({ error: 'Failed to send verification email', details: error.message });
      }
      console.log('✅ Email sent:', info.response);
      res.json({ success: true, message: 'Verification code sent to email', email });
    });
  } catch (err) {
    console.error('Error in send-verification-email:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Verify OTP code
app.post('/api/verify-email-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(email);
    if (!storedOTP) {
      return res.status(400).json({ error: 'No OTP found for this email. Request a new one.' });
    }

    // Check if OTP has expired
    if (Date.now() - storedOTP.timestamp > OTP_EXPIRY) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'Verification code expired. Request a new one.' });
    }

    // Check attempt limit
    if (storedOTP.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many failed attempts. Request a new code.' });
    }

    // Verify code
    if (storedOTP.code !== code) {
      storedOTP.attempts += 1;
      return res.status(400).json({ error: 'Invalid verification code. Please try again.', attemptsLeft: MAX_OTP_ATTEMPTS - storedOTP.attempts });
    }

    // ✅ Code is correct! Mark email as verified and clear OTP
    otpStore.delete(email);

    if (!requireMongo(res, 'Email verification update')) return;

    // If user exists in MongoDB, mark as verified
    try {
      const user = await User.findOne({ email });
      if (user) {
        user.emailVerified = true;
        await user.save();
      }
    } catch (e) {
      console.log('Note: Could not update user verification status in MongoDB:', e.message);
    }

    res.json({ success: true, message: 'Email verified successfully', email });
  } catch (err) {
    console.error('Error in verify-email-code:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get default location for user
app.get('/api/users/:email/location', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();

    
    const user = await User.findOne({ email });
    const loc = user?.defaultLocation || null;
    const label = user?.locationLabel || 'موقعي';
    res.json({ location: loc, label });
  } catch (err) {
    console.error('Error fetching user location:', err);
    res.status(500).json({ error: err.message });
  }
});

// Set default location for user
app.put('/api/users/:email/location', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const { lat, lng, label = 'موقعي' } = req.body;

    
    const user = await User.findOneAndUpdate(
      { email },
      { 
        defaultLocation: { lat, lng },
        locationLabel: label || 'موقعي'
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, location: user.defaultLocation, label: user.locationLabel });
  } catch (err) {
    console.error('Error setting user location:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete default location for user
app.delete('/api/users/:email/location', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();

    
    await User.findOneAndUpdate(
      { email },
      { defaultLocation: null, locationLabel: 'موقعي' },
      { new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user location:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get footer pages
app.get('/api/pages', async (req, res) => {
  try {
    if (!requireMongo(res, 'Pages fetch')) return;

    const pages = await Settings.find({ key: { $in: ['about', 'returns', 'terms', 'faq'] } });
    const result = {};
    pages.forEach(p => result[p.key] = p.value);
    res.json(result);
  } catch (err) {
    console.error('Error fetching pages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update footer page
app.put('/api/pages/:pageId', requireAdmin, async (req, res) => {
  try {
    if (!requireMongo(res, 'Page update')) return;

    const { pageId } = req.params;
    const { title, content } = req.body;
    
    await Settings.findOneAndUpdate(
      { key: pageId },
      { key: pageId, value: { title, content } },
      { upsert: true }
    );
    
    res.json({ message: 'Page updated', page: { title, content } });
  } catch (err) {
    console.error('Error updating page:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// MAPS CONFIG
// ============================================

app.get('/api/maps/config', (req, res) => {
  const googleMapsEnabled = Boolean(GOOGLE_MAPS_API_KEY);
  res.json({
    provider: googleMapsEnabled ? 'google' : 'leaflet',
    googleMapsEnabled,
    googleMapsApiKey: googleMapsEnabled ? GOOGLE_MAPS_API_KEY : ''
  });
});

// ============================================
// MOYASAR PAYMENT
// ============================================

// Return publishable key to frontend (safe to expose)
app.get('/api/payment/config', (req, res) => {
  res.json({
    publishableKey: MOYASAR_PUBLISHABLE_KEY || '',
    enabled: Boolean(MOYASAR_PUBLISHABLE_KEY)
  });
});

// Verify payment after Moyasar callback
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { paymentId, orderId } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId مطلوب' });
    }

    if (!MOYASAR_SECRET_KEY) {
      return res.status(500).json({ error: 'Moyasar غير مُعد على السيرفر' });
    }

    // Verify payment with Moyasar API
    const moyasarRes = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64')
      }
    });

    if (!moyasarRes.ok) {
      return res.status(400).json({ error: 'فشل التحقق من الدفعة مع Moyasar' });
    }

    const payment = await moyasarRes.json();

    if (payment.status !== 'paid') {
      return res.status(400).json({ error: 'الدفعة لم تكتمل', status: payment.status });
    }

    // If orderId provided, update order paymentMethod and status
    if (orderId && isMongoConnected()) {
      try {
        await Order.findByIdAndUpdate(orderId, {
          paymentMethod: 'online',
          paymentId: paymentId,
          status: 'processing'
        });
      } catch (e) {
        console.warn('Could not update order payment status:', e.message);
      }
    }

    return res.json({ success: true, payment });
  } catch (err) {
    console.error('Moyasar verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INITIAL DATA
// ============================================

async function initData() {
  try {
    // Check if categories exist
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      const defaultCategories = [
        { id: 'candles', name: 'شموع منزلية', icon: '🕯️', subcategories: ['شموع عطرية', 'شموع زينة', 'فواحات'] },
        { id: 'furniture', name: 'أثاث', icon: '🪑', subcategories: ['كراسي', 'طاولات', 'خزائن'] },
        { id: 'decor', name: 'ديكور جداري', icon: '🖼️', subcategories: ['لوحات', 'مرايا', 'رفوف'] },
        { id: 'tools', name: 'أدوات منزلية', icon: '🏺', subcategories: ['مطبخ', 'حمام', 'غرفة المعيشة'] }
      ];
      await Category.insertMany(defaultCategories);
      console.log('✅ Default categories created');
    }
    
    // ⚠️ Default products creation is DISABLED - user wants clean database
    // To re-enable, uncomment the code below
    /*
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      const defaultProducts = [...];
      await Product.insertMany(defaultProducts);
      console.log('✅ Default products created');
    }
    */
    const prodCount = await Product.countDocuments();
    console.log(`📦 Products in database: ${prodCount}`);
    
    // Create default announcing text if not exists
    const announcingExists = await Settings.findOne({ key: 'announcing' });
    if (!announcingExists) {
      await Settings.create({
        key: 'announcing',
        value: { text: '🚚 تخفيضات وخصومات تصل إلى 50% وتوصيل مجاني لجميع مدن المملكة' }
      });
      console.log('✅ Default announcing text created');
    }
    
  } catch (err) {
    console.error('Error initializing data:', err);
  }
}

// ============================================
// SYSTEM STATUS (for frontend debugging)
// ============================================

app.get('/api/status', async (req, res) => {
  try {
    const mongoStatus = isMongoConnected() ? 'connected' : 'disconnected';
    let productCount = null;
    let categoryCount = null;

    if (isMongoConnected()) {
      productCount = await Product.countDocuments();
      categoryCount = await Category.countDocuments();
    }
    
    res.json({
      mongodb: mongoStatus,
      database: mongoose.connection.db?.databaseName || 'antika_store',
      productCount,
      categoryCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching system status:', err);
    res.json({
      mongodb: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  if (isMongoConnected()) {
    await initData();
  } else {
    console.log('Skipping initData until MongoDB is connected');
  }
});

// Handle EADDRINUSE error - kill existing process and retry
server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${PORT} is already in use. Attempting to free it...`);
    try {
      // Find and kill process using port 3000
      const { exec } = require('child_process');
      exec(`powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`, (error) => {
        if (error) {
          console.log(`❌ Could not free port ${PORT}. Trying alternative port...`);
          // Try alternative port
          const ALT_PORT = 3001;
          app.listen(ALT_PORT, async () => {
            console.log(`🚀 Server running on alternative port ${ALT_PORT}`);
            console.log(`📡 API available at http://localhost:${ALT_PORT}/api`);
            if (isMongoConnected()) {
              await initData();
            }
          });
        } else {
          console.log(`✅ Port ${PORT} freed. Retrying...`);
          setTimeout(() => {
            app.listen(PORT, async () => {
              console.log(`🚀 Server running on port ${PORT}`);
              console.log(`📡 API available at http://localhost:${PORT}/api`);
              if (isMongoConnected()) {
                await initData();
              }
            });
          }, 1000);
        }
      });
    } catch (e) {
      console.error('Error handling port conflict:', e);
    }
  } else {
    console.error('Server error:', err);
  }
});