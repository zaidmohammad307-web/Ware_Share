// api/routes/index.js
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const upload = multer({ dest: '/tmp' });

router.get('/', (req, res) => {
  res.status(200).json({ greeting: 'Hello from wareshare api' });
});

router.post('/upload-by-link', async (req, res) => {
  try {
    const { link } = req.body;
    let result = await cloudinary.uploader.upload(link, { folder: 'Airbnb/Places' });
    res.json(result.secure_url);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/upload', upload.array('photos', 100), async (req, res) => {
  try {
    let imageArray = [];
    for (let index = 0; index < req.files.length; index++) {
      let { path } = req.files[index];
      let result = await cloudinary.uploader.upload(path, { folder: 'Airbnb/Places' });
      imageArray.push(result.secure_url);
    }
    res.status(200).json(imageArray);
  } catch (error) {
    console.log('Error: ', error);
    res.status(500).json({ error, message: 'Internal server error' });
  }
});

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
