// client/src/pages/SingleBookedPlace.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import AccountNav from '../components/ui/AccountNav';
import AddressLink from '../components/ui/AddressLink';
import BookingDates from '../components/ui/BookingDates';
import PlaceGallery from '../components/ui/PlaceGallery';
import Spinner from '../components/ui/Spinner';
import axiosInstance from '../utils/axios';

const SingleBookedPlace = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  // Review (renter -> warehouse)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dummy payment
  const [paying, setPaying] = useState(false);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/bookings');
      const found = (data.booking || []).find((b) => b._id === id);
      setBooking(found || null);
    } catch (error) {
      console.log('Error: ', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  const canReviewNow = () => {
    if (!booking?._id) return false;
    const checkOut = booking?.checkOut ? new Date(booking.checkOut) : null;
    const finishedByDate =
      checkOut && !Number.isNaN(checkOut.getTime()) && new Date() >= checkOut;

    return (
      booking.status === 'completed' ||
      (booking.status === 'approved' && finishedByDate)
    );
  };

  const submitReview = async () => {
    try {
      if (!canReviewNow()) {
        toast.error('You can review only after the booking is finished.');
        return;
      }

      setSubmittingReview(true);
      await axiosInstance.post('/reviews/place', {
        bookingId: booking._id,
        rating: Number(rating),
        comment,
      });
      toast.success('Thanks! Your warehouse rating was submitted.');
      setComment('');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to submit the review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const pay = async (paymentMethod) => {
    try {
      setPaying(true);
      const { data } = await axiosInstance.put(
        `/bookings/${booking._id}/payment`,
        { paymentMethod }
      );
      setBooking(data.booking);
      toast.success('Payment saved (dummy flow).');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Payment could not be saved.'
      );
    } finally {
      setPaying(false);
    }
  };

  const amounts = useMemo(() => {
    const base = Number(booking?.price) || 0;
    const insurance = Number(booking?.insuranceFee) || 0;
    const packing = Number(booking?.packingFee) || 0;
    const delivery = Number(booking?.deliveryFee) || 0;
    const total =
      Number(booking?.totalPrice) || base + insurance + packing + delivery;

    return { base, insurance, packing, delivery, total };
  }, [booking]);

  if (loading) return <Spinner />;

  if (!booking?.place) {
    return (
      <div>
        <AccountNav />
        <div className="p-4">No data</div>
      </div>
    );
  }

  const paymentStatusLabel =
    {
      not_yet: 'Not available yet',
      not_paid: 'Not paid',
      paid: 'Paid',
    }[booking.paymentStatus] || 'Unknown';

  return (
    <div>
      <AccountNav />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl">{booking.place.title}</h1>
            <AddressLink
              className="my-2 block"
              placeAddress={booking.place.address}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {booking?.place?.owner && (
              <Link
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                to={`/host/${booking.place.owner}`}
              >
                View host profile
              </Link>
            )}

            <Link
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              to={`/account/chats/booking/${booking._id}`}
            >
              Open live chat
            </Link>
          </div>
        </div>

        <div className="my-6 flex flex-col items-center justify-between rounded-2xl bg-gray-200 p-6 sm:flex-row">
          <div>
            <h2 className="mb-4 text-2xl md:text-2xl">
              Your booking information
            </h2>
            <BookingDates booking={booking} />
            <div className="mt-2 text-sm text-gray-700">
              Booking status: <span className="font-semibold">{booking.status}</span>
            </div>
          </div>

          <div className="mt-5 w-full rounded-2xl bg-primary p-6 text-white sm:mt-0 sm:w-auto">
            <div className="hidden md:block">Total price</div>
            <div className="flex justify-center text-3xl">
              <span>JOD{amounts.total}</span>
            </div>
          </div>
        </div>

        {/* Add-ons summary */}
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Price breakdown</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Base booking price</span>
              <span className="font-semibold">JOD{amounts.base}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Insurance fee</span>
              <span className="font-semibold">JOD{amounts.insurance}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Packing fee</span>
              <span className="font-semibold">JOD{amounts.packing}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Delivery fee</span>
              <span className="font-semibold">JOD{amounts.delivery}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-base font-bold">JOD{amounts.total}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="font-semibold">Packing</div>
              <div className="mt-1 text-gray-700">
                Selected: <span className="font-semibold">{booking.packingSelected ? 'Yes' : 'No'}</span>
              </div>
              {booking.packingSelected ? (
                <div className="mt-1 text-gray-700">
                  <div>Type: <span className="font-semibold">{booking.packingType}</span></div>
                  <div>Units: <span className="font-semibold">{booking.packingUnitsCount}</span> {booking.packingUnitsType}</div>
                  <div>Status: <span className="font-semibold">{booking.packingStatus || 'requested'}</span></div>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <div className="font-semibold">Delivery</div>
              <div className="mt-1 text-gray-700">
                Selected: <span className="font-semibold">{booking.deliverySelected ? 'Yes' : 'No'}</span>
              </div>
              {booking.deliverySelected ? (
                <div className="mt-1 text-gray-700">
                  <div>Type: <span className="font-semibold">{booking.deliveryType}</span></div>
                  {booking.pickupCity ? <div>Pickup city: <span className="font-semibold">{booking.pickupCity}</span></div> : null}
                  {booking.dropoffCity ? <div>Drop-off city: <span className="font-semibold">{booking.dropoffCity}</span></div> : null}
                  {booking.deliveryTimeWindow ? <div>Window: <span className="font-semibold">{booking.deliveryTimeWindow}</span></div> : null}
                  <div>Status: <span className="font-semibold">{booking.deliveryStatus || 'requested'}</span></div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Dummy payment section (only after approval) */}
        {booking.status === 'approved' && (
          <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Payment</h2>
            <p className="mt-1 text-sm text-gray-600">
              Status: <span className="font-semibold">{paymentStatusLabel}</span>
              {booking.paymentMethod ? (
                <span className="ml-2 text-gray-500">
                  ({booking.paymentMethod.replace('_', ' ')})
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Amount: <span className="font-semibold">JOD{amounts.total}</span>
            </p>

            {booking.paymentStatus !== 'paid' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => pay('apple_pay')}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Apple Pay
                </button>
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => pay('visa')}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Visa
                </button>
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => pay('cash')}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Cash
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-green-700">
                Payment is marked as paid (dummy flow).
              </p>
            )}
          </div>
        )}

        {/* Review section */}
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Rate this warehouse</h2>

          {!canReviewNow() ? (
            <p className="mt-2 text-sm text-gray-600">
              You can rate after your booking is finished (after check-out) or
              when the host marks it completed.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rating
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Share your experience"
                />
              </div>

              <button
                type="button"
                disabled={submittingReview}
                onClick={submitReview}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                {submittingReview ? 'Submitting...' : 'Submit rating'}
              </button>
            </div>
          )}
        </div>

        <PlaceGallery place={booking.place} />
      </div>
    </div>
  );
};

export default SingleBookedPlace;
