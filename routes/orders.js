const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Create order from cart
router.post('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    // Verify stock and calculate total
    let total = 0;
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ error: `${item.product.name} has insufficient stock` });
      }
      total += item.product.price * item.quantity;
    }

    // Create order
    const order = new Order({
      user: req.user.id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      })),
      total,
      status: 'processing' // Default status
    });

    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    await order.save();
    await Cart.deleteOne({ _id: cart._id }); // Clear cart

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
      .sort({ createdAt: -1 }); // Newest first
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders (Admin/Seller)
router.get('/all', auth, roleCheck(['admin', 'seller']), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'seller') {
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
router.patch('/:id/status', auth, roleCheck(['admin', 'seller']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Verify seller only updates their own products
    if (req.user.role === 'seller') {
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