// api/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    // BASIC
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    picture: {
      type: String,
      required: true,
      default:
        'https://res.cloudinary.com/rahul4019/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1695133265/pngwing.com_zi4cre.png',
    },

    /* =====================================================
       HOSTING CAPABILITY (UNIVERSAL ACCOUNT)
       ===================================================== */

    // Simple role helper (can still rent even if host)
    role: {
      type: String,
      enum: ['renter', 'host', 'both'],
      default: 'renter',
    },

    // When user ticks "I want to host" at signup/profile
    wantsToHost: {
      type: Boolean,
      default: false,
    },

    // Extra info when someone wants to host
    hostProfile: {
      companyName: { type: String, trim: true },
      phone: { type: String, trim: true },
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      taxId: { type: String, trim: true }, // optional VAT / Tax ID
      businessRegNumber: { type: String, trim: true },
      website: { type: String, trim: true },
      about: { type: String, trim: true }, // short "About the host"
    },

    /* =====================================================
       HOST VERIFICATION
       ===================================================== */

    // Fast check for UI badges
    isHostVerified: {
      type: Boolean,
      default: false,
    },

    // Status for review flow
    hostVerificationStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
    },

    // Optional note from admin (e.g. why rejected)
    hostVerificationNotes: {
      type: String,
      trim: true,
    },

    // Files uploaded by host for verification
    // (stored as URLs from Cloudinary / S3)
    hostVerificationFiles: [
      {
        url: { type: String, required: true },
        label: { type: String, trim: true }, // e.g. "ID card", "Commercial registry"
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ð Encrypt password before saving it into the DB
userSchema.pre('save', async function (next) {
  // Only hash if password was created/changed
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ð Create and return JWT token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};

// â Validate the password
userSchema.methods.isValidatedPassword = async function (userSentPassword) {
  return await bcrypt.compare(userSentPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
