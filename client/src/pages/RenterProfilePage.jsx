// client/src/pages/RenterProfilePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '@/utils/axios';

const normalizeId = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s === 'undefined' || s === 'null') return null;
  return s;
};

const RenterProfilePage = () => {
  const params = useParams();

  // ✅ Robust: support different route param names
  // e.g. /renter/:renterId OR /renter/:id OR /renter/:userId
  const renterId = useMemo(() => {
    const raw = params.renterId || params.id || params.userId || null;
    return normalizeId(raw);
  }, [params]);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRenterData = async () => {
      try {
        setLoading(true);

        // ✅ Guard against undefined / null / "undefined"
        if (!renterId) {
          setReviews([]);
          return;
        }

        const { data } = await axiosInstance.get(`/reviews/renter/${renterId}`);
        setReviews(data.reviews || []);
      } catch (e) {
        console.log('Renter profile error:', e);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadRenterData();
  }, [renterId]);

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
          reviews.length
        ).toFixed(1)
      : null;

  return (
    <div className="mt-20 px-4 pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Renter profile</h1>
              <p className="mt-1 text-sm text-gray-500">
                Public ratings and feedback from hosts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
              {avgRating && (
                <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                  <span className="text-base">⭐</span>
                  <span className="font-semibold">{avgRating}</span>
                  <span className="text-gray-500">
                    ({reviews.length} review{reviews.length === 1 ? '' : 's'})
                  </span>
                </div>
              )}

              {renterId && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  ID: {renterId}
                </span>
              )}
            </div>
          </div>
        </div>

        {loading && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

        {!loading && !renterId && (
          <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-red-600 shadow-sm">
            Renter id is missing in the URL. Fix your route to include an id, for
            example: <span className="font-semibold">/renter/:renterId</span>
          </div>
        )}

        {!loading && renterId && (
          <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Renter reviews</h2>

            {reviews.length === 0 && (
              <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                No renter reviews yet.
              </div>
            )}

            {reviews.length > 0 && (
              <div className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-medium text-gray-900">
                        From:{' '}
                        <span className="font-semibold">
                          {r.host?.name || 'Host'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : ''}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-800">
                      {'⭐'.repeat(Number(r.rating) || 0)}{' '}
                      <span className="text-gray-500">({r.rating} / 5)</span>
                    </div>

                    {r.comment && (
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                        {r.comment}
                      </p>
                    )}

                    {(r.place?._id || r.place) && (
                      <div className="mt-3">
                        <Link
                          className="text-sm font-semibold text-primary hover:underline"
                          to={`/place/${r.place?._id || r.place}`}
                        >
                          View related warehouse
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RenterProfilePage;
