const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Place = require('../models/Place');
const Message = require('../models/Message');

// -----------------------------
// Booking chat history
// -----------------------------
exports.getBookingChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingId' });
    }

    const booking = await Booking.findById(bookingId).populate('place');
    if (!booking || !booking.place) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const renterId = String(booking.user);
    const hostId = String(booking.place.owner);

    const isRenter = renterId === String(userId);
    const isHost = hostId === String(userId);
    if (!isRenter && !isHost) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const messages = await Message.find({ booking: booking._id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      messages,
      hostId,
      renterId,
      placeId: String(booking.place._id),
      bookingId: String(booking._id),
    });
  } catch (err) {
    console.error('getBookingChat error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// -----------------------------
// Place inquiry chat history (pre-booking)
// If host -> can view any renter thread, must pass renterId as query param (?renterId=xxx)
// If renter -> gets only their thread automatically
// -----------------------------
exports.getPlaceChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { placeId } = req.params;
    const { renterId: renterIdQuery } = req.query;

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ success: false, message: 'Invalid placeId' });
    }

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    const hostId = String(place.owner);
    const me = String(userId);
    const isHost = hostId === me;

    let renterIdToUse = me;
    if (isHost) {
      if (!renterIdQuery || renterIdQuery === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'Host must provide renterId as query param: /chat/place/:placeId?renterId=XXXX',
        });
      }
      if (!mongoose.Types.ObjectId.isValid(renterIdQuery)) {
        return res.status(400).json({ success: false, message: 'Invalid renterId' });
      }
      renterIdToUse = renterIdQuery;
    }

    const messages = await Message.find({
      booking: null,
      place: place._id,
      host: place.owner,
      renter: renterIdToUse,
    })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      messages,
      hostId,
      renterId: String(renterIdToUse),
      placeId: String(place._id),
    });
  } catch (err) {
    console.error('getPlaceChat error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// -----------------------------
// Inbox for BOTH host & renter
// -----------------------------
exports.getChatInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const threads = await Message.aggregate([
      {
        $match: {
          $or: [
            { host: new mongoose.Types.ObjectId(userId) },
            { renter: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $addFields: {
          type: {
            $cond: [{ $ifNull: ['$booking', false] }, 'booking', 'place'],
          },
          threadPlace: '$place',
          threadBooking: '$booking',
          threadRenter: '$renter',
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            type: '$type',
            place: '$threadPlace',
            booking: '$threadBooking',
            renter: '$threadRenter',
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 200 },
    ]);

    const placeIds = [];
    const bookingIds = [];

    threads.forEach((t) => {
      if (t._id.place) placeIds.push(t._id.place);
      if (t._id.booking) bookingIds.push(t._id.booking);
    });

    const places = await Place.find({ _id: { $in: placeIds } }).select('title owner photos address');
    const bookings = await Booking.find({ _id: { $in: bookingIds } }).select('place user status checkIn checkOut');

    const placesMap = new Map(places.map((p) => [String(p._id), p]));
    const bookingsMap = new Map(bookings.map((b) => [String(b._id), b]));

    const result = threads.map((t) => {
      const last = t.lastMessage;
      const place = t._id.place ? placesMap.get(String(t._id.place)) : null;
      const booking = t._id.booking ? bookingsMap.get(String(t._id.booking)) : null;

      return {
        type: t._id.type,
        placeId: t._id.place ? String(t._id.place) : null,
        bookingId: t._id.booking ? String(t._id.booking) : null,
        renterId: t._id.renter ? String(t._id.renter) : null,
        hostId: place?.owner ? String(place.owner) : null,
        place: place
          ? {
              _id: String(place._id),
              title: place.title,
              address: place.address,
              owner: String(place.owner),
              photo: Array.isArray(place.photos) && place.photos.length ? place.photos[0] : null,
            }
          : null,
        booking: booking
          ? {
              _id: String(booking._id),
              status: booking.status,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              place: booking.place ? String(booking.place) : null,
              user: booking.user ? String(booking.user) : null,
            }
          : null,
        lastMessage: {
          _id: String(last._id),
          text: last.text,
          sender: String(last.sender),
          createdAt: last.createdAt,
        },
      };
    });

    return res.status(200).json({ success: true, threads: result });
  } catch (err) {
    console.error('getChatInbox error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

