// api/routes/support.js
const express = require('express');
const router = express.Router();
const { isLoggedIn, isAdmin } = require('../middlewares/user');

const {
  joinWaitlist,
  listWaitlist,
  reportIssue,
  listTickets,
  updateTicket,
} = require('../controllers/supportController');

// Public: join the launch waitlist
router.post('/waitlist', joinWaitlist);

// Admin: view collected waitlist signups
router.get('/waitlist', isLoggedIn, isAdmin, listWaitlist);

// Public: report an issue (works logged in or anonymous)
router.post('/support/report', reportIssue);

// Admin: view + manage submitted requests
router.get('/support/tickets', isLoggedIn, isAdmin, listTickets);
router.patch('/support/tickets/:id', isLoggedIn, isAdmin, updateTicket);

module.exports = router;
