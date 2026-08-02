// client/src/pages/HostProfilePage.jsx
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import axiosInstance from '@/utils/axios';
import { useAuth } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    loading: 'Loading host profile...',
    notFound: 'Host not found or has no public data yet.',
    host: 'Host',
    hostAndRenter: 'Host & Renter',
    renter: 'Renter',
    memberSince: 'Member since',
    verifiedHost: 'Verified host',
    verificationPending: 'Verification pending',
    verificationRejected: 'Verification review needed',
    reviewsCount: (n) => `(${n} review${n === 1 ? '' : 's'})`,
    listingsCount: (n) => `${n} listing${n === 1 ? '' : 's'}`,
    reviewsShort: (n) => `${n} review${n === 1 ? '' : 's'}`,
    chatWithHost: 'Chat with host',
    loginToChat: 'Login to start an inquiry chat.',
    company: 'Company: ',
    taxId: 'Tax / VAT ID: ',
    businessReg: 'Business registration: ',
    contactPhone: 'Contact phone: ',
    aboutHost: 'About this host',
    warehousesBy: (name) => `Warehouses by ${name}`,
    noWarehouses: 'This host has no warehouses listed yet.',
    hostReviews: 'Host Reviews',
    noReviews: 'No reviews yet.',
    anonymous: 'Anonymous',
    dateFormat: 'dd MMM yyyy',
  },
  AR: {
    loading: 'جارٍ تحميل ملف المضيف...',
    notFound: 'لم يتم العثور على المضيف أو لا توجد بيانات عامة بعد.',
    host: 'مضيف',
    hostAndRenter: 'مضيف ومستأجر',
    renter: 'مستأجر',
    memberSince: 'عضو منذ',
    verifiedHost: 'مضيف موثّق',
    verificationPending: 'التحقق قيد المراجعة',
    verificationRejected: 'التحقق يحتاج إلى مراجعة',
    reviewsCount: (n) => `(${n} تقييم)`,
    listingsCount: (n) => `${n} إعلان`,
    reviewsShort: (n) => `${n} تقييم`,
    chatWithHost: 'تواصل مع المضيف',
    loginToChat: 'سجّل الدخول لبدء محادثة استفسار.',
    company: 'الشركة: ',
    taxId: 'الرقم الضريبي: ',
    businessReg: 'السجل التجاري: ',
    contactPhone: 'هاتف التواصل: ',
    aboutHost: 'عن هذا المضيف',
    warehousesBy: (name) => `مستودعات ${name}`,
    noWarehouses: 'لا توجد مستودعات معروضة لهذا المضيف بعد.',
    hostReviews: 'تقييمات المضيف',
    noReviews: 'لا توجد تقييمات بعد.',
    anonymous: 'مجهول',
    dateFormat: 'dd MMM yyyy',
  },
};

const HostProfilePage = () => {
  const { hostId } = useParams();
  const { user } = useAuth();
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;

  const [host, setHost] = useState(null);
  const [hostReviews, setHostReviews] = useState([]);
  const [hostPlaces, setHostPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHostData = async () => {
      try {
        setLoading(true);

        const [reviewRes, placeRes] = await Promise.all([
          axiosInstance.get(`/reviews/host/${hostId}`),
          axiosInstance.get(`/places/host/${hostId}`),
        ]);

        const reviews = reviewRes?.data?.reviews || [];
        const places = placeRes?.data?.places || [];

        setHostReviews(reviews);
        setHostPlaces(places);

        const fromReview = reviews[0]?.host;
        const fromPlace = places[0]?.owner;
        setHost(fromReview || fromPlace || null);
      } catch (_) {
        // silently fail; empty state shows "no data" fallback
      } finally {
        setLoading(false);
      }
    };

    loadHostData();
  }, [hostId]);

  if (loading) {
    return <div className="mt-24 px-4">{L.loading}</div>;
  }

  if (!host && hostPlaces.length === 0 && hostReviews.length === 0) {
    return <div className="mt-24 px-4 text-red-500">{L.notFound}</div>;
  }

  const hostName = host?.name || L.host;
  const hostCreatedAt = host?.createdAt;
  const hostPicture = host?.picture;

  const avgHostRating =
    hostReviews.length > 0
      ? (
          hostReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          hostReviews.length
        ).toFixed(1)
      : null;

  const hostProfile = host?.hostProfile || {};

  const hostCity = hostProfile?.city || host?.city || null;
  const hostCompany = hostProfile?.companyName || null;
  const hostTaxId = hostProfile?.taxId || null;
  const hostBusinessRegNumber = hostProfile?.businessRegNumber || null;
  const hostPhone = hostProfile?.phone || null;
  const hostAbout = hostProfile?.about || null;
  const hostRole = host?.role || null;

  const verificationStatus = host?.hostVerificationStatus || 'not_submitted';

  const verificationBadge = (() => {
    switch (verificationStatus) {
      case 'approved':
        return {
          label: L.verifiedHost,
          className:
            'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800',
          icon: '✅',
        };
      case 'pending':
        return {
          label: L.verificationPending,
          className:
            'inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800',
          icon: '⏳',
        };
      case 'rejected':
        return {
          label: L.verificationRejected,
          className:
            'inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-800',
          icon: '⚠️',
        };
      default:
        return null;
    }
  })();

  const totalListings = hostPlaces.length;
  const totalReviews = hostReviews.length;

  const renterId = user?._id || null;
  const firstPlaceId = hostPlaces?.[0]?._id;
  const canStartInquiryChat = Boolean(renterId && firstPlaceId);

  return (
    <div className="mt-24 px-4 pb-12">
      <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100">
              {hostPicture ? (
                <img
                  src={hostPicture}
                  alt={hostName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-gray-400">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-semibold">{hostName}</h1>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                {hostRole && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {hostRole === 'both'
                      ? L.hostAndRenter
                      : hostRole === 'host'
                      ? L.host
                      : L.renter}
                  </span>
                )}

                {hostCity && <span>📍 {hostCity}</span>}
              </div>

              {hostCreatedAt && (
                <div className="mt-1 text-xs text-gray-500">
                  {L.memberSince}{' '}
                  {format(new Date(hostCreatedAt), L.dateFormat)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            {avgHostRating && (
              <div className="flex items-center gap-1 text-sm text-gray-700">
                <span className="text-lg">⭐</span>
                <span className="font-semibold">{avgHostRating}</span>
                <span className="text-gray-500">
                  {L.reviewsCount(hostReviews.length)}
                </span>
              </div>
            )}

            {verificationBadge && (
              <span className={verificationBadge.className}>
                <span>{verificationBadge.icon}</span>
                <span>{verificationBadge.label}</span>
              </span>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 md:justify-end">
              <span>🏭 {L.listingsCount(totalListings)}</span>
              <span>💬 {L.reviewsShort(totalReviews)}</span>
            </div>

            {canStartInquiryChat && (
              <Link
                to={`/place/${firstPlaceId}/chat`}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                {L.chatWithHost}
              </Link>
            )}

            {!renterId && (
              <p className="mt-2 text-xs text-gray-500">
                {L.loginToChat}
              </p>
            )}
          </div>
        </div>

        {(hostCompany || hostPhone || hostTaxId || hostBusinessRegNumber) && (
          <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            <div>
              {hostCompany && (
                <div>
                  <span className="font-medium">{L.company}</span>
                  {hostCompany}
                </div>
              )}

              {hostTaxId && (
                <div>
                  <span className="font-medium">{L.taxId}</span>
                  {hostTaxId}
                </div>
              )}

              {hostBusinessRegNumber && (
                <div>
                  <span className="font-medium">{L.businessReg}</span>
                  {hostBusinessRegNumber}
                </div>
              )}
            </div>

            <div>
              {hostPhone && (
                <div>
                  <span className="font-medium">{L.contactPhone}</span>
                  {hostPhone}
                </div>
              )}
            </div>
          </div>
        )}

        {hostAbout && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
              {L.aboutHost}
            </div>
            <p className="whitespace-pre-line">{hostAbout}</p>
          </div>
        )}
      </div>

      <div className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">
          {L.warehousesBy(hostName)}
        </h2>
        {hostPlaces.length === 0 && (
          <p className="text-sm text-gray-500">{L.noWarehouses}</p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hostPlaces.map((place) => (
            <Link
              key={place._id}
              to={`/place/${place._id}`}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg"
            >
              {place.photos?.[0] && (
                <img
                  src={place.photos[0]}
                  alt={place.title}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">{place.title}</h3>
                  {verificationBadge && verificationStatus === 'approved' && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      ✅ {L.verifiedHost}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">{place.address}</p>

                {(place.city || place.zone) && (
                  <p className="mt-1 text-xs text-gray-500">
                    {place.city}
                    {place.city && place.zone && ' • '}
                    {place.zone}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">{L.hostReviews}</h2>

        {hostReviews.length === 0 && (
          <p className="text-sm text-gray-500">{L.noReviews}</p>
        )}

        <div className="space-y-4">
          {hostReviews.map((review) => (
            <div key={review._id} className="border-b pb-3 last:border-0">
              <div className="flex justify-between">
                <div className="font-medium">{review.reviewer?.name || L.anonymous}</div>
                <div className="text-xs text-gray-500">
                  {review.createdAt && format(new Date(review.createdAt), L.dateFormat)}
                </div>
              </div>

              <div className="mt-1 text-sm">
                {'⭐'.repeat(review.rating || 0)} ({review.rating}/5)
              </div>

              {review.comment && (
                <p className="mt-1 text-sm text-gray-700">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HostProfilePage;
