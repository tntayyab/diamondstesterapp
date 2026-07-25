/**
 * "Use my current location" helper shared by the Create Post flow (and any
 * other screen that wants a human-readable place string, e.g. "City, Region").
 *
 * Requests foreground-only permission, reads the current position, then
 * reverse-geocodes it. Falls back to raw coordinates when reverse geocoding
 * fails or comes back empty (e.g. open ocean, no network for the geocoder).
 */
import * as Location from "expo-location";

import { showAlert } from "@/components/AppAlert";

export interface ResolvedLocation {
  label: string;
  latitude: number;
  longitude: number;
}

/** "City, Region" / "City, Country" — whichever pair of parts is available. */
function formatPlace(place: Location.LocationGeocodedAddress): string | null {
  const city = place.city || place.subregion || place.district;
  const region = place.region;
  const country = place.country;

  if (city && region && region !== city) return `${city}, ${region}`;
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (region && country) return `${region}, ${country}`;
  return region || country || null;
}

function coordsLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Resolves the device's current location to a display string. Returns `null`
 * only when the user declines permission or the position itself can't be read
 * (both cases already show an explanatory alert) — a failed/empty reverse
 * geocode still resolves, just with raw coordinates instead of a place name.
 */
export async function resolveCurrentLocation(): Promise<ResolvedLocation | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    showAlert(
      "Location access needed",
      "Enable location access in Settings to auto-fill where you found this gemstone.",
    );
    return null;
  }

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    showAlert("Couldn't get your location", "Please try again, or enter it manually.");
    return null;
  }

  const { latitude, longitude } = position.coords;

  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const label = places.length ? formatPlace(places[0]) : null;
    return { label: label || coordsLabel(latitude, longitude), latitude, longitude };
  } catch {
    return { label: coordsLabel(latitude, longitude), latitude, longitude };
  }
}
