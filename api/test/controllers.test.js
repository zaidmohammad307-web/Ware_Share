const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-secret';

const User = require('../models/User');
const Place = require('../models/Place');
const Booking = require('../models/Booking');
const HostReview = require('../models/HostReview');
const userController = require('../controllers/userController');
const placeController = require('../controllers/placeController');
const bookingController = require('../controllers/bookingController');
const { PUBLIC_HOST_FIELDS } = require('../utils/publicFields');
const { mockRes, mockQuery } = require('./helpers');

const oid = () => new mongoose.Types.ObjectId().toString();

test('login gives the same answer for unknown email and wrong password', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  const unknown = mockRes();
  await userController.login(
    { body: { email: 'nobody@x.com', password: 'whatever1' } },
    unknown
  );

  t.mock.restoreAll();
  t.mock.method(User, 'findOne', async () => ({
    isValidatedPassword: async () => false,
  }));
  const wrong = mockRes();
  await userController.login(
    { body: { email: 'someone@x.com', password: 'whatever1' } },
    wrong
  );

  assert.equal(unknown.statusCode, 401);
  assert.deepEqual(unknown.body, wrong.body);
});

test('register rejects short passwords before touching the database', async (t) => {
  const findOne = t.mock.method(User, 'findOne', async () => null);
  const res = mockRes();
  await userController.register(
    { body: { name: 'A', email: 'a@x.com', password: 'short' } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(findOne.mock.callCount(), 0);
});

test('register rejects the reserved admin email', async (t) => {
  process.env.ADMIN_EMAIL = 'boss@wareshare.app';
  t.mock.method(User, 'findOne', async () => null);
  const res = mockRes();
  await userController.register(
    { body: { name: 'A', email: 'BOSS@wareshare.app', password: 'longenough1' } },
    res
  );
  assert.equal(res.statusCode, 403);
  delete process.env.ADMIN_EMAIL;
});

test('500 responses do not leak internal error messages', async (t) => {
  t.mock.method(User, 'findOne', async () => {
    throw new Error('connection string mongodb://secret@db');
  });
  const res = mockRes();
  await userController.login(
    { body: { email: 'a@x.com', password: 'whatever1' } },
    res
  );
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(JSON.stringify(res.body), /secret/);
});

test('hidden listing: 404 for the public, visible to its owner', async (t) => {
  const owner = oid();
  const doc = {
    _id: oid(),
    owner,
    status: 'hidden',
    toObject() {
      return { _id: this._id, owner, status: 'hidden' };
    },
  };
  t.mock.method(Place, 'findById', async () => doc);
  t.mock.method(HostReview, 'aggregate', async () => []);

  const anon = mockRes();
  await placeController.singlePlace({ params: { id: doc._id } }, anon);
  assert.equal(anon.statusCode, 404);

  const stranger = mockRes();
  await placeController.singlePlace(
    { params: { id: doc._id }, user: { id: oid() } },
    stranger
  );
  assert.equal(stranger.statusCode, 404);

  const mine = mockRes();
  await placeController.singlePlace(
    { params: { id: doc._id }, user: { id: owner } },
    mine
  );
  assert.equal(mine.statusCode, 200);
});

test('public host listings only populate public host fields', async (t) => {
  const calls = [];
  t.mock.method(Place, 'find', () => mockQuery([], calls));
  const res = mockRes();
  await placeController.getPlacesByHost({ params: { hostId: oid() } }, res);
  assert.equal(res.statusCode, 200);
  const populate = calls.find((c) => c[0] === 'populate');
  assert.equal(populate[2], PUBLIC_HOST_FIELDS);
  assert.doesNotMatch(PUBLIC_HOST_FIELDS, /taxId|businessRegNumber|phone/);
});

test('listing paging is capped and opt-in', () => {
  const { parsePaging } = placeController._test;
  assert.equal(parsePaging({}).paged, false);
  assert.equal(parsePaging({}).limit, 1000);
  assert.deepEqual(parsePaging({ page: '3', limit: '10' }), {
    paged: true,
    page: 3,
    limit: 10,
    skip: 20,
  });
  assert.equal(parsePaging({ limit: '100000' }).limit, 100);
});

test('only the renter can mark a booking as paid', async (t) => {
  const booking = { user: oid(), status: 'approved', save: async () => {} };
  t.mock.method(Booking, 'findById', () => mockQuery(booking));
  const res = mockRes();
  await bookingController.updateBookingPayment(
    { params: { id: oid() }, body: { paymentMethod: 'visa' }, user: { id: oid() } },
    res
  );
  assert.equal(res.statusCode, 403);
});
