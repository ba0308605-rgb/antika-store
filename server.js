// require('dotenv').config();  // علّق هذا مؤقتاً

// ✅ قاعدة بيانات MongoDB محلية
process.env.MONGODB_URI = 'mongodb://localhost:27017/mystore';
process.env.JWT_SECRET = 'your-secret-key-12345';
process.env.PORT = '3000';
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ============================================
// SCHEMAS (نماذج البيانات)
// ============================================

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  discountPrice: Number,
  discountPercentage: Number,
  categories: [{ type: String }],
  subcategory: String,
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
  stockDisplay: { type: String, default: 'number' },
  stockText: String,
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  reviewsList: [{
    user: String,
    rating: Number,
    comment: String,
    date: Date
  }],
  isNewProduct: { type: Boolean, default: false },
  productExpiryDate: Date,
  isFeatured: { type: Boolean, default: false },
  // ✅ مميزات المنتج - خاصة بكل منتج على حدة
  features: {
    freeShipping: { type: Boolean, default: false },
    easyReturns: { type: Boolean, default: false },
    qualityGuarantee: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: String,
  color: String,
  subcategories: [{ type: String }]
});

// Cart Schema
const cartSchema = new mongoose.Schema({
  sessionId: String,
  userId: String,
  items: [{
    productId: String,
    name: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 }
  }],
  updatedAt: { type: Date, default: Date.now }
});

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
const Cart = mongoose.model('Cart', cartSchema);
const User = mongoose.model('User', userSchema);
const Settings = mongoose.model('Settings', settingsSchema);

// ============================================
// MIDDLEWARE
// ============================================

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = async (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// AUTH ROUTES
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for admin credentials
    if (email === 'BDR-FIRST' && password === 'B1-a2d3e4r5') {
      const token = jwt.sign(
        { email, isAdmin: true, name: 'Admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ token, user: { email, isAdmin: true, name: 'Admin' } });
    }
    
    // Regular user login
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });
    
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, phone });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, isAdmin: false, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { name: user.name, email: user.email, isAdmin: false } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PRODUCTS ROUTES
// ============================================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, featured, discount } = req.query;
    let query = {};
    
    if (category) query.categories = category;
    if (featured) query.isFeatured = true;
    if (discount) query.discountPrice = { $exists: true, $ne: null };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product (Admin only)
app.post('/api/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product (Admin only)
app.put('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    req.body.updatedAt = new Date();
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (Admin only)
app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk discount (Admin only)
app.post('/api/products/bulk-discount', authMiddleware, adminMiddleware, async (req, res) => {
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
        discountPrice = product.price - discountValue;
        discountPercentage = Math.round((discountValue / product.price) * 100);
      } else if (discountType === 'newPrice') {
        discountPrice = discountValue;
        discountPercentage = Math.round(((product.price - discountValue) / product.price) * 100);
      }
      
      product.discountPrice = discountPrice;
      product.discountPercentage = discountPercentage;
      if (endDate) product.discountEndDate = endDate;
      product.updatedAt = new Date();
      
      await product.save();
    }
    
    res.json({ message: 'Bulk discount applied' });
  } catch (err) {
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
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create category (Admin only)
app.post('/api/categories', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update category (Admin only)
app.put('/api/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category (Admin only)
app.delete('/api/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CART ROUTES
// ============================================

// Get cart
app.get('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    let cart = await Cart.findOne({ sessionId });
    
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
      await cart.save();
    }
    
    res.json(cart.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to cart
app.post('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    const { productId, name, price, image, quantity = 1 } = req.body;
    
    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
    }
    
    const existingItem = cart.items.find(item => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, name, price, image, quantity });
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    
    res.json(cart.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update cart item
app.put('/api/cart/:productId', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    const { quantity } = req.body;
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    
    const item = cart.items.find(item => item.productId === req.params.productId);
    if (item) {
      item.quantity = quantity;
      if (quantity <= 0) {
        cart.items = cart.items.filter(item => item.productId !== req.params.productId);
      }
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    
    res.json(cart.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete cart item
app.delete('/api/cart/:productId', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    
    cart.items = cart.items.filter(item => item.productId !== req.params.productId);
    cart.updatedAt = new Date();
    await cart.save();
    
    res.json(cart.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear cart
app.delete('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    await Cart.findOneAndUpdate({ sessionId }, { items: [], updatedAt: new Date() });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// REVIEWS ROUTES
// ============================================

// Add review
app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { user, rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    product.reviewsList.push({
      user,
      rating,
      comment,
      date: new Date()
    });
    
    // Update average rating
    const totalRating = product.reviewsList.reduce((sum, r) => sum + r.rating, 0);
    product.rating = totalRating / product.reviewsList.length;
    product.reviews = product.reviewsList.length;
    
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SETTINGS ROUTES
// ============================================

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.find();
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings (Admin only)
app.put('/api/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Settings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true }
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
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
        { id: 'candles', name: 'شموع منزلية', icon: '🕯️', color: '#FFB6C1', subcategories: ['شموع عطرية', 'شموع زينة', 'فواحات'] },
        { id: 'furniture', name: 'أثاث', icon: '🪑', color: '#8B4513', subcategories: ['كراسي', 'طاولات', 'خزائن'] },
        { id: 'decor', name: 'ديكور جداري', icon: '🖼️', color: '#DDA0DD', subcategories: ['لوحات', 'مرايا', 'رفوف'] },
        { id: 'tools', name: 'أدوات منزلية', icon: '🏺', color: '#F4A460', subcategories: ['مطبخ', 'حمام', 'غرفة المعيشة'] }
      ];
      await Category.insertMany(defaultCategories);
      console.log('✅ Default categories created');
    }
    
    // Check if products exist
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      const defaultProducts = [
        {
          name: 'شمعة العود الفاخرة',
          description: 'شمعة يدوية الصنع من الشمع الطبيعي بنسبة 100%...',
          price: 150,
          discountPrice: 120,
          discountPercentage: 20,
          categories: ['candles'],
          subcategory: 'شموع عطرية',
          images: ['https://images.unsplash.com/photo-1602607688656-1c7a1b1c0b5e?w=800&h=800&fit=crop'],
          stock: 20,
          stockDisplay: 'number',
          rating: 4.8,
          reviews: 45,
          isFeatured: true,
          createdAt: new Date()
        },
        {
          name: 'كرسي خشبي كلاسيكي',
          description: 'كرسي بتصميم Scandinavian أنيق...',
          price: 800,
          discountPrice: 650,
          discountPercentage: 18.75,
          categories: ['furniture'],
          subcategory: 'كراسي',
          images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop'],
          stock: 5,
          stockDisplay: 'number',
          rating: 4.9,
          reviews: 28,
          isFeatured: true,
          createdAt: new Date()
        }
      ];
      await Product.insertMany(defaultProducts);
      console.log('✅ Default products created');
    }
  } catch (err) {
    console.error('Error initializing data:', err);
  }
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initData();
});