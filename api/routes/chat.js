// api/routes/chat.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/user');

const { getBookingChat, getPlaceChat, getChatInbox } = require('../controllers/chatController');

router.get('/inbox', isLoggedIn, getChatInbox);
router.get('/booking/:bookingId', isLoggedIn, getBookingChat);
router.get('/place/:placeId', isLoggedIn, getPlaceChat);

module.exports = router;
