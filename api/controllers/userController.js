// api/controllers/userController.js
const User = require('../models/User');
const cookieToken = require('../utils/cookieToken');
const { buildSafeUser } = cookieToken;
const cloudinary = require('cloudinary').v2;
const fs = require('fs/promises');
const { isAdminEmail } = require('../utils/admin');
const { assertFileSignature } = require('../utils/fileSignature');

const MIN_PASSWORD_LENGTH = 8;

// ID / company documents are personal data, so they are stored as
// "authenticated" Cloudinary assets: the plain URL does not work, and only
// the admin endpoint hands out signed links.
async function uploadHostVerificationFile(file, label) {
  if (!file || !file.path) return null;
  try {
    await assertFileSignature(file.path, file.mimetype);
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder: 'WareShare/HostVerification',
      resource_type: 'auto',
      type: 'authenticated',
    });
    return {
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      resourceType: uploadRes.resource_type,
      format: uploadRes.format,
      version: uploadRes.version,
      deliveryType: 'authenticated',
      label,
    };
  } finally {
    // Best-effort cleanup of temp upload
    try {
      await fs.unlink(file.path);
    } catch (_) {
      // ignore
    }
  }
}

// The admin account is identified purely by email, so that address is
// reserved: nobody may register or sign in with it via Google.
const isReservedAdminEmail = isAdminEmail;

// Signed, non-guessable link to a private verification document.
const signedVerificationUrl = (f) => {
  if (!f || f.deliveryType !== 'authenticated' || !f.publicId) return f && f.url;
  return cloudinary.url(f.publicId, {
    type: 'authenticated',
    resource_type: f.resourceType || 'image',
    format: f.format,
    version: f.version,
    sign_url: true,
    secure: true,
  });
};

/* ------------------------------------------------
   REGISTER / SIGNUP
-------------------------------------------------*/
exports.register = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    // Coerce to strings so objects like {$ne: null} cannot reach the query
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    if (isReservedAdminEmail(email)) {
      return res.status(403).json({
        message: 'This email address is reserved.',
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: 'User already registered!',
      });
    }

    user = await User.create({
      name,
      email,
      password,
    });

    cookieToken(user, res);
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({
      message: 'Internal server Error',
    });
  }
};

/* ------------------------------------------------
   LOGIN
-------------------------------------------------*/
exports.login = async (req, res) => {
  try {
    // Coerce to strings so operator objects cannot reach the query
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required!',
      });
    }

    // Same response for unknown email and wrong password, so the endpoint
    // cannot be used to discover which emails have accounts.
    const user = await User.findOne({ email });
    const isPasswordCorrect = user
      ? await user.isValidatedPassword(password)
      : false;
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: 'Email or password is incorrect!',
      });
    }

    cookieToken(user, res);
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({
      message: 'Internal server Error',
    });
  }
};

/* ------------------------------------------------
   GOOGLE LOGIN (server-side token verification)
-------------------------------------------------*/
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: 'Google credential token is required',
      });
    }

    // Verify the Google ID token server-side
    let name, email;
    try {
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      name = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim();
      email = payload.email;
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({
        message: 'Invalid Google credential',
      });
    }

    if (!name || !email) {
      return res.status(400).json({
        message: 'Could not extract name and email from Google token',
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      if (isReservedAdminEmail(email)) {
        return res.status(403).json({
          message: 'This email address is reserved.',
        });
      }
      const randomPassword = require('crypto').randomBytes(16).toString('hex');
      user = await User.create({
        name,
        email,
        password: randomPassword,
      });
    }

    cookieToken(user, res);
  } catch (err) {
    console.error('googleLogin error:', err);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ------------------------------------------------
   UPLOAD PROFILE PICTURE
-------------------------------------------------*/
exports.uploadPicture = async (req, res) => {
  let filePath = null;
  try {
    filePath = req.file && req.file.path;
    if (!filePath) {
      return res.status(400).json({ message: 'No file provided' });
    }

    await assertFileSignature(filePath, req.file.mimetype);

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'WareShare/Users',
      resource_type: 'image',
    });

    return res.status(200).json(result.secure_url);
  } catch (error) {
    if (error && error.status === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('uploadPicture error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (_) {
        // ignore
      }
    }
  }
};

/* ------------------------------------------------
   UPDATE USER (name / password / picture)
-------------------------------------------------*/
exports.updateUserDetails = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { name, password, email, picture } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: 'Not authenticated',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Backward compatibility: frontend may still send email.
    // Do not allow editing a different account by email.
    if (
      email &&
      String(email).toLowerCase() !== String(user.email).toLowerCase()
    ) {
      return res.status(403).json({
        message: 'You are not allowed to update another user',
      });
    }

    if (name) user.name = String(name).trim();
    if (picture) {
      // Only accept https image URLs (normally our own Cloudinary uploads)
      if (!/^https:\/\//i.test(String(picture))) {
        return res.status(400).json({ message: 'Invalid picture URL' });
      }
      user.picture = String(picture);
    }

    // Changing a password requires proving knowledge of the current one,
    // so a stolen token cannot be turned into account takeover.
    if (password) {
      if (String(password).length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }
      const currentPassword = String(req.body.currentPassword || '');
      if (!currentPassword) {
        return res.status(400).json({
          message: 'Your current password is required to set a new one.',
        });
      }
      const ok = await user.isValidatedPassword(currentPassword);
      if (!ok) {
        return res.status(401).json({
          message: 'Current password is incorrect.',
        });
      }
      // IMPORTANT: Do not hash here; the User model will hash on save.
      user.password = String(password);
    }

    const updatedUser = await user.save();
    cookieToken(updatedUser, res);
  } catch (error) {
    console.error('updateUserDetails error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
};

/* ------------------------------------------------
   HOST SETTINGS (USER SIDE)
-------------------------------------------------*/
exports.updateHostSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wantsToHost, isHost, role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Accept both 'wantsToHost' and 'isHost' (frontend compat)
    const hostValue = wantsToHost !== undefined ? wantsToHost : isHost;
    if (typeof hostValue === 'boolean') user.wantsToHost = hostValue;
    const ALLOWED_ROLES = ['renter', 'host', 'both'];
    if (role && ALLOWED_ROLES.includes(role)) user.role = role;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Host settings updated',
      user: buildSafeUser(user),
    });
  } catch (err) {
    console.error('updateHostSettings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating host settings',
    });
  }
};

/* ------------------------------------------------
   HOST VERIFICATION (USER SIDE)
   POST /users/host/verify  (isLoggedIn + multer.fields)
-------------------------------------------------*/
exports.submitHostVerification = async (req, res) => {
  try {
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      companyName,
      phone,
      country,
      city,
      taxId,
      businessRegNumber,
      website,
      about,
    } = req.body;

    const files = req.files || {};

    // Build new uploaded file entries
    const newFiles = [];

    if (files.idDocument && files.idDocument[0]) {
      const uploaded = await uploadHostVerificationFile(
        files.idDocument[0],
        'ID document'
      );
      if (uploaded) newFiles.push(uploaded);
    }

    if (files.companyDocument && files.companyDocument[0]) {
      const uploaded = await uploadHostVerificationFile(
        files.companyDocument[0],
        'Company / warehouse document'
      );
      if (uploaded) newFiles.push(uploaded);
    }

    if (!newFiles.length && !companyName && !phone) {
      return res.status(400).json({
        success: false,
        message:
          'Please upload at least one document or provide basic host information.',
      });
    }

    // Ensure hostProfile exists
    if (!user.hostProfile) user.hostProfile = {};

    // Update host profile basic info
    if (companyName) user.hostProfile.companyName = companyName;
    if (phone) user.hostProfile.phone = phone;
    if (country) user.hostProfile.country = country;
    if (city) user.hostProfile.city = city;
    if (taxId) user.hostProfile.taxId = taxId;
    if (businessRegNumber)
      user.hostProfile.businessRegNumber = businessRegNumber;
    if (website) user.hostProfile.website = website;
    if (about) user.hostProfile.about = about;

    // Append uploaded files into hostVerificationFiles
    if (!user.hostVerificationFiles) user.hostVerificationFiles = [];
    user.hostVerificationFiles.push(...newFiles);

    // Core verification flags
    user.wantsToHost = true;
    user.hostVerificationStatus = 'pending';
    user.isHostVerified = false;
    user.hostVerificationNotes = '';

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Host verification submitted. We will review your documents.',
      user: buildSafeUser(user),
    });
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('submitHostVerification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while submitting verification',
    });
  }
};

/* ------------------------------------------------
   ADMIN: GET PENDING HOSTS
-------------------------------------------------*/
exports.getPendingHosts = async (req, res) => {
  try {
    const pendingHosts = await User.find({
      hostVerificationStatus: 'pending',
    })
      .select(
        'name email hostProfile hostVerificationStatus hostVerificationNotes hostVerificationFiles wantsToHost createdAt updatedAt'
      )
      .lean();

    const hosts = pendingHosts.map((h) => ({
      ...h,
      hostVerificationFiles: (h.hostVerificationFiles || []).map((f) => ({
        _id: f._id,
        label: f.label,
        uploadedAt: f.uploadedAt,
        url: signedVerificationUrl(f),
      })),
    }));

    return res.status(200).json({
      success: true,
      hosts,
    });
  } catch (err) {
    console.error('getPendingHosts error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching pending hosts',
    });
  }
};

/* ------------------------------------------------
   ADMIN: VERIFY HOST
-------------------------------------------------*/
exports.adminVerifyHost = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, note } = req.body; // 'approved' | 'rejected' | 'pending'

    let newStatus;
    if (status === 'approved') newStatus = 'approved';
    else if (status === 'rejected') newStatus = 'rejected';
    else if (status === 'pending') newStatus = 'pending';
    else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.hostVerificationStatus = newStatus;
    user.isHostVerified = newStatus === 'approved';
    if (note) user.hostVerificationNotes = String(note).slice(0, 2000);

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Host verification ${newStatus}`,
      user: buildSafeUser(user),
    });
  } catch (err) {
    console.error('adminVerifyHost error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying host',
    });
  }
};

/* =====================================================
   FAVORITES (synced saved places)
   ===================================================== */
const mongooseFav = require('mongoose');

exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('favorites');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      ids: (user.favorites || []).map(String),
    });
  } catch (err) {
    console.error('getFavorites error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const { placeId } = req.params;
    if (!mongooseFav.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ success: false, message: 'Invalid placeId' });
    }

    const user = await User.findById(req.user.id).select('favorites');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const current = (user.favorites || []).map(String);
    if (current.includes(placeId)) {
      user.favorites = user.favorites.filter((id) => String(id) !== placeId);
    } else {
      user.favorites.push(placeId);
    }

    await user.save();
    return res.status(200).json({
      success: true,
      ids: user.favorites.map(String),
    });
  } catch (err) {
    console.error('toggleFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// One-time merge of device favorites into the account after login
exports.mergeFavorites = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'ids must be an array' });
    }

    const valid = ids
      .filter((id) => mongooseFav.Types.ObjectId.isValid(String(id)))
      .slice(0, 500);

    const user = await User.findById(req.user.id).select('favorites');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const set = new Set((user.favorites || []).map(String));
    valid.forEach((id) => set.add(String(id)));
    user.favorites = Array.from(set);

    await user.save();
    return res.status(200).json({
      success: true,
      ids: user.favorites.map(String),
    });
  } catch (err) {
    console.error('mergeFavorites error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
