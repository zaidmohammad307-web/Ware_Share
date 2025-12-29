// client/src/pages/OwnerBookingsPage.jsx
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

import axiosInstance from '@/utils/axios';
import AccountNav from '../components/ui/AccountNav';

const normalizeId = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    const inner = v?._id || v?.id;
    if (inner) return normalizeId(inner);
  }
  const s = String(v).trim();
  if (!s) return null;
  if (s === 'undefined' || s === 'null') return null;
  return s;
};

const OwnerBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [renterReviewForm, setRenterReviewForm] = useState({});

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/bookings/owner');
      setBookings(data.bookings || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load booking requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const updateStatus = async (bookingId, status) => {
    try {
      const { data } = await axiosInstance.put(`/bookings/${bookingId}/status`, { status });
      toast.success(data.message || `Booking ${status} successfully.`);

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, ...data.booking } : b))
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to update booking status.');
    }
  };

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800' };
      case 'not_paid':
        return { label: 'Not paid', cls: 'bg-amber-100 text-amber-800' };
      case 'not_yet':
      default:
        return { label: 'Not available yet', cls: 'bg-gray-100 text-gray-700' };
    }
  };

  const handleRenterReviewChange = (bookingId, field, value) => {
    setRenterReviewForm((prev) => ({
      ...prev,
      [bookingId]: {
        rating: prev[bookingId]?.rating ?? 5,
        comment: prev[bookingId]?.comment ?? '',
        submitted: prev[bookingId]?.submitted ?? false,
        [field]: value,
      },
    }));
  };

  const handleSubmitRenterReview = async (bookingId) => {
    const form = renterReviewForm[bookingId] || { rating: 5, comment: '', submitted: false };

    try {
      await axiosInstance.post('/reviews/renter', {
        bookingId,
        rating: form.rating,
        comment: form.comment,
      });

      toast.success('Renter review submitted.');

      setRenterReviewForm((prev) => ({
        ...prev,
        [bookingId]: { ...form, submitted: true },
      }));
    } catch (error) {
      console.error(error);
      const msg = error?.response?.data?.message || 'Failed to submit renter review.';
      toast.error(msg);
    }
  };

  const renderAddonsSummary = (booking) => {
    const parts = [];

    if (booking?.insuranceSelected) {
      const fee = booking?.insuranceFee ?? 0;
      parts.push(`Insurance: Yes (JOD ${fee})`);
    } else {
      parts.push('Insurance: No');
    }

    if (booking?.packingSelected) {
      const fee = booking?.packingFee ?? 0;
      const status = booking?.packingStatus || 'requested';
      parts.push(`Packing: Yes (JOD ${fee}) · ${status}`);
    } else {
      parts.push('Packing: No');
    }

    if (booking?.deliverySelected) {
      const fee = booking?.deliveryFee ?? 0;
      const status = booking?.deliveryStatus || 'requested';
      parts.push(`Delivery: Yes (JOD ${fee}) · ${status}`);
    } else {
      parts.push('Delivery: No');
    }

    return parts.join(' · ');
  };

  return (
    <div className="mt-8">
      <AccountNav />
      <div className="mt-8">
        <h1 className="mb-4 text-2xl font-semibold">Requests to my warehouses</h1>

        {loading && <p>Loading booking requests...</p>}

        {!loading && bookings.length === 0 && (
          <p className="text-gray-500">No requests yet. Once renters send requests, they will appear here.</p>
        )}

        <div className="space-y-4">
          {bookings.map((booking) => {
            const form = renterReviewForm[booking._id] || { rating: 5, comment: '', submitted: false };
            const pay = getPaymentBadge(booking.paymentStatus);
            const total = booking.totalPrice ?? booking.price ?? 0;

            const renterIdResolved = normalizeId(booking.user);
            const renterName =
              booking?.user?.name || booking?.name || 'Renter';
            const renterEmail = booking?.user?.email || null;

            return (
              <div
                key={booking._id}
                className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-start md:justify-between"
              >
                <div className="flex-1">
                  <div className="mb-1 text-sm font-medium text-gray-500">Warehouse</div>
                  <div className="text-lg font-semibold">{booking.place?.title || 'Untitled warehouse'}</div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
                    <div>
                      <div className="font-medium text-gray-500">Renter</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div>{renterName}</div>

                        {typeof booking.renterRating === 'number' && booking.renterRatingCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                            ⭐ {booking.renterRating}{' '}
                            <span className="text-[10px] text-yellow-900">({booking.renterRatingCount})</span>
                          </span>
                        )}

                        {renterIdResolved && (
                          <Link
                            to={`/renter/${renterIdResolved}`}
                            state={{ renterName }}
                            className="text-xs font-medium text-primary underline"
                          >
                            View profile
                          </Link>
                        )}
                      </div>

                      {renterEmail && <div className="text-xs text-gray-500">{renterEmail}</div>}
                      <div className="text-xs text-gray-500">Phone: {booking.phone}</div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-500">Dates</div>
                      <div>
                        {booking.checkIn && format(new Date(booking.checkIn), 'dd MMM yyyy')} –{' '}
                        {booking.checkOut && format(new Date(booking.checkOut), 'dd MMM yyyy')}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Units / pallet positions: {booking.noOfGuests}</div>
                      <div className="mt-1 text-xs text-gray-500">Total: JOD {total}</div>

                      <div className="mt-1 text-xs text-gray-600">{renderAddonsSummary(booking)}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${pay.cls}`}>
                          {pay.label}
                        </span>
                        {booking.paymentMethod && booking.paymentStatus === 'paid' && (
                          <span className="text-xs text-gray-600">Method: {booking.paymentMethod.replace('_', ' ')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.status === 'completed' && (
                    <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                      <div className="text-sm font-semibold text-gray-700">Review renter</div>
                      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                        <select
                          value={form.rating}
                          onChange={(e) => handleRenterReviewChange(booking._id, 'rating', Number(e.target.value))}
                          className="rounded-lg border px-3 py-2 text-sm"
                          disabled={form.submitted}
                        >
                          {[5, 4, 3, 2, 1].map((r) => (
                            <option key={r} value={r}>
                              {r} stars
                            </option>
                          ))}
                        </select>

                        <input
                          value={form.comment}
                          onChange={(e) => handleRenterReviewChange(booking._id, 'comment', e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          placeholder="Write a short comment (optional)"
                          disabled={form.submitted}
                        />

                        <button
                          type="button"
                          onClick={() => handleSubmitRenterReview(booking._id)}
                          disabled={form.submitted}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {form.submitted ? 'Submitted' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex w-full flex-col gap-3 md:w-64">
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeClasses(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(booking._id, 'approved')}
                          className="rounded-lg bg-green-600 px-3 py-1 text-sm font-semibold text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(booking._id, 'declined')}
                          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {booking.status === 'approved' && (
                      <button
                        onClick={() => updateStatus(booking._id, 'completed')}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Mark as completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OwnerBookingsPage;
