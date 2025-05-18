const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    res.json(cart || { items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to cart
router.post('/', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex >= 0) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.json(await cart.populate('items.product'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Make sure this line is exactly like this:
module.exports = router;