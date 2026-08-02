// api/controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Place = require('../models/Place');
const User = require('../models/User');
const RenterReview = require('../models/RenterReview');
const { sendMail, emailWrap, escapeHtml } = require('../utils/mailer');

const {
  INSURANCE_CONSTANTS,
  computeInsuranceSnapshot,
  roundTo2: insuranceRoundTo2,
} = require('../config/insurance');

const {
  roundTo2,
  computePackingFee,
  computeDeliveryFee,
} = require('../config/packingDelivery');

/* Small helper: turn Date -> 'yyyy-MM-dd' in UTC */
function toYMDUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* Small helper: add 1 day in UTC */
function addOneDayUTC(date) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return !!v;
}

function safeTrim(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function daysBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return null;
  const MS_DAY = 24 * 60 * 60 * 1000;
  const days = Math.ceil(diffMs / MS_DAY);
  return Math.max(1, days);
}

// PUBLIC â insurance constants (for frontend pricing display)
exports.getInsuranceConfig = async (req, res) => {
  return res.status(200).json({
    success: true,
    constants: INSURANCE_CONSTANTS,
  });
};

// RENTER: create a booking REQUEST for a warehouse
exports.createBookings = async (req, res) => {
  try {
    const userData = req.user;

    const {
      place,
      checkIn,
      checkOut,
      noOfGuests,
      name,
      phone,

      // Insurance
      insuranceSelected,
      insuranceDeclaredValue,
      insuranceTier,

      // Packing
      packingSelected,
      packingType,
      packingUnitsType,
      packingUnitsCount,

      // Delivery
      deliverySelected,
      deliveryType,
      pickupCity,
      dropoffCity,
      pickupAddressText,
      dropoffAddressText,
      deliveryTimeWindow,
    } = req.body;

    if (!place || !checkIn || !checkOut || !noOfGuests || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking fields',
      });
    }

    const guests = Number(noOfGuests);
    if (!Number.isFinite(guests) || guests <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Units requested must be a positive number',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(place)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse id',
      });
    }

    const placeDoc = await Place.findById(place).select(
      'price pricePerDay city title owner blockedDates availableArea status'
    );
    if (!placeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Hidden listings must not be bookable — this is also what enforces the
    // host-verification gate, since unverified hosts' listings stay hidden.
    if (placeDoc.status === 'hidden') {
      return res.status(404).json({
        success: false,
        message: 'This warehouse is not currently available for booking.',
      });
    }

    const days = daysBetween(checkIn, checkOut);
    if (!days) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking dates',
      });
    }

    // Bookings in the past would permanently consume capacity for those days
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    if (new Date(checkIn) < todayUTC) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past',
      });
    }

    // ---- Capacity-aware availability ----
    // A warehouse with availableArea can be rented partially: multiple
    // bookings may overlap in time as long as their combined m² fits.
    // Places without availableArea keep the legacy whole-place behavior.
    const totalCapacity =
      Number.isFinite(Number(placeDoc.availableArea)) &&
      Number(placeDoc.availableArea) > 0
        ? Number(placeDoc.availableArea)
        : null;

    let requestedArea = null;
    if (
      req.body.areaM2 !== undefined &&
      req.body.areaM2 !== null &&
      req.body.areaM2 !== ''
    ) {
      requestedArea = Number(req.body.areaM2);
      if (!Number.isFinite(requestedArea) || requestedArea <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid space requested (areaM2 must be a positive number)',
        });
      }
      if (totalCapacity && requestedArea > totalCapacity) {
        return res.status(409).json({
          success: false,
          message: `This warehouse has ${totalCapacity} m² available in total. Please request ${totalCapacity} m² or less.`,
        });
      }
      // No capacity info on the place -> treat any request as full booking
      if (!totalCapacity) requestedArea = null;
      // Requesting the whole space is the same as a full booking
      if (totalCapacity && requestedArea >= totalCapacity) requestedArea = null;
    }

    const overlapping = await Booking.find({
      place,
      status: { $in: ['pending', 'approved'] },
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    }).select('checkIn checkOut areaM2');

    if (!totalCapacity) {
      // Legacy: whole-place bookings only
      if (overlapping.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            'Some of the selected dates are no longer available. Please pick different dates.',
        });
      }
    } else {
      const myArea = requestedArea ?? totalCapacity;

      // Walk the requested range day by day and check remaining capacity
      let cur = new Date(checkIn);
      const endDate = new Date(checkOut);
      while (cur < endDate) {
        const dayEnd = addOneDayUTC(cur);
        let used = 0;
        for (const b of overlapping) {
          if (new Date(b.checkIn) < dayEnd && new Date(b.checkOut) > cur) {
            // Bookings without areaM2 occupy the whole warehouse
            used += Number(b.areaM2) || totalCapacity;
          }
        }
        if (used + myArea > totalCapacity) {
          const remaining = Math.max(0, totalCapacity - used);
          return res.status(409).json({
            success: false,
            message:
              remaining > 0
                ? `Only ${remaining} m² is available on ${toYMDUTC(cur)}. Reduce the space requested or pick different dates.`
                : `The warehouse is fully booked on ${toYMDUTC(cur)}. Please pick different dates.`,
          });
        }
        cur = dayEnd;
      }
    }

    // Reject dates the host has blocked
    if (Array.isArray(placeDoc.blockedDates) && placeDoc.blockedDates.length) {
      const blocked = new Set(placeDoc.blockedDates);
      let cur = new Date(checkIn);
      const endDate = new Date(checkOut);
      while (cur < endDate) {
        if (blocked.has(toYMDUTC(cur))) {
          return res.status(409).json({
            success: false,
            message:
              'The host has blocked some of the selected dates. Please pick different dates.',
          });
        }
        cur = addOneDayUTC(cur);
      }
    }

    const perDay = Number(placeDoc.pricePerDay ?? placeDoc.price);
    if (!Number.isFinite(perDay) || perDay < 0) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse pricing is not configured correctly',
      });
    }

    // Partial bookings pay proportionally to the space they occupy
    const areaFraction =
      totalCapacity && requestedArea ? requestedArea / totalCapacity : 1;
    const baseBookingPrice = roundTo2(days * perDay * areaFraction);

    // ---- Insurance (server source of truth) ----
    const insuranceIsSelected = parseBool(insuranceSelected);
    let insuranceSnapshot;
    try {
      insuranceSnapshot = computeInsuranceSnapshot({
        insuranceSelected: insuranceIsSelected,
        declaredValue: insuranceDeclaredValue,
        tier: insuranceTier,
        startDate: checkIn,
        endDate: checkOut,
      });
    } catch (e) {
      const status = e.status || 400;
      return res.status(status).json({
        success: false,
        message: e.message || 'Invalid insurance data',
      });
    }

    // ---- Packing ----
    const packingIsSelected = parseBool(packingSelected);
    let packingPayload = {
      packingSelected: false,
      packingType: null,
      packingUnitsType: null,
      packingUnitsCount: null,
      packingFee: 0,
      packingStatus: 'none',
      packingRateUsed: 0,
      packingMinFeeUsed: 0,
    };

    if (packingIsSelected) {
      const pType = safeTrim(packingType);
      const pUnitsType = safeTrim(packingUnitsType);
      const pCount = Number(packingUnitsCount);

      if (!['basic', 'standard', 'fragile'].includes(pType || '')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid packingType',
        });
      }
      if (!['boxes', 'pallets'].includes(pUnitsType || '')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid packingUnitsType',
        });
      }
      if (!Number.isFinite(pCount) || pCount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid packingUnitsCount',
        });
      }

      const computedPacking = computePackingFee({
        packingSelected: true,
        packingType: pType,
        packingUnitsType: pUnitsType,
        packingUnitsCount: pCount,
      });

      packingPayload = {
        ...packingPayload,
        packingSelected: true,
        packingType: pType,
        packingUnitsType: pUnitsType,
        packingUnitsCount: pCount,
        packingFee: computedPacking.packingFee,
        packingStatus: computedPacking.packingStatus,
        packingRateUsed: computedPacking.packingRateUsed,
        packingMinFeeUsed: computedPacking.packingMinFeeUsed,
      };
    }

    // ---- Delivery ----
    const deliveryIsSelected = parseBool(deliverySelected);
    let deliveryPayload = {
      deliverySelected: false,
      deliveryType: null,
      pickupCity: null,
      dropoffCity: null,
      pickupAddressText: null,
      dropoffAddressText: null,
      deliveryTimeWindow: null,
      deliveryFee: 0,
      deliveryStatus: 'none',
      deliveryZoneUsed: null,
      deliveryBundleDiscountUsed: 0,
    };

    if (deliveryIsSelected) {
      const dType = safeTrim(deliveryType);
      if (
        !['pickup_to_warehouse', 'warehouse_to_dropoff', 'round_trip'].includes(
          dType || ''
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deliveryType',
        });
      }

      const warehouseCity = safeTrim(placeDoc.city);
      if (!warehouseCity) {
        return res.status(400).json({
          success: false,
          message: 'Warehouse city is required to calculate delivery fees',
        });
      }

      const pCity = safeTrim(pickupCity);
      const dCity = safeTrim(dropoffCity);

      if (dType === 'pickup_to_warehouse') {
        if (!pCity) {
          return res.status(400).json({
            success: false,
            message: 'pickupCity is required for pickup_to_warehouse',
          });
        }
      }

      if (dType === 'warehouse_to_dropoff') {
        if (!dCity) {
          return res.status(400).json({
            success: false,
            message: 'dropoffCity is required for warehouse_to_dropoff',
          });
        }
      }

      if (dType === 'round_trip') {
        if (!pCity || !dCity) {
          return res.status(400).json({
            success: false,
            message: 'pickupCity and dropoffCity are required for round_trip',
          });
        }
      }

      const computedDelivery = computeDeliveryFee({
        deliverySelected: true,
        deliveryType: dType,
        pickupCity: pCity,
        dropoffCity: dCity,
        warehouseCity,
      });

      const tw = safeTrim(deliveryTimeWindow);
      if (tw && !['morning', 'afternoon', 'evening'].includes(tw)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deliveryTimeWindow',
        });
      }

      deliveryPayload = {
        ...deliveryPayload,
        deliverySelected: true,
        deliveryType: dType,
        pickupCity: pCity,
        dropoffCity: dCity,
        pickupAddressText: safeTrim(pickupAddressText),
        dropoffAddressText: safeTrim(dropoffAddressText),
        deliveryTimeWindow: tw,
        deliveryFee: computedDelivery.deliveryFee,
        deliveryStatus: computedDelivery.deliveryStatus,
        deliveryZoneUsed: computedDelivery.deliveryZoneUsed,
        deliveryBundleDiscountUsed: computedDelivery.deliveryBundleDiscountUsed,
      };
    }

    const totalPrice = insuranceRoundTo2(
      baseBookingPrice +
        (Number(insuranceSnapshot.insuranceFee) || 0) +
        (Number(packingPayload.packingFee) || 0) +
        (Number(deliveryPayload.deliveryFee) || 0)
    );

    const booking = await Booking.create({
      user: userData.id,
      place,
      checkIn,
      checkOut,
      noOfGuests: guests,
      areaM2: requestedArea,
      name,
      phone,

      // Base
      price: baseBookingPrice,

      // Insurance snapshot
      insuranceSelected: insuranceSnapshot.insuranceSelected,
      insuranceDeclaredValue: insuranceSnapshot.insuranceDeclaredValue,
      insuranceTier: insuranceSnapshot.insuranceTier,
      insuranceRatePerDayUsed: insuranceSnapshot.insuranceRatePerDayUsed,
      insuranceMinFeeUsed: insuranceSnapshot.insuranceMinFeeUsed,
      insuranceFee: insuranceSnapshot.insuranceFee,

      // Packing snapshot
      ...packingPayload,

      // Delivery snapshot
      ...deliveryPayload,

      // Total
      totalPrice,

      // Booking status
      status: 'pending',
      paymentStatus: 'not_yet',
      paymentMethod: null,
    });

    const populated = await Booking.findById(booking._id).populate('place');

    // Notify the host by email (fire-and-forget; never blocks the response)
    User.findById(placeDoc.owner)
      .select('email name')
      .then((host) => {
        if (!host?.email) return;
        return sendMail({
          to: host.email,
          subject: `New booking request for ${placeDoc.title || 'your warehouse'}`,
          html: emailWrap(`
            <p>Hi ${escapeHtml(host.name || 'there')},</p>
            <p><strong>${escapeHtml(name)}</strong> requested to book
            <strong>${escapeHtml(placeDoc.title || 'your warehouse')}</strong>.</p>
            <ul>
              <li>Check-in: ${toYMDUTC(new Date(checkIn))}</li>
              <li>Check-out: ${toYMDUTC(new Date(checkOut))}</li>
              <li>Total: JOD ${totalPrice}</li>
            </ul>
            <p>Log in to WareShare to approve or decline this request.</p>
          `),
        });
      })
      .catch((e) => console.error('booking email error:', e?.message));

    return res.status(201).json({
      success: true,
      booking: populated,
      message: 'Booking request sent to the warehouse owner.',
    });
  } catch (err) {
    console.error('createBookings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating booking',
      error: err.message,
    });
  }
};

// RENTER: get their own bookings
exports.getBookings = async (req, res) => {
  try {
    const userData = req.user;

    const bookings = await Booking.find({ user: userData.id })
      .populate('place')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      booking: bookings,
    });
  } catch (err) {
    console.error('getBookings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching bookings',
      error: err.message,
    });
  }
};

// RENTER OR HOST: get single booking by id
exports.getBookingById = async (req, res) => {
  try {
    const userData = req.user;
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('place');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isRenter = String(booking.user) === String(userData.id);
    const isHost =
      booking.place && String(booking.place.owner) === String(userData.id);

    if (!isRenter && !isHost) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view this booking',
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (err) {
    console.error('getBookingById error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching booking',
      error: err.message,
    });
  }
};

// OWNER: get bookings for all warehouses they own (with renter rating)
exports.getOwnerBookings = async (req, res) => {
  try {
    const userData = req.user;

    const ownerPlaces = await Place.find({ owner: userData.id }).select('_id');
    const placeIds = ownerPlaces.map((p) => p._id);

    let bookings = await Booking.find({ place: { $in: placeIds } })
      .populate('place')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const renterIds = [
      ...new Set(
        bookings
          .map((b) => (b.user ? b.user._id?.toString() : null))
          .filter(Boolean)
      ),
    ];

    let ratingsMap = {};

    if (renterIds.length > 0) {
      const renterObjectIds = renterIds.map(
        (rid) => new mongoose.Types.ObjectId(rid)
      );

      const renterAgg = await RenterReview.aggregate([
        { $match: { renter: { $in: renterObjectIds } } },
        {
          $group: {
            _id: '$renter',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]);

      ratingsMap = renterAgg.reduce((acc, r) => {
        acc[r._id.toString()] = {
          avgRating: parseFloat(r.avgRating.toFixed(1)),
          count: r.count,
        };
        return acc;
      }, {});
    }

    bookings = bookings.map((b) => {
      const renterId = b.user ? b.user._id?.toString() : null;
      const ratingInfo = renterId ? ratingsMap[renterId] : null;

      return {
        ...b,
        renterRating: ratingInfo ? ratingInfo.avgRating : null,
        renterRatingCount: ratingInfo ? ratingInfo.count : 0,
      };
    });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (err) {
    console.error('getOwnerBookings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching owner bookings',
      error: err.message,
    });
  }
};

// OWNER: approve / decline / mark completed
exports.updateBookingStatus = async (req, res) => {
  try {
    const userData = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'declined', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const booking = await Booking.findById(id).populate('place');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (!booking.place) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse no longer exists',
      });
    }

    if (String(booking.place.owner) !== String(userData.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update this booking',
      });
    }

    // Approving must not oversubscribe the warehouse among approved bookings
    if (status === 'approved') {
      const cap = Number(booking.place.availableArea);
      const totalCapacity = Number.isFinite(cap) && cap > 0 ? cap : null;

      const others = await Booking.find({
        place: booking.place._id,
        _id: { $ne: booking._id },
        status: 'approved',
        checkIn: { $lt: booking.checkOut },
        checkOut: { $gt: booking.checkIn },
      }).select('checkIn checkOut areaM2');

      if (!totalCapacity) {
        if (others.length > 0) {
          return res.status(409).json({
            success: false,
            message:
              'These dates are already taken by another approved booking.',
          });
        }
      } else {
        const myArea = Number(booking.areaM2) || totalCapacity;
        let cur = new Date(booking.checkIn);
        const endDate = new Date(booking.checkOut);
        while (cur < endDate) {
          const dayEnd = addOneDayUTC(cur);
          let used = 0;
          for (const b of others) {
            if (new Date(b.checkIn) < dayEnd && new Date(b.checkOut) > cur) {
              used += Number(b.areaM2) || totalCapacity;
            }
          }
          if (used + myArea > totalCapacity) {
            return res.status(409).json({
              success: false,
              message: `Not enough space left on ${toYMDUTC(cur)} — approving this would oversubscribe the warehouse (${Math.max(0, totalCapacity - used)} m² remaining).`,
            });
          }
          cur = dayEnd;
        }
      }
    }

    booking.status = status;

    // Dummy payment logic
    if (status === 'approved') {
      if (booking.paymentStatus === 'not_yet') {
        booking.paymentStatus = 'not_paid';
      }
      booking.paymentMethod = null;
    }

    if (status === 'declined') {
      booking.paymentStatus = 'not_yet';
      booking.paymentMethod = null;
    }

    await booking.save();

    const populated = await Booking.findById(id).populate('place');

    // Notify the renter by email (fire-and-forget)
    if (status === 'approved' || status === 'declined') {
      User.findById(booking.user)
        .select('email name')
        .then((renter) => {
          if (!renter?.email) return;
          const placeTitle = populated?.place?.title || 'the warehouse';
          return sendMail({
            to: renter.email,
            subject: `Your booking was ${status}`,
            html: emailWrap(`
              <p>Hi ${escapeHtml(renter.name || 'there')},</p>
              <p>Your booking request for <strong>${escapeHtml(placeTitle)}</strong> was
              <strong>${status}</strong> by the host.</p>
              ${
                status === 'approved'
                  ? '<p>Log in to WareShare to complete payment and view details.</p>'
                  : '<p>You can browse other warehouses on WareShare.</p>'
              }
            `),
          });
        })
        .catch((e) => console.error('status email error:', e?.message));
    }

    return res.status(200).json({
      success: true,
      booking: populated,
      message: `Booking ${status} successfully.`,
    });
  } catch (err) {
    console.error('updateBookingStatus error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating booking status',
      error: err.message,
    });
  }
};

// RENTER: dummy payment update (choose method and mark as paid)
exports.updateBookingPayment = async (req, res) => {
  try {
    const userData = req.user;
    const { id } = req.params;
    const { paymentMethod } = req.body;

    if (!['apple_pay', 'visa', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid paymentMethod',
      });
    }

    const booking = await Booking.findById(id).populate('place');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (String(booking.user) !== String(userData.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to pay for this booking',
      });
    }

    if (booking.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Payment is available only after the booking is approved',
      });
    }

    booking.paymentMethod = paymentMethod;
    booking.paymentStatus = 'paid';
    await booking.save();

    const populated = await Booking.findById(id).populate('place');

    return res.status(200).json({
      success: true,
      booking: populated,
      message: 'Payment recorded (dummy flow).',
    });
  } catch (err) {
    console.error('updateBookingPayment error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating payment',
      error: err.message,
    });
  }
};

/* ----------------------------------------
   PLACE AVAILABILITY (calendar)
   ---------------------------------------- */
exports.getPlaceAvailability = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'placeId is required',
      });
    }

    const bookings = await Booking.find({
      place: placeId,
      status: { $in: ['approved', 'pending'] },
    }).select('checkIn checkOut status areaM2');

    const placeDoc = await Place.findById(placeId).select(
      'blockedDates availableArea'
    );

    const totalCapacity =
      placeDoc &&
      Number.isFinite(Number(placeDoc.availableArea)) &&
      Number(placeDoc.availableArea) > 0
        ? Number(placeDoc.availableArea)
        : null;

    const unavailableSet = new Set();
    // Per-date m² still bookable (only for capacity-aware places)
    const remainingByDate = {};

    // Host-blocked dates are always unavailable
    if (placeDoc && Array.isArray(placeDoc.blockedDates)) {
      placeDoc.blockedDates.forEach((d) => unavailableSet.add(d));
    }

    // Sum booked area per date; without capacity info, any booking = full
    const usedByDate = {};
    bookings.forEach((b) => {
      if (!b.checkIn || !b.checkOut) return;

      const start = new Date(b.checkIn);
      const end = new Date(b.checkOut);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      const area = totalCapacity
        ? Number(b.areaM2) || totalCapacity
        : Infinity;

      let cur = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
      );
      const endUtc = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
      );

      while (cur < endUtc) {
        const key = toYMDUTC(cur);
        usedByDate[key] = (usedByDate[key] || 0) + area;
        cur = addOneDayUTC(cur);
      }
    });

    Object.entries(usedByDate).forEach(([date, used]) => {
      if (!totalCapacity) {
        unavailableSet.add(date);
        return;
      }
      const remaining = totalCapacity - used;
      if (remaining <= 0) {
        unavailableSet.add(date);
      } else {
        remainingByDate[date] = remaining;
      }
    });

    return res.status(200).json({
      success: true,
      unavailableDates: Array.from(unavailableSet),
      // Extra capacity info for partial-rental UIs
      totalCapacity,
      remainingByDate,
    });
  } catch (err) {
    console.error('getPlaceAvailability error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching availability',
      error: err.message,
    });
  }
};
