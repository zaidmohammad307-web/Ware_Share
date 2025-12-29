// client/src/pages/AccountPlaces.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '@/utils/axios';

const StatusBadge = ({ isActive }) => {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
      <span className="h-2 w-2 rounded-full bg-gray-500" />
      Hidden
    </span>
  );
};

const AccountPlaces = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null); // for toggle status
  const [deletingId, setDeletingId] = useState(null); // for delete
  const [error, setError] = useState('');

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axiosInstance.get('/places/user-places');
      // data is array of places
      setPlaces(data || []);
    } catch (err) {
      console.error('fetchPlaces error', err);
      setError('Unable to load your warehouses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleToggleStatus = async (place) => {
    try {
      setSavingId(place._id);
      setError('');

      const nextStatus = !place.isActive;

      const { data } = await axiosInstance.patch(
        `/places/${place._id}/status`,
        { isActive: nextStatus }
      );

      const updated = data.place;

      setPlaces((prev) =>
        prev.map((p) => (p._id === place._id ? { ...p, ...updated } : p))
      );
    } catch (err) {
      console.error('updatePlaceStatus error', err);
      setError('Could not update listing status. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (place) => {
    const ok = window.confirm(
      `Delete "${place.title || 'this warehouse'}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingId(place._id);
      setError('');

      await axiosInstance.delete(`/places/${place._id}`);

      setPlaces((prev) => prev.filter((p) => p._id !== place._id));
    } catch (err) {
      console.error('deletePlace error', err);
      setError('Could not delete listing. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const liveCount = places.filter((p) => p.isActive !== false).length;
  const hiddenCount = places.length - liveCount;

  return (
    <div className="mt-24 px-4 pb-10">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Your warehouses
          </h1>
          <p className="text-sm text-neutral-600">
            Manage your Wareshare listings, visibility, and status.
          </p>
          {places.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              <span className="font-medium">{liveCount}</span> live •{' '}
              <span className="font-medium">{hiddenCount}</span> hidden
            </p>
          )}
        </div>

        <Link
          to="/account/places/new"
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1565C0] transition"
        >
          + Add new warehouse
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Loading your warehouses…</p>
        </div>
      ) : places.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-neutral-800">
            You don&apos;t have any warehouses yet.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Start by creating your first listing on Wareshare.
          </p>
          <Link
            to="/account/places/new"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1565C0] transition"
          >
            Create a warehouse listing
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop: table-like layout */}
          <div className="hidden rounded-2xl border bg-white shadow-sm md:block">
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr] border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span>Warehouse</span>
              <span>Pricing</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {places.map((place) => {
              const price =
                typeof place.pricePerDay === 'number'
                  ? place.pricePerDay
                  : typeof place.price === 'number'
                  ? place.price
                  : null;

              return (
                <div
                  key={place._id}
                  className="grid grid-cols-[2fr,1fr,1fr,1fr] items-center border-b px-4 py-3 last:border-b-0 hover:bg-neutral-50"
                >
                  {/* Warehouse info */}
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-24 overflow-hidden rounded-lg bg-neutral-100">
                      {place.photos?.[0] ? (
                        <img
                          src={place.photos[0]}
                          alt={place.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/place/${place._id}`}
                        className="block truncate text-sm font-semibold text-neutral-900 hover:underline"
                      >
                        {place.title || 'Warehouse'}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {place.city && <span>{place.city}</span>}
                        {place.city && place.zone && <span> • </span>}
                        {place.zone && <span>{place.zone}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="text-sm font-medium text-neutral-900">
                    {price != null ? (
                      <>
                        JOD {price.toLocaleString()}
                        <span className="ml-1 text-xs font-normal text-neutral-500">
                          / day
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-neutral-500">
                        Price on request
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge
                      isActive={place.isActive !== false} // default true if missing
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(place)}
                      disabled={savingId === place._id}
                      className="rounded-full border border-neutral-300 px-3 py-1 font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === place._id
                        ? 'Saving…'
                        : place.isActive !== false
                        ? 'Hide listing'
                        : 'Make live'}
                    </button>

                    <Link
                      to={`/account/places/${place._id}`}
                      className="rounded-full border border-primary/30 px-3 py-1 font-medium text-primary hover:bg-primary/5"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(place)}
                      disabled={deletingId === place._id}
                      className="rounded-full border border-red-200 px-3 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === place._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: card layout */}
          <div className="space-y-3 md:hidden">
            {places.map((place) => {
              const price =
                typeof place.pricePerDay === 'number'
                  ? place.pricePerDay
                  : typeof place.price === 'number'
                  ? place.price
                  : null;

              return (
                <div
                  key={place._id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  {place.photos?.[0] && (
                    <Link to={`/place/${place._id}`}>
                      <img
                        src={place.photos[0]}
                        alt={place.title}
                        className="h-40 w-full object-cover"
                      />
                    </Link>
                  )}

                  <div className="p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/place/${place._id}`}
                          className="block truncate text-sm font-semibold text-neutral-900"
                        >
                          {place.title || 'Warehouse'}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {place.city && <span>{place.city}</span>}
                          {place.city && place.zone && <span> • </span>}
                          {place.zone && <span>{place.zone}</span>}
                        </p>
                      </div>
                      <StatusBadge
                        isActive={place.isActive !== false}
                      />
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="text-sm font-semibold text-neutral-900">
                        {price != null ? (
                          <>
                            JOD {price.toLocaleString()}
                            <span className="text-xs font-normal text-neutral-500">
                              {' '}
                              / day
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-500">
                            Price on request
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(place)}
                        disabled={savingId === place._id}
                        className="flex-1 rounded-full border border-neutral-300 px-3 py-1 font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === place._id
                          ? 'Saving…'
                          : place.isActive !== false
                          ? 'Hide'
                          : 'Make live'}
                      </button>

                      <Link
                        to={`/account/places/${place._id}`}
                        className="flex-1 rounded-full border border-primary/30 px-3 py-1 text-center font-medium text-primary hover:bg-primary/5"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(place)}
                        disabled={deletingId === place._id}
                        className="flex-1 rounded-full border border-red-200 px-3 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === place._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountPlaces;
