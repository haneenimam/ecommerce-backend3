const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Core fields for app
  name: { type: String, required: false }, // Not required to support imported data
  description: { type: String },
  price: { type: Number },
  category: { type: String },
  stock: { type: Number, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  image: { type: String },

  // Fields to support Kaggle-style imports
  title: { type: String },
  main_category: { type: String },
  average_rating: { type: Number },
  rating_number: { type: Number },
  images: [{ type: String }],
  store: { type: String }
}, {
  timestamps: true,
  strict: false // Accept extra fields if imported
});

module.exports = mongoose.model('Product', ProductSchema);
