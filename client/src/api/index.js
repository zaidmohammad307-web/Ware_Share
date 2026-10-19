// client/src/api/index.js
// Every backend endpoint the app calls, in one place. Each function returns
// the axios promise, so callers keep using `const { data } = await ...`.
// When an endpoint changes, this is the only file that needs updating.
import http from '@/utils/axios';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const authApi = {
  register: (body) => http.post('/users/register', body),
  login: (body) => http.post('/users/login', body),
  googleLogin: (body) => http.post('/users/google/login', body),
  logout: () => http.post('/users/logout'),
};

export const usersApi = {
  uploadPicture: (formData) =>
    http.post('/users/upload-picture', formData, multipart),
  update: (body) => http.put('/users/update-user', body),
  updateHostSettings: (body) => http.put('/users/host/settings', body),
  submitHostVerification: (formData) =>
    http.post('/users/host/verify', formData, multipart),
  favorites: () => http.get('/users/favorites'),
  toggleFavorite: (placeId) => http.put(`/users/favorites/${placeId}`),
  mergeFavorites: (body) => http.post('/users/favorites/merge', body),
};

export const placesApi = {
  list: (config) => http.get('/places', config),
  get: (id) => http.get(`/places/${id}`),
  mine: () => http.get('/places/user-places'),
  byHost: (hostId) => http.get(`/places/host/${hostId}`),
  create: (body) => http.post('/places/add-places', body),
  update: (body) => http.put('/places/update-place', body),
  updateStatus: (id, body) => http.patch(`/places/${id}/status`, body),
  remove: (id) => http.delete(`/places/${id}`),
  blockedDates: (id) => http.get(`/places/${id}/blocked-dates`),
  updateBlockedDates: (id, body) => http.put(`/places/${id}/blocked-dates`, body),
};

export const bookingsApi = {
  insuranceConfig: () => http.get('/bookings/insurance-config'),
  availability: (placeId) => http.get(`/bookings/availability/${placeId}`),
  mine: () => http.get('/bookings'),
  owner: () => http.get('/bookings/owner'),
  create: (body) => http.post('/bookings', body),
  updateStatus: (id, body) => http.put(`/bookings/${id}/status`, body),
  pay: (id, body) => http.put(`/bookings/${id}/payment`, body),
};

export const reviewsApi = {
  forPlace: (placeId) => http.get(`/reviews/place/${placeId}`),
  forHost: (hostId) => http.get(`/reviews/host/${hostId}`),
  forRenter: (renterId) => http.get(`/reviews/renter/${renterId}`),
  createPlaceReview: (body) => http.post('/reviews/place', body),
  createRenterReview: (body) => http.post('/reviews/renter', body),
};

export const chatApi = {
  inbox: () => http.get('/chat/inbox'),
  unread: () => http.get('/chat/unread'),
  bookingThread: (bookingId) => http.get(`/chat/booking/${bookingId}`),
  placeThread: (placeId, renterId) =>
    http.get(`/chat/place/${placeId}`, {
      params: renterId ? { renterId } : undefined,
    }),
};

export const uploadsApi = {
  byLink: (body) => http.post('/upload-by-link', body),
  photos: (formData) => http.post('/upload', formData, multipart),
};

export const geoApi = {
  reverse: (config) => http.get('/geo/reverse', config),
  search: (config) => http.get('/geo/search', config),
};

export const dashboardApi = {
  summary: (config) => http.get('/dashboard/summary', config),
  renter: (config) => http.get('/dashboard/renter', config),
  owner: (config) => http.get('/dashboard/owner', config),
};

export const adminApi = {
  summary: (config) => http.get('/admin/dashboard/summary', config),
  bookings: (config) => http.get('/admin/dashboard/bookings', config),
  utilization: (config) => http.get('/admin/dashboard/utilization', config),
  risk: (config) => http.get('/admin/dashboard/risk', config),
  pendingHosts: () => http.get('/users/admin/hosts/pending'),
  verifyHost: (userId, body) => http.put(`/users/admin/hosts/${userId}/verify`, body),
};

export const supportApi = {
  joinWaitlist: (body) => http.post('/waitlist', body),
  waitlist: () => http.get('/waitlist'),
  reportIssue: (body) => http.post('/support/report', body),
  tickets: () => http.get('/support/tickets'),
  updateTicket: (id, body) => http.patch(`/support/tickets/${id}`, body),
};
