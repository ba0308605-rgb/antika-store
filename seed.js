// 🌱 Quick Seed - Import db.json into MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb://localhost:27017/antika_store';

// Schemas
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  discountPrice: Number,
  discountPercentage: Number,
  category: String,
  categories: [String],
  images: [String],
  stock: Number,
  rating: Number,
  reviews: Number,
  isNew: Boolean,
  isFeatured: Boolean,
  freeShipping: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const categorySchema = new mongoose.Schema({
  id: String,
  name: String,
  icon: String,
  subcategories: [String]
});

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);

async function seedDB() {
  try {
    console.log('🌱 Starting seed process...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Read db.json
    const dbPath = path.join(__dirname, 'db.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('🗑️ Cleared existing data');
    
    // Insert products
    if (dbData.products && dbData.products.length > 0) {
      await Product.insertMany(dbData.products);
      console.log(`✅ Added ${dbData.products.length} products`);
    }
    
    // Insert categories
    if (dbData.categories && dbData.categories.length > 0) {
      await Category.insertMany(dbData.categories);
      console.log(`✅ Added ${dbData.categories.length} categories`);
    }
    
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seedDB();
