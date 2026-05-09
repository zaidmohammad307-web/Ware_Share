import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';

import AccountNav from '@/components/ui/AccountNav';
import PhotosUploader from '@/components/ui/PhotosUploader';
import Spinner from '@/components/ui/Spinner';
import LocationPicker from '@/components/ui/LocationPicker';
import Perks from '@/components/ui/Perks';
import { formatGps, parseGpsFlexible } from '@/utils/gps';

/**
 * IMPORTANT
 * Helper components MUST live at module scope.
 * If defined inside PlacesFormPage, they get re-created on every render,
 * which can cause inputs to lose focus ("have to re-click after each letter").
 */

const WAREHOUSE_TYPES = [
  { value: 'dry', label: 'Dry (Ambient)' },
  { value: 'cold', label: 'Cold' },
  { value: 'general', label: 'Mixed / General' },
];

const FACILITIES = [
  { key: 'CCTV', label: 'CCTV' },
  { key: 'forklift', label: 'Forklift' },
  { key: 'loadingDock', label: 'Loading dock' },
  { key: 'access247', label: '24/7 access' },
  { key: 'temperatureControl', label: 'Temperature control' },
];

const SERVICES_OFFERED = [
  { key: 'insurance', label: 'Insurance available' },
  { key: 'packing', label: 'Packing available' },
  { key: 'delivery', label: 'Delivery available' },
];

const MIN_PHOTOS_REQUIRED = 3;

const stepList = [
  { id: 'basic', title: 'Basic Info' },
  { id: 'capacity', title: 'Capacity & Pricing' },
  { id: 'location', title: 'Location' },
  { id: 'facilities', title: 'Facilities' },
  { id: 'services', title: 'Services Offered' },
  { id: 'availability', title: 'Availability & Rules' },
  { id: 'images', title: 'Images' },
  { id: 'review', title: 'Review & Publish' },
];

const emptyForm = {
  // BASIC (required by backend: title, address)
  title: '',
  address: '',
  description: '',
  warehouseType: [],

  // CAPACITY & PRICING
  totalArea: '',
  availableArea: '',
  palletCapacity: '',
  pricePerDay: '',
  price: 500, // legacy, keep for compatibility
  priceUnit: 'day', // UI-only helper (not saved in DB)

  negotiablePrice: false,

  // LOCATION
  city: '',
  zone: '', // used as "country" in UX (stored in DB as zone)
  gps: '',

  // FACILITIES (mapped to existing model fields)
  CCTV: false,

  // existing model fields we keep stable
  equipment: [],
  perks: [],
  tempControlFee: '',

  // SERVICES
  insurance: false,
  services: [],

  // AVAILABILITY & RULES
  checkIn: '',
  extraInfo: '',

  // keep existing required/used fields
  checkOut: '',
  maxGuests: 10, // legacy (can represent "units/pallets")
  minBookingDays: '',
  maxBookingDays: '',

  // keep existing extras (do not remove)
  loadingDocks: '',
  loadingFee: '',
  parkingAvailable: false,
  securityGuards: false,
  fireSuppression: false,
  smokeDetectors: false,
  hazmatCert: false,
  foodGradeCert: false,
  ISOcert: '',
  hazmatRestrictions: '',
  ceilingHeight: '',
  floorLoadCapacity: '',
  rackAvailability: false,
  rackType: 'none',
  spaceType: 'open-floor',
  truckAccess: [],
  peakSeason: false,
  pricePerPallet: '',
  allowedGoods: [],
  prohibitedGoods: '',
};

const isFiniteNumber = (v) => {
  if (v === '' || v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n);
};

const normalizeString = (v) => (typeof v === 'string' ? v.trim() : '');

// -------------------------
// Helper components (module scope)
// -------------------------

const SectionCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
    {children}
  </div>
);

const FieldLabel = ({ children }) => (
  <label className="mb-1 block text-sm font-medium text-gray-700">{children}</label>
);

const FieldError = ({ errors, name }) => {
  const msg = errors?.[name] || '';
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
};

const Stepper = ({ activeStep, stepIndex, validateStep, goStep }) => (
  <div className="rounded-2xl border bg-white p-3 shadow-sm">
    <div className="flex flex-wrap gap-2">
      {stepList.map((s, idx) => {
        const isActive = s.id === activeStep;
        const isDone = idx < stepIndex;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              // Allow navigation backwards freely; forward only if current step validates
              if (idx <= stepIndex) {
                goStep(s.id);
                return;
              }
              const { ok } = validateStep(activeStep);
              if (!ok) {
                toast.error('Please complete this step before continuing.');
                return;
              }
              goStep(s.id);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? 'bg-primary text-white'
                : isDone
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isDone
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700'
              }`}
            >
              {idx + 1}
            </span>
            <span>{s.title}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const NavButtons = ({ stepIndex, onBack, onNext, showPublish = false }) => (
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      disabled={stepIndex === 0}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm disabled:opacity-50"
    >
      Back
    </button>

    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {stepIndex < stepList.length - 1 && (
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm"
        >
          Continue
        </button>
      )}

      {showPublish && (
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          Publish warehouse
        </button>
      )}
    </div>
  </div>
);

const WarehouseTypeSelector = ({ warehouseType, setMainType }) => {
  const selected = Array.isArray(warehouseType) ? warehouseType : [];

  const currentMain = (() => {
    if (selected.includes('dry')) return 'dry';
    if (selected.includes('cold') || selected.includes('frozen')) return 'cold';
    if (selected.includes('general') || selected.includes('fulfillment') || selected.includes('bonded'))
      return 'general';
    return '';
  })();

  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-3">
      {WAREHOUSE_TYPES.map((opt) => {
        const checked = currentMain === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMainType(opt.value)}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
              checked ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
              <p className="mt-1 text-xs text-gray-500">
                {opt.value === 'dry'
                  ? 'Ambient storage for general goods.'
                  : opt.value === 'cold'
                    ? 'Temperature-controlled storage.'
                    : 'Flexible storage for multiple categories.'}
              </p>
            </div>
            <span
              className={`h-5 w-5 rounded-full border-2 ${
                checked ? 'border-primary bg-primary' : 'border-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
    <div className="text-sm font-medium text-gray-700">{label}</div>
    <div className="text-right text-sm text-gray-900">{value || '—'}</div>
  </div>
);

const PlacesFormPage = () => {
  const { id } = useParams();

  const [redirect, setRedirect] = useState(false);
  const [loading, setLoading] = useState(false);

  const [addedPhotos, setAddedPhotos] = useState([]);
  const [activeStep, setActiveStep] = useState('basic');

  const [formData, setFormData] = useState({ ...emptyForm });
  const [errors, setErrors] = useState({});

  const stepIndex = useMemo(
    () => Math.max(0, stepList.findIndex((s) => s.id === activeStep)),
    [activeStep]
  );

  const goStep = (nextId) => {
    setActiveStep(nextId);
    setErrors({});
  };

  const goNext = () => {
    const { ok, nextErrors } = validateStep(activeStep);
    setErrors(nextErrors);
    if (!ok) return;

    const next = stepList[stepIndex + 1];
    if (next) goStep(next.id);
  };

  const goBack = () => {
    const prev = stepList[stepIndex - 1];
    if (prev) goStep(prev.id);
  };

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const toggleArrayValue = (field, optionValue) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(optionValue);
      const nextArr = exists
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [field]: nextArr };
    });
  };

  const toggleCheckbox = (name) => {
    setFormData((prev) => ({ ...prev, [name]: !prev[name] }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const setMainWarehouseType = (v) => {
    // Keep schema-compatible values; ensure exactly one of the UX-required types is present.
    setFormData((prev) => {
      const current = Array.isArray(prev.warehouseType) ? prev.warehouseType : [];
      let next = current.filter((t) => !['dry', 'cold', 'frozen', 'general'].includes(t));

      if (v === 'dry') next = [...next, 'dry'];
      if (v === 'cold') next = [...next, 'cold'];
      if (v === 'general') next = [...next, 'general'];

      // Keep temperatureControl coherence if user picked cold
      if (v === 'cold') {
        const equip = Array.isArray(prev.equipment) ? prev.equipment : [];
        const nextEquip = equip.includes('chillers') ? equip : [...equip, 'chillers'];
        return { ...prev, warehouseType: next, equipment: nextEquip };
      }

      return { ...prev, warehouseType: next };
    });
    setErrors((prev) => ({ ...prev, warehouseType: '' }));
  };

  const facilityState = useMemo(() => {
    const equipment = Array.isArray(formData.equipment) ? formData.equipment : [];
    const perks = Array.isArray(formData.perks) ? formData.perks : [];
    const types = Array.isArray(formData.warehouseType)
      ? formData.warehouseType
      : [];

    return {
      CCTV: !!formData.CCTV,
      forklift: equipment.includes('forklift'),
      loadingDock: equipment.includes('loading-dock'),
      access247: perks.includes('access-24-7'),
      temperatureControl:
        types.includes('cold') ||
        types.includes('frozen') ||
        equipment.includes('chillers') ||
        equipment.includes('freezers'),
    };
  }, [formData]);

  const toggleFacility = (key) => {
    if (key === 'CCTV') {
      toggleCheckbox('CCTV');
      return;
    }

    if (key === 'forklift') {
      toggleArrayValue('equipment', 'forklift');
      return;
    }

    if (key === 'loadingDock') {
      toggleArrayValue('equipment', 'loading-dock');
      return;
    }

    if (key === 'access247') {
      toggleArrayValue('perks', 'access-24-7');
      return;
    }

    if (key === 'temperatureControl') {
      // Prefer warehouseType for clarity; keep equipment aligned as optional hint
      setFormData((prev) => {
        const currentTypes = Array.isArray(prev.warehouseType)
          ? prev.warehouseType
          : [];
        const hasTemp =
          currentTypes.includes('cold') ||
          currentTypes.includes('frozen') ||
          (Array.isArray(prev.equipment) &&
            (prev.equipment.includes('chillers') ||
              prev.equipment.includes('freezers')));

        if (hasTemp) {
          const nextTypes = currentTypes.filter(
            (t) => t !== 'cold' && t !== 'frozen'
          );
          const currentEquip = Array.isArray(prev.equipment)
            ? prev.equipment
            : [];
          const nextEquip = currentEquip.filter(
            (e) => e !== 'chillers' && e !== 'freezers'
          );
          return { ...prev, warehouseType: nextTypes, equipment: nextEquip };
        }

        const nextTypes = currentTypes.includes('cold')
          ? currentTypes
          : [...currentTypes, 'cold'];

        const currentEquip = Array.isArray(prev.equipment) ? prev.equipment : [];
        const nextEquip = currentEquip.includes('chillers')
          ? currentEquip
          : [...currentEquip, 'chillers'];

        return { ...prev, warehouseType: nextTypes, equipment: nextEquip };
      });
      return;
    }
  };

  const servicesState = useMemo(() => {
    const services = Array.isArray(formData.services) ? formData.services : [];
    return {
      insurance: !!formData.insurance,
      packing:
        services.includes('picking-packing') ||
        services.includes('labeling-packaging'),
      delivery: services.includes('transportation'),
    };
  }, [formData]);

  const toggleServiceOffer = (key) => {
    if (key === 'insurance') {
      toggleCheckbox('insurance');
      return;
    }

    if (key === 'packing') {
      setFormData((prev) => {
        const current = Array.isArray(prev.services) ? prev.services : [];
        const hasPacking =
          current.includes('picking-packing') ||
          current.includes('labeling-packaging');

        if (hasPacking) {
          return {
            ...prev,
            services: current.filter(
              (s) => s !== 'picking-packing' && s !== 'labeling-packaging'
            ),
          };
        }

        // Add both for better matching/search
        const next = [...new Set([...current, 'picking-packing', 'labeling-packaging'])];
        return { ...prev, services: next };
      });
      return;
    }

    if (key === 'delivery') {
      toggleArrayValue('services', 'transportation');
      return;
    }
  };

  const validateStep = (stepId) => {
    const nextErrors = {};

    const title = normalizeString(formData.title);
    const address = normalizeString(formData.address);
    const description = normalizeString(formData.description);

    const gpsParsed = parseGpsFlexible(formData.gps);
    const gpsOk =
      gpsParsed &&
      typeof gpsParsed.lat === 'number' &&
      typeof gpsParsed.lng === 'number' &&
      Number.isFinite(gpsParsed.lat) &&
      Number.isFinite(gpsParsed.lng) &&
      gpsParsed.lat >= -90 &&
      gpsParsed.lat <= 90 &&
      gpsParsed.lng >= -180 &&
      gpsParsed.lng <= 180;

    const requireWarehouseType = () => {
      const wt = Array.isArray(formData.warehouseType)
        ? formData.warehouseType
        : [];
      if (wt.length < 1) nextErrors.warehouseType = 'Please select a warehouse type.';
    };

    const requirePrice = () => {
      // We keep stable backend fields: pricePerDay is used (preferred), price legacy stays
      if (!isFiniteNumber(formData.pricePerDay) || Number(formData.pricePerDay) <= 0) {
        nextErrors.pricePerDay = 'Enter a valid price per day.';
      }
    };

    const requireCapacity = () => {
      const hasArea = isFiniteNumber(formData.totalArea) && Number(formData.totalArea) > 0;
      const hasPallet = isFiniteNumber(formData.palletCapacity) && Number(formData.palletCapacity) > 0;
      if (!hasArea && !hasPallet) {
        nextErrors.totalArea = 'Provide total capacity (m² or pallets).';
        nextErrors.palletCapacity = 'Provide total capacity (m² or pallets).';
      }
      if (
        isFiniteNumber(formData.totalArea) &&
        isFiniteNumber(formData.availableArea) &&
        Number(formData.totalArea) > 0 &&
        Number(formData.availableArea) > Number(formData.totalArea)
      ) {
        nextErrors.availableArea = 'Available capacity cannot exceed total capacity.';
      }
    };

    const requireLocation = () => {
      if (!address) nextErrors.address = 'Address is required.';
      if (!gpsOk) nextErrors.gps = 'Please set a valid location on the map.';
      if (!normalizeString(formData.city)) nextErrors.city = 'City is required.';
      if (!normalizeString(formData.zone)) nextErrors.zone = 'Country is required.';
    };

    const requireImages = () => {
      if (!Array.isArray(addedPhotos) || addedPhotos.length < MIN_PHOTOS_REQUIRED) {
        nextErrors.addedPhotos = `Please upload at least ${MIN_PHOTOS_REQUIRED} images.`;
      }
    };

    if (stepId === 'basic') {
      if (!title) nextErrors.title = 'Warehouse name is required.';
      requireWarehouseType();
      if (!description) nextErrors.description = 'Short description is required.';
    }

    if (stepId === 'capacity') {
      requireCapacity();
      requirePrice();
    }

    if (stepId === 'location') {
      requireLocation();
    }

    if (stepId === 'availability') {
      const from = normalizeString(formData.checkIn);
      if (!from) nextErrors.checkIn = 'Available from date is required.';
      const rules = normalizeString(formData.extraInfo);
      if (!rules) nextErrors.extraInfo = 'Please add basic warehouse rules.';
    }

    if (stepId === 'images') {
      requireImages();
    }

    if (stepId === 'review') {
      // full validation gate
      if (!title) nextErrors.title = 'Warehouse name is required.';
      if (!description) nextErrors.description = 'Short description is required.';
      requireWarehouseType();
      requireCapacity();
      requirePrice();
      requireLocation();
      const from = normalizeString(formData.checkIn);
      if (!from) nextErrors.checkIn = 'Available from date is required.';
      const rules = normalizeString(formData.extraInfo);
      if (!rules) nextErrors.extraInfo = 'Please add basic warehouse rules.';
      requireImages();
    }

    return { ok: Object.keys(nextErrors).length === 0, nextErrors };
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    axiosInstance
      .get(`/places/${id}`)
      .then((response) => {
        const { place } = response.data;

        setFormData((prev) => {
          const updated = { ...prev };
          Object.keys(prev).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(place, key)) {
              updated[key] =
                place[key] === null || place[key] === undefined ? prev[key] : place[key];
            }
          });

          // Backward-compat: if older listing used "price" only, copy to pricePerDay for UX
          if (
            (!isFiniteNumber(updated.pricePerDay) || Number(updated.pricePerDay) <= 0) &&
            isFiniteNumber(place?.price) &&
            Number(place.price) > 0
          ) {
            updated.pricePerDay = Number(place.price);
          }

          // Ensure arrays
          updated.warehouseType = Array.isArray(updated.warehouseType) ? updated.warehouseType : [];
          updated.equipment = Array.isArray(updated.equipment) ? updated.equipment : [];
          updated.perks = Array.isArray(updated.perks) ? updated.perks : [];
          updated.services = Array.isArray(updated.services) ? updated.services : [];

          return updated;
        });

        setAddedPhotos(Array.isArray(place.photos) ? place.photos : []);
      })
      .catch(() => {
        toast.error('Failed to load warehouse data.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const buildPayload = () => {
    // Normalize GPS (prevents swapped lat/lng and URL-only values)
    const normalizedGps = (() => {
      const parsed = parseGpsFlexible(formData.gps);
      return parsed ? formatGps(parsed) : formData.gps;
    })();

    // Keep data shape stable (backend expects addedPhotos + rest)
    // Map UI priceUnit into existing fields without changing backend schema.
    const pricePerDay =
      isFiniteNumber(formData.pricePerDay) && Number(formData.pricePerDay) > 0
        ? Number(formData.pricePerDay)
        : '';

    const legacyPrice =
      isFiniteNumber(formData.price) && Number(formData.price) > 0
        ? Number(formData.price)
        : '';

    const payload = {
      ...formData,
      gps: normalizedGps,
      pricePerDay,
      price: legacyPrice || pricePerDay || formData.price,
      addedPhotos,
    };

    // UI-only helper must not go to backend
    delete payload.priceUnit;

    return payload;
  };

  const savePlace = async (e) => {
    e.preventDefault();

    const { ok, nextErrors } = validateStep('review');
    setErrors(nextErrors);
    if (!ok) {
      toast.error('Please fix the highlighted fields before publishing.');
      return;
    }

    try {
      const payload = buildPayload();
      if (id) {
        await axiosInstance.put('/places/update-place', { id, ...payload });
      } else {
        await axiosInstance.post('/places/add-places', payload);
      }
      toast.success('Warehouse saved successfully.');
      setRedirect(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save warehouse.');
    }
  };

  if (redirect) {
    return <Navigate to="/account/places" />;
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div>
      <AccountNav />

      <form className="mx-auto max-w-5xl px-4 pb-10" onSubmit={savePlace}>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{id ? 'Edit warehouse' : 'Add new warehouse'}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Follow the steps to create a clear, high-quality warehouse listing.
            </p>
          </div>

          <div className="text-sm text-gray-600">
            Step <span className="font-semibold">{stepIndex + 1}</span> of{' '}
            <span className="font-semibold">{stepList.length}</span>
          </div>
        </div>

        <div className="mt-4">
          <Stepper
            activeStep={activeStep}
            stepIndex={stepIndex}
            validateStep={validateStep}
            goStep={goStep}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          {/* MAIN */}
          <div className="space-y-6">
            {/* 1) BASIC INFO */}
            {activeStep === 'basic' && (
              <SectionCard
                title="Basic Info"
                subtitle="Start with a clear name, type, and a short description."
              >
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Warehouse name</FieldLabel>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setField('title', e.target.value)}
                      placeholder="e.g. Cold storage warehouse in Amman"
                      required
                    />
                    <FieldError errors={errors} name="title" />
                  </div>

                  <div>
                    <FieldLabel>Warehouse type</FieldLabel>
                    <WarehouseTypeSelector
                      warehouseType={formData.warehouseType}
                      setMainType={setMainWarehouseType}
                    />
                    <FieldError errors={errors} name="warehouseType" />
                  </div>

                  <div>
                    <FieldLabel>Short description</FieldLabel>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Describe what you store, typical goods, handling, and key notes."
                      className="min-h-[120px]"
                      required
                    />
                    <FieldError errors={errors} name="description" />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 2) CAPACITY & PRICING */}
            {activeStep === 'capacity' && (
              <SectionCard
                title="Capacity & Pricing"
                subtitle="Provide capacity and a clear pricing structure."
              >
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Total capacity (m²)</FieldLabel>
                      <input
                        type="number"
                        value={formData.totalArea}
                        onChange={(e) => setField('totalArea', e.target.value)}
                        placeholder="e.g. 500"
                        min="0"
                      />
                      <FieldError errors={errors} name="totalArea" />
                    </div>

                    <div>
                      <FieldLabel>Available capacity (m²)</FieldLabel>
                      <input
                        type="number"
                        value={formData.availableArea}
                        onChange={(e) => setField('availableArea', e.target.value)}
                        placeholder="e.g. 200"
                        min="0"
                      />
                      <FieldError errors={errors} name="availableArea" />
                    </div>

                    <div>
                      <FieldLabel>Total capacity (pallets)</FieldLabel>
                      <input
                        type="number"
                        value={formData.palletCapacity}
                        onChange={(e) => setField('palletCapacity', e.target.value)}
                        placeholder="e.g. 1200"
                        min="0"
                      />
                      <FieldError errors={errors} name="palletCapacity" />
                    </div>

                    <div>
                      <FieldLabel>Available units (legacy)</FieldLabel>
                      <input
                        type="number"
                        value={formData.maxGuests}
                        onChange={(e) => setField('maxGuests', e.target.value)}
                        placeholder="e.g. 50"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This keeps compatibility with your existing booking flow.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <FieldLabel>Price per unit</FieldLabel>
                        <input
                          type="number"
                          value={formData.pricePerDay}
                          onChange={(e) => setField('pricePerDay', e.target.value)}
                          placeholder="e.g. 25"
                          min="0"
                          required
                        />
                        <FieldError errors={errors} name="pricePerDay" />
                      </div>

                      <div className="sm:w-48">
                        <FieldLabel>Billing period</FieldLabel>
                        <select
                          value={formData.priceUnit}
                          onChange={(e) => setField('priceUnit', e.target.value)}
                        >
                          <option value="day">Per day</option>
                          <option value="month">Per month</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Stored as daily price (backend-compatible).
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        id="negotiablePrice"
                        type="checkbox"
                        checked={!!formData.negotiablePrice}
                        onChange={() => toggleCheckbox('negotiablePrice')}
                      />
                      <label htmlFor="negotiablePrice" className="text-sm font-medium text-gray-800">
                        Price is negotiable
                      </label>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 3) LOCATION */}
            {activeStep === 'location' && (
              <SectionCard
                title="Location"
                subtitle="Pin your location on the map and confirm address details."
              >
                <div className="grid gap-5">
                  <div>
                    <FieldLabel>Map location</FieldLabel>
                    <LocationPicker
                      gpsValue={formData.gps}
                      addressValue={formData.address}
                      onChange={(patch) => {
                        if (patch?.gps !== undefined) setField('gps', patch.gps);
                        if (patch?.address !== undefined) setField('address', patch.address);
                        if (patch?.city !== undefined && patch.city) setField('city', patch.city);
                      }}
                      className="mt-2"
                    />
                    <FieldError errors={errors} name="gps" />
                  </div>

                  <div>
                    <FieldLabel>Address</FieldLabel>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setField('address', e.target.value)}
                      placeholder="Address will update from the map, but you can edit it."
                      required
                    />
                    <FieldError errors={errors} name="address" />
                    <p className="mt-1 text-xs text-gray-500">
                      If you edit the address manually, ensure it matches the pinned location.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setField('city', e.target.value)}
                        placeholder="e.g. Amman"
                        required
                      />
                      <FieldError errors={errors} name="city" />
                    </div>

                    <div>
                      <FieldLabel>Country</FieldLabel>
                      <input
                        type="text"
                        value={formData.zone}
                        onChange={(e) => setField('zone', e.target.value)}
                        placeholder="e.g. Jordan"
                        required
                      />
                      <FieldError errors={errors} name="zone" />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 4) FACILITIES */}
            {activeStep === 'facilities' && (
              <SectionCard
                title="Facilities"
                subtitle="Select the facilities available at your warehouse."
              >
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FACILITIES.map((f) => {
                      const checked = !!facilityState[f.key];
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => toggleFacility(f.key)}
                          className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
                            checked ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {f.key === 'temperatureControl'
                                ? 'Cold storage / climate control features.'
                                : 'Visible on your listing for renters.'}
                            </p>
                          </div>
                          <span
                            className={`h-5 w-5 rounded-md border ${
                              checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800">Optional notes</p>
                    <p className="mt-1 text-xs text-gray-500">
                      You can add details about access procedures, dock scheduling, or temperature ranges in Rules.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 5) SERVICES OFFERED */}
            {activeStep === 'services' && (
              <SectionCard
                title="Services Offered"
                subtitle="Select services you can provide as add-ons."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {SERVICES_OFFERED.map((s) => {
                    const checked = !!servicesState[s.key];
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleServiceOffer(s.key)}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
                          checked ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {s.key === 'delivery'
                              ? 'Transport / local delivery options.'
                              : s.key === 'packing'
                                ? 'Picking, packing, labeling, and packaging.'
                                : 'Insurance availability for stored goods.'}
                          </p>
                        </div>
                        <span
                          className={`h-5 w-5 rounded-md border ${
                            checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* 6) AVAILABILITY & RULES */}
            {activeStep === 'availability' && (
              <SectionCard
                title="Availability & Rules"
                subtitle="Set availability start date and basic warehouse rules."
              >
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Available from</FieldLabel>
                      <input
                        type="date"
                        value={formData.checkIn}
                        onChange={(e) => setField('checkIn', e.target.value)}
                        required
                      />
                      <FieldError errors={errors} name="checkIn" />
                    </div>

                    <div>
                      <FieldLabel>Available until (optional)</FieldLabel>
                      <input
                        type="date"
                        value={formData.checkOut}
                        onChange={(e) => setField('checkOut', e.target.value)}
                      />
                      <p className="mt-1 text-xs text-gray-500">Leave empty if always available.</p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Basic warehouse rules</FieldLabel>
                    <textarea
                      value={formData.extraInfo}
                      onChange={(e) => setField('extraInfo', e.target.value)}
                      placeholder="e.g. No hazardous materials. Access hours. Booking lead time. Pallet labeling requirements."
                      className="min-h-[140px]"
                      required
                    />
                    <FieldError errors={errors} name="extraInfo" />
                  </div>

                  <details className="rounded-2xl border bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                      Advanced (optional) legacy fields
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Min booking days (optional)</FieldLabel>
                          <input
                            type="number"
                            value={formData.minBookingDays}
                            onChange={(e) => setField('minBookingDays', e.target.value)}
                            min="0"
                            placeholder="e.g. 3"
                          />
                        </div>
                        <div>
                          <FieldLabel>Max booking days (optional)</FieldLabel>
                          <input
                            type="number"
                            value={formData.maxBookingDays}
                            onChange={(e) => setField('maxBookingDays', e.target.value)}
                            min="0"
                            placeholder="e.g. 30"
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Legacy perks (optional)</FieldLabel>
                        <Perks
                          selected={Array.isArray(formData.perks) ? formData.perks : []}
                          handleFormData={(e) => {
                            // keep original perks component behavior stable
                            const { type, name, checked } = e.target;
                            if (type === 'checkbox') {
                              setFormData((prev) => {
                                const current = Array.isArray(prev.perks) ? prev.perks : [];
                                const exists = current.includes(name);
                                const next = checked
                                  ? exists
                                    ? current
                                    : [...current, name]
                                  : current.filter((p) => p !== name);
                                return { ...prev, perks: next };
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </SectionCard>
            )}

            {/* 7) IMAGES */}
            {activeStep === 'images' && (
              <SectionCard
                title="Images"
                subtitle={`Upload and preview warehouse photos. At least ${MIN_PHOTOS_REQUIRED} images are required.`}
              >
                <div>
                  <PhotosUploader addedPhotos={addedPhotos} setAddedPhotos={setAddedPhotos} />
                  <FieldError errors={errors} name="addedPhotos" />
                  <p className="mt-2 text-xs text-gray-500">
                    Minimum: {MIN_PHOTOS_REQUIRED} images. Recommended: 5+ (exterior, interior, access points).
                  </p>
                </div>
              </SectionCard>
            )}

            {/* 8) REVIEW & PUBLISH */}
            {activeStep === 'review' && (
              <SectionCard
                title="Review & Publish"
                subtitle="Double-check your listing details before publishing."
              >
                <div className="grid gap-5">
                  <div className="rounded-2xl border bg-white">
                    <div className="px-5 py-4">
                      <h3 className="text-base font-semibold text-gray-900">Summary</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This is what renters will see on your listing.
                      </p>
                    </div>
                    <div className="px-5 pb-2">
                      <SummaryRow label="Warehouse name" value={normalizeString(formData.title)} />
                      <SummaryRow
                        label="Warehouse type"
                        value={
                          Array.isArray(formData.warehouseType) && formData.warehouseType.length
                            ? formData.warehouseType.join(', ')
                            : ''
                        }
                      />
                      <SummaryRow label="Short description" value={normalizeString(formData.description)} />
                      <SummaryRow
                        label="Capacity"
                        value={[
                          isFiniteNumber(formData.totalArea) ? `${Number(formData.totalArea)} m²` : '',
                          isFiniteNumber(formData.availableArea)
                            ? `${Number(formData.availableArea)} m² available`
                            : '',
                          isFiniteNumber(formData.palletCapacity)
                            ? `${Number(formData.palletCapacity)} pallets`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      />
                      <SummaryRow
                        label="Pricing"
                        value={
                          isFiniteNumber(formData.pricePerDay)
                            ? `${Number(formData.pricePerDay)} / day${
                                formData.negotiablePrice ? ' (negotiable)' : ''
                              }`
                            : ''
                        }
                      />
                      <SummaryRow
                        label="Location"
                        value={[
                          normalizeString(formData.address),
                          normalizeString(formData.city),
                          normalizeString(formData.zone),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      />
                      <SummaryRow
                        label="Facilities"
                        value={FACILITIES.filter((f) => !!facilityState[f.key])
                          .map((f) => f.label)
                          .join(', ')}
                      />
                      <SummaryRow
                        label="Services offered"
                        value={SERVICES_OFFERED.filter((s) => !!servicesState[s.key])
                          .map((s) => s.label)
                          .join(', ')}
                      />
                      <SummaryRow
                        label="Available from"
                        value={normalizeString(formData.checkIn)}
                      />
                      <SummaryRow
                        label="Rules"
                        value={normalizeString(formData.extraInfo)}
                      />
                      <SummaryRow
                        label="Images"
                        value={Array.isArray(addedPhotos) ? `${addedPhotos.length} uploaded` : '0 uploaded'}
                      />
                    </div>
                  </div>

                  {/* Inline validation callouts */}
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">Final checks</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      <li className={errors.title ? 'text-red-700' : ''}>
                        Warehouse name {errors.title ? `— ${errors.title}` : '— OK'}
                      </li>
                      <li className={errors.warehouseType ? 'text-red-700' : ''}>
                        Warehouse type {errors.warehouseType ? `— ${errors.warehouseType}` : '— OK'}
                      </li>
                      <li className={errors.description ? 'text-red-700' : ''}>
                        Description {errors.description ? `— ${errors.description}` : '— OK'}
                      </li>
                      <li className={errors.pricePerDay ? 'text-red-700' : ''}>
                        Price {errors.pricePerDay ? `— ${errors.pricePerDay}` : '— OK'}
                      </li>
                      <li className={errors.gps || errors.address || errors.city || errors.zone ? 'text-red-700' : ''}>
                        Location{' '}
                        {errors.gps || errors.address || errors.city || errors.zone
                          ? `— ${errors.gps || errors.address || errors.city || errors.zone}`
                          : '— OK'}
                      </li>
                      <li className={errors.checkIn ? 'text-red-700' : ''}>
                        Availability {errors.checkIn ? `— ${errors.checkIn}` : '— OK'}
                      </li>
                      <li className={errors.extraInfo ? 'text-red-700' : ''}>
                        Rules {errors.extraInfo ? `— ${errors.extraInfo}` : '— OK'}
                      </li>
                      <li className={errors.addedPhotos ? 'text-red-700' : ''}>
                        Images {errors.addedPhotos ? `— ${errors.addedPhotos}` : '— OK'}
                      </li>
                    </ul>
                  </div>
                </div>
              </SectionCard>
            )}

            <NavButtons
              stepIndex={stepIndex}
              onBack={goBack}
              onNext={goNext}
              showPublish={activeStep === 'review'}
            />
          </div>

          {/* SIDE PANEL */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Listing quality</h3>
              <p className="mt-1 text-sm text-gray-500">
                Completing these increases renter trust and reduces booking issues.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Name + type</span>
                  <span className="font-semibold text-gray-900">
                    {normalizeString(formData.title) &&
                    Array.isArray(formData.warehouseType) &&
                    formData.warehouseType.length
                      ? 'Done'
                      : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Capacity + price</span>
                  <span className="font-semibold text-gray-900">
                    {(isFiniteNumber(formData.totalArea) ||
                      isFiniteNumber(formData.palletCapacity)) &&
                    isFiniteNumber(formData.pricePerDay)
                      ? 'Done'
                      : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Map + address</span>
                  <span className="font-semibold text-gray-900">
                    {parseGpsFlexible(formData.gps) && normalizeString(formData.address) ? 'Done' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Images</span>
                  <span className="font-semibold text-gray-900">
                    {Array.isArray(addedPhotos) && addedPhotos.length >= MIN_PHOTOS_REQUIRED
                      ? 'Done'
                      : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Quick tips</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
                <li>Use a specific name (city + type).</li>
                <li>Ensure available capacity matches your operational reality.</li>
                <li>Pin the exact location; the address should match the map marker.</li>
                <li>Add facility/services that you truly offer to avoid disputes.</li>
                <li>Upload clear photos (access points + interior).</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlacesFormPage;
