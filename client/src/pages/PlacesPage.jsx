// client/src/pages/PlacesPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import AccountNav from '@/components/ui/AccountNav';
import Spinner from '@/components/ui/Spinner';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const PlacesPage = () => {
  usePageTitle('Your warehouses');
  const { t } = usePrefs();

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    const getPlaces = async () => {
      try {
        const { data } = await axiosInstance.get('/places/user-places');
        setPlaces(data || []);
      } catch (error) {
        toast.error('Failed to load your warehouses.');
      } finally {
        setLoading(false);
      }
    };
    getPlaces();
  }, []);

  const handleToggleStatus = async (place) => {
    const newStatus = place.status === 'hidden' ? 'live' : 'hidden';

    try {
      setActionLoadingId(place._id);
      const { data } = await axiosInstance.patch(
        `/places/${place._id}/status`,
        { status: newStatus }
      );

      const serverStatus = data?.status || newStatus;
      setPlaces((prev) =>
        prev.map((p) =>
          p._id === place._id ? { ...p, status: serverStatus } : p
        )
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          'Could not update status. Please try again.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (place) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete “${place.title || 'this listing'}”?`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(place._id);
      await axiosInstance.delete(`/places/${place._id}`);

      setPlaces((prev) => prev.filter((p) => p._id !== place._id));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          'Could not delete listing. Please try again.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div>
      <AccountNav />

      {/* Header + add button */}
      <div className="mt-4 flex items-center justify-between px-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {t('places.title')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('places.subtitle')}
          </p>
        </div>

        <Link
          className="inline-flex items-center gap-1 rounded-full bg-primary py-2 px-6 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          to="/account/places/new"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {t('places.addNew')}
        </Link>
      </div>

      <div className="mx-4 mt-6">
        {places.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <p className="mb-2 text-sm font-medium text-gray-800">
              You don’t have any warehouses listed yet.
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Create your first listing and start monetizing your spare warehouse space.
            </p>
            <Link
              to="/account/places/new"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create a listing
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {places.map((place) => {
              const status = place.status || 'live';
              const isHidden = status === 'hidden';
              const isBusy = actionLoadingId === place._id;

              return (
                <div
                  key={place._id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  {/* Image */}
                  {place.photos?.[0] && (
                    <Link to={`/place/${place._id}`} className="block">
                      <img
                        src={place.photos[0]}
                        alt={place.title}
                        loading="lazy"
                        className="h-40 w-full object-cover"
                      />
                    </Link>
                  )}

                  <div className="flex flex-1 flex-col p-3">
                    {/* Top row: title + status badge */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/place/${place._id}`}
                          className="text-sm font-semibold text-gray-900 hover:underline line-clamp-2"
                        >
                          {place.title || 'Warehouse'}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {place.city && <span>{place.city}</span>}
                          {place.city && place.zone && <span> • </span>}
                          {place.zone && <span>{place.zone}</span>}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isHidden
                            ? 'bg-gray-100 text-gray-600 border border-gray-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isHidden ? t('places.hidden') : t('places.live')}
                      </span>
                    </div>

                    {/* Capacity / pricing quick info */}
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                      {typeof place.availableArea === 'number' && (
                        <span>
                          <strong className="font-semibold text-gray-800">
                            {place.availableArea} m²
                          </strong>{' '}
                          available
                        </span>
                      )}
                      {typeof place.pricePerDay === 'number' && (
                        <span>
                          <strong className="font-semibold text-gray-800">
                            JOD {place.pricePerDay}
                          </strong>{' '}
                          / day
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                      <div className="flex gap-2">
                        {/* Edit */}
                        <Link
                          to={`/account/places/${place._id}`}
                          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {t('common.edit')}
                        </Link>

                        {/* Availability */}
                        <Link
                          to={`/account/places/${place._id}/availability`}
                          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {t('places.availability')}
                        </Link>

                        {/* Hide / Make live */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(place)}
                          disabled={isBusy}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            isHidden
                              ? 'border border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          } ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {isBusy
                            ? '…'
                            : isHidden
                            ? t('places.makeLive')
                            : t('places.hide')}
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(place)}
                        disabled={isBusy}
                        className={`rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 ${
                          isBusy ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlacesPage;
