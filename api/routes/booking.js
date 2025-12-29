// api/routes/booking.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/user');

const {
  createBookings,
  getBookings,
  getBookingById,
  getOwnerBookings,
  updateBookingStatus,
  getPlaceAvailability,
  getInsuranceConfig,
  updateBookingPayment,
} = require('../controllers/bookingController');

/* ----------------------------------------------------
   🧾 PUBLIC — INSURANCE CONSTANTS (for frontend preview)
   ---------------------------------------------------- */
router.get('/insurance-config', getInsuranceConfig);

/* ----------------------------------------------------
   📅 PUBLIC — GET PLACE AVAILABILITY
   ---------------------------------------------------- */
// Must be ABOVE "/:id" so it doesn't confuse placeId with bookingId
router.get('/availability/:placeId', getPlaceAvailability);

/* ----------------------------------------------------
   👤 RENTER — Own bookings
   ---------------------------------------------------- */
router.get('/', isLoggedIn, getBookings); // list renter bookings
router.post('/', isLoggedIn, createBookings); // create booking request

/* ----------------------------------------------------
   🏭 OWNER — Bookings for all warehouses they own
   ---------------------------------------------------- */
// IMPORTANT: must be placed BEFORE "/:id"
router.get('/owner', isLoggedIn, getOwnerBookings);

/* ----------------------------------------------------
   👤 RENTER — Get a single booking
   ---------------------------------------------------- */
router.get('/:id', isLoggedIn, getBookingById);

/* ----------------------------------------------------
   🧾 RENTER — Dummy payment update
   ---------------------------------------------------- */
router.put('/:id/payment', isLoggedIn, updateBookingPayment);

/* ----------------------------------------------------
   🏭 OWNER — Update booking status (approve / decline / completed)
   ---------------------------------------------------- */
router.put('/:id/status', isLoggedIn, updateBookingStatus);

module.exports = router;
