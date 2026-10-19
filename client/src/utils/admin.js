// client/src/utils/admin.js
// UI-only check for showing admin links/pages. The server enforces admin
// access on every admin endpoint; this just decides what to render.
// `isAdmin` comes from the API; the email check covers users whose stored
// session predates that field.
const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();

export const isAdminUser = (user) => {
  if (!user) return false;
  if (typeof user.isAdmin === 'boolean') return user.isAdmin;
  return (
    !!ADMIN_EMAIL && String(user.email || '').toLowerCase() === ADMIN_EMAIL
  );
};
