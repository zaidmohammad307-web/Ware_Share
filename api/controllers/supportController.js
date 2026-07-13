// api/controllers/supportController.js
const WaitlistEntry = require('../models/WaitlistEntry');
const SupportTicket = require('../models/SupportTicket');
const { sendMail, emailWrap } = require('../utils/mailer');

// Loose on purpose: some accounts use non-standard emails (no TLD).
const EMAIL_RE = /^\S+@\S+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

/* ----------------------------------------
   📝 JOIN WAITLIST (public)
---------------------------------------- */
exports.joinWaitlist = async (req, res) => {
  try {
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const rawPhone = String(req.body.phone || '').trim();
    const name = String(req.body.name || '').trim().slice(0, 120) || null;
    const source = String(req.body.source || 'launch-page').trim().slice(0, 60);

    const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : null;
    const phone = rawPhone && PHONE_RE.test(rawPhone) ? rawPhone : null;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address or phone number.',
      });
    }

    // Friendly dedupe: same email or phone only counts once
    const dupe = await WaitlistEntry.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    }).select('_id');

    if (dupe) {
      return res.status(200).json({
        success: true,
        already: true,
        message: "You're already on the list — we'll be in touch at launch!",
      });
    }

    await WaitlistEntry.create({ email, phone, name, source });

    return res.status(201).json({
      success: true,
      message: "You're on the list! We'll contact you as soon as we launch.",
    });
  } catch (err) {
    console.error('joinWaitlist error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

/* ----------------------------------------
   📋 LIST WAITLIST (admin only)
---------------------------------------- */
exports.listWaitlist = async (req, res) => {
  try {
    const entries = await WaitlistEntry.find({})
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    return res.status(200).json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (err) {
    console.error('listWaitlist error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ----------------------------------------
   🛟 REPORT AN ISSUE (public, email optional-auth)
---------------------------------------- */
exports.reportIssue = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim().slice(0, 120) || null;
    const message = String(req.body.message || '').trim();
    const rawCategory = String(req.body.category || 'other').trim();

    const ALLOWED = ['bug', 'booking', 'payment', 'safety', 'listing', 'other'];
    const category = ALLOWED.includes(rawCategory) ? rawCategory : 'other';

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email is required so we can reply to you.',
      });
    }

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please describe the issue in a bit more detail (10+ characters).',
      });
    }

    const ticket = await SupportTicket.create({
      user: req.user?.id || null,
      name,
      email,
      category,
      message: message.slice(0, 5000),
    });

    // Notify the admin inbox if email is configured (fire-and-forget)
    if (process.env.ADMIN_EMAIL) {
      sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: `[WareShare support] New ${category} report`,
        html: emailWrap(`
          <p><strong>From:</strong> ${name || 'Anonymous'} (${email})</p>
          <p><strong>Category:</strong> ${category}</p>
          <p style="white-space: pre-line;">${message.slice(0, 2000)}</p>
        `),
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      ticketId: ticket._id,
      message: "Thanks — we've received your report and will get back to you by email.",
    });
  } catch (err) {
    console.error('reportIssue error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};
