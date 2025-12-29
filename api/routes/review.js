// api/routes/review.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/user');

const {
  createPlaceReview,
  getPlaceReviews,
  createHostReview,
  getHostReviews,
  createRenterReview,
  getRenterReviews,
} = require('../controllers/reviewController');

// Warehouse (place) reviews – renter -> warehouse
router.post('/place', isLoggedIn, createPlaceReview);
router.get('/place/:placeId', getPlaceReviews);

// Host reviews – renter -> host
router.post('/host', isLoggedIn, createHostReview);
router.get('/host/:hostId', getHostReviews);

// Renter reviews – host -> renter
router.post('/renter', isLoggedIn, createRenterReview);
router.get('/renter/:renterId', getRenterReviews);

module.exports = router;
