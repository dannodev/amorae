const GOOGLE_MAPS_API_KEY = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY?.trim();
const GOOGLE_MAPS_SCRIPT_ID = "amorae-google-maps";
const GOOGLE_MAPS_CALLBACK = "__amoraeGoogleMapsReady";

let googleMapsPromise = null;

export const isGoogleMapsConfigured = () => Boolean(GOOGLE_MAPS_API_KEY);

export const loadGoogleMaps = () => {
  if (typeof window === "undefined" || !GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps API key is not configured."));
  }

  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    window[GOOGLE_MAPS_CALLBACK] = () => {
      resolve(window.google.maps);
    };

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      callback: GOOGLE_MAPS_CALLBACK,
      language: "es",
      region: "MX",
      loading: "async",
      v: "weekly",
    });

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

const getAddressComponent = (result, type, key = "long_name") =>
  result?.address_components?.find((component) => component.types.includes(type))?.[key] || "";

const isMexicoResult = (result) => getAddressComponent(result, "country", "short_name") === "MX";

const resultPostalCode = (result) => getAddressComponent(result, "postal_code");

export const reverseGeocodeWithGoogle = async ({ lat, lon }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isGoogleMapsConfigured()) {
    return null;
  }

  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  const response = await geocoder.geocode({
    location: { lat, lng: lon },
    region: "mx",
  });
  const results = (response?.results || []).filter(isMexicoResult);
  const postalResult =
    results.find((result) => result.types.includes("postal_code")) ||
    results.find((result) => resultPostalCode(result));

  if (!postalResult) return null;

  const zipcode = resultPostalCode(postalResult);
  if (!zipcode) return null;

  const city =
    getAddressComponent(postalResult, "locality") ||
    getAddressComponent(postalResult, "administrative_area_level_2") ||
    "Guadalajara";

  return {
    lat,
    lon,
    displayName: postalResult.formatted_address || "",
    address: {},
    components: {
      street: "",
      houseNumber: "",
      streetLine: "",
      colonia: "",
      zipcode,
      city,
      state: getAddressComponent(postalResult, "administrative_area_level_1") || "Jalisco",
      source: "google",
      postalSource: "google",
      missingFields: ["calle", "colonia"],
    },
    sources: {
      google: postalResult,
    },
  };
};
