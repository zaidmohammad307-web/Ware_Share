// api/routes/dashboard.js
const express = require('express');
const router = express.Router();

const { isLoggedIn } = require('../middlewares/user');
const {
  getSummary,
  getRenterDashboard,
  getOwnerDashboard,
} = require('../controllers/dashboardController');

router.get('/summary', isLoggedIn, getSummary);
router.get('/renter', isLoggedIn, getRenterDashboard);
router.get('/owner', isLoggedIn, getOwnerDashboard);

module.exports = router;

