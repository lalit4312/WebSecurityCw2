const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true
  },
  comment: {
    type: String,
    required: true
  }
}, { timestamps: true });

reviewSchema.methods.isOwner = function(user) {
  return this.userId.equals(user._id);
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
