/* const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const Product = require('../models/Product');

// ===== TEST ROUTE =====
router.get('/ping', (req, res) => {
  res.send('Products route alive!');
});

// ===== PUBLIC ROUTES ===== //
// Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;
    let query = {};

    // Filter by category
    if (category) query.category = category;

    // Price range filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Simple search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'); // Exclude version key

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      products
    });
  } catch (err) {
    console.error('Error in GET /api/products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product details
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== SELLER-ONLY ROUTES ===== //
// Add product (Seller only)
router.post('/', auth, roleCheck(['seller']), async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      seller: req.user.id
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get seller's products
router.get('/my-products', auth, roleCheck(['seller']), async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
 */


//test////////////////////////////////


const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const Product = require('../models/Product');

// ===== TEST ROUTE =====
router.get('/ping', (req, res) => {
  res.send('Products route alive!');
});

// ===== PUBLIC ROUTES ===== //
// Get all products with filtering (no pagination)
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    let query = {};

    // Filter by category
    if (category) query.category = category;

    // Price range filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query).select('-__v');
    res.json(products);
  } catch (err) {
    console.error('Error in GET /api/products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product details
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== SELLER-ONLY ROUTES ===== //
// Add product (Seller only)
router.post('/', auth, roleCheck(['seller']), async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      seller: req.user.id
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get seller's products
router.get('/my-products', auth, roleCheck(['seller']), async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
