// api/routes/index.js
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs/promises');
const { isLoggedIn } = require('../middlewares/user');

// ── FILE UPLOAD CONFIG (secure) ──
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  dest: '/tmp',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 10,                  // max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Only JPEG, PNG, and WebP are accepted.`));
    }
  },
});

router.get('/', (req, res) => {
  res.status(200).json({ greeting: 'Hello from wareshare api' });
});

// ── UPLOAD BY LINK (protected) ──
router.post('/upload-by-link', isLoggedIn, async (req, res) => {
  try {
    const { link } = req.body;

    if (!link || typeof link !== 'string') {
      return res.status(400).json({ message: 'A valid image URL is required' });
    }

    // Basic URL validation
    try {
      const parsed = new URL(link);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ message: 'Only HTTP/HTTPS URLs are allowed' });
      }
    } catch (_) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    const result = await cloudinary.uploader.upload(link, {
      folder: 'Airbnb/Places',
      resource_type: 'image',
    });

    res.json(result.secure_url);
  } catch (error) {
    console.error('upload-by-link error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── UPLOAD FILES (protected, validated) ──
router.post('/upload', isLoggedIn, upload.array('photos', 10), async (req, res) => {
  const uploadedPaths = [];
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const imageArray = [];
    for (const file of req.files) {
      uploadedPaths.push(file.path);
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'Airbnb/Places',
        resource_type: 'image',
      });
      imageArray.push(result.secure_url);
    }

    res.status(200).json(imageArray);
  } catch (error) {
    console.error('upload error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    // Clean up temp files
    for (const p of uploadedPaths) {
      try { await fs.unlink(p); } catch (_) { /* ignore */ }
    }
  }
});

router.use('/', require('./support'));
router.use('/users', require('./user'));
router.use('/places', require('./place'));
router.use('/bookings', require('./booking'));
router.use('/reviews', require('./review'));
router.use('/chat', require('./chat'));

// Geocoding (Nominatim proxy)
router.use('/geo', require('./geo'));

// Dashboards
router.use('/dashboard', require('./dashboard'));
router.use('/admin/dashboard', require('./adminDashboard'));

module.exports = router;
