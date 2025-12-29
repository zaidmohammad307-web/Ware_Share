// api/controllers/adminDashboardController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Place = require('../models/Place');
const User = require('../models/User');

function safeNumber(n, fallback = 0) {
  const num = Number(n);
  return Number.isFinite(num) ? num : fallback;
}

function safeMoney(n) {
  return Math.round((safeNumber(n, 0) + Number.EPSILON) * 100) / 100;
}

function parseDateYMD(s) {
  if (!s || typeof s !== 'string') return null;
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

  const from = fromQ || addDaysUTC(todayUTC, -29);
  const to = toQ || todayUTC;
  const toExclusive = addDaysUTC(to, 1);
  return { from, to, toExclusive };
}

function normalizeStatus(s) {
  if (!s) return null;
  const v = String(s).toLowerCase().trim();
  if (v === 'all') return null;
  const allowed = new Set(['pending', 'approved', 'declined', 'completed', 'cancelled']);
  if (!allowed.has(v)) return null;
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

function fillDaily(days, rawMap, keys) {
  return days.map((day) => {
    const row = rawMap.get(day) || {};
    const obj = { date: day };
    for (const k of keys) obj[k] = safeMoney(row[k] ?? 0);
    return obj;
  });
}

function buildObjectIdOrNull(id) {
  if (!id) return null;
  const s = String(id);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function placeCapacity(p) {
  const pallet = safeNumber(p?.palletCapacity, NaN);
  if (Number.isFinite(pallet) && pallet > 0) return pallet;
  const avail = safeNumber(p?.availableArea, NaN);
  if (Number.isFinite(avail) && avail > 0) return avail;
  const totalArea = safeNumber(p?.totalArea, NaN);
  if (Number.isFinite(totalArea) && totalArea > 0) return totalArea;
  return 0;
}

async function aggregateBookingsOverTime(prefix) {
  const agg = await Booking.aggregate([
    ...prefix,
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map();
  for (const r of agg) map.set(r._id, { bookings: safeNumber(r.bookings, 0) });
  return map;
}

async function aggregateGMVOverTime(prefix) {
  const agg = await Booking.aggregate([
    ...prefix,
    { $match: { status: { $ne: 'declined' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        gmv: { $sum: { $ifNull: ['$totalPrice', '$price'] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map();
  for (const r of agg) map.set(r._id, { gmv: safeMoney(r.gmv) });
  return map;
}

async function aggregateAddOnsOverTime(prefix) {
  const agg = await Booking.aggregate([
    ...prefix,
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

exports.getSummary = async (req, res) => {
  try {
    const { from, to, toExclusive } = parseRange(req);
    const status = normalizeStatus(req.query.status);

    // Global totals (all-time)
    const [totalUsers, totalWarehouses] = await Promise.all([
      User.countDocuments({}),
      Place.countDocuments({}),
    ]);

    // Booking totals (date-filtered)
    const bookingMatch = {
      createdAt: { $gte: from, $lt: toExclusive },
      ...(status ? { status } : {}),
    };

    const totalsAgg = await Booking.aggregate([
      { $match: bookingMatch },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          activeBookings: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'approved']] }, 1, 0] },
          },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          declinedBookings: { $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] } },
          gmv: { $sum: { $cond: [{ $ne: ['$status', 'declined'] }, { $ifNull: ['$totalPrice', '$price'] }, 0] } },
          insuranceRevenue: { $sum: { $ifNull: ['$insuranceFee', 0] } },
          packingRevenue: { $sum: { $ifNull: ['$packingFee', 0] } },
          deliveryRevenue: { $sum: { $ifNull: ['$deliveryFee', 0] } },
          insuredCount: { $sum: { $cond: [{ $eq: ['$insuranceSelected', true] }, 1, 0] } },
        },
      },
    ]);

    const t = totalsAgg?.[0] || {
      totalBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      declinedBookings: 0,
      gmv: 0,
      insuranceRevenue: 0,
      packingRevenue: 0,
      deliveryRevenue: 0,
      insuredCount: 0,
    };

    const cancellationRate =
      safeNumber(t.totalBookings, 0) > 0
        ? safeMoney((safeNumber(t.declinedBookings, 0) / safeNumber(t.totalBookings, 0)) * 100)
        : 0;

    const insuredBookingsPercentage =
      safeNumber(t.totalBookings, 0) > 0
        ? safeMoney((safeNumber(t.insuredCount, 0) / safeNumber(t.totalBookings, 0)) * 100)
        : 0;

    // Charts
    const days = buildDailySkeleton(from, to);
    const prefix = [{ $match: bookingMatch }];

    const [bookingsMap, gmvMap, addOnsMap] = await Promise.all([
      aggregateBookingsOverTime(prefix),
      aggregateGMVOverTime(prefix),
      aggregateAddOnsOverTime(prefix),
    ]);

    return res.status(200).json({
      success: true,
      from: toYMDUTC(from),
      to: toYMDUTC(to),
      kpis: {
        totalUsers,
        totalWarehouses,
        totalBookings: safeNumber(t.totalBookings, 0),
        activeBookings: safeNumber(t.activeBookings, 0),
        completedBookings: safeNumber(t.completedBookings, 0),
        cancellationRate,
        grossBookingValue: safeMoney(t.gmv),
        totalInsuranceRevenue: safeMoney(t.insuranceRevenue),
        totalPackingRevenue: safeMoney(t.packingRevenue),
        totalDeliveryRevenue: safeMoney(t.deliveryRevenue),
        insuredBookingsPercentage,
      },
      charts: {
        bookingsOverTime: fillDaily(days, bookingsMap, ['bookings']),
        gmvOverTime: fillDaily(days, gmvMap, ['gmv']),
        addOnsRevenueOverTime: fillDaily(days, addOnsMap, ['insurance', 'packing', 'delivery']),
      },
    });
  } catch (err) {
    console.error('admin dashboard getSummary error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching admin dashboard summary',
    });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const { from, to, toExclusive } = parseRange(req);
    const status = normalizeStatus(req.query.status);
    const q = normalizeQuery(req.query.q);

    const match = {
      createdAt: { $gte: from, $lt: toExclusive },
      ...(status ? { status } : {}),
    };

    const qObjectId = buildObjectIdOrNull(q);

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 80 },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'renterDoc',
        },
      },
      { $unwind: { path: '$renterDoc', preserveNullAndEmptyArrays: true } },
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
        $lookup: {
          from: 'users',
          localField: 'placeDoc.owner',
          foreignField: '_id',
          as: 'ownerDoc',
        },
      },
      { $unwind: { path: '$ownerDoc', preserveNullAndEmptyArrays: true } },
    ];

    if (qObjectId) {
      pipeline.push({ $match: { _id: qObjectId } });
    } else if (q) {
      pipeline.push({
        $match: {
          $or: [
            { 'placeDoc.title': { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $project: {
        _id: 1,
        status: 1,
        createdAt: 1,
        totalPrice: { $ifNull: ['$totalPrice', '$price'] },
        renterEmail: { $ifNull: ['$renterDoc.email', ''] },
        ownerEmail: { $ifNull: ['$ownerDoc.email', ''] },
        warehouseTitle: { $ifNull: ['$placeDoc.title', ''] },
      },
    });

    const rows = await Booking.aggregate(pipeline);

    const formatted = rows.map((b) => ({
      _id: b._id,
      renterEmail: b.renterEmail || '',
      ownerEmail: b.ownerEmail || '',
      status: b.status,
      totalPrice: safeMoney(b.totalPrice),
      warehouseTitle: b.warehouseTitle || '',
      createdAt: b.createdAt,
    }));

    return res.status(200).json({
      success: true,
      from: toYMDUTC(from),
      to: toYMDUTC(to),
      bookings: formatted,
    });
  } catch (err) {
    console.error('admin dashboard getBookings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching admin bookings',
    });
  }
};

exports.getUtilization = async (req, res) => {
  try {
    const { from, to, toExclusive } = parseRange(req);

    const places = await Place.find({}).select('palletCapacity availableArea totalArea');
    const totalListedCapacity = safeMoney(places.reduce((sum, p) => sum + placeCapacity(p), 0));

    // Current utilization snapshot
    const activeBookings = await Booking.find({ status: 'approved' }).select('noOfGuests');
    const usedCapacity = safeMoney(activeBookings.reduce((sum, b) => sum + safeNumber(b.noOfGuests, 0), 0));

    const utilizationPercentage =
      totalListedCapacity > 0 ? safeMoney((usedCapacity / totalListedCapacity) * 100) : 0;

    // "Over time" (proxy): daily booked units from approved bookings created that day
    const days = buildDailySkeleton(from, to);
    const agg = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lt: toExclusive },
          status: 'approved',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bookedUnits: { $sum: { $ifNull: ['$noOfGuests', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map();
    for (const r of agg) map.set(r._id, { bookedUnits: safeNumber(r.bookedUnits, 0) });

    const utilizationOverTime = days.map((d) => {
      const bookedUnitsDay = safeNumber(map.get(d)?.bookedUnits, 0);
      const utilizationPctDay =
        totalListedCapacity > 0 ? safeMoney((bookedUnitsDay / totalListedCapacity) * 100) : 0;
      return { date: d, bookedUnits: safeMoney(bookedUnitsDay), utilization: utilizationPctDay };
    });

    return res.status(200).json({
      success: true,
      from: toYMDUTC(from),
      to: toYMDUTC(to),
      totalListedCapacity,
      usedCapacity,
      utilizationPercentage,
      utilizationOverTime,
    });
  } catch (err) {
    console.error('admin dashboard getUtilization error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching utilization',
    });
  }
};

exports.getRisk = async (req, res) => {
  try {
    const { from, toExclusive } = parseRange(req);

    // Low-performing owners: high decline rate in range
    const agg = await Booking.aggregate([
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
      { $unwind: { path: '$placeDoc', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$placeDoc.owner',
          total: { $sum: 1 },
          declined: { $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          cancellationRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$declined', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { cancellationRate: -1, declined: -1, total: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'ownerDoc',
        },
      },
      { $unwind: { path: '$ownerDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ownerId: '$_id',
          ownerEmail: { $ifNull: ['$ownerDoc.email', ''] },
          ownerName: { $ifNull: ['$ownerDoc.name', ''] },
          totalBookings: '$total',
          declinedCount: '$declined',
          completedCount: '$completed',
          cancellationRate: 1,
        },
      },
    ]);

    const lowPerformingOwners = agg.map((o) => ({
      ownerId: o.ownerId,
      ownerEmail: o.ownerEmail || '',
      ownerName: o.ownerName || '',
      totalBookings: safeNumber(o.totalBookings, 0),
      declinedCount: safeNumber(o.declinedCount, 0),
      completedCount: safeNumber(o.completedCount, 0),
      cancellationRate: safeMoney(o.cancellationRate),
    }));

    return res.status(200).json({
      success: true,
      lowPerformingOwners,
    });
  } catch (err) {
    console.error('admin dashboard getRisk error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching risk monitoring',
    });
  }
};
