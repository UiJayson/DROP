import type { LatLng } from '@drop/shared';

export type PlaceSuggestion = {
  id: string;
  label: string;
};

export type PlaceDetail = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

function browserFetch(): FetchLike {
  const candidate = (globalThis as { fetch?: FetchLike }).fetch;
  if (!candidate) {
    return async () => ({ ok: false, json: async () => null });
  }
  return candidate;
}

export function parseRoutesDistance(body: unknown): number | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const routes = (body as { routes?: unknown }).routes;
  if (!Array.isArray(routes) || routes.length === 0) {
    return null;
  }
  const metres = (routes[0] as { distanceMeters?: unknown }).distanceMeters;
  if (typeof metres !== 'number' || !Number.isFinite(metres) || metres < 0) {
    return null;
  }
  return Math.round(metres);
}

export function parsePlaceSuggestions(body: unknown): PlaceSuggestion[] {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const suggestions = (body as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) {
    return [];
  }
  const places: PlaceSuggestion[] = [];
  for (const item of suggestions) {
    const prediction = (
      item as { placePrediction?: { placeId?: unknown; text?: { text?: unknown } } }
    ).placePrediction;
    const id = prediction?.placeId;
    const label = prediction?.text?.text;
    if (typeof id === 'string' && id && typeof label === 'string' && label) {
      places.push({ id, label });
    }
  }
  return places;
}

export function parsePlaceDetail(id: string, body: unknown): PlaceDetail | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const location = (body as { location?: { latitude?: unknown; longitude?: unknown } }).location;
  const lat = location?.latitude;
  const lng = location?.longitude;
  const label =
    (body as { displayName?: { text?: unknown } }).displayName?.text ??
    (body as { formattedAddress?: unknown }).formattedAddress;
  if (typeof lat !== 'number' || typeof lng !== 'number' || typeof label !== 'string' || !label) {
    return null;
  }
  return { id, label, lat, lng };
}

export async function googleRoadDistanceM(
  key: string,
  from: LatLng,
  to: LatLng,
  fetchImpl: FetchLike = browserFetch(),
): Promise<number | null> {
  if (key.trim() === '') {
    return null;
  }
  try {
    const response = await fetchImpl('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: 'TWO_WHEELER',
      }),
    });
    if (!response.ok) {
      return null;
    }
    return parseRoutesDistance(await response.json());
  } catch {
    return null;
  }
}

export async function googlePlaceSuggestions(
  key: string,
  input: string,
  sessionToken: string,
  bias: LatLng,
  fetchImpl: FetchLike = browserFetch(),
): Promise<PlaceSuggestion[]> {
  if (key.trim() === '' || input.trim().length < 3) {
    return [];
  }
  try {
    const response = await fetchImpl('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ['ng'],
        locationBias: {
          circle: {
            center: { latitude: bias.lat, longitude: bias.lng },
            radius: 20000,
          },
        },
      }),
    });
    if (!response.ok) {
      return [];
    }
    return parsePlaceSuggestions(await response.json());
  } catch {
    return [];
  }
}

export async function googlePlaceDetail(
  key: string,
  placeId: string,
  sessionToken: string,
  fetchImpl: FetchLike = browserFetch(),
): Promise<PlaceDetail | null> {
  if (key.trim() === '' || placeId.trim() === '') {
    return null;
  }
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const response = await fetchImpl(url, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'location,displayName,formattedAddress',
        'X-Goog-Session-Token': sessionToken,
      },
    });
    if (!response.ok) {
      return null;
    }
    return parsePlaceDetail(placeId, await response.json());
  } catch {
    return null;
  }
}
