const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Guest or Authenticated: Create order (from frontend data)
router.post('/', async (req, res) => {
  try {
    const { items, user, shippingInfo, paymentMethod, cardNumber, cardName, expiry, cvv } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain items' });
    }

    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `${product.name} has insufficient stock` });
      }

      totalPrice += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
    }

    const newOrder = new Order({
      user: user || null,
      items: orderItems,
      totalPrice,
      shippingInfo: shippingInfo || {},
      paymentMethod,
      cardNumber,
      cardName,
      expiry,
      cvv,
      status: 'processing',
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Authenticated: Get user's orders
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

// Admin/Seller: Get all orders
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

// Admin/Seller: Update order status
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
      const sellerProductIds = sellerProducts.map(p => p._id.toString());

      const isAuthorized = order.items.every(item =>
        sellerProductIds.includes(item.product.toString())
      );

      if (!isAuthorized) {
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
