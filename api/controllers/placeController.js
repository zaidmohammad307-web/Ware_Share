// api/controllers/placeController.js
const mongoose = require('mongoose');
const Place = require('../models/Place');
const HostReview = require('../models/HostReview');

const isValidLatLng = (lat, lng) =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

// Accepts:
// - "lat,lng" / "lat lng"
// - Google Maps URLs with "@lat,lng" or "q=lat,lng" / "query=lat,lng"
// - Swapped values (auto-detect)
const parseGpsFlexible = (input) => {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  const atMatch = s.match(
    /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/
  );
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const qMatch = s.match(
    /(?:\?|&)\s*(?:q|query)=\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i
  );
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const basic = s.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (!basic) return null;
  const a = parseFloat(basic[1]);
  const b = parseFloat(basic[2]);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (isValidLatLng(a, b)) return { lat: a, lng: b };
  if (isValidLatLng(b, a)) return { lat: b, lng: a };
  return null;
};

const formatGps = ({ lat, lng }) =>
  `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;

/* ----------------------------------------
   ➕ ADD PLACE
---------------------------------------- */
exports.addPlace = async (req, res) => {
  try {
    const userData = req.user;

    // We expect addedPhotos + all other fields from formData
    const { addedPhotos, ...rest } = req.body;

    // Canonicalize GPS if possible (prevents swapped lat/lng and URL-only inputs)
    if (typeof rest.gps === 'string' && rest.gps.trim()) {
      const parsed = parseGpsFlexible(rest.gps);
      if (parsed) rest.gps = formatGps(parsed);
    }

    const place = await Place.create({
      owner: userData.id,
      photos: addedPhotos || [],
      ...rest,
    });

    res.status(200).json({ place });
  } catch (err) {
    console.error('addPlace error:', err);
    res.status(500).json({
      message: 'Internal server error',
      error: err,
    });
  }
};

/* ----------------------------------------
   🙋 USER PLACES (all, live + hidden)
---------------------------------------- */
exports.userPlaces = async (req, res) => {
  try {
    const userData = req.user;
    const id = userData.id;
    const places = await Place.find({ owner: id });
    res.status(200).json(places);
  } catch (err) {
    console.error('userPlaces error:', err);
    res.status(500).json({
      message: 'Internal serever error',
    });
  }
};

/* ----------------------------------------
   ✏️ UPDATE PLACE
---------------------------------------- */
exports.updatePlace = async (req, res) => {
  try {
    const userData = req.user;
    const userId = userData.id;

    const { id, addedPhotos, ...rest } = req.body;

    // Canonicalize GPS if possible (prevents swapped lat/lng and URL-only inputs)
    if (typeof rest.gps === 'string' && rest.gps.trim()) {
      const parsed = parseGpsFlexible(rest.gps);
      if (parsed) rest.gps = formatGps(parsed);
    }

    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    if (String(place.owner) !== String(userId)) {
      return res.status(403).json({
        message: 'Unauthorized to update this place',
      });
    }

    place.set({
      ...rest,
      photos: addedPhotos || place.photos,
    });

    await place.save();
    res.status(200).json({
      message: 'place updated!',
    });
  } catch (err) {
    console.error('updatePlace error:', err);
    res.status(500).json({
      message: 'Internal server error',
      error: err,
    });
  }
};

/* ----------------------------------------
   🌍 PUBLIC PLACES (only LIVE / no-status)
---------------------------------------- */
exports.getPlaces = async (req, res) => {
  try {
    // Only get places that are live OR have no status (old data)
    let places = await Place.find({
      $or: [{ status: 'live' }, { status: { $exists: false } }],
    }).lean();

    const ownerIds = [
      ...new Set(
        places
          .map((p) => (p.owner ? p.owner.toString() : null))
          .filter(Boolean)
      ),
    ];

    let ratingsMap = {};

    if (ownerIds.length > 0) {
      const ownerObjectIds = ownerIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const agg = await HostReview.aggregate([
        { $match: { host: { $in: ownerObjectIds } } },
        {
          $group: {
            _id: '$host',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]);

      ratingsMap = agg.reduce((acc, r) => {
        acc[r._id.toString()] = {
          avgRating: parseFloat(r.avgRating.toFixed(1)),
          count: r.count,
        };
        return acc;
      }, {});
    }

    // Attach hostRating + hostRatingCount on each place
    places = places.map((p) => {
      const ownerId = p.owner ? p.owner.toString() : null;
      const ratingInfo = ownerId ? ratingsMap[ownerId] : null;

      return {
        ...p,
        hostRating: ratingInfo ? ratingInfo.avgRating : null,
        hostRatingCount: ratingInfo ? ratingInfo.count : 0,
      };
    });

    res.status(200).json({
      places,
    });
  } catch (err) {
    console.error('getPlaces error:', err);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ----------------------------------------
   🔍 SINGLE PLACE (with host rating)
---------------------------------------- */
exports.singlePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const place = await Place.findById(id);

    if (!place) {
      return res.status(400).json({
        message: 'Place not found',
      });
    }

    const hostId = place.owner;
    let hostRating = null;
    let hostRatingCount = 0;

    if (hostId) {
      const agg = await HostReview.aggregate([
        { $match: { host: new mongoose.Types.ObjectId(hostId) } },
        {
          $group: {
            _id: '$host',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]);

      if (agg.length > 0) {
        hostRating = parseFloat(agg[0].avgRating.toFixed(1));
        hostRatingCount = agg[0].count;
      }
    }

    const placeObj = place.toObject();
    placeObj.hostRating = hostRating;
    placeObj.hostRatingCount = hostRatingCount;

    res.status(200).json({
      place: placeObj,
    });
  } catch (err) {
    console.error('singlePlace error:', err);
    res.status(500).json({
      message: 'Internal serever error',
    });
  }
};

/* ----------------------------------------
   🔍 SEARCH PLACES (only LIVE / no-status)
---------------------------------------- */
exports.searchPlaces = async (req, res) => {
  try {
    const searchword = req.params.key;

    const statusFilter = {
      $or: [{ status: 'live' }, { status: { $exists: false } }],
    };

    // If empty search → return all live places
    if (!searchword || searchword.trim() === '') {
      const places = await Place.find(statusFilter);
      return res.status(200).json(places);
    }

    const searchMatches = await Place.find({
      ...statusFilter,
      address: { $regex: searchword, $options: 'i' },
    });

    res.status(200).json(searchMatches);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: 'Internal serever error 1',
    });
  }
};

/* ----------------------------------------
   🧑‍💼 PLACES BY HOST (all statuses)
---------------------------------------- */
exports.getPlacesByHost = async (req, res) => {
  try {
    const { hostId } = req.params;

    const places = await Place.find({ owner: hostId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      places,
    });
  } catch (err) {
    console.error('getPlacesByHost error:', err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching host's places",
      error: err.message,
    });
  }
};

/* ----------------------------------------
   🔄 TOGGLE PLACE STATUS (live / hidden)
---------------------------------------- */
exports.updatePlaceStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    if (String(place.owner) !== String(userId)) {
      return res.status(403).json({
        message: 'Unauthorized to change status of this place',
      });
    }

    // Toggle status on the server – ignore body for simplicity
    const current = place.status || 'live';
    const next = current === 'hidden' ? 'live' : 'hidden';

    place.status = next;
    await place.save();

    return res.status(200).json({
      success: true,
      status: next,
    });
  } catch (err) {
    console.error('updatePlaceStatus error:', err);
    return res.status(500).json({
      message: 'Internal server error while updating place status',
      error: err.message,
    });
  }
};

/* ----------------------------------------
   🗑️ DELETE PLACE
---------------------------------------- */
exports.deletePlace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    if (String(place.owner) !== String(userId)) {
      return res.status(403).json({
        message: 'Unauthorized to delete this place',
      });
    }

    await place.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Place deleted successfully',
    });
  } catch (err) {
    console.error('deletePlace error:', err);
    return res.status(500).json({
      message: 'Internal server error while deleting place',
      error: err.message,
    });
  }
};
