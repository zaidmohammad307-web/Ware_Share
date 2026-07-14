// client/src/pages/BookingsPage.jsx
import { useEffect, useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import AccountNav from '../components/ui/AccountNav';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    title: 'My bookings',
    loading: 'Loading your bookings...',
    empty:
      "You don't have any bookings yet. Browse warehouses and send a request to start using storage.",
    loadFailed: 'Failed to load your bookings.',
    warehouse: 'Warehouse',
    dates: 'Dates',
    days: 'days',
    unitsLabel: 'Units / pallet positions',
    priceAndStatus: 'Price & status',
    total: 'Total',
    status: {
      pending: 'Pending',
      approved: 'Approved',
      declined: 'Declined',
      completed: 'Completed',
    },
  },
  AR: {
    title: 'حجوزاتي',
    loading: 'جارٍ تحميل حجوزاتك...',
    empty:
      'ليس لديك أي حجوزات بعد. تصفّح المستودعات وأرسل طلبًا لتبدأ باستخدام التخزين.',
    loadFailed: 'تعذّر تحميل حجوزاتك.',
    warehouse: 'مستودع',
    dates: 'التواريخ',
    days: 'يوم',
    unitsLabel: 'الوحدات / مواقع المنصات',
    priceAndStatus: 'السعر والحالة',
    total: 'الإجمالي',
    status: {
      pending: 'قيد الانتظار',
      approved: 'مقبول',
      declined: 'مرفوض',
      completed: 'مكتمل',
    },
  },
};

const BookingsPage = () => {
  const { lang, formatPrice } = usePrefs();
  const L = STR[lang] || STR.EN;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/bookings');
      // backend returns { success, booking: [...] }
      setBookings(data.booking || []);
    } catch (error) {
      toast.error(L.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

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

  const getStatusLabel = (status) => L.status[status] || status;

  return (
    <div className="mt-8">
      <AccountNav />

      <div className="mt-8">
        <h1 className="mb-4 text-2xl font-semibold">{L.title}</h1>

        {loading && <p>{L.loading}</p>}

        {!loading && bookings.length === 0 && (
          <p className="text-gray-500">{L.empty}</p>
        )}

        <div className="space-y-4">
          {bookings.map((booking) => {
            const days = differenceInCalendarDays(
              new Date(booking.checkOut),
              new Date(booking.checkIn)
            );

            const total =
              typeof booking.totalPrice === 'number'
                ? booking.totalPrice
                : booking.price;

            return (
              <Link
                key={booking._id}
                to={`/account/bookings/${booking._id}`}
                className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md md:flex-row"
              >
                {booking.place?.photos?.length > 0 && (
                  <div className="h-32 w-full overflow-hidden rounded-xl bg-gray-200 md:h-40 md:w-40">
                    <img
                      src={booking.place.photos[0]}
                      alt={booking.place.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {booking.place?.title || L.warehouse}
                    </h2>
                    <div className="text-sm text-gray-500">
                      {booking.place?.address}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
                    <div>
                      <div className="font-medium text-gray-500">{L.dates}</div>
                      <div>
                        {booking.checkIn &&
                          format(new Date(booking.checkIn), 'dd MMM yyyy')}{' '}
                        –{' '}
                        {booking.checkOut &&
                          format(new Date(booking.checkOut), 'dd MMM yyyy')}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {days} {L.days} · {L.unitsLabel}: {booking.noOfGuests}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-500">
                        {L.priceAndStatus}
                      </div>
                      <div className="text-base font-semibold">
                        {L.total}: {formatPrice(Number(total) || 0)}
                      </div>
                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeClasses(
                          booking.status
                        )}`}
                      >
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;
