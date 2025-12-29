// api/utils/cookieToken.js
const jwt = require('jsonwebtoken');

const cookieToken = (user, res) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || 'your_jwt_secret',
    {
      expiresIn: '7d',
    }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: false,   // true in production with HTTPS
    sameSite: 'lax', // 'none' if cross-site with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      hostVerification: user.hostVerification,
      isVerifiedHost: user.isVerifiedHost,
    },
  });
};

module.exports = cookieToken;
