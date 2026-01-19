// api/middlewares/user.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Simple "must be logged in" check
exports.isLoggedIn = async (req, res, next) => {
  try {
    let token = null;

    // 1) From Authorization header: "Bearer xxx"
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2) Or from cookie "token"
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not logged in: no token provided.',
      });
    }

    // Decode token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret'
    );

    // Load user from DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found for this token.',
      });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    // Token expiry is a normal event; avoid noisy stack traces in production logs.
    if (err && err.name === 'TokenExpiredError') {
      const isProd = process.env.NODE_ENV === 'production';

      // Clear cookie token so the browser stops re-sending an expired token.
      res.cookie('token', null, {
        expires: new Date(0),
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
      });

      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token expired. Please login again.',
        expiredAt: err.expiredAt,
      });
    }

    // Invalid token / signature / malformed
    const reason = err?.name || err?.message || 'UnknownError';
    console.warn(`isLoggedIn rejected request (${reason})`);

    return res.status(401).json({
      success: false,
      code: 'TOKEN_INVALID',
      message: 'Invalid token. Please login again.',
    });
  }
};

// ✅ Admin-only middleware (identified ONLY by email)
exports.isAdmin = (req, res, next) => {
  try {
    const email = (req.user?.email || '').toLowerCase();
    if (email !== 'admin@123456') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: admin access required.',
      });
    }

    return next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: admin access required.',
    });
  }
};
