// api/models/PlaceReview.js
const mongoose = require('mongoose');

const placeReviewSchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    user: {
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

// one place review per booking per user
placeReviewSchema.index({ booking: 1, user: 1 }, { unique: true });

const PlaceReview = mongoose.model('PlaceReview', placeReviewSchema);
module.exports = PlaceReview;
