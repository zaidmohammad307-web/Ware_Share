// api/controllers/reviewController.js
const Booking = require('../models/Booking');
const PlaceReview = require('../models/PlaceReview');
const HostReview = require('../models/HostReview');
const RenterReview = require('../models/RenterReview');

/**
 * PLACE REVIEWS – RENTER -> WAREHOUSE
 * Also auto-creates HOST REVIEW (Renter -> Host) so HostProfile shows reviews
 */
exports.createPlaceReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'bookingId and rating are required',
      });
    }

    const booking = await Booking.findById(bookingId).populate('place');
    if (!booking || !booking.place) {
      return res
        .status(404)
        .json({ success: false, message: 'Booking not found' });
    }

    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can review only after the booking is completed',
      });
    }

    const existingPlace = await PlaceReview.findOne({
      booking: bookingId,
      user: userId,
    });

    if (existingPlace) {
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this warehouse for this booking',
      });
    }

    const placeReview = await PlaceReview.create({
      place: booking.place._id,
      booking: booking._id,
      user: userId,
      rating,
      comment,
    });

    // Auto-create HostReview (same rating/comment) if not exists
    const hostId = booking.place.owner;
    const existingHost = await HostReview.findOne({
      booking: bookingId,
      reviewer: userId,
    });

    if (!existingHost) {
      await HostReview.create({
        host: hostId,
        booking: booking._id,
        reviewer: userId,
        rating,
        comment,
      });
    }

    await placeReview.populate('user', 'name');

    return res.status(201).json({
      success: true,
      review: placeReview,
      hostReviewCreated: !existingHost,
    });
  } catch (err) {
    console.error('createPlaceReview error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating place review',
      error: err.message,
    });
  }
};

exports.getPlaceReviews = async (req, res) => {
  try {
    const { placeId } = req.params;
    const reviews = await PlaceReview.find({ place: placeId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reviews });
  } catch (err) {
    console.error('getPlaceReviews error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching place reviews',
      error: err.message,
    });
  }
};

/**
 * HOST REVIEWS – RENTER -> HOST
 */
exports.createHostReview = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'bookingId and rating are required',
      });
    }

    const booking = await Booking.findById(bookingId).populate('place');
    if (!booking || !booking.place) {
      return res
        .status(404)
        .json({ success: false, message: 'Booking not found' });
    }

    if (String(booking.user) !== String(reviewerId)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can review only after the booking is completed',
      });
    }

    const hostId = booking.place.owner;
    const existing = await HostReview.findOne({
      booking: bookingId,
      reviewer: reviewerId,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this host for this booking',
      });
    }

    const review = await HostReview.create({
      host: hostId,
      booking: booking._id,
      reviewer: reviewerId,
      rating,
      comment,
    });

    await review.populate([
      { path: 'reviewer', select: 'name' },
      {
        path: 'host',
        select:
          'name picture hostProfile hostVerificationStatus isHostVerified createdAt',
      },
    ]);

    return res.status(201).json({ success: true, review });
  } catch (err) {
    console.error('createHostReview error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating host review',
      error: err.message,
    });
  }
};

exports.getHostReviews = async (req, res) => {
  try {
    const { hostId } = req.params;
    const reviews = await HostReview.find({ host: hostId })
      .populate('reviewer', 'name')
      .populate(
        'host',
        'name picture hostProfile hostVerificationStatus isHostVerified createdAt'
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reviews });
  } catch (err) {
    console.error('getHostReviews error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching host reviews',
      error: err.message,
    });
  }
};

/**
 * RENTER REVIEWS – HOST -> RENTER
 * ✅ FIX: correct populate usage (no chaining .populate().populate() on a promise)
 */
exports.createRenterReview = async (req, res) => {
  try {
    const hostId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'bookingId and rating are required',
      });
    }

    const booking = await Booking.findById(bookingId).populate('place');
    if (!booking || !booking.place) {
      return res
        .status(404)
        .json({ success: false, message: 'Booking not found' });
    }

    if (String(booking.place.owner) !== String(hostId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to review this renter',
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can review the renter only after the booking is completed',
      });
    }

    const existing = await RenterReview.findOne({
      booking: bookingId,
      host: hostId,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this renter for this booking',
      });
    }

    const review = await RenterReview.create({
      renter: booking.user,
      booking: booking._id,
      host: hostId,
      rating,
      comment,
    });

    await review.populate([
      { path: 'host', select: 'name' },
      { path: 'renter', select: 'name' },
    ]);

    return res.status(201).json({
      success: true,
      review,
    });
  } catch (err) {
    console.error('createRenterReview error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating renter review',
      error: err.message,
    });
  }
};

exports.getRenterReviews = async (req, res) => {
  try {
    const { renterId } = req.params;

    if (!renterId || renterId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'renterId is required',
      });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(renterId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid renterId',
      });
    }

    const reviews = await RenterReview.find({ renter: renterId })
      .populate('host', 'name')
      .populate('renter', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reviews });
  } catch (err) {
    console.error('getRenterReviews error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching renter reviews',
      error: err.message,
    });
  }
};
