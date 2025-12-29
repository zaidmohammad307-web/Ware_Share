// api/routes/user.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: '/tmp' });

const { isLoggedIn } = require('../middlewares/user');

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

// UPDATE USER PROFILE
router.put('/update-user', updateUserDetails);

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

// ADMIN: GET PENDING HOSTS
// For now: only must be logged in
router.get('/admin/hosts/pending', isLoggedIn, getPendingHosts);

// ADMIN: APPROVE / REJECT HOST
router.put('/admin/hosts/:userId/verify', isLoggedIn, adminVerifyHost);

// LOGOUT
router.get('/logout', logout);

module.exports = router;
