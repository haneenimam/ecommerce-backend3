const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  address: String,
  apartment: String,
  city: String,
  governorate: String,
  postalCode: String,
  phone: String,
  paymentMethod: String,
  cardNumber: String,
  cardName: String,
  expiry: String,
  cvv: String,
  items: Array,
  totalPrice: Number,
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
