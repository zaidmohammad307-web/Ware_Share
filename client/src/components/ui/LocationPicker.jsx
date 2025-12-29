// client/src/components/ui/LocationPicker.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import marker assets so Vite handles them
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import axiosInstance from '@/utils/axios';
import { formatGps, parseGpsFlexible } from '@/utils/gps';

// Ensure Leaflet icons render correctly under Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const AMMAN_DEFAULT = { lat: 31.9539, lng: 35.9106 };

const isValidLatLng = (lat, lng) =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

// Geocoding is proxied via backend to avoid browser CORS + Nominatim 403.
const geoReverse = async ({ lat, lng }, signal) => {
  const res = await axiosInstance.get('/geo/reverse', {
    params: { lat, lng },
    signal,
  });
  return res.data;
};

const geoForward = async (query, signal) => {
  const res = await axiosInstance.get('/geo/search', {
    params: { q: query },
    signal,
  });
  return res.data;
};

/**
 * LocationPicker
 * - Click map to set marker
 * - Drag marker to fine-tune
 * - Reverse geocodes to fill a human-readable address
 * - Optional address search to reposition marker
 */
const LocationPicker = ({
  gpsValue,
  addressValue,
  onChange,
  className = '',
}) => {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const abortRef = useRef(null);
  const isEditingRef = useRef(false);

  const initialCoords = useMemo(() => {
    const parsed = parseGpsFlexible(gpsValue);
    return parsed || AMMAN_DEFAULT;
  }, [gpsValue]);

  const [searchText, setSearchText] = useState(addressValue || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');

  // Keep search box in sync when parent address changes (e.g., when loading an existing listing)
  useEffect(() => {
    // Do NOT overwrite user typing on each parent re-render.
    if (!isEditingRef.current) {
      setSearchText(addressValue || '');
    }
  }, [addressValue]);

  const safeAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const commitCoords = async ({ lat, lng }, { updateAddress = true } = {}) => {
    if (!isValidLatLng(lat, lng)) return;

    // Update GPS immediately (canonical format)
    const gps = formatGps({ lat, lng });
    onChange?.({ gps });

    if (!updateAddress) return;

    safeAbort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setBusy(true);
      setError('');
      setGeoError('');
      const data = await geoReverse({ lat, lng }, controller.signal);
      const displayName = data?.display_name || '';
      const cityFromApi =
        data?.address?.city ||
        data?.address?.town ||
        data?.address?.village ||
        data?.address?.state ||
        '';

      onChange?.({
        gps,
        address: displayName || addressValue || '',
        city: cityFromApi,
      });
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setGeoError('Could not fetch address for this location.');
      }
    } finally {
      setBusy(false);
    }
  };

  // Init map once
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current).setView(
      [initialCoords.lat, initialCoords.lng],
      12
    );
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialCoords.lat, initialCoords.lng], {
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    map.on('click', (ev) => {
      const { lat, lng } = ev.latlng;
      marker.setLatLng([lat, lng]);
      commitCoords({ lat, lng });
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      commitCoords({ lat: pos.lat, lng: pos.lng });
    });

    return () => {
      safeAbort();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If gpsValue changes externally (loading existing listing), update map + marker
  useEffect(() => {
    const coords = parseGpsFlexible(gpsValue);
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!coords || !map || !marker) return;
    marker.setLatLng([coords.lat, coords.lng]);
    map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 12));
  }, [gpsValue]);

  const handleSearch = async () => {
    const q = (searchText || '').trim();
    if (!q) return;

    safeAbort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setBusy(true);
      setError('');
      setGeoError('');
      const results = await geoForward(q, controller.signal);
      const first = Array.isArray(results) ? results[0] : null;
      const lat = first ? parseFloat(first.lat) : NaN;
      const lng = first ? parseFloat(first.lon) : NaN;
      if (!isValidLatLng(lat, lng)) {
        setError('No matching location found.');
        return;
      }

      const map = mapRef.current;
      const marker = markerRef.current;
      if (map && marker) {
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], 14);
      }

      // Prefer the API display name as address on search
      const display = first?.display_name || '';
      onChange?.({ address: display || q });
      await commitCoords({ lat, lng }, { updateAddress: true });
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setGeoError('Search failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLocateMe = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setBusy(true);
    setError('');
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos?.coords?.latitude;
          const lng = pos?.coords?.longitude;
          if (!isValidLatLng(lat, lng)) {
            setError('Could not read your location.');
            return;
          }

          const map = mapRef.current;
          const marker = markerRef.current;
          if (map && marker) {
            marker.setLatLng([lat, lng]);
            map.setView([lat, lng], 14);
          }

          await commitCoords({ lat, lng }, { updateAddress: true });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        if (err?.code === 1) {
          setError('Location permission denied. Please allow location access.');
        } else {
          setError('Could not retrieve your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className={className}>
      <div className="rounded-2xl border bg-white p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search address (optional)
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => {
                isEditingRef.current = true;
              }}
              onBlur={() => {
                isEditingRef.current = false;
              }}
              placeholder="Type an address or a place name"
            />
          </div>
          <div className="flex gap-2 md:pt-6">
            <button
              type="button"
              onClick={handleSearch}
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60 md:w-auto"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={busy}
              className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm disabled:opacity-60 md:w-auto"
            >
              Locate me
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        ) : null}
        {geoError ? (
          <div className="mt-2 text-sm text-red-600">{geoError}</div>
        ) : null}
        {busy ? (
          <div className="mt-2 text-sm text-gray-500">Updating location…</div>
        ) : null}

        <div className="mt-3 h-72 overflow-hidden rounded-2xl border">
          <div ref={mapElRef} className="h-full w-full" />
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <div className="font-medium text-gray-700">GPS (saved)</div>
            <div className="mt-1 break-all text-gray-600">
              {(gpsValue || '').trim() || '—'}
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <div className="font-medium text-gray-700">Address (saved)</div>
            <div className="mt-1 break-all text-gray-600">
              {(addressValue || '').trim() || '—'}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Tip: click on the map to set a marker, then drag it to adjust.
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;
