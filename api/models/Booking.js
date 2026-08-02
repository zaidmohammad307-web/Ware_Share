// api/models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: true,
    },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    noOfGuests: { type: Number, required: true },

    // Space booked in m². null = the full warehouse (legacy bookings too).
    areaM2: { type: Number, default: null },

    name: { type: String, required: true },
    phone: { type: String, required: true },

    // Base booking price (legacy field used across UI)
    price: { type: Number, required: true },

    // Booking lifecycle
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'completed'],
      default: 'pending',
    },

    // Dummy payment
    paymentStatus: {
      type: String,
      enum: ['not_yet', 'not_paid', 'paid'],
      default: 'not_yet',
    },
    paymentMethod: {
      type: String,
      enum: ['apple_pay', 'visa', 'cash', null],
      default: null,
    },

    // Optional insurance (safe defaults if feature not enabled yet)
    insuranceSelected: { type: Boolean, default: false },
    insuranceDeclaredValue: { type: Number, default: null },
    insuranceTier: {
      type: String,
      enum: ['standard', 'high', null],
      default: null,
    },
    insuranceRatePerDayUsed: { type: Number, default: 0 },
    insuranceMinFeeUsed: { type: Number, default: 0 },
    insuranceFee: { type: Number, default: 0 },

    // Packing add-on
    packingSelected: { type: Boolean, default: false },
    packingType: {
      type: String,
      enum: ['basic', 'standard', 'fragile', null],
      default: null,
    },
    packingUnitsType: {
      type: String,
      enum: ['boxes', 'pallets', null],
      default: null,
    },
    packingUnitsCount: { type: Number, default: null },
    packingFee: { type: Number, default: 0 },
    packingStatus: {
      type: String,
      enum: ['none', 'requested', 'accepted', 'declined', 'completed'],
      default: 'none',
    },
    packingRateUsed: { type: Number, default: 0 },
    packingMinFeeUsed: { type: Number, default: 0 },

    // Delivery add-on
    deliverySelected: { type: Boolean, default: false },
    deliveryType: {
      type: String,
      enum: ['pickup_to_warehouse', 'warehouse_to_dropoff', 'round_trip', null],
      default: null,
    },
    pickupCity: { type: String, default: null },
    dropoffCity: { type: String, default: null },
    pickupAddressText: { type: String, default: null },
    dropoffAddressText: { type: String, default: null },
    deliveryTimeWindow: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', null],
      default: null,
    },
    deliveryFee: { type: Number, default: 0 },
    deliveryStatus: {
      type: String,
      enum: [
        'none',
        'requested',
        'accepted',
        'declined',
        'scheduled',
        'in_transit',
        'delivered',
      ],
      default: 'none',
    },
    deliveryZoneUsed: { type: String, default: null }, // A / B / C
    deliveryBundleDiscountUsed: { type: Number, default: 0 },

    // Total = base + add-ons (source of truth for payment UI)
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hot paths: the overlap scan on every booking creation, and the
// renter's own bookings list.
bookingSchema.index({ place: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;

