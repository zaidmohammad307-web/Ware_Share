// api/controllers/userController.js
const User = require('../models/User');
const cookieToken = require('../utils/cookieToken');
const { buildSafeUser } = cookieToken;
const cloudinary = require('cloudinary').v2;

/* ------------------------------------------------
   REGISTER / SIGNUP
-------------------------------------------------*/
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
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
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   LOGIN
-------------------------------------------------*/
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required!',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'User does not exist!',
      });
    }

    const isPasswordCorrect = await user.isValidatedPassword(password);
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
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   GOOGLE LOGIN
-------------------------------------------------*/
exports.googleLogin = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required',
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      user = await User.create({
        name,
        email,
        // Store a random password; hashing happens in the User model pre-save hook.
        password: randomPassword,
      });
    }

    cookieToken(user, res);
  } catch (err) {
    console.error('googleLogin error:', err);
    res.status(500).json({
      message: 'Internal server Error',
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   UPLOAD PROFILE PICTURE
-------------------------------------------------*/
exports.uploadPicture = async (req, res) => {
  try {
    const { path } = req.file;

    let result = await cloudinary.uploader.upload(path, {
      folder: 'Airbnb/Users',
    });

    res.status(200).json(result.secure_url);
  } catch (error) {
    console.error('uploadPicture error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Internal server error',
    });
  }
};

/* ------------------------------------------------
   UPDATE USER (name / password / picture)
   FIXES:
   - endpoint is now auth-protected in routes
   - updates by req.user.id (not by arbitrary email)
   - avoids double-hashing (let model pre-save hook hash once)
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

    if (name) user.name = name;
    if (picture) user.picture = picture;

    // IMPORTANT: Do not hash here; the User model will hash on save.
    if (password) user.password = password;

    const updatedUser = await user.save();
    cookieToken(updatedUser, res);
  } catch (error) {
    console.error('updateUserDetails error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/* ------------------------------------------------
   HOST VERIFICATION (USER SIDE)
   POST /users/host/verify  (isLoggedIn + multer.fields)
   FIX: return safe user projection (no password hash)
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
      const uploadRes = await cloudinary.uploader.upload(
        files.idDocument[0].path,
        { folder: 'Airbnb/HostVerification' }
      );
      newFiles.push({ url: uploadRes.secure_url, label: 'ID document' });
    }

    if (files.companyDocument && files.companyDocument[0]) {
      const uploadRes = await cloudinary.uploader.upload(
        files.companyDocument[0].path,
        { folder: 'Airbnb/HostVerification' }
      );
      newFiles.push({
        url: uploadRes.secure_url,
        label: 'Company / warehouse document',
      });
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
    console.error('submitHostVerification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while submitting verification',
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   ADMIN: GET PENDING HOSTS
   GET /users/admin/hosts/pending
-------------------------------------------------*/
exports.getPendingHosts = async (req, res) => {
  try {
    const pendingHosts = await User.find({
      hostVerificationStatus: 'pending',
    }).select(
      'name email hostProfile hostVerificationStatus hostVerificationNotes hostVerificationFiles wantsToHost createdAt updatedAt'
    );

    return res.status(200).json({
      success: true,
      hosts: pendingHosts,
    });
  } catch (err) {
    console.error('getPendingHosts error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching pending hosts',
      error: err.message,
    });
  }
};

// ------------------------------------------------
// HOST VERIFICATION (ADMIN SIDE)
// PUT /users/admin/hosts/:userId/verify
// FIX: return safe user projection (no password hash)
// ------------------------------------------------
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
    if (note) user.hostVerificationNotes = note;

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
      message: 'Internal server error while changing host status',
      error: err.message,
    });
  }
};

// ------------------------------------------------
// HOST SETTINGS (no file upload, just fields)
// PUT /users/host/settings
// FIX: return safe user projection (no password hash)
// ------------------------------------------------
exports.updateHostSettings = async (req, res) => {
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
      phone,
      companyName,
      country,
      city,
      taxId,
      businessRegNumber,
      website,
      about,
      wantsToHost,
      isHost, // old frontend – map to wantsToHost
    } = req.body;

    if (!user.hostProfile) user.hostProfile = {};

    if (phone) user.hostProfile.phone = phone;
    if (companyName) user.hostProfile.companyName = companyName;
    if (country) user.hostProfile.country = country;
    if (city) user.hostProfile.city = city;
    if (taxId) user.hostProfile.taxId = taxId;
    if (businessRegNumber)
      user.hostProfile.businessRegNumber = businessRegNumber;
    if (website) user.hostProfile.website = website;
    if (about) user.hostProfile.about = about;

    if (typeof wantsToHost === 'boolean') user.wantsToHost = wantsToHost;
    else if (typeof isHost === 'boolean') user.wantsToHost = isHost;

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
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   LOGOUT
   FIX: clear cookie using same attributes as set-cookie
-------------------------------------------------*/
exports.logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out',
  });
};
