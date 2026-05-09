// api/models/RenterReview.js
const mongoose = require('mongoose');

const renterReviewSchema = new mongoose.Schema(
  {
    renter: {
      // renter being reviewed
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    host: {
      // host who writes the review
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

// One renter review per booking per host
renterReviewSchema.index({ booking: 1, host: 1 }, { unique: true });

const RenterReview = mongoose.model('RenterReview', renterReviewSchema);
module.exports = RenterReview;

