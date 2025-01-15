const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  otpReset: {
    type: Number,
    default: null
  },
  otpResetExpires: {
    type: Date,
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products' // Must match the model name in productModel.js
  }],
  cartItem: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products' 
  }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
