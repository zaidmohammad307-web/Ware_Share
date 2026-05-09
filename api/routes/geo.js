// api/routes/geo.js
const express = require('express');

const router = express.Router();

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Nominatim can respond with 403 if requests are missing an identifiable User-Agent.
// Configure these in api/.env for best results.
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  `WareShare/1.0 (dev; ${process.env.NOMINATIM_EMAIL || 'no-email-configured'})`;

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_SIZE = 500;

// Simple in-memory cache to reduce requests and avoid rate limiting.
// Key => { expiresAt, value }
const cache = new Map();

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const cacheSet = (key, value, ttlMs = CACHE_TTL_MS) => {
  // Evict oldest entries if cache is full
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

// Very small per-IP rate limit (token bucket): default 1 req/sec, burst 3.
const buckets = new Map();
const BUCKETS_MAX_SIZE = 1000;
const RATE = 1; // tokens per second
const BURST = 3;

const takeToken = (ip) => {
  const now = Date.now();
  const b = buckets.get(ip) || { tokens: BURST, last: now };
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(BURST, b.tokens + elapsed * RATE);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  // Evict oldest buckets if map is too large
  if (buckets.size >= BUCKETS_MAX_SIZE) {
    const firstKey = buckets.keys().next().value;
    buckets.delete(firstKey);
  }
  buckets.set(ip, b);
  return true;
};

const buildHeaders = (req) => {
  // Add referer for compliance and to help with upstream filtering.
  const referer = req.get('origin') || req.get('referer') || undefined;
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
  if (referer) headers.Referer = referer;
  return headers;
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'Missing query q' });

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!takeToken(ip)) {
      return res.status(429).json({ message: 'Too many requests' });
    }

    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.status(200).json(cached);

    const url = new URL(`${NOMINATIM_BASE}/search`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(req),
    });

    if (!upstream.ok) {
      const body = await safeJson(upstream);
      return res
        .status(502)
        .json({ message: 'Geocode search failed', status: upstream.status, body });
    }

    const data = await upstream.json();
    cacheSet(cacheKey, data);
    return res.status(200).json(data);
  } catch (e) {
    console.error('geo/search error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Invalid lat/lng' });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!takeToken(ip)) {
      return res.status(429).json({ message: 'Too many requests' });
    }

    const cacheKey = `rev:${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.status(200).json(cached);

    const url = new URL(`${NOMINATIM_BASE}/reverse`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(req),
    });

    if (!upstream.ok) {
      const body = await safeJson(upstream);
      return res
        .status(502)
        .json({ message: 'Reverse geocode failed', status: upstream.status, body });
    }

    const data = await upstream.json();
    cacheSet(cacheKey, data);
    return res.status(200).json(data);
  } catch (e) {
    console.error('geo/reverse error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
