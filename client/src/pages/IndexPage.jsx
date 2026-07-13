// client/src/pages/IndexPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import axiosInstance from '@/utils/axios';
import SearchMap from '@/components/ui/SearchMap';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const labelMaps = {
  warehouseType: {
    general: 'General storage',
    cold: 'Cold storage',
    frozen: 'Frozen storage',
    dry: 'Dry / ambient storage',
    hazmat: 'Hazardous material storage',
    bonded: 'Bonded warehouse',
    fulfillment: 'Fulfillment center',
    'cross-docking': 'Cross-docking facility',
  },
};

const warehouseTypeOptions = [
  { value: '', label: 'Any type' },
  { value: 'general', label: 'General storage' },
  { value: 'cold', label: 'Cold storage' },
  { value: 'frozen', label: 'Frozen storage' },
  { value: 'dry', label: 'Dry / ambient' },
  { value: 'hazmat', label: 'Hazardous material' },
  { value: 'bonded', label: 'Bonded warehouse' },
  { value: 'fulfillment', label: 'Fulfillment center' },
  { value: 'cross-docking', label: 'Cross-docking facility' },
];

const equipmentOptions = [
  { value: 'forklift', label: 'Forklift' },
  { value: 'racks', label: 'Racks / shelves' },
  { value: 'loading-dock', label: 'Loading docks' },
  { value: 'dock-leveler', label: 'Dock leveler' },
  { value: 'ramp', label: 'Ramp' },
  { value: 'chillers', label: 'Chillers' },
  { value: 'freezers', label: 'Freezers' },
];

const allowedGoodsOptions = [
  { value: 'fmcg', label: 'FMCG' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'pharma', label: 'Pharma' },
  { value: 'clothing', label: 'Clothing / textiles' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'industrial', label: 'Industrial goods' },
  { value: 'food', label: 'Food items' },
  { value: 'chemicals', label: 'Chemicals' },
];

const sortOptions = [
  { value: 'best', label: 'Best match' },
  { value: 'price_low', label: 'Lowest price' },
  { value: 'rating_high', label: 'Highest rating' },
  { value: 'distance', label: 'Closest first' },
  { value: 'newest', label: 'Newest listings' },
];

const ownerRatingOptions = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4.0+ stars' },
  { value: '4.5', label: '4.5+ stars' },
  { value: '5', label: '5.0 only' },
];

// Parse "lat,long" or "lat long" from gps field
const parseGps = (gps) => {
  if (!gps || typeof gps !== 'string') return null;
  const match = gps.trim().match(/(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[3]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

// Haversine distance in km
const distanceKm = (coord1, coord2) => {
  if (!coord1 || !coord2) return null;
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // one decimal
};

const IndexPage = () => {
  usePageTitle('Find storage');
  const { t, formatPrice } = usePrefs();

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    city: '',
    zone: '',
    warehouseType: '',
    minArea: '',
    maxPrice: '',
    equipment: [],
    allowedGoods: [],
    ownerRatingMin: '',
    // safety filters
    requireCctv: false,
    requireGuards: false,
    requireFireSystem: false,
    requireFoodGrade: false,
    requireHazmat: false,
    nearMe: false,
    maxDistanceKm: 50,
    sortBy: 'best',
  });

  const [userLocation, setUserLocation] = useState(null);
  const [locStatus, setLocStatus] = useState('');

  // filters panel collapsed by default
  const [filtersOpen, setFiltersOpen] = useState(false);

  // section accordions (all collapsed by default)
  const [secLocationOpen, setSecLocationOpen] = useState(false);
  const [secCapacityOpen, setSecCapacityOpen] = useState(false);
  const [secSafetyOpen, setSecSafetyOpen] = useState(false);
  const [secEquipmentOpen, setSecEquipmentOpen] = useState(false);
  const [secGoodsOpen, setSecGoodsOpen] = useState(false);
  const [secNearMeOpen, setSecNearMeOpen] = useState(false);

  // list / map view
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // ❤️ favorites: store IDs + animation state
  const [favorites, setFavorites] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('wareshare_favorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [heartAnim, setHeartAnim] = useState({}); // { [placeId]: 'added' | 'removed' | null }

  // keep favorites in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wareshare_favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const toggleFavorite = (placeId) => {
    setFavorites((prev) => {
      const isFav = prev.includes(placeId);

      if (isFav) {
        // un-save: fade-out
        setHeartAnim((prevAnim) => ({ ...prevAnim, [placeId]: 'removed' }));
        setTimeout(() => {
          setHeartAnim((prevAnim) => ({ ...prevAnim, [placeId]: null }));
        }, 400);
        return prev.filter((id) => id !== placeId);
      } else {
        // save: bounce + burst
        setHeartAnim((prevAnim) => ({ ...prevAnim, [placeId]: 'added' }));
        setTimeout(() => {
          setHeartAnim((prevAnim) => ({ ...prevAnim, [placeId]: null }));
        }, 500);
        return [...prev, placeId];
      }
    });
  };

  const favoritePlaces = useMemo(
    () => places.filter((p) => favorites.includes(p._id)),
    [places, favorites]
  );

  // Load all places once
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const { data } = await axiosInstance.get('/places');
        const all = data.places || [];
        const visible = all.filter(
          (p) => !p.status || p.status === 'live'
        );
        setPlaces(visible);
      } catch (err) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, []);

  // Unique city & zone options from places
  const cityOptions = useMemo(() => {
    const set = new Set();
    places.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set);
  }, [places]);

  const zoneOptions = useMemo(() => {
    const set = new Set();
    places.forEach((p) => {
      if (p.zone) set.add(p.zone);
    });
    return Array.from(set);
  }, [places]);

  const toggleArrayFilter = (field, value) => {
    setFilters((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('Geolocation is not supported in this browser.');
      return;
    }

    setLocStatus('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocStatus('Location detected.');
      },
      () => {
        setLocStatus('Unable to get location. Please allow location access.');
      }
    );
  };

  // Apply filters & sorting
  const filteredPlaces = useMemo(() => {
    let result = [...places];

    // Search
    if (filters.search.trim() !== '') {
      const term = filters.search.toLowerCase();
      result = result.filter((p) => {
        return (
          (p.title && p.title.toLowerCase().includes(term)) ||
          (p.address && p.address.toLowerCase().includes(term)) ||
          (p.city && p.city.toLowerCase().includes(term)) ||
          (p.zone && p.zone.toLowerCase().includes(term))
        );
      });
    }

    // City
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city);
    }

    // Zone
    if (filters.zone) {
      result = result.filter((p) => p.zone === filters.zone);
    }

    // Warehouse type (single selection)
    if (filters.warehouseType) {
      result = result.filter((p) =>
        Array.isArray(p.warehouseType)
          ? p.warehouseType.includes(filters.warehouseType)
          : false
      );
    }

    // Min area
    if (filters.minArea) {
      const min = Number(filters.minArea);
      if (!Number.isNaN(min)) {
        result = result.filter(
          (p) =>
            (typeof p.availableArea === 'number' &&
              p.availableArea >= min) ||
            (typeof p.totalArea === 'number' && p.totalArea >= min)
        );
      }
    }

    // Max price per day
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice);
      if (!Number.isNaN(max)) {
        result = result.filter((p) => {
          if (typeof p.pricePerDay === 'number') {
            return p.pricePerDay <= max;
          }
          if (typeof p.price === 'number') {
            return p.price <= max;
          }
          return true;
        });
      }
    }

    // Owner rating minimum
    if (filters.ownerRatingMin) {
      const minRating = parseFloat(filters.ownerRatingMin);
      if (!Number.isNaN(minRating)) {
        result = result.filter(
          (p) =>
            typeof p.hostRating === 'number' &&
            p.hostRating >= minRating
        );
      }
    }

    // Safety & security filters (matching actual Place schema field names)
    if (filters.requireCctv) {
      result = result.filter((p) => p.CCTV === true);
    }
    if (filters.requireGuards) {
      result = result.filter((p) => p.securityGuards === true);
    }
    if (filters.requireFireSystem) {
      result = result.filter((p) => p.fireSuppression === true);
    }
    if (filters.requireFoodGrade) {
      result = result.filter((p) => p.foodGradeCert === true);
    }
    if (filters.requireHazmat) {
      result = result.filter((p) => p.hazmatCert === true);
    }

    // Equipment (AND logic – must contain all selected)
    if (filters.equipment.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.equipment)) return false;
        return filters.equipment.every((e) => p.equipment.includes(e));
      });
    }

    // Allowed goods (AND logic)
    if (filters.allowedGoods.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.allowedGoods)) return false;
        return filters.allowedGoods.every((g) =>
          p.allowedGoods.includes(g)
        );
      });
    }

    // Near me filter
    let withDistances = result.map((p) => ({ ...p, _distanceKm: null }));
    if (filters.nearMe && userLocation) {
      withDistances = withDistances
        .map((p) => {
          const coords = parseGps(p.gps);
          const dist = coords ? distanceKm(userLocation, coords) : null;
          return { ...p, _distanceKm: dist };
        })
        .filter(
          (p) =>
            typeof p._distanceKm === 'number' &&
            p._distanceKm <= filters.maxDistanceKm
        );
    } else if (filters.nearMe && !userLocation) {
      withDistances = withDistances.map((p) => ({
        ...p,
        _distanceKm: null,
      }));
    }

    // Sorting
    const sorted = [...withDistances];
    switch (filters.sortBy) {
      case 'price_low':
        sorted.sort((a, b) => {
          const pa =
            typeof a.pricePerDay === 'number'
              ? a.pricePerDay
              : a.price ?? Infinity;
          const pb =
            typeof b.pricePerDay === 'number'
              ? b.pricePerDay
              : b.price ?? Infinity;
          return pa - pb;
        });
        break;
      case 'rating_high':
        sorted.sort((a, b) => {
          const ra =
            typeof a.hostRating === 'number' ? a.hostRating : -1;
          const rb =
            typeof b.hostRating === 'number' ? b.hostRating : -1;
          return rb - ra;
        });
        break;
      case 'distance':
        sorted.sort((a, b) => {
          const da =
            typeof a._distanceKm === 'number' ? a._distanceKm : Infinity;
          const db =
            typeof b._distanceKm === 'number' ? b._distanceKm : Infinity;
          return da - db;
        });
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        break;
      case 'best':
      default:
        // best: slight preference for rating, then newest
        sorted.sort((a, b) => {
          const ra =
            typeof a.hostRating === 'number' ? a.hostRating : 0;
          const rb =
            typeof b.hostRating === 'number' ? b.hostRating : 0;
          if (rb !== ra) return rb - ra;
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        break;
    }

    return sorted;
  }, [places, filters, userLocation]);

  const resetFilters = () =>
    setFilters({
      search: '',
      city: '',
      zone: '',
      warehouseType: '',
      minArea: '',
      maxPrice: '',
      equipment: [],
      allowedGoods: [],
      ownerRatingMin: '',
      requireCctv: false,
      requireGuards: false,
      requireFireSystem: false,
      requireFoodGrade: false,
      requireHazmat: false,
      nearMe: false,
      maxDistanceKm: 50,
      sortBy: 'best',
    });

  if (loading) {
    return (
      <div className="mt-24 px-4 pb-10">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="mb-6 h-14 w-full animate-pulse rounded-2xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              <div className="h-40 w-full animate-pulse bg-gray-200" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-24 px-4 pb-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {t('home.title')}
        </h1>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-full border border-gray-300 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-full ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700'
              }`}
            >
              {t('home.list')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-full ${
                viewMode === 'map'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700'
              }`}
            >
              {t('home.map')}
            </button>
          </div>

          {/* Filters collapse toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            <span>{filtersOpen ? t('home.hideFilters') : t('home.showFilters')}</span>
            <span className="text-[10px]">
              {filtersOpen ? '▴' : '▾'}
            </span>
          </button>
        </div>
      </div>

      {/* Filters panel */}
      <div className="mb-6 rounded-2xl border bg-white shadow-sm">
        {/* Filters header (always visible) */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-xs font-semibold text-gray-600">
            {t('home.filtersSearch')}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
            >
              {t('home.resetAll')}
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
            >
              <span>{filtersOpen ? 'Collapse' : 'Expand'}</span>
              <span className="text-[9px]">
                {filtersOpen ? '▴' : '▾'}
              </span>
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            {/* Section: Location */}
            <div className="rounded-xl border bg-gray-50">
              <button
                type="button"
                onClick={() => setSecLocationOpen((p) => !p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
              >
                <span>Location</span>
                <span className="text-[9px]">
                  {secLocationOpen ? '▴' : '▾'}
                </span>
              </button>
              {secLocationOpen && (
                <div className="border-t px-3 py-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    {/* Search */}
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-semibold text-gray-600">
                        Search (city, area, address, landmark)
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        placeholder="e.g. Sahab, Mecca Street, Aqaba port..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        City
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        value={filters.city}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                      >
                        <option value="">Any city</option>
                        {cityOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Zone */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        Area / Zone
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        value={filters.zone}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            zone: e.target.value,
                          }))
                        }
                      >
                        <option value="">Any area</option>
                        {zoneOptions.map((z) => (
                          <option key={z} value={z}>
                            {z}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Capacity, price, owner rating & sort */}
            <div className="rounded-xl border bg-gray-50">
              <button
                type="button"
                onClick={() => setSecCapacityOpen((p) => !p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
              >
                <span>Capacity & pricing</span>
                <span className="text-[9px]">
                  {secCapacityOpen ? '▴' : '▾'}
                </span>
              </button>
              {secCapacityOpen && (
                <div className="border-t px-3 py-3">
                  <div className="grid gap-3 md:grid-cols-5">
                    {/* Warehouse type */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        Warehouse type
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        value={filters.warehouseType}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            warehouseType: e.target.value,
                          }))
                        }
                      >
                        {warehouseTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Min area */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        Min available area (m²)
                      </label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        placeholder="e.g. 100"
                        value={filters.minArea}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            minArea: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Max price */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        Max price per day
                      </label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        placeholder="e.g. 150"
                        value={filters.maxPrice}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            maxPrice: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Owner rating */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        Owner rating
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        value={filters.ownerRatingMin}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            ownerRatingMin: e.target.value,
                          }))
                        }
                      >
                        {ownerRatingOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600">
                        Sort by
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                        value={filters.sortBy}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            sortBy: e.target.value,
                          }))
                        }
                      >
                        {sortOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Safety & Security */}
            <div className="rounded-xl border bg-gray-50">
              <button
                type="button"
                onClick={() => setSecSafetyOpen((p) => !p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
              >
                <span>Safety & security</span>
                <span className="text-[9px]">
                  {secSafetyOpen ? '▴' : '▾'}
                </span>
              </button>
              {secSafetyOpen && (
                <div className="border-t px-3 py-3">
                  <div className="grid gap-2 text-xs md:grid-cols-2">
                    <label className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={filters.requireCctv}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            requireCctv: e.target.checked,
                          }))
                        }
                      />
                      <span>CCTV surveillance</span>
                    </label>

                    <label className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={filters.requireGuards}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            requireGuards: e.target.checked,
                          }))
                        }
                      />
                      <span>24/7 security guards</span>
                    </label>

                    <label className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={filters.requireFireSystem}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            requireFireSystem: e.target.checked,
                          }))
                        }
                      />
                      <span>Fire suppression system</span>
                    </label>

                    <label className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={filters.requireFoodGrade}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            requireFoodGrade: e.target.checked,
                          }))
                        }
                      />
                      <span>Food-grade certified</span>
                    </label>

                    <label className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={filters.requireHazmat}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            requireHazmat: e.target.checked,
                          }))
                        }
                      />
                      <span>Hazmat certified</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Equipment */}
            <div className="rounded-xl border bg-gray-50">
              <button
                type="button"
                onClick={() => setSecEquipmentOpen((p) => !p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
              >
                <span>Equipment & infrastructure</span>
                <span className="text-[9px]">
                  {secEquipmentOpen ? '▴' : '▾'}
                </span>
              </button>
              {secEquipmentOpen && (
                <div className="border-t px-3 py-3">
                  <div className="grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
                    {equipmentOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={filters.equipment.includes(opt.value)}
                          onChange={() =>
                            toggleArrayFilter('equipment', opt.value)
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Allowed goods */}
            <div className="rounded-xl border bg-gray-50">
              <button
                type="button"
                onClick={() => setSecGoodsOpen((p) => !p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
              >
                <span>Allowed goods</span>
                <span className="text-[9px]">
                  {secGoodsOpen ? '▴' : '▾'}
                </span>
              </button>
              {secGoodsOpen && (
                <div className="border-t px-3 py-3">
                  <div className="grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
                    {allowedGoodsOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={filters.allowedGoods.includes(opt.value)}
                          onChange={() =>
                            toggleArrayFilter('allowedGoods', opt.value)
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Near me */}
            <div className="rounded-xl border bg-gray-50">
              <button
                type="button"
                onClick={() => setSecNearMeOpen((p) => !p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
              >
                <span>Distance & “Near me”</span>
                <span className="text-[9px]">
                  {secNearMeOpen ? '▴' : '▾'}
                </span>
              </button>
              {secNearMeOpen && (
                <div className="border-t px-3 py-3">
                  <div className="rounded-xl bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-700">
                          📍 Near me
                        </label>
                        <p className="text-[11px] text-gray-500">
                          Show warehouses within a radius around your location.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={filters.nearMe}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            nearMe: e.target.checked,
                          }))
                        }
                      />
                    </div>

                    {filters.nearMe && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          className="w-full rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
                        >
                          Use my location
                        </button>
                        {locStatus && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            {locStatus}
                          </p>
                        )}

                        <div className="mt-3">
                          <label className="flex items-center justify-between text-[11px] font-medium text-gray-600">
                            <span>Max distance</span>
                            <span>{filters.maxDistanceKm} km</span>
                          </label>
                          <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={filters.maxDistanceKm}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                maxDistanceKm: Number(e.target.value),
                              }))
                            }
                            className="mt-1 w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ❤️ Favorites horizontal strip */}
      {favoritePlaces.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Saved warehouses
            </h2>
            <span className="text-xs text-gray-500">
              {favoritePlaces.length} saved
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {favoritePlaces.map((place) => {
              const hasHostRating =
                typeof place.hostRating === 'number' &&
                place.hostRatingCount > 0;
              const isFav = favorites.includes(place._id);
              const anim = heartAnim[place._id];

              return (
                <Link
                  key={place._id}
                  to={`/place/${place._id}`}
                  className="relative min-w-[260px] max-w-[260px] overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg"
                >
                  {/* Heart with animation */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(place._id);
                    }}
                    className={`absolute right-2 top-2 z-20 ${
                      anim === 'added'
                        ? 'heart-anim-bounce'
                        : anim === 'removed'
                        ? 'heart-anim-fade'
                        : ''
                    }`}
                  >
                    {anim === 'added' && (
                      <span className="heart-particles" />
                    )}

                    {isFav ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="#E53935"
                        className="h-7 w-7 drop-shadow-xl"
                      >
                        <path d="M12.1 21.35l-1.1-1.05C5.14 15.05 2 12.1 2 8.6 2 6 4 4 6.6 4c1.54 0 3.04.73 4 1.88C11.36 4.73 12.86 4 14.4 4 17 4 19 6 19 8.6c0 3.5-3.14 6.45-8.9 11.7l-1.1 1.05z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        stroke="#444"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        className="h-7 w-7 drop-shadow-xl"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.172 8.172a4.2 4.2 0 016 0L12 10.999l2.828-2.827a4.2 4.2 0 116 5.945L12 21 3.172 14.117a4.2 4.2 0 010-5.945z"
                        />
                      </svg>
                    )}
                  </button>

                  {place.photos?.[0] && (
                    <img
                      src={place.photos[0]}
                      alt={place.title}
                      loading="lazy"
                      className="h-32 w-full object-cover"
                    />
                  )}
                  <div className="p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold line-clamp-2">
                          {place.title || 'Warehouse'}
                        </h3>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {place.city && <span>{place.city}</span>}
                          {place.city && place.zone && <span> • </span>}
                          {place.zone && <span>{place.zone}</span>}
                        </div>
                      </div>
                      {hasHostRating && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                          ⭐ {place.hostRating}
                          <span className="text-[10px] text-yellow-900">
                            ({place.hostRatingCount})
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="text-sm font-semibold">
                        {typeof place.pricePerDay === 'number'
                          ? `JOD ${place.pricePerDay}`
                          : typeof place.price === 'number'
                          ? `JOD ${place.price}`
                          : 'Price on request'}
                        <span className="text-xs font-normal text-gray-500">
                          {' '}
                          / day
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Results */}
      {loadError ? (
        <p className="text-sm text-red-500">
          {t('home.loadFailed')}
        </p>
      ) : filteredPlaces.length === 0 && places.length === 0 ? (
        <p className="text-sm text-gray-500">
          {t('home.noneYet')}
        </p>
      ) : filteredPlaces.length === 0 ? (
        <p className="text-sm text-gray-500">
          {t('home.noMatch')}
        </p>
      ) : viewMode === 'list' ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredPlaces.map((place) => {
            const hasHostRating =
              typeof place.hostRating === 'number' &&
              place.hostRatingCount > 0;
            const isFav = favorites.includes(place._id);
            const anim = heartAnim[place._id];

            return (
              <Link
                key={place._id}
                to={`/place/${place._id}`}
                className="relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg"
              >
                {/* Heart with animation */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(place._id);
                  }}
                  className={`absolute right-2 top-2 z-20 ${
                    anim === 'added'
                      ? 'heart-anim-bounce'
                      : anim === 'removed'
                      ? 'heart-anim-fade'
                      : ''
                  }`}
                >
                  {anim === 'added' && (
                    <span className="heart-particles" />
                  )}

                  {isFav ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="#E53935"
                      className="h-7 w-7 drop-shadow-xl"
                    >
                      <path d="M12.1 21.35l-1.1-1.05C5.14 15.05 2 12.1 2 8.6 2 6 4 4 6.6 4c1.54 0 3.04.73 4 1.88C11.36 4.73 12.86 4 14.4 4 17 4 19 6 19 8.6c0 3.5-3.14 6.45-8.9 11.7l-1.1 1.05z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      stroke="#444"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      className="h-7 w-7 drop-shadow-xl"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.172 8.172a4.2 4.2 0 016 0L12 10.999l2.828-2.827a4.2 4.2 0 116 5.945L12 21 3.172 14.117a4.2 4.2 0 010-5.945z"
                      />
                    </svg>
                  )}
                </button>

                {place.photos?.[0] && (
                  <img
                    src={place.photos[0]}
                    alt={place.title}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold line-clamp-2">
                        {place.title || 'Warehouse'}
                      </h2>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        {place.city && <span>{place.city}</span>}
                        {place.city && place.zone && <span> • </span>}
                        {place.zone && <span>{place.zone}</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {place.hostVerified && (
                          <span className="font-semibold text-emerald-700">
                            ✅ {t('home.verifiedHost')}
                          </span>
                        )}
                        {typeof place.availableArea === 'number' && (
                          <span className="text-gray-500">
                            {place.availableArea} m² {t('home.available')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Host rating */}
                    {hasHostRating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                        ⭐ {place.hostRating}
                        <span className="text-[10px] text-yellow-900">
                          ({place.hostRatingCount})
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Warehouse type tags (short) */}
                  {Array.isArray(place.warehouseType) &&
                    place.warehouseType.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {place.warehouseType.slice(0, 2).map((wt) => (
                          <span
                            key={wt}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                          >
                            {labelMaps.warehouseType[wt] || wt}
                          </span>
                        ))}
                        {place.warehouseType.length > 2 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                            +{place.warehouseType.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                  {/* Price + distance */}
                  <div className="mt-2 flex items-baseline justify-between">
                    <div className="text-sm font-bold text-primary">
                      {typeof place.pricePerDay === 'number'
                        ? formatPrice(place.pricePerDay)
                        : typeof place.price === 'number'
                        ? formatPrice(place.price)
                        : t('home.priceOnRequest')}
                      <span className="text-xs font-normal text-gray-500">
                        {' '}
                        {t('home.perDay')}
                      </span>
                    </div>

                    {typeof place._distanceKm === 'number' &&
                      filters.nearMe &&
                      userLocation && (
                        <div className="text-[11px] text-gray-500">
                          {place._distanceKm} km away
                        </div>
                      )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <SearchMap places={filteredPlaces} userLocation={userLocation} priceLabel={(v) => formatPrice(v)} />
        </div>
      )}
    </div>
  );
};

export default IndexPage;
