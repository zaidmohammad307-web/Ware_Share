// api/models/SupportTicket.js
const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // anonymous reports allowed
    },
    name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, required: true },
    category: {
      type: String,
      enum: ['bug', 'booking', 'payment', 'safety', 'listing', 'other'],
      default: 'other',
    },
    message: { type: String, trim: true, required: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
