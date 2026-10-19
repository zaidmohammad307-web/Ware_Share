const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const { isAdminEmail } = require('../utils/admin');
const { matchesSignature, assertFileSignature } = require('../utils/fileSignature');
const { buildSafeUser } = require('../utils/cookieToken');
const { isAdmin, optionalUser } = require('../middlewares/user');
const { mockRes } = require('./helpers');

test('nobody is admin when ADMIN_EMAIL is unset (no hardcoded fallback)', () => {
  delete process.env.ADMIN_EMAIL;
  assert.equal(isAdminEmail('admin@123456'), false);
  assert.equal(isAdminEmail(''), false);
});

test('admin email match is case-insensitive', () => {
  process.env.ADMIN_EMAIL = 'Boss@WareShare.app';
  assert.equal(isAdminEmail('boss@wareshare.app'), true);
  assert.equal(isAdminEmail('other@wareshare.app'), false);
  delete process.env.ADMIN_EMAIL;
});

test('isAdmin middleware rejects non-admins with 403', () => {
  process.env.ADMIN_EMAIL = 'boss@wareshare.app';
  const res = mockRes();
  let called = false;
  isAdmin({ user: { email: 'renter@x.com' } }, res, () => (called = true));
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  delete process.env.ADMIN_EMAIL;
});

test('file signature check accepts real headers and rejects spoofed ones', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const pdf = Buffer.from('%PDF-1.7\n....');
  const html = Buffer.from('<html><script>');
  assert.equal(matchesSignature(png, 'image/png'), true);
  assert.equal(matchesSignature(pdf, 'application/pdf'), true);
  assert.equal(matchesSignature(html, 'image/png'), false);
  assert.equal(matchesSignature(png, 'image/jpeg'), false);
});

test('assertFileSignature throws a 400 for a disguised file', async () => {
  const p = path.join(os.tmpdir(), `sig-${process.pid}.png`);
  fs.writeFileSync(p, '<svg onload=alert(1)>not a png</svg>');
  try {
    await assert.rejects(assertFileSignature(p, 'image/png'), (e) => e.status === 400);
  } finally {
    fs.unlinkSync(p);
  }
});

test('safe user never exposes password or verification document URLs', () => {
  const safe = buildSafeUser({
    _id: 'u1',
    name: 'A',
    email: 'a@x.com',
    password: 'hash',
    hostVerificationFiles: [
      { _id: 'f1', url: 'https://res.cloudinary.com/secret.pdf', label: 'ID', uploadedAt: new Date() },
    ],
  });
  assert.equal('password' in safe, false);
  assert.equal(safe.hostVerificationFiles[0].url, undefined);
  assert.equal(safe.hostVerificationFiles[0].label, 'ID');
  assert.equal(safe.isAdmin, false);
});

test('optionalUser sets req.user for a valid token and ignores bad ones', () => {
  const good = jwt.sign({ id: 'abc' }, process.env.JWT_SECRET);
  const req1 = { headers: { authorization: `Bearer ${good}` } };
  optionalUser(req1, mockRes(), () => {});
  assert.equal(req1.user.id, 'abc');

  const req2 = { headers: { authorization: 'Bearer not-a-token' } };
  let nextCalled = false;
  optionalUser(req2, mockRes(), () => (nextCalled = true));
  assert.equal(req2.user, undefined);
  assert.equal(nextCalled, true);
});
