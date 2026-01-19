// api/routes/user.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: '/tmp' });

const { isLoggedIn, isAdmin } = require('../middlewares/user');

const {
  register,
  login,
  googleLogin,
  uploadPicture,
  updateUserDetails,
  submitHostVerification,
  updateHostSettings,
  getPendingHosts,
  adminVerifyHost,
} = require('../controllers/userController');

// AUTH
router.post('/register', register);
router.post('/login', login);
router.post('/google/login', googleLogin);

// PROFILE PICTURE
router.post('/upload-picture', upload.single('picture'), uploadPicture);

// UPDATE USER PROFILE (requires auth)
router.put('/update-user', isLoggedIn, updateUserDetails);

// HOST SETTINGS
router.put('/host/settings', isLoggedIn, updateHostSettings);

// HOST VERIFICATION (USER SIDE)
router.post(
  '/host/verify',
  isLoggedIn,
  upload.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'companyDocument', maxCount: 1 },
  ]),
  submitHostVerification
);

// ADMIN: GET PENDING HOSTS (admin enforced)
router.get('/admin/hosts/pending', isLoggedIn, isAdmin, getPendingHosts);

// ADMIN: APPROVE / REJECT HOST (admin enforced)
router.put('/admin/hosts/:userId/verify', isLoggedIn, isAdmin, adminVerifyHost);

// LOGOUT (inline handler to avoid undefined controller export issues)
router.get('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', null, {
    expires: new Date(0),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out',
  });
});

module.exports = router;
