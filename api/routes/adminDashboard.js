// api/routes/adminDashboard.js
const express = require('express');
const router = express.Router();

const { isLoggedIn, isAdmin } = require('../middlewares/user');
const {
  getSummary,
  getBookings,
  getUtilization,
  getRisk,
} = require('../controllers/adminDashboardController');

router.get('/summary', isLoggedIn, isAdmin, getSummary);
router.get('/bookings', isLoggedIn, isAdmin, getBookings);
router.get('/utilization', isLoggedIn, isAdmin, getUtilization);
router.get('/risk', isLoggedIn, isAdmin, getRisk);

module.exports = router;

