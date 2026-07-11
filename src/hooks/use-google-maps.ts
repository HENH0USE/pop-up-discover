import { useEffect, useState } from "react";

declare global {
  interface Window {
    __googleMapsPromise?: Promise<typeof google>;
    initGoogleMaps?: () => void;
  }
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (window.__googleMapsPromise) {
    return window.__googleMapsPromise;
  }

  window.__googleMapsPromise = new Promise((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("Missing Google Maps browser key"));
      return;
    }
    window.initGoogleMaps = () => resolve(window.google);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      callback: "initGoogleMaps",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load "));
    document.head.appendChild(script);
  });

  return window.__googleMapsPromise;
}

export function useGoogleMaps() {
  const [maps, setMaps] = useState<typeof google | null>(
    typeof window !== "undefined" && window.google?.maps ? window.google : null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then((g) => {
        if (active) setMaps(g);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Map failed to load");
      });
    return () => {
      active = false;
    };
  }, []);

  return { maps, isLoaded: !!maps, error };
}
