// api/utils/cookieToken.js
const jwt = require('jsonwebtoken');

// Keep the response shape stable for the frontend.
// This intentionally returns a *subset* of the User document (never password).
function buildSafeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    picture: user.picture,

    // Hosting + verification
    role: user.role,
    wantsToHost: !!user.wantsToHost,
    hostProfile: user.hostProfile || {},
    isHostVerified: !!user.isHostVerified,
    hostVerificationStatus: user.hostVerificationStatus || 'not_submitted',
    hostVerificationNotes: user.hostVerificationNotes || '',
    hostVerificationFiles: Array.isArray(user.hostVerificationFiles)
      ? user.hostVerificationFiles
      : [],

    // Backward-compat aliases (old frontend prototypes)
    isVerifiedHost: !!user.isHostVerified,
    hostVerification: user.hostVerificationStatus || 'not_submitted',
  };
}

const cookieToken = (user, res) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd, // MUST be true for SameSite=None in production (HTTPS)
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    token,
    user: buildSafeUser(user),
  });
};

module.exports = cookieToken;
module.exports.buildSafeUser = buildSafeUser;

