// api/index.js
require('dotenv').config();

// ── ENV VALIDATION (crash early if misconfigured) ──
const REQUIRED_ENV = [
  'JWT_SECRET',
  'DB_URL',
  'CLOUDINARY_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SESSION_SECRET',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key] || !String(process.env[key]).trim()) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectWithDB = require('./config/db');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Booking = require('./models/Booking');
const Place = require('./models/Place');
const Message = require('./models/Message');

const isProd = process.env.NODE_ENV === 'production';

// -----------------------------
// CORS
// -----------------------------
const normalizeOrigin = (value) =>
  String(value || '').trim().replace(/\/+$/, '');

const allowedOrigins = (() => {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_URL || '';
  const list = String(raw)
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const renderExternalUrl = normalizeOrigin(process.env.RENDER_EXTERNAL_URL);
  if (renderExternalUrl) list.push(renderExternalUrl);

  if (!isProd) {
    list.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return Array.from(new Set(list));
})();

const corsOrigin = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (allowedOrigins.length === 0) return cb(null, true);

  const norm = normalizeOrigin(origin);
  const ok = allowedOrigins.includes(norm);

  if (!ok && process.env.CORS_DEBUG === 'true') {
    console.warn('Blocked CORS origin:', norm);
    console.warn('Allowed origins:', allowedOrigins);
  }

  return cb(null, ok);
};

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Render terminates TLS at its proxy; needed for correct req.ip / secure cookies
app.set('trust proxy', 1);

// ── SECURITY HEADERS ──
app.use(helmet());

app.use(cookieParser());

app.use(
  cookieSession({
    name: 'session',
    maxAge: (Number(process.env.COOKIE_TIME) || 7) * 24 * 60 * 60 * 1000,
    keys: [process.env.SESSION_SECRET],
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    httpOnly: true,
  })
);

// ── BODY SIZE LIMIT ──
app.use(express.json({ limit: '2mb' }));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── HEALTH CHECK (for Render / uptime monitors) ──
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    ok: dbState === 1,
    db: dbState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
});

// ── RATE LIMIT AUTH ENDPOINTS (brute-force protection) ──
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
});
app.use(['/users/login', '/users/register', '/users/google/login'], authLimiter);

// Public form endpoints (waitlist signup, issue reports)
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions. Please try again later.',
  },
});
app.use(['/waitlist', '/support/report'], formLimiter);

app.use('/', require('./routes'));

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
  });
});

// -----------------------------
// Socket.IO (Live Chat)
// -----------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
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
      process.env.JWT_SECRET
    );
    socket.userId = decoded.id;

    return next();
  } catch (e) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  // Booking chat
  socket.on('join_booking', async ({ bookingId }) => {
    try {
      if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;

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
      if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId) || !text || !text.trim()) return;

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

  // Place inquiry chat (pre-booking)
  socket.on('join_place', async ({ placeId, renterId }) => {
    try {
      if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) return;

      const place = await Place.findById(placeId);
      if (!place) return;

      const me = String(socket.userId);
      const isHost = String(place.owner) === me;

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

  socket.on('leave_booking', ({ bookingId }) => {
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      socket.leave(bookingRoom(bookingId));
    }
  });

  socket.on('leave_place', ({ placeId, renterId }) => {
    if (placeId && mongoose.Types.ObjectId.isValid(placeId)) {
      const me = String(socket.userId);
      const renterToUse = renterId ? String(renterId) : me;
      socket.leave(placeRoom(placeId, renterToUse));
    }
  });

  socket.on('send_place_message', async ({ placeId, renterId, text }) => {
    try {
      if (!placeId || !mongoose.Types.ObjectId.isValid(placeId) || !text || !text.trim()) return;

      const place = await Place.findById(placeId);
      if (!place) return;

      const me = String(socket.userId);
      const isHost = String(place.owner) === me;

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
      io.to(placeRoom(placeId, renterToUse)).emit('new_message', populated);
    } catch (e) {
      console.error('send_place_message error:', e);
    }
  });
});

const PORT = Number(process.env.PORT) || 8000;

(async () => {
  await connectWithDB();

  server.listen(PORT, (err) => {
    if (err) console.log('Error in connecting to server: ', err);
    console.log(`Server is running on port no. ${PORT}`);
  });
})();

// ── GRACEFUL ERROR HANDLING ──
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;

