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
    console.error('isLoggedIn error:', err);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// ✅ Admin-only middleware (identified ONLY by email)
// Admin user is identified ONLY by email: "admin@123456"
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
