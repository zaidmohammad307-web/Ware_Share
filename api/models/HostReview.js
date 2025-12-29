// api/models/HostReview.js
const mongoose = require('mongoose');

const hostReviewSchema = new mongoose.Schema(
  {
    host: {
      // warehouse owner being reviewed
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    reviewer: {
      // renter who wrote the review
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// one host review per booking per reviewer
hostReviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

const HostReview = mongoose.model('HostReview', hostReviewSchema);
module.exports = HostReview;
