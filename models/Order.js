const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  shippingInfo: {
    email: String,
    firstName: String,
    lastName: String,
    address: String,
    apartment: String,
    city: String,
    governorate: String,
    postalCode: String,
    phone: String,
    country: String,
  },
  paymentMethod: String,
  cardNumber: String,
  cardName: String,
  expiry: String,
  cvv: String,
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: Number,
      price: Number,
    },
  ],
  totalPrice: Number,
  status: {
    type: String,
    enum: ['processing', 'shipped', 'delivered', 'cancelled'],
    default: 'processing',
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
