// api/routes/user.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: '/tmp' });

const { isLoggedIn, isAdmin } = require('../middlewares/user');

const {
  register,
  login,
  logout,
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
router.post('/upload-picture', upload.single('picture', 1), uploadPicture);

// UPDATE USER PROFILE (FIX: now requires auth)
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

// ADMIN: GET PENDING HOSTS (FIX: enforce admin)
router.get('/admin/hosts/pending', isLoggedIn, isAdmin, getPendingHosts);

// ADMIN: APPROVE / REJECT HOST (FIX: enforce admin)
router.put('/admin/hosts/:userId/verify', isLoggedIn, isAdmin, adminVerifyHost);

// LOGOUT
router.get('/logout', logout);

module.exports = router;
