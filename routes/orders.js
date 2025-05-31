const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Create order (guest or logged-in user)
router.post('/', async (req, res) => {
  try {
    const { items, userInfo } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Validate items and calculate total
    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `${product.name} has insufficient stock` });
      }
      total += product.price * item.quantity;
    }

    // Create order
    const order = new Order({
      user: req.user?.id || null, // If logged in, assign user ID; otherwise null
      userInfo, // Store guest user info (name, email, address, etc.)
      items: await Promise.all(items.map(async item => {
        const product = await Product.findById(item.product);
        return {
          product: product._id,
          quantity: item.quantity,
          price: product.price
        };
      })),
      total,
      status: 'processing'
    });

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's orders
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders (Admin/Seller)
router.get('/all', auth, roleCheck(['Admin', 'Seller']), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Seller') {
      const sellerProducts = await Product.find({ seller: req.user.id });
      query = { 'items.product': { $in: sellerProducts.map(p => p._id) } };
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.patch('/:id/status', auth, roleCheck(['Admin', 'Seller']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (req.user.role === 'Seller') {
      const sellerProducts = await Product.find({ seller: req.user.id });
      const allItemsBelongToSeller = order.items.every(item =>
        sellerProducts.some(p => p._id.equals(item.product))
      );
      if (!allItemsBelongToSeller) {
        return res.status(403).json({ error: 'Not authorized to update this order' });
      }
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
