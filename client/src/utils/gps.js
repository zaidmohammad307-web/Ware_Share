// client/src/utils/gps.js

const isValidLatLng = (lat, lng) =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

// Accepts:
// - "lat,lng" / "lat lng"
// - Google Maps URLs with "@lat,lng" or "q=lat,lng" / "query=lat,lng"
// - Swapped values (auto-detect)
export const parseGpsFlexible = (input) => {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  const atMatch = s.match(
    /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/
  );
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const qMatch = s.match(
    /(?:\?|&)\s*(?:q|query)=\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i
  );
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const basic = s.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (!basic) return null;
  const a = parseFloat(basic[1]);
  const b = parseFloat(basic[2]);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (isValidLatLng(a, b)) return { lat: a, lng: b };
  if (isValidLatLng(b, a)) return { lat: b, lng: a };
  return null;
};

export const formatGps = ({ lat, lng }) =>
  `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
