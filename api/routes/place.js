// api/routes/place.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/user');

const {
  addPlace,
  getPlaces,
  updatePlace,
  singlePlace,
  userPlaces,
  searchPlaces,
  getPlacesByHost,
  deletePlace,
  updatePlaceStatus,
} = require('../controllers/placeController');

// ✅ Public: get all active places
router.route('/').get(getPlaces);

// ✅ Protected: add / edit / list my places
router.route('/add-places').post(isLoggedIn, addPlace);
router.route('/user-places').get(isLoggedIn, userPlaces);
router.route('/update-place').put(isLoggedIn, updatePlace);

// ✅ Public: search & list by host (MUST be before "/:id")
router.route('/search/:key').get(searchPlaces);
router.get('/host/:hostId', getPlacesByHost);

// ✅ Protected: toggle listing status (hide / show)
router
  .route('/:id/status')
  .patch(isLoggedIn, updatePlaceStatus);

// ✅ Get single place (public) + delete place (protected, owner only)
router
  .route('/:id')
  .get(singlePlace)
  .delete(isLoggedIn, deletePlace);

module.exports = router;

