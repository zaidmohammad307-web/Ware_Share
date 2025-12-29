require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectWithDB = require('./config/db');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const Booking = require('./models/Booking');
const Place = require('./models/Place');
const Message = require('./models/Message');

connectWithDB();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(cookieParser());

app.use(
  cookieSession({
    name: 'session',
    maxAge: process.env.COOKIE_TIME * 24 * 60 * 60 * 1000,
    keys: [process.env.SESSION_SECRET],
    secure: true,
    sameSite: 'none',
    httpOnly: true,
  })
);

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use('/', require('./routes'));

// -----------------------------
// Socket.IO (Live Chat)
// -----------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// Rooms
const bookingRoom = (bookingId) => `booking:${bookingId}`;
const placeRoom = (placeId, renterId) => `place:${placeId}:renter:${renterId}`;

// Token from cookie "token" OR from socket auth { token }
io.use((socket, next) => {
  try {
    const authToken = socket.handshake.auth && socket.handshake.auth.token;
    const cookieHeader =
      socket.handshake.headers && socket.handshake.headers.cookie;

    let token = authToken || null;

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (match && match[1]) token = decodeURIComponent(match[1]);
    }

    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret'
    );
    socket.userId = decoded.id;

    next();
  } catch (e) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  // -----------------------------
  // Booking chat
  // -----------------------------
  socket.on('join_booking', async ({ bookingId }) => {
    try {
      if (!bookingId) return;

      const booking = await Booking.findById(bookingId).populate('place');
      if (!booking || !booking.place) return;

      const isRenter = String(booking.user) === String(socket.userId);
      const isHost = String(booking.place.owner) === String(socket.userId);
      if (!isRenter && !isHost) return;

      socket.join(bookingRoom(bookingId));
    } catch (e) {
      console.error('join_booking error:', e);
    }
  });

  socket.on('send_message', async ({ bookingId, text }) => {
    try {
      if (!bookingId || !text || !text.trim()) return;

      const booking = await Booking.findById(bookingId).populate('place');
      if (!booking || !booking.place) return;

      const isRenter = String(booking.user) === String(socket.userId);
      const isHost = String(booking.place.owner) === String(socket.userId);
      if (!isRenter && !isHost) return;

      const msg = await Message.create({
        booking: booking._id,
        place: booking.place._id,
        renter: booking.user,
        host: booking.place.owner,
        sender: socket.userId,
        text: text.trim(),
      });

      const populated = await msg.populate('sender', 'name');
      io.to(bookingRoom(bookingId)).emit('new_message', populated);
    } catch (e) {
      console.error('send_message error:', e);
    }
  });

  // -----------------------------
  // Place inquiry chat (pre-booking)
  // -----------------------------
  socket.on('join_place', async ({ placeId, renterId }) => {
    try {
      if (!placeId) return;

      const place = await Place.findById(placeId);
      if (!place) return;

      const me = String(socket.userId);
      const isHost = String(place.owner) === me;

      // If host: must provide renterId
      let renterToUse = me;
      if (isHost) {
        if (!renterId) return;
        renterToUse = String(renterId);
      }

      socket.join(placeRoom(placeId, renterToUse));
    } catch (e) {
      console.error('join_place error:', e);
    }
  });

  socket.on('send_place_message', async ({ placeId, renterId, text }) => {
    try {
      if (!placeId || !text || !text.trim()) return;

      const place = await Place.findById(placeId);
      if (!place) return;

      const me = String(socket.userId);
      const isHost = String(place.owner) === me;

      // Decide renter thread
      let renterToUse = me;
      if (isHost) {
        if (!renterId) return;
        renterToUse = String(renterId);
      }

      const msg = await Message.create({
        booking: null,
        place: place._id,
        renter: renterToUse,
        host: place.owner,
        sender: socket.userId,
        text: text.trim(),
      });

      const populated = await msg.populate('sender', 'name');

      // ✅ IMPORTANT: emit SAME event name the client listens to
      io.to(placeRoom(placeId, renterToUse)).emit('new_message', populated);
    } catch (e) {
      console.error('send_place_message error:', e);
    }
  });
});

server.listen(process.env.PORT || 8000, (err) => {
  if (err) console.log('Error in connecting to server: ', err);
  console.log(`Server is running on port no. ${process.env.PORT}`);
});

module.exports = app;
