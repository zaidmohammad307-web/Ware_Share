// api/controllers/dashboardController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Place = require('../models/Place');

function safeNumber(n, fallback = 0) {
  const num = Number(n);
  return Number.isFinite(num) ? num : fallback;
}

function safeMoney(n) {
  return Math.round((safeNumber(n, 0) + Number.EPSILON) * 100) / 100;
}

function bookingTotalPriceDoc(doc) {
  const total = safeNumber(doc?.totalPrice, NaN);
  if (Number.isFinite(total) && total >= 0) return total;
  return safeNumber(doc?.price, 0);
}

function parseDateYMD(s) {
  if (!s || typeof s !== 'string') return null;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDaysUTC(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toYMDUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseRange(req) {
  const fromQ = parseDateYMD(req.query.from);
  const toQ = parseDateYMD(req.query.to);

  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );

  // Default = last 30 days including today
  const from = fromQ || addDaysUTC(todayUTC, -29);
  const to = toQ || todayUTC;

  // Build exclusive end boundary (to + 1 day)
  const toExclusive = addDaysUTC(to, 1);

  return { from, to, toExclusive };
}

function normalizeStatus(s) {
  if (!s) return null;
  const v = String(s).toLowerCase().trim();
  if (v === 'all') return null;
  const allowed = new Set(['pending', 'approved', 'declined', 'completed', 'cancelled']);
  if (!allowed.has(v)) return null;
  // Your schema uses 'declined', not 'cancelled'
  if (v === 'cancelled') return 'declined';
  return v;
}

function normalizeQuery(q) {
  if (!q) return null;
  const s = String(q).trim();
  if (!s) return null;
  return s.slice(0, 80);
}

function buildDailySkeleton(from, to) {
  const out = [];
  let cur = new Date(from.getTime());
  const end = new Date(to.getTime());
  while (cur.getTime() <= end.getTime()) {
    out.push(toYMDUTC(cur));
    cur = addDaysUTC(cur, 1);
  }
  return out;
}

function fillDailySeries(days, rawMap, keys) {
  return days.map((day) => {
    const row = rawMap.get(day) || {};
    const obj = { date: day };
    for (const k of keys) obj[k] = safeMoney(row[k] ?? 0);
    return obj;
  });
}

function buildObjectIdOrNull(id) {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
  return new mongoose.Types.ObjectId(String(id));
}

/**
 * Build a base pipeline that:
 * - $match (scope)
 * - $lookup places
 * - $unwind
 * - optional search by booking id or place title
 */
function buildScopedBookingPipeline({
  scopeMatch,
  status,
  q,
  placeId,
  lookupPlace = true,
  projectFields = null,
}) {
  const match = { ...scopeMatch };

  if (status) match.status = status;
  if (placeId) match.place = placeId;

  const qNorm = normalizeQuery(q);
  const qObjectId = buildObjectIdOrNull(qNorm);

  const pipeline = [{ $match: match }];

  if (lookupPlace) {
    pipeline.push(
      {
        $lookup: {
          from: 'places',
          localField: 'place',
          foreignField: '_id',
          as: 'placeDoc',
        },
      },
      { $unwind: { path: '$placeDoc', preserveNullAndEmptyArrays: true } }
    );
  }

  if (qObjectId) {
    pipeline.push({ $match: { _id: qObjectId } });
  } else if (qNorm) {
    // Search by place title
    pipeline.push({
      $match: {
        'placeDoc.title': { $regex: qNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      },
    });
  }

  if (projectFields) pipeline.push({ $project: projectFields });

  return pipeline;
}

async function aggregateBookingsOverTime(pipelinePrefix) {
  const agg = await Booking.aggregate([
    ...pipelinePrefix,
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map();
  for (const r of agg) map.set(r._id, { bookings: safeNumber(r.bookings, 0) });
  return map;
}

async function aggregateStatusBreakdown(pipelinePrefix) {
  const agg = await Booking.aggregate([
    ...pipelinePrefix,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const out = { pending: 0, approved: 0, declined: 0, completed: 0 };
  for (const r of agg) {
    const key = String(r._id || '').toLowerCase();
    if (key in out) out[key] = safeNumber(r.count, 0);
  }
  return out;
}

async function aggregateMoneyOverTime(pipelinePrefix, mode) {
  // mode: 'spending' (paid bookings by renter) or 'earnings' (paid bookings by owner) or 'gmv' (all non-declined)
  const matchExtra = {};
  if (mode === 'spending' || mode === 'earnings') matchExtra.paymentStatus = 'paid';
  if (mode === 'gmv') matchExtra.status = { $ne: 'declined' };

  const agg = await Booking.aggregate([
    ...pipelinePrefix,
    { $match: matchExtra },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        amount: { $sum: { $ifNull: ['$totalPrice', '$price'] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map();
  for (const r of agg) map.set(r._id, { amount: safeMoney(r.amount) });
  return map;
}

async function aggregateAddOnsOverTime(pipelinePrefix) {
  const agg = await Booking.aggregate([
    ...pipelinePrefix,
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        insurance: { $sum: { $ifNull: ['$insuranceFee', 0] } },
        packing: { $sum: { $ifNull: ['$packingFee', 0] } },
        delivery: { $sum: { $ifNull: ['$deliveryFee', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map();
  for (const r of agg) {
    map.set(r._id, {
      insurance: safeMoney(r.insurance),
      packing: safeMoney(r.packing),
      delivery: safeMoney(r.delivery),
    });
  }
  return map;
}

function formatBookingCard(b) {
  const place = b.placeDoc || null;
  return {
    _id: b._id,
    warehouse: {
      _id: place?._id || null,
      title: place?.title || 'Warehouse',
      city: place?.city || '',
      image: Array.isArray(place?.photos) ? place.photos[0] || null : null,
    },
    status: b.status,
    paymentStatus: b.paymentStatus ?? 'not_yet',
    basePrice: safeMoney(b.price),
    insuranceFee: safeMoney(b.insuranceFee ?? 0),
    packingFee: safeMoney(b.packingFee ?? 0),
    deliveryFee: safeMoney(b.deliveryFee ?? 0),
    totalPrice: safeMoney(bookingTotalPriceDoc(b)),
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    createdAt: b.createdAt,
  };
}

function formatOwnerBookingCard(b) {
  const place = b.placeDoc || null;
  const renter = b.renterDoc || null;

  return {
    _id: b._id,
    renter: {
      name: renter?.name || b.name || 'Renter',
      email: renter?.email || '',
    },
    warehouse: {
      _id: place?._id || null,
      title: place?.title || 'Warehouse',
      city: place?.city || '',
      image: Array.isArray(place?.photos) ? place.photos[0] || null : null,
    },
    status: b.status,
    paymentStatus: b.paymentStatus ?? 'not_yet',
    addOns: {
      insuranceSelected: Boolean(b.insuranceSelected),
      insuranceFee: safeMoney(b.insuranceFee ?? 0),
      packingFee: safeMoney(b.packingFee ?? 0),
      deliveryFee: safeMoney(b.deliveryFee ?? 0),
    },
    totalPrice: safeMoney(bookingTotalPriceDoc(b)),
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    createdAt: b.createdAt,
  };
}

// Overview: all bookings that involve the user (as renter OR owner)
exports.getSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { from, to, toExclusive } = parseRange(req);
    const status = normalizeStatus(req.query.status);
    const q = normalizeQuery(req.query.q);

    const days = buildDailySkeleton(from, to);

    // Match bookings in range, then lookup place to determine ownership
    const base = [
      {
        $match: {
          createdAt: { $gte: from, $lt: toExclusive },
        },
      },
      {
        $lookup: {
          from: 'places',
          localField: 'place',
          foreignField: '_id',
          as: 'placeDoc',
        },
      },
      { $unwind: { path: '$placeDoc', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [{ user: userId }, { 'placeDoc.owner': userId }],
        },
      },
    ];

    if (status) base.push({ $match: { status } });

    const qObjectId = buildObjectIdOrNull(q);
    if (qObjectId) {
      base.push({ $match: { _id: qObjectId } });
    } else if (q) {
      base.push({
        $match: {
          'placeDoc.title': { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
        },
      });
    }

    const [statusBreakdown, bookingsMap] = await Promise.all([
      aggregateStatusBreakdown(base),
      aggregateBookingsOverTime(base),
    ]);

    // Split renter/owner KPI totals computed via aggregation
    const renterKpiAgg = await Booking.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: from, $lt: toExclusive },
          ...(status ? { status } : {}),
        },
      },
      {
        $group: {
          _id: null,
          renterPendingBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          renterActiveBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          renterPaidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          renterTotalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $ifNull: ['$totalPrice', '$price'] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const ownerPlaces = await Place.find({ owner: userId }).select('_id');
    const ownerPlaceIds = ownerPlaces.map((p) => p._id);

    let ownerKPIs = {
      ownerPendingRequests: 0,
      ownerActiveBookings: 0,
      ownerTotalEarned: 0,
    };

    if (ownerPlaceIds.length > 0) {
      const ownerKpiAgg = await Booking.aggregate([
        {
          $match: {
            place: { $in: ownerPlaceIds },
            createdAt: { $gte: from, $lt: toExclusive },
            ...(status ? { status } : {}),
          },
        },
        {
          $group: {
            _id: null,
            ownerPendingRequests: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            ownerActiveBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
            },
            ownerTotalEarned: {
              $sum: {
                $cond: [{ $ne: ['$status', 'declined'] }, { $ifNull: ['$totalPrice', '$price'] }, 0],
              },
            },
          },
        },
      ]);

      const o = ownerKpiAgg?.[0] || {};
      ownerKPIs = {
        ownerPendingRequests: safeNumber(o.ownerPendingRequests, 0),
        ownerActiveBookings: safeNumber(o.ownerActiveBookings, 0),
        ownerTotalEarned: safeMoney(o.ownerTotalEarned),
      };
    }

    const r = renterKpiAgg?.[0] || {};

    const bookingsOverTime = fillDailySeries(days, bookingsMap, ['bookings']);

    return res.status(200).json({
      success: true,
      from: toYMDUTC(from),
      to: toYMDUTC(to),
      kpis: {
        renterActiveBookings: safeNumber(r.renterActiveBookings, 0),
        renterPendingBookings: safeNumber(r.renterPendingBookings, 0),
        renterTotalSpent: safeMoney(r.renterTotalSpent),
        ownerPendingRequests: ownerKPIs.ownerPendingRequests,
        ownerActiveBookings: ownerKPIs.ownerActiveBookings,
        ownerTotalEarned: ownerKPIs.ownerTotalEarned,
        unreadMessagesCount: 0,
      },
      charts: {
        bookingsOverTime,
        statusBreakdown: [
          { name: 'pending', value: statusBreakdown.pending },
          { name: 'approved', value: statusBreakdown.approved },
          { name: 'completed', value: statusBreakdown.completed },
          { name: 'declined', value: statusBreakdown.declined },
        ],
      },
    });
  } catch (err) {
    console.error('dashboard getSummary error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching dashboard summary',
    });
  }
};

exports.getRenterDashboard = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { from, to, toExclusive } = parseRange(req);
    const status = normalizeStatus(req.query.status);
    const q = normalizeQuery(req.query.q);

    const days = buildDailySkeleton(from, to);

    const prefix = buildScopedBookingPipeline({
      scopeMatch: {
        user: userId,
        createdAt: { $gte: from, $lt: toExclusive },
      },
      status,
      q,
      placeId: null,
      lookupPlace: true,
    });

    const [statusBreakdown, bookingsMap, spendingMap, addOnsMap] = await Promise.all([
      aggregateStatusBreakdown(prefix),
      aggregateBookingsOverTime(prefix),
      aggregateMoneyOverTime(prefix, 'spending'),
      aggregateAddOnsOverTime(prefix),
    ]);

    const totalsAgg = await Booking.aggregate([
      ...prefix,
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpentPaid: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $ifNull: ['$totalPrice', '$price'] },
                0,
              ],
            },
          },
          insuranceTotal: { $sum: { $ifNull: ['$insuranceFee', 0] } },
          packingTotal: { $sum: { $ifNull: ['$packingFee', 0] } },
          deliveryTotal: { $sum: { $ifNull: ['$deliveryFee', 0] } },
        },
      },
    ]);

    const totals = totalsAgg?.[0] || {
      totalBookings: 0,
      totalSpentPaid: 0,
      insuranceTotal: 0,
      packingTotal: 0,
      deliveryTotal: 0,
    };

    const listAgg = await Booking.aggregate([
      ...prefix,
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 1,
          placeDoc: 1,
          status: 1,
          paymentStatus: 1,
          price: 1,
          totalPrice: 1,
          insuranceFee: 1,
          packingFee: 1,
          deliveryFee: 1,
          checkIn: 1,
          checkOut: 1,
          createdAt: 1,
        },
      },
    ]);

    const formatted = listAgg.map(formatBookingCard);

    return res.status(200).json({
      success: true,
      from: toYMDUTC(from),
      to: toYMDUTC(to),
      totals: {
        totalBookings: safeNumber(totals.totalBookings, 0),
        totalSpentPaid: safeMoney(totals.totalSpentPaid),
        insuranceTotal: safeMoney(totals.insuranceTotal),
        packingTotal: safeMoney(totals.packingTotal),
        deliveryTotal: safeMoney(totals.deliveryTotal),
      },
      charts: {
        bookingsOverTime: fillDailySeries(days, bookingsMap, ['bookings']),
        statusBreakdown: [
          { name: 'pending', value: statusBreakdown.pending },
          { name: 'approved', value: statusBreakdown.approved },
          { name: 'completed', value: statusBreakdown.completed },
          { name: 'declined', value: statusBreakdown.declined },
        ],
        spendingOverTime: fillDailySeries(days, spendingMap, ['amount']),
        addOnsOverTime: fillDailySeries(days, addOnsMap, ['insurance', 'packing', 'delivery']),
      },
      bookings: formatted,
    });
  } catch (err) {
    console.error('dashboard getRenterDashboard error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching renter dashboard',
    });
  }
};

exports.getOwnerDashboard = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { from, to, toExclusive } = parseRange(req);
    const status = normalizeStatus(req.query.status);
    const q = normalizeQuery(req.query.q);
    const placeIdParam = buildObjectIdOrNull(req.query.placeId);

    const ownerPlaces = await Place.find({ owner: userId }).select('_id title city photos address');
    const placeIds = ownerPlaces.map((p) => p._id);

    const days = buildDailySkeleton(from, to);

    if (placeIds.length === 0) {
      return res.status(200).json({
        success: true,
        from: toYMDUTC(from),
        to: toYMDUTC(to),
        places: [],
        selectedPlaceId: null,
        totals: {
          totalGrossEarned: 0,
          pendingRequests: 0,
          completedBookings: 0,
          insuranceTotal: 0,
          packingTotal: 0,
          deliveryTotal: 0,
        },
        charts: {
          bookingsOverTime: days.map((d) => ({ date: d, bookings: 0 })),
          statusBreakdown: [
            { name: 'pending', value: 0 },
            { name: 'approved', value: 0 },
            { name: 'completed', value: 0 },
            { name: 'declined', value: 0 },
          ],
          earningsOverTime: days.map((d) => ({ date: d, amount: 0 })),
          addOnsOverTime: days.map((d) => ({ date: d, insurance: 0, packing: 0, delivery: 0 })),
        },
        bookings: [],
      });
    }

    const selectedPlaceId =
      placeIdParam && placeIds.some((id) => String(id) === String(placeIdParam))
        ? placeIdParam
        : null;

    const prefix = buildScopedBookingPipeline({
      scopeMatch: {
        place: { $in: placeIds },
        createdAt: { $gte: from, $lt: toExclusive },
      },
      status,
      q,
      placeId: selectedPlaceId,
      lookupPlace: true,
    });

    // Add renter lookup for listing cards
    const prefixWithRenter = [
      ...prefix,
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'renterDoc',
        },
      },
      { $unwind: { path: '$renterDoc', preserveNullAndEmptyArrays: true } },
    ];

    const [statusBreakdown, bookingsMap, earningsMap, addOnsMap] = await Promise.all([
      aggregateStatusBreakdown(prefix),
      aggregateBookingsOverTime(prefix),
      aggregateMoneyOverTime(prefix, 'earnings'),
      aggregateAddOnsOverTime(prefix),
    ]);

    const totalsAgg = await Booking.aggregate([
      ...prefix,
      {
        $group: {
          _id: null,
          totalGrossEarned: {
            $sum: {
              $cond: [{ $ne: ['$status', 'declined'] }, { $ifNull: ['$totalPrice', '$price'] }, 0],
            },
          },
          pendingRequests: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          insuranceTotal: { $sum: { $ifNull: ['$insuranceFee', 0] } },
          packingTotal: { $sum: { $ifNull: ['$packingFee', 0] } },
          deliveryTotal: { $sum: { $ifNull: ['$deliveryFee', 0] } },
        },
      },
    ]);

    const totals = totalsAgg?.[0] || {
      totalGrossEarned: 0,
      pendingRequests: 0,
      completedBookings: 0,
      insuranceTotal: 0,
      packingTotal: 0,
      deliveryTotal: 0,
    };

    const listAgg = await Booking.aggregate([
      ...prefixWithRenter,
      { $sort: { createdAt: -1 } },
      { $limit: 120 },
      {
        $project: {
          _id: 1,
          placeDoc: 1,
          renterDoc: 1,
          name: 1,
          status: 1,
          paymentStatus: 1,
          price: 1,
          totalPrice: 1,
          insuranceSelected: 1,
          insuranceFee: 1,
          packingFee: 1,
          deliveryFee: 1,
          checkIn: 1,
          checkOut: 1,
          createdAt: 1,
        },
      },
    ]);

    const formatted = listAgg.map(formatOwnerBookingCard);

    return res.status(200).json({
      success: true,
      from: toYMDUTC(from),
      to: toYMDUTC(to),
      places: ownerPlaces.map((p) => ({
        _id: p._id,
        title: p.title || 'Warehouse',
        city: p.city || '',
        image: Array.isArray(p.photos) ? p.photos[0] || null : null,
      })),
      selectedPlaceId: selectedPlaceId ? String(selectedPlaceId) : null,
      totals: {
        totalGrossEarned: safeMoney(totals.totalGrossEarned),
        pendingRequests: safeNumber(totals.pendingRequests, 0),
        completedBookings: safeNumber(totals.completedBookings, 0),
        insuranceTotal: safeMoney(totals.insuranceTotal),
        packingTotal: safeMoney(totals.packingTotal),
        deliveryTotal: safeMoney(totals.deliveryTotal),
      },
      charts: {
        bookingsOverTime: fillDailySeries(days, bookingsMap, ['bookings']),
        statusBreakdown: [
          { name: 'pending', value: statusBreakdown.pending },
          { name: 'approved', value: statusBreakdown.approved },
          { name: 'completed', value: statusBreakdown.completed },
          { name: 'declined', value: statusBreakdown.declined },
        ],
        earningsOverTime: fillDailySeries(days, earningsMap, ['amount']),
        addOnsOverTime: fillDailySeries(days, addOnsMap, ['insurance', 'packing', 'delivery']),
      },
      bookings: formatted,
    });
  } catch (err) {
    console.error('dashboard getOwnerDashboard error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching owner dashboard',
    });
  }
};
