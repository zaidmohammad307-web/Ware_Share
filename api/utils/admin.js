// api/utils/admin.js
// The admin account is identified by the ADMIN_EMAIL env var. There is no
// fallback: if it is unset, nobody is admin.
const getAdminEmail = () =>
  String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

const isAdminEmail = (email) => {
  const admin = getAdminEmail();
  return !!admin && String(email || '').trim().toLowerCase() === admin;
};

module.exports = { getAdminEmail, isAdminEmail };
