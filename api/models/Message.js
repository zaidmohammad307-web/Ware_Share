const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // If this message belongs to a booking chat, booking is set.
    // If this message is a pre-booking place inquiry, booking is null.
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },

    place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true },
    renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },

    // Has the recipient (the non-sender participant) seen this message?
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ host: 1, read: 1 });
messageSchema.index({ renter: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);

