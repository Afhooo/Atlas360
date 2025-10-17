// src/app/endpoints/geocode/route.ts
import { NextResponse } from 'next/server';

const KEY = process.env.OPENCAGE_API_KEY || process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT || 'fenix-store/1.0 (contacto: soporte@fenix.local)';

type SafeFetchOptions = RequestInit & { timeoutMs?: number };

async function safeFetch(
  input: string | URL,
  options: SafeFetchOptions = {}
): Promise<Response | null> {
  const { timeoutMs = 10000, signal, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    const target = typeof input === 'string' ? input : input.toString();
    console.warn('[geocode] fetch failed for', target, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type GeoComponents = {
  street?: string;
  neighbourhood?: string;
  suburb?: string;
  district?: string;
  city?: string;
  state?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type GeoOut = {
  formatted: string;
  lat: number;
  lng: number;
  components?: GeoComponents;
  confidence?: number;
  source: 'opencage' | 'nominatim' | 'fallback';
};

const normalizeComponents = (
  input: Record<string, unknown> | null | undefined,
): GeoComponents | undefined => {
  if (!input) return undefined;
  const source = input as Record<string, unknown>;
  const pick = (keys: string[]) => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  };

  const street = pick(['road', 'street', 'pedestrian', 'path', 'residential', 'highway']);
  const houseNumber = pick(['house_number', 'house_no', 'number']);
  const neighbourhood = pick(['neighbourhood', 'neighborhood', 'barrio']);
  const suburb = pick(['suburb', 'quarter']);
  const district = pick(['district', 'city_district']);
  const city = pick(['city', 'town', 'village', 'municipality']);
  const state = pick(['state', 'state_district', 'region', 'province']);
  const county = pick(['county', 'departamento']);
  const postcode = pick(['postcode', 'postal_code']);
  const country = pick(['country']);

  return {
    ...(street || houseNumber ? { street: [street, houseNumber].filter(Boolean).join(' ').trim() } : {}),
    ...(neighbourhood ? { neighbourhood } : {}),
    ...(suburb ? { suburb } : {}),
    ...(district ? { district } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(county ? { county } : {}),
    ...(postcode ? { postcode } : {}),
    ...(country ? { country } : {}),
  };
};

function pickQuery(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const bag = body as Record<string, unknown>;
  const candidate = bag.query ?? bag.text ?? bag.address ?? bag.q;
  return candidate ? String(candidate).trim() : '';
}

function parseLatLngLiteral(input: string): { lat: number; lng: number } | null {
  const m = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng };
  }
  return null;
}

type GoogleUrlParseResult = { lat: number; lng: number; text?: string | null };

function parseGoogleMapsUrl(u: string): GoogleUrlParseResult | null {
  try {
    const url = new URL(u);
    if (!/google\.[^/]*\/maps/.test(url.href)) return null;

    let text: string | undefined;
    const segments = url.pathname.split('/').filter(Boolean);
    const placeIdx = segments.indexOf('place');
    if (placeIdx !== -1) {
      const candidate = segments.slice(placeIdx + 1).find(seg => seg && !seg.startsWith('@') && !seg.startsWith('data='));
      if (candidate) {
        text = decodeURIComponent(candidate).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    if (!text) {
      const qp = url.searchParams.get('query') || url.searchParams.get('destination') || url.searchParams.get('q');
      if (qp) text = qp.replace(/\+/g, ' ').trim();
    }

    // patrón @lat,lng,zoom
    const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) return { lat: Number(at[1]), lng: Number(at[2]), text };

    // query=lat,lng
    const q = url.searchParams.get('query') || url.searchParams.get('q');
    const ll = q && parseLatLngLiteral(q);
    if (ll) return { ...ll, text };

    // !3dLAT!4dLNG
    const m = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]), text };

    return null;
  } catch {
    return null;
  }
}

async function expandGoogleMapsUrl(u: string): Promise<string | null> {
  try {
    const res = await safeFetch(u, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      timeoutMs: 7000,
    });
    if (!res) return null;
    if (res.url && res.url !== u) return res.url;
    const hinted = res.headers.get('location');
    return hinted || null;
  } catch (err) {
    console.warn('[geocode] expandGoogleMapsUrl failed', err);
    return null;
  }
}

async function opencageForward(q: string): Promise<GeoOut | null> {
  if (!KEY) return null;
  const url = new URL('https://api.opencagedata.com/geocode/v1/json');
  url.searchParams.set('q', q);
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'es');
  url.searchParams.set('countrycode', 'bo');
  url.searchParams.set('limit', '1');
  url.searchParams.set('no_annotations', '1');

  const res = await safeFetch(url.toString(), { cache: 'no-store' });
  if (!res) return null;
  let data: any;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (!res.ok || !data?.results?.[0]) return null;
  const r = data.results[0];
  return {
    formatted: r.formatted,
    lat: r.geometry.lat,
    lng: r.geometry.lng,
    components: normalizeComponents(r.components),
    confidence: r.confidence,
    source: 'opencage',
  };
}

async function opencageReverse(lat: number, lng: number): Promise<GeoOut | null> {
  if (!KEY) return null;
  const url = new URL('https://api.opencagedata.com/geocode/v1/json');
  url.searchParams.set('q', `${lat},${lng}`);
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'es');
  url.searchParams.set('limit', '1');
  url.searchParams.set('no_annotations', '1');

  const res = await safeFetch(url.toString(), { cache: 'no-store' });
  if (!res) return null;
  let data: any;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (!res.ok || !data?.results?.[0]) return null;
  const r = data.results[0];
  return {
    formatted: r.formatted,
    lat: r.geometry.lat,
    lng: r.geometry.lng,
    components: normalizeComponents(r.components),
    confidence: r.confidence,
    source: 'opencage',
  };
}

async function nominatimForward(q: string): Promise<GeoOut | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  const res = await safeFetch(url.toString(), {
    headers: { 'User-Agent': NOMINATIM_UA },
    cache: 'no-store',
    timeoutMs: 15000,
  });
  if (!res) return null;
  let data: any;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const r = Array.isArray(data) && data[0];
  if (!res.ok || !r) return null;
  return {
    formatted: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    components: normalizeComponents(r.address),
    source: 'nominatim',
  };
}

async function nominatimReverse(lat: number, lng: number): Promise<GeoOut | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  const res = await safeFetch(url.toString(), {
    headers: { 'User-Agent': NOMINATIM_UA },
    cache: 'no-store',
    timeoutMs: 15000,
  });
  if (!res) return null;
  let data: any;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (!res.ok || !data) return null;
  const formatted = data.display_name || `${lat}, ${lng}`;
  return {
    formatted,
    lat,
    lng,
    components: normalizeComponents(data.address),
    source: 'nominatim',
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let input = pickQuery(body);
    if (!input) {
      return NextResponse.json({ error: 'Geocoding query is missing.' }, { status: 400 });
    }

    const looksLikeShort =
      /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input) ||
      /^https?:\/\/maps\.google(?:\.[a-z.]+)?\/maps\/app/i.test(input);
    if (looksLikeShort) {
      const expanded = await expandGoogleMapsUrl(input);
      if (expanded) {
        input = expanded;
      }
    }

    // a) ¿URL de Google Maps?
    const fromUrl = parseGoogleMapsUrl(input);
    if (fromUrl) {
      const { lat, lng, text } = fromUrl;
      const rev = (await opencageReverse(lat, lng)) ||
                  (await nominatimReverse(lat, lng));
      if (rev) return NextResponse.json(rev);
      if (text) {
        const fwdFromText = (await opencageForward(text)) || (await nominatimForward(text));
        if (fwdFromText) return NextResponse.json(fwdFromText);
      }
      return NextResponse.json({ formatted: `${lat}, ${lng}`, lat, lng, source: 'fallback' });
    }

    // b) ¿"lat,lng" literal?
    const literal = parseLatLngLiteral(input);
    if (literal) {
      const rev = (await opencageReverse(literal.lat, literal.lng)) ||
                  (await nominatimReverse(literal.lat, literal.lng));
      if (rev) return NextResponse.json(rev);
      return NextResponse.json({ formatted: `${literal.lat}, ${literal.lng}`, lat: literal.lat, lng: literal.lng, source: 'fallback' });
    }

    // c) texto → forward geocoding
    const fwd = (await opencageForward(input)) || (await nominatimForward(input));
    if (fwd) return NextResponse.json(fwd);

    return NextResponse.json({ error: 'No se encontraron resultados.' }, { status: 404 });
  } catch (err) {
    console.error('Error /endpoints/geocode:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'An internal server error occurred.', details: message },
      { status: 500 }
    );
  }
}
