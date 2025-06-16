const express = require('express');
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

    const parsedLimit = parseInt(limit);
    const skip = (parseInt(page) - 1) * parsedLimit;

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .skip(skip)
      .limit(parsedLimit)
      .select('-__v'); // Exclude version key

    res.json({
      total,
      page: parseInt(page),
      limit: parsedLimit,
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

// Add product (Admin and Seller)
router.post('/', auth, roleCheck(['Admin', 'Seller']), async (req, res) => {
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

// Update product (Admin or Seller)
router.put('/:id', auth, roleCheck(['Admin', 'Seller']), async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If image is not in the request, keep the existing image
    const updatedData = {
      ...product.toObject(),
      ...req.body,
      image: req.body.image || product.image,
    };

    if (req.user.role === 'Admin') {
      product = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    } else {
      product = await Product.findOneAndUpdate(
        { _id: req.params.id, seller: req.user.id },
        updatedData,
        { new: true }
      );
    }

    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// Get seller's products
router.get('/my-products', auth, roleCheck(['Seller']), async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});







// Delete product (admin can delete any, seller can delete their own)
router.delete('/:id', auth, roleCheck(['Admin', 'Seller']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If the user is a seller, check they own the product
    if (req.user.role === 'Seller' && product.seller.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

