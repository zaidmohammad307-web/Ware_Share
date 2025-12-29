// api/models/Place.js
const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // BASIC INFO
    title: { type: String, required: true },
    address: { type: String, required: true },
    photos: [{ type: String }],
    description: { type: String },
    perks: [{ type: String }],
    extraInfo: { type: String },
    maxGuests: { type: Number },
    price: { type: Number }, // legacy

    // listing status
    status: {
      type: String,
      enum: ['live', 'hidden'],
      default: 'live',
    },

    // CAPACITY & SPACE
    totalArea: { type: Number },
    availableArea: { type: Number },
    ceilingHeight: { type: Number },
    palletCapacity: { type: Number },
    loadingDocks: { type: Number },
    floorLoadCapacity: { type: Number },

    rackAvailability: { type: Boolean, default: false },
    rackType: {
      type: String,
      enum: ['selective', 'drive-in', 'pallet-flow', 'cantilever', 'none'],
      default: 'none',
    },

    spaceType: {
      type: String,
      enum: ['open-floor', 'racked', 'yard', 'room'],
      default: 'open-floor',
    },

    // WAREHOUSE TYPE
    warehouseType: [
      {
        type: String,
        enum: [
          'general',
          'cold',
          'frozen',
          'dry',
          'hazmat',
          'bonded',
          'fulfillment',
          'cross-docking',
        ],
      },
    ],

    // EQUIPMENT
    equipment: [
      {
        type: String,
        enum: [
          'forklift',
          'electric-pallet-jack',
          'manual-pallet-jack',
          'reach-truck',
          'stacker',
          'conveyor',
          'crane',
          'racks',
          'chillers',
          'freezers',
          'ventilation',
          'loading-dock',
          'dock-leveler',
          'ramp',
          'roll-up-door',
        ],
      },
    ],

    // SAFETY & SECURITY
    CCTV: { type: Boolean, default: false },
    securityGuards: { type: Boolean, default: false },
    fireSuppression: { type: Boolean, default: false },
    smokeDetectors: { type: Boolean, default: false },
    insurance: { type: Boolean, default: false },
    hazmatCert: { type: Boolean, default: false },
    foodGradeCert: { type: Boolean, default: false },
    ISOcert: { type: String },
    hazmatRestrictions: { type: String },

    // LOCATION & ACCESS
    city: { type: String },
    zone: { type: String },
    gps: { type: String },

    truckAccess: [
      {
        type: String,
        enum: ['20ft', '40ft', 'trailer'],
      },
    ],

    parkingAvailable: { type: Boolean, default: false },

    // AVAILABILITY & SCHEDULING
    minBookingDays: { type: Number },
    maxBookingDays: { type: Number },
    checkIn: { type: String },
    checkOut: { type: String },
    peakSeason: { type: Boolean, default: false },

    // PRICING
    pricePerDay: { type: Number },
    pricePerPallet: { type: Number },
    loadingFee: { type: Number },
    tempControlFee: { type: Number },

    // ✅ NEW: negotiable price flag
    negotiablePrice: { type: Boolean, default: false },

    // SERVICES
    services: [
      {
        type: String,
        enum: [
          'inventory-management',
          'labeling-packaging',
          'picking-packing',
          'quality-inspection',
          'transportation',
          'customs-clearance',
          'cross-docking',
        ],
      },
    ],

    // GOODS
    allowedGoods: [
      {
        type: String,
        enum: [
          'fmcg',
          'electronics',
          'pharma',
          'clothing',
          'automotive',
          'industrial',
          'food',
          'chemicals',
        ],
      },
    ],

    prohibitedGoods: [{ type: String }],
  },
  { timestamps: true }
);

const Place = mongoose.model('Place', placeSchema);
module.exports = Place;
