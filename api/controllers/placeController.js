// api/controllers/placeController.js
const mongoose = require('mongoose');
const Place = require('../models/Place');
const Booking = require('../models/Booking');
const HostReview = require('../models/HostReview');
const User = require('../models/User');

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

const sanitizePlaceInput = (input) => {
  const out = { ...(input || {}) };

  // Prevent privilege/ownership tampering + immutable fields
  delete out.owner;
  delete out._id;
  delete out.__v;
  delete out.createdAt;
  delete out.updatedAt;

  return out;
};

const getHostFlags = async (userId, reqUser) => {
  // Prefer DB truth; use req.user as fallback if DB read fails
  try {
    const u = await User.findById(userId).select(
      'wantsToHost isHostVerified hostVerificationStatus'
    );

    if (!u) {
      return {
        wantsToHost: !!reqUser?.wantsToHost,
        isHostVerified:
          !!reqUser?.isHostVerified || reqUser?.hostVerificationStatus === 'approved',
        hostVerificationStatus: reqUser?.hostVerificationStatus || 'not_submitted',
      };
    }

    const wantsToHost = !!u.wantsToHost;
    const hostVerificationStatus = u.hostVerificationStatus || 'not_submitted';
    const isHostVerified = !!u.isHostVerified || hostVerificationStatus === 'approved';

    return { wantsToHost, isHostVerified, hostVerificationStatus };
  } catch (_) {
    return {
      wantsToHost: !!reqUser?.wantsToHost,
      isHostVerified:
        !!reqUser?.isHostVerified || reqUser?.hostVerificationStatus === 'approved',
      hostVerificationStatus: reqUser?.hostVerificationStatus || 'not_submitted',
    };
  }
};

/* ----------------------------------------
   â ADD PLACE
---------------------------------------- */
exports.addPlace = async (req, res) => {
  try {
    const userData = req.user;

    if (!userData || !userData.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { wantsToHost, isHostVerified } = await getHostFlags(
      userData.id,
      userData
    );

    if (!wantsToHost) {
      return res.status(403).json({
        success: false,
        code: 'HOSTING_NOT_ENABLED',
        message: 'Enable hosting in your profile before creating a listing.',
      });
    }

    // We expect addedPhotos + all other fields from formData
    const { addedPhotos, ...rawRest } = req.body;
    const rest = sanitizePlaceInput(rawRest);

    // Canonicalize GPS if possible (prevents swapped lat/lng and URL-only inputs)
    if (typeof rest.gps === 'string' && rest.gps.trim()) {
      const parsed = parseGpsFlexible(rest.gps);
      if (parsed) rest.gps = formatGps(parsed);
    }

    // Enforce publishing policy:
    // - Unverified hosts can create listing but it will always be hidden
    // - Verified hosts can choose live/hidden; if omitted, schema default applies
    if (!isHostVerified) {
      rest.status = 'hidden';
    } else if (rest.status && rest.status !== 'live' && rest.status !== 'hidden') {
      delete rest.status;
    }

    const place = await Place.create({
      ...rest,
      owner: userData.id,
      photos: addedPhotos || [],
    });

    return res.status(200).json({ place });
  } catch (err) {
    console.error('addPlace error:', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err,
    });
  }
};

/* ----------------------------------------
   ð USER PLACES (all, live + hidden)
---------------------------------------- */
exports.userPlaces = async (req, res) => {
  try {
    const userData = req.user;
    const id = userData.id;
    const places = await Place.find({ owner: id });
    return res.status(200).json(places);
  } catch (err) {
    console.error('userPlaces error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ----------------------------------------
   âï¸ UPDATE PLACE
---------------------------------------- */
exports.updatePlace = async (req, res) => {
  try {
    const userData = req.user;
    const userId = userData.id;

    const { id, addedPhotos, ...rawRest } = req.body;
    const rest = sanitizePlaceInput(rawRest);

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

    // Prevent publishing bypass through update-place
    if (rest.status === 'live') {
      const { wantsToHost, isHostVerified } = await getHostFlags(userId, userData);

      if (!wantsToHost) {
        rest.status = 'hidden';
      } else if (!isHostVerified) {
        rest.status = 'hidden';
      }
    } else if (rest.status && rest.status !== 'hidden') {
      // Only allow explicit 'hidden' here; 'live' handled above; anything else removed
      delete rest.status;
    }

    place.set({
      ...rest,
      photos: addedPhotos || place.photos,
    });

    await place.save();
    return res.status(200).json({
      message: 'place updated!',
    });
  } catch (err) {
    console.error('updatePlace error:', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err,
    });
  }
};

/* ----------------------------------------
   ð PUBLIC PLACES (only LIVE / no-status)
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

    return res.status(200).json({
      places,
    });
  } catch (err) {
    console.error('getPlaces error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ----------------------------------------
   ð SINGLE PLACE (with host rating)
---------------------------------------- */
exports.singlePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const place = await Place.findById(id);

    if (!place) {
      return res.status(404).json({
        message: 'Place not found',
      });
    }

    // Prevent public access to hidden listings
    if (place.status === 'hidden') {
      return res.status(404).json({
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

    return res.status(200).json({
      place: placeObj,
    });
  } catch (err) {
    console.error('singlePlace error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ----------------------------------------
   ð SEARCH PLACES (only LIVE / no-status)
---------------------------------------- */
exports.searchPlaces = async (req, res) => {
  try {
    const searchword = req.params.key;

    const statusFilter = {
      $or: [{ status: 'live' }, { status: { $exists: false } }],
    };

    // If empty search â return all live places
    if (!searchword || searchword.trim() === '') {
      const places = await Place.find(statusFilter);
      return res.status(200).json(places);
    }

    // Escape regex special characters to prevent ReDoS
    const escaped = searchword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const searchMatches = await Place.find({
      ...statusFilter,
      address: { $regex: escaped, $options: 'i' },
    });

    return res.status(200).json(searchMatches);
  } catch (err) {
    console.error('searchPlaces error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ----------------------------------------
   ð§âð¼ PLACES BY HOST (PUBLIC: only LIVE / no-status)
---------------------------------------- */
exports.getPlacesByHost = async (req, res) => {
  try {
    const { hostId } = req.params;

    const places = await Place.find({
      owner: hostId,
      $or: [{ status: 'live' }, { status: { $exists: false } }],
    })
      .populate(
        'owner',
        'name picture hostProfile hostVerificationStatus isHostVerified role createdAt'
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      places,
    });
  } catch (err) {
    console.error('getPlacesByHost error:', err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching host's places",
      error: err.message,
    });
  }
};

/* ----------------------------------------
   ð TOGGLE PLACE STATUS (live / hidden)
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

    // Toggle status on the server â ignore body for simplicity
    const current = place.status || 'live';
    const next = current === 'hidden' ? 'live' : 'hidden';

    // Publishing gate: only verified hosts can set listings live
    if (next === 'live') {
      const { wantsToHost, isHostVerified } = await getHostFlags(userId, req.user);

      if (!wantsToHost) {
        return res.status(403).json({
          success: false,
          code: 'HOSTING_NOT_ENABLED',
          message: 'Enable hosting in your profile before publishing listings.',
        });
      }

      if (!isHostVerified) {
        return res.status(403).json({
          success: false,
          code: 'HOST_NOT_VERIFIED',
          message:
            'Your host verification must be approved before you can publish a live listing.',
        });
      }
    }

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
   ðï¸ DELETE PLACE
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

/* ----------------------------------------
   📅 BLOCKED DATES (owner only)
---------------------------------------- */
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

exports.getBlockedDates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const place = await Place.findById(id).select('title owner blockedDates');
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    if (String(place.owner) !== String(userId)) {
      return res.status(403).json({ message: 'Not your listing' });
    }

    // Dates already taken by bookings (owner cannot unblock these)
    const bookings = await Booking.find({
      place: id,
      status: { $in: ['approved', 'pending'] },
    }).select('checkIn checkOut');

    const bookedSet = new Set();
    bookings.forEach((b) => {
      if (!b.checkIn || !b.checkOut) return;
      let cur = new Date(b.checkIn);
      const end = new Date(b.checkOut);
      while (cur < end) {
        const y = cur.getUTCFullYear();
        const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
        const d = String(cur.getUTCDate()).padStart(2, '0');
        bookedSet.add(`${y}-${m}-${d}`);
        cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
      }
    });

    return res.status(200).json({
      success: true,
      title: place.title,
      blockedDates: place.blockedDates || [],
      bookedDates: Array.from(bookedSet),
    });
  } catch (err) {
    console.error('getBlockedDates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateBlockedDates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { dates } = req.body;

    if (!Array.isArray(dates)) {
      return res.status(400).json({ message: 'dates must be an array' });
    }

    const clean = [...new Set(dates.filter((d) => YMD_RE.test(String(d))))].sort();

    if (clean.length > 730) {
      return res.status(400).json({ message: 'Too many blocked dates (max 730)' });
    }

    const place = await Place.findById(id).select('owner');
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    if (String(place.owner) !== String(userId)) {
      return res.status(403).json({ message: 'Not your listing' });
    }

    place.blockedDates = clean;
    await place.save();

    return res.status(200).json({ success: true, blockedDates: clean });
  } catch (err) {
    console.error('updateBlockedDates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
