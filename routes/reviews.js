const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Add review (only verified buyers)
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    
    // Check if user has purchased the product
    const hasPurchased = await Order.exists({
      user: req.user.id,
      'items.product': productId,
      status: 'completed'
    });
    
    if (!hasPurchased) {
      return res.status(403).json({ error: 'You must purchase the product first' });
    }

    // Check for existing review
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });
    
    if (existingReview) {
      return res.status(400).json({ error: 'You already reviewed this product' });
    }

    const review = new Review({
      product: productId,
      user: req.user.id,
      rating,
      comment,
      verifiedPurchase: true
    });

    await review.save();
    
    // Update product average rating
    await updateProductRating(productId);
    
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to update product rating
async function updateProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } }
  ]);
  
  const averageRating = result[0]?.averageRating || 0;
  await Product.findByIdAndUpdate(productId, { averageRating });
}

module.exports = router;