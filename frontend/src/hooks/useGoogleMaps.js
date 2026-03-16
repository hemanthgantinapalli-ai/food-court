/**
 * useGoogleMaps.js
 *
 * A single shared hook for loading the Google Maps JS API.
 * IMPORTANT: useJsApiLoader must be called from a SINGLE location in the app
 * (not per-component) to avoid "already loaded" errors.
 *
 * Usage:
 *   const { isLoaded, loadError } = useGoogleMaps();
 *
 * Requires: VITE_GOOGLE_MAPS_API_KEY in your frontend .env file
 */

import { useApiIsLoaded } from '@vis.gl/react-google-maps';

export const useGoogleMaps = () => {
    const isLoaded = useApiIsLoaded();
    return { isLoaded, loadError: null };
};
