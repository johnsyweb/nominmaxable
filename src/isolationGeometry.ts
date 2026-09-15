import type { Feature } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function coordinatesFromFeature(feature: Feature): { lon: number; lat: number } | null {
  const geometry = feature.geometry;
  if (!geometry || geometry.type !== "Point") {
    return null;
  }
  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }
  const lon = coords[0];
  const lat = coords[1];
  if (typeof lon !== "number" || typeof lat !== "number") {
    return null;
  }
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }
  return { lon, lat };
}

export function formatIsolationDistanceKm(km: number): string {
  return `${km.toFixed(1)} km`;
}
