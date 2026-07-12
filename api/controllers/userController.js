// api/controllers/userController.js
const User = require('../models/User');
const cookieToken = require('../utils/cookieToken');
const { buildSafeUser } = cookieToken;
const cloudinary = require('cloudinary').v2;
const fs = require('fs/promises');

// Upload any file type (image/pdf) to Cloudinary and remove temp file
async function uploadHostVerificationFile(file, label) {
  if (!file || !file.path) return null;
  try {
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder: 'Airbnb/HostVerification',
      resource_type: 'auto',
    });
    return { url: uploadRes.secure_url, label };
  } finally {
    // Best-effort cleanup of temp upload
    try {
      await fs.unlink(file.path);
    } catch (_) {
      // ignore
    }
  }
}

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
      error: err.message,
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

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'Airbnb/Users',
      resource_type: 'image',
    });

    return res.status(200).json(result.secure_url);
  } catch (error) {
    console.error('uploadPicture error:', error);
    return res.status(500).json({
      error: error.message,
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
    const ALLOWED_ROLES = ['user', 'host'];
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
      error: err.message,
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
      message: 'Internal server error while verifying host',
      error: err.message,
    });
  }
};
