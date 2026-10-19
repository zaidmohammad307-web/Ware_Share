// api/utils/publicFields.js
// User fields that are safe to show on public pages. hostProfile.phone,
// taxId and businessRegNumber are only visible to the host and the admin.
const PUBLIC_HOST_FIELDS = [
  'name',
  'picture',
  'hostProfile.companyName',
  'hostProfile.country',
  'hostProfile.city',
  'hostProfile.website',
  'hostProfile.about',
  'hostVerificationStatus',
  'isHostVerified',
  'role',
  'createdAt',
].join(' ');

module.exports = { PUBLIC_HOST_FIELDS };
