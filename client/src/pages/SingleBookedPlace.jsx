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
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    loadFailed: 'Failed to load booking details.',
    noData: 'No data',
    viewHostProfile: 'View host profile',
    openLiveChat: 'Open live chat',
    bookingInfo: 'Your booking information',
    bookingStatus: 'Booking status',
    totalPrice: 'Total price',
    priceBreakdown: 'Price breakdown',
    basePrice: 'Base booking price',
    insuranceFee: 'Insurance fee',
    packingFee: 'Packing fee',
    deliveryFee: 'Delivery fee',
    total: 'Total',
    packing: 'Packing',
    delivery: 'Delivery',
    selected: 'Selected',
    yes: 'Yes',
    no: 'No',
    type: 'Type',
    units: 'Units',
    statusLabel: 'Status',
    pickupCity: 'Pickup city',
    dropoffCity: 'Drop-off city',
    window: 'Window',
    payment: 'Payment',
    amount: 'Amount',
    applePay: 'Apple Pay',
    visa: 'Visa',
    cash: 'Cash',
    paidNote: 'Payment is marked as paid (dummy flow).',
    paymentSaved: 'Payment saved (dummy flow).',
    paymentFailed: 'Payment could not be saved.',
    rateWarehouse: 'Rate this warehouse',
    rateAfter:
      'You can rate after your booking is finished (after check-out) or when the host marks it completed.',
    rating: 'Rating',
    comment: 'Comment (optional)',
    commentPlaceholder: 'Share your experience',
    submitting: 'Submitting...',
    submitRating: 'Submit rating',
    reviewOnlyAfter: 'You can review only after the booking is finished.',
    reviewThanks: 'Thanks! Your warehouse rating was submitted.',
    reviewFailed: 'Failed to submit the review.',
    paymentStatus: {
      not_yet: 'Not available yet',
      not_paid: 'Not paid',
      paid: 'Paid',
      unknown: 'Unknown',
    },
    bookingStatuses: {
      pending: 'Pending',
      approved: 'Approved',
      declined: 'Declined',
      completed: 'Completed',
    },
    addonStatuses: {
      requested: 'Requested',
      confirmed: 'Confirmed',
      done: 'Done',
      cancelled: 'Cancelled',
    },
    paymentMethods: {
      apple_pay: 'Apple Pay',
      visa: 'Visa',
      cash: 'Cash',
    },
  },
  AR: {
    loadFailed: 'تعذّر تحميل تفاصيل الحجز.',
    noData: 'لا توجد بيانات',
    viewHostProfile: 'عرض ملف المضيف',
    openLiveChat: 'فتح المحادثة المباشرة',
    bookingInfo: 'معلومات حجزك',
    bookingStatus: 'حالة الحجز',
    totalPrice: 'السعر الإجمالي',
    priceBreakdown: 'تفاصيل السعر',
    basePrice: 'سعر الحجز الأساسي',
    insuranceFee: 'رسوم التأمين',
    packingFee: 'رسوم التغليف',
    deliveryFee: 'رسوم التوصيل',
    total: 'الإجمالي',
    packing: 'التغليف',
    delivery: 'التوصيل',
    selected: 'مُختار',
    yes: 'نعم',
    no: 'لا',
    type: 'النوع',
    units: 'الوحدات',
    statusLabel: 'الحالة',
    pickupCity: 'مدينة الاستلام',
    dropoffCity: 'مدينة التسليم',
    window: 'الفترة الزمنية',
    payment: 'الدفع',
    amount: 'المبلغ',
    applePay: 'أبل باي',
    visa: 'فيزا',
    cash: 'نقدًا',
    paidNote: 'تم تسجيل الدفع كمدفوع (نظام تجريبي).',
    paymentSaved: 'تم حفظ الدفع (نظام تجريبي).',
    paymentFailed: 'تعذّر حفظ الدفع.',
    rateWarehouse: 'قيّم هذا المستودع',
    rateAfter:
      'يمكنك التقييم بعد انتهاء حجزك (بعد تاريخ المغادرة) أو عندما يحدد المضيف الحجز كمكتمل.',
    rating: 'التقييم',
    comment: 'تعليق (اختياري)',
    commentPlaceholder: 'شاركنا تجربتك',
    submitting: 'جارٍ الإرسال...',
    submitRating: 'إرسال التقييم',
    reviewOnlyAfter: 'يمكنك التقييم فقط بعد انتهاء الحجز.',
    reviewThanks: 'شكرًا لك! تم إرسال تقييمك للمستودع.',
    reviewFailed: 'تعذّر إرسال التقييم.',
    paymentStatus: {
      not_yet: 'غير متاح بعد',
      not_paid: 'غير مدفوع',
      paid: 'مدفوع',
      unknown: 'غير معروف',
    },
    bookingStatuses: {
      pending: 'قيد الانتظار',
      approved: 'مقبول',
      declined: 'مرفوض',
      completed: 'مكتمل',
    },
    addonStatuses: {
      requested: 'مطلوب',
      confirmed: 'مؤكد',
      done: 'منجز',
      cancelled: 'ملغى',
    },
    paymentMethods: {
      apple_pay: 'أبل باي',
      visa: 'فيزا',
      cash: 'نقدًا',
    },
  },
};

const SingleBookedPlace = () => {
  const { lang, formatPrice } = usePrefs();
  const L = STR[lang] || STR.EN;

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
      toast.error(L.loadFailed);
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
        toast.error(L.reviewOnlyAfter);
        return;
      }

      setSubmittingReview(true);
      await axiosInstance.post('/reviews/place', {
        bookingId: booking._id,
        rating: Number(rating),
        comment,
      });
      toast.success(L.reviewThanks);
      setComment('');
    } catch (error) {
      toast.error(error?.response?.data?.message || L.reviewFailed);
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
      toast.success(L.paymentSaved);
    } catch (error) {
      toast.error(error?.response?.data?.message || L.paymentFailed);
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
        <div className="p-4">{L.noData}</div>
      </div>
    );
  }

  const paymentStatusLabel =
    L.paymentStatus[booking.paymentStatus] || L.paymentStatus.unknown;

  const bookingStatusLabel =
    L.bookingStatuses[booking.status] || booking.status;

  const addonStatusLabel = (status) => {
    const key = status || 'requested';
    return L.addonStatuses[key] || key;
  };

  const paymentMethodLabel = (method) =>
    L.paymentMethods[method] || String(method).replace('_', ' ');

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
                {L.viewHostProfile}
              </Link>
            )}

            <Link
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              to={`/account/chats/booking/${booking._id}`}
            >
              {L.openLiveChat}
            </Link>
          </div>
        </div>

        <div className="my-6 flex flex-col items-center justify-between rounded-2xl bg-gray-200 p-6 sm:flex-row">
          <div>
            <h2 className="mb-4 text-2xl md:text-2xl">{L.bookingInfo}</h2>
            <BookingDates booking={booking} />
            <div className="mt-2 text-sm text-gray-700">
              {L.bookingStatus}:{' '}
              <span className="font-semibold">{bookingStatusLabel}</span>
            </div>
          </div>

          <div className="mt-5 w-full rounded-2xl bg-primary p-6 text-white sm:mt-0 sm:w-auto">
            <div className="hidden md:block">{L.totalPrice}</div>
            <div className="flex justify-center text-3xl">
              <span>{formatPrice(amounts.total)}</span>
            </div>
          </div>
        </div>

        {/* Add-ons summary */}
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{L.priceBreakdown}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{L.basePrice}</span>
              <span className="font-semibold">{formatPrice(amounts.base)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{L.insuranceFee}</span>
              <span className="font-semibold">
                {formatPrice(amounts.insurance)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{L.packingFee}</span>
              <span className="font-semibold">
                {formatPrice(amounts.packing)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{L.deliveryFee}</span>
              <span className="font-semibold">
                {formatPrice(amounts.delivery)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">{L.total}</span>
              <span className="text-base font-bold">
                {formatPrice(amounts.total)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="font-semibold">{L.packing}</div>
              <div className="mt-1 text-gray-700">
                {L.selected}:{' '}
                <span className="font-semibold">
                  {booking.packingSelected ? L.yes : L.no}
                </span>
              </div>
              {booking.packingSelected ? (
                <div className="mt-1 text-gray-700">
                  <div>
                    {L.type}:{' '}
                    <span className="font-semibold">{booking.packingType}</span>
                  </div>
                  <div>
                    {L.units}:{' '}
                    <span className="font-semibold">
                      {booking.packingUnitsCount}
                    </span>{' '}
                    {booking.packingUnitsType}
                  </div>
                  <div>
                    {L.statusLabel}:{' '}
                    <span className="font-semibold">
                      {addonStatusLabel(booking.packingStatus)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <div className="font-semibold">{L.delivery}</div>
              <div className="mt-1 text-gray-700">
                {L.selected}:{' '}
                <span className="font-semibold">
                  {booking.deliverySelected ? L.yes : L.no}
                </span>
              </div>
              {booking.deliverySelected ? (
                <div className="mt-1 text-gray-700">
                  <div>
                    {L.type}:{' '}
                    <span className="font-semibold">
                      {booking.deliveryType}
                    </span>
                  </div>
                  {booking.pickupCity ? (
                    <div>
                      {L.pickupCity}:{' '}
                      <span className="font-semibold">
                        {booking.pickupCity}
                      </span>
                    </div>
                  ) : null}
                  {booking.dropoffCity ? (
                    <div>
                      {L.dropoffCity}:{' '}
                      <span className="font-semibold">
                        {booking.dropoffCity}
                      </span>
                    </div>
                  ) : null}
                  {booking.deliveryTimeWindow ? (
                    <div>
                      {L.window}:{' '}
                      <span className="font-semibold">
                        {booking.deliveryTimeWindow}
                      </span>
                    </div>
                  ) : null}
                  <div>
                    {L.statusLabel}:{' '}
                    <span className="font-semibold">
                      {addonStatusLabel(booking.deliveryStatus)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Dummy payment section (only after approval) */}
        {booking.status === 'approved' && (
          <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{L.payment}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {L.statusLabel}:{' '}
              <span className="font-semibold">{paymentStatusLabel}</span>
              {booking.paymentMethod ? (
                <span className="ml-2 text-gray-500">
                  ({paymentMethodLabel(booking.paymentMethod)})
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {L.amount}:{' '}
              <span className="font-semibold">
                {formatPrice(amounts.total)}
              </span>
            </p>

            {booking.paymentStatus !== 'paid' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => pay('apple_pay')}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  {L.applePay}
                </button>
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => pay('visa')}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  {L.visa}
                </button>
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => pay('cash')}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  {L.cash}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-green-700">{L.paidNote}</p>
            )}
          </div>
        )}

        {/* Review section */}
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{L.rateWarehouse}</h2>

          {!canReviewNow() ? (
            <p className="mt-2 text-sm text-gray-600">{L.rateAfter}</p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {L.rating}
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
                  {L.comment}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  placeholder={L.commentPlaceholder}
                />
              </div>

              <button
                type="button"
                disabled={submittingReview}
                onClick={submitReview}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                {submittingReview ? L.submitting : L.submitRating}
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
