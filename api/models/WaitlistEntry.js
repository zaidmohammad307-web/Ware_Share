// api/models/WaitlistEntry.js
const mongoose = require('mongoose');

const waitlistEntrySchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    name: { type: String, trim: true, default: null },

    // where the signup came from (e.g. 'launch-page')
    source: { type: String, trim: true, default: 'launch-page' },

    contacted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

waitlistEntrySchema.index({ email: 1 }, { sparse: true });
waitlistEntrySchema.index({ phone: 1 }, { sparse: true });

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema);
