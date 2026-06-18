// Delivery fee calculation utilities.
//
// The store is configured via Vite environment variables. Customer addresses are
// geocoded on demand. Google Maps is used when VITE_GOOGLE_MAPS_API_KEY is
// configured; otherwise the app falls back to OpenStreetMap/Nominatim plus local
// postal data. Distance is computed with the Haversine formula and the fee follows
// the business rule:
//   - First N kilometers are free
//   - Each chargeable km costs VITE_DELIVERY_PER_KM_MXN (MXN)
//   - Orders above VITE_DELIVERY_FREE_ORDER_MIN_MXN get free delivery up to
//     VITE_DELIVERY_FREE_ORDER_MAX_KM, then pay the same per-km rate for each
//     extra km.

import { jaliscoPostalPlaces } from "./jaliscoPostalData.js";
import { jaliscoColonias } from "./jaliscoColoniasData.js";
import { reverseGeocodeWithGoogle } from "./googleMaps.js";

const env = import.meta.env;

const FALLBACK_WHATSAPP_NUMBER = "523330089383";
const FALLBACK_FREE_KM = 2;
const FALLBACK_PER_KM = 5.5;
const FALLBACK_FREE_ORDER_MIN_MXN = 600;
const FALLBACK_FREE_ORDER_MAX_KM = 15;
const FALLBACK_LONG_DISTANCE_PER_KM = FALLBACK_PER_KM;
const FALLBACK_STORE_COORDINATES = { lat: 20.6426, lon: -103.2888 };
const FALLBACK_STORE_ADDRESS =
  "Cipriano Campos Alatorre 1283, Villas del Nilo, 44824 Guadalajara, Jalisco";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const PHOTON_REVERSE_ENDPOINT = "https://photon.komoot.io/reverse";
const ZIPPOPOTAMUS_ENDPOINT = "https://api.zippopotam.us/MX";

const getEnvString = (key, fallback) => {
  const value = env?.[key];
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const getEnvNumber = (key, fallback) => {
  const raw = getEnvString(key, "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCoordinatePair = (raw) => {
  if (!raw) return null;
  const match = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
  if (match.length !== 2) return null;
  const [lat, lon] = match;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
};

export const getStoreConfig = () => {
  const freeKm = getEnvNumber("VITE_DELIVERY_FREE_KM", FALLBACK_FREE_KM);
  const perKmMxn = getEnvNumber("VITE_DELIVERY_PER_KM_MXN", FALLBACK_PER_KM);
  const freeOrderMinMxn = getEnvNumber(
    "VITE_DELIVERY_FREE_ORDER_MIN_MXN",
    FALLBACK_FREE_ORDER_MIN_MXN
  );
  const freeOrderMaxKm = getEnvNumber(
    "VITE_DELIVERY_FREE_ORDER_MAX_KM",
    FALLBACK_FREE_ORDER_MAX_KM
  );
  const longDistancePerKmMxn = getEnvNumber(
    "VITE_DELIVERY_LONG_DISTANCE_PER_KM_MXN",
    FALLBACK_LONG_DISTANCE_PER_KM
  );
  const explicitCoordinates = parseCoordinatePair(
    getEnvString("VITE_STORE_COORDINATES", "")
  );
  const storeAddress = getEnvString(
    "VITE_STORE_ADDRESS",
    FALLBACK_STORE_ADDRESS
  );
  return {
    storeAddress,
    storeCoordinates: explicitCoordinates || FALLBACK_STORE_COORDINATES,
    freeKm,
    perKmMxn,
    freeOrderMinMxn,
    freeOrderMaxKm,
    longDistancePerKmMxn,
  };
};

export const getWhatsAppNumber = () => {
  const raw = getEnvString("VITE_WHATSAPP_BUSINESS_NUMBER", FALLBACK_WHATSAPP_NUMBER);
  const digits = raw.replace(/\D/g, "");
  return digits || FALLBACK_WHATSAPP_NUMBER;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const haversineKm = (origin, destination) => {
  if (!origin || !destination) return null;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLon = toRadians(destination.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const calculateDeliveryFee = (
  distanceKm,
  config = getStoreConfig(),
  orderSubtotal = 0
) => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return {
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
      feeMxn: 0,
      chargeableKm: 0,
      promotionApplied: false,
      rateMxn: 0,
    };
  }
  const {
    freeKm,
    perKmMxn,
    freeOrderMinMxn,
    freeOrderMaxKm,
    longDistancePerKmMxn,
  } = config;
  const safeFreeKm = Math.max(0, Number(freeKm) || 0);
  const safePerKm = Math.max(0, Number(perKmMxn) || 0);
  const safeOrderSubtotal = Math.max(0, Number(orderSubtotal) || 0);
  const safeFreeOrderMin = Math.max(0, Number(freeOrderMinMxn) || 0);
  const safeFreeOrderMaxKm = Math.max(0, Number(freeOrderMaxKm) || 0);
  const safeLongDistancePerKm = Math.max(0, Number(longDistancePerKmMxn) || 0);
  const promotionApplies =
    safeFreeOrderMin > 0 &&
    safeFreeOrderMaxKm > 0 &&
    safeOrderSubtotal >= safeFreeOrderMin;

  if (promotionApplies && distanceKm <= safeFreeOrderMaxKm) {
    return {
      distanceKm,
      feeMxn: 0,
      chargeableKm: 0,
      promotionApplied: true,
      rateMxn: 0,
    };
  }

  if (promotionApplies && distanceKm > safeFreeOrderMaxKm) {
    const chargeableKm = distanceKm - safeFreeOrderMaxKm;
    const feeMxn = Math.round(chargeableKm * safeLongDistancePerKm * 100) / 100;
    return {
      distanceKm,
      feeMxn,
      chargeableKm,
      promotionApplied: true,
      rateMxn: safeLongDistancePerKm,
    };
  }

  if (distanceKm <= safeFreeKm) {
    return {
      distanceKm,
      feeMxn: 0,
      chargeableKm: 0,
      promotionApplied: false,
      rateMxn: 0,
    };
  }
  const chargeableKm = distanceKm - safeFreeKm;
  const feeMxn = Math.round(chargeableKm * safePerKm * 100) / 100;
  return {
    distanceKm,
    feeMxn,
    chargeableKm,
    promotionApplied: false,
    rateMxn: safePerKm,
  };
};

const formatNumber = (value) => value.toLocaleString("es-MX", { maximumFractionDigits: 2 });

const isCacheable = (query) => typeof query === "string" && query.trim().length >= 6;

const geocodeCache = new Map();
const postalCodeCache = new Map();

const SERVICE_AREA_MUNICIPALITIES = new Map([
  [14039, "Guadalajara"],
  [14120, "Zapopan"],
  [14098, "San Pedro Tlaquepaque"],
  [14101, "Tonalá"],
  [14097, "Tlajomulco de Zúñiga"],
  [14070, "El Salto"],
  [14051, "Juanacatlán"],
  [14044, "Ixtlahuacán de los Membrillos"],
]);

const SERVICE_AREA_WARNING =
  "Por ahora solo entregamos en Guadalajara, Jalisco y zona metropolitana.";

const getServiceAreaMunicipality = (place) =>
  SERVICE_AREA_MUNICIPALITIES.get(Number(place?.municipalityId)) || "";

const buildPostalResult = (postalCode, places, source = "local-jalisco") => {
  const deliveryPlaces = places.filter((place) => getServiceAreaMunicipality(place));
  const displayPlaces = deliveryPlaces.length ? deliveryPlaces : places;
  const municipalityNames = [
    ...new Set(displayPlaces.map(getServiceAreaMunicipality).filter(Boolean)),
  ];
  return {
    postalCode,
    country: "Mexico",
    state: "Jalisco",
    places: displayPlaces,
    source,
    deliveryAvailable: deliveryPlaces.length > 0,
    serviceAreaMessage: deliveryPlaces.length ? "" : SERVICE_AREA_WARNING,
    primaryMunicipality: municipalityNames[0] || "",
    municipalities: municipalityNames,
  };
};

const buildAddressQuery = (input) => {
  if (typeof input === "string") return input.trim();
  if (!input || typeof input !== "object") return "";
  const { street, colonia, zipcode, city, state } = input;
  return [street, colonia, zipcode, city, state, "México"]
    .filter((part) => Boolean(part && String(part).trim()))
    .map((part) => String(part).trim())
    .join(", ");
};

const fetchNominatim = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Geocoder responded with ${response.status}`);
  }
  return response.json();
};

const normalizePostalPlace = (place) => ({
  name: place?.["place name"] || "",
  state: place?.state || "",
  stateAbbreviation: place?.["state abbreviation"] || "",
  lat: Number(place?.latitude),
  lon: Number(place?.longitude),
});

const LOCAL_POSTAL_MAX_DISTANCE_KM = 12;
const GEOCODER_POSTAL_MAX_DISTANCE_KM = 10;
const GEOCODER_POSTAL_DISTANCE_MARGIN_KM = 0.75;

const localPostalPlaces = jaliscoPostalPlaces.map(
  ([name, postalCode, lat, lon, municipality, accuracy]) => ({
    name,
    postalCode,
    state: "Jalisco",
    stateAbbreviation: "JAL",
    lat,
    lon,
    municipality,
    accuracy,
  })
);

const localColonias = jaliscoColonias.map(
  ([name, postalCode, municipalityId, settlement]) => {
    const coordinatePlace =
      localPostalPlaces.find(
        (place) =>
          place.postalCode === postalCode &&
          place.name.toLowerCase() === name.toLowerCase()
      ) || localPostalPlaces.find((place) => place.postalCode === postalCode);

    return {
      name,
      postalCode,
      state: "Jalisco",
      stateAbbreviation: "JAL",
      municipalityId,
      settlement,
      lat: coordinatePlace?.lat,
      lon: coordinatePlace?.lon,
    };
  }
);

const getLocalPostalPlacesByCode = (postalCode) => {
  const cleanCode = String(postalCode || "").replace(/\D/g, "").slice(0, 5);
  if (cleanCode.length !== 5) return [];
  return localPostalPlaces.filter((place) => place.postalCode === cleanCode);
};

const getLocalColoniasByCode = (postalCode) => {
  const cleanCode = String(postalCode || "").replace(/\D/g, "").slice(0, 5);
  if (cleanCode.length !== 5) return [];
  return localColonias.filter((place) => place.postalCode === cleanCode);
};

const findNearestFromPlaces = (places, coordinates, maxDistanceKm) => {
  const origin = {
    lat: Number(coordinates?.lat),
    lon: Number(coordinates?.lon),
  };
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) return null;
  const nearest = places
    .map((place) => ({
      ...place,
      distanceKm: haversineKm(origin, { lat: place.lat, lon: place.lon }),
    }))
    .filter((place) => Number.isFinite(place.distanceKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  return nearest && nearest.distanceKm <= maxDistanceKm ? nearest : null;
};

export const findNearestPostalPlace = (
  coordinates,
  maxDistanceKm = LOCAL_POSTAL_MAX_DISTANCE_KM
) => findNearestFromPlaces(localPostalPlaces, coordinates, maxDistanceKm);

const findNearestPostalPlaceByCode = (
  postalCode,
  coordinates,
  maxDistanceKm = GEOCODER_POSTAL_MAX_DISTANCE_KM
) => {
  const places = getLocalPostalPlacesByCode(postalCode);
  if (!places.length) return null;
  return findNearestFromPlaces(places, coordinates, maxDistanceKm);
};

const cleanText = (value) => String(value || "").trim();

const cleanPostalCode = (value) =>
  cleanText(value).match(/\b\d{5}\b/)?.[0] || "";

const uniqueAddressParts = (displayName) =>
  cleanText(displayName)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const buildStreetLine = (street, houseNumber) => {
  const safeStreet = cleanText(street);
  const safeHouseNumber = cleanText(houseNumber);
  if (!safeStreet) return "";
  if (!safeHouseNumber || safeStreet.includes(safeHouseNumber)) return safeStreet;
  return `${safeStreet} ${safeHouseNumber}`;
};

const normalizeNominatimReverse = (data) => {
  const address = data?.address || {};
  const displayParts = uniqueAddressParts(data?.display_name);
  const street =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.cycleway ||
    address.path ||
    address.service ||
    address.residential ||
    displayParts[0] ||
    "";
  const houseNumber = address.house_number || "";
  const colonia =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    address.district ||
    address.hamlet ||
    address.locality ||
    "";
  const zipcode = cleanPostalCode(address.postcode) || cleanPostalCode(data?.display_name);
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    address.county ||
    "";
  return {
    street,
    houseNumber,
    streetLine: buildStreetLine(street, houseNumber),
    colonia,
    zipcode,
    city,
    state: address.state || "",
    displayName: data?.display_name || "",
    source: "nominatim",
  };
};

const normalizePhotonReverse = (feature) => {
  const properties = feature?.properties || {};
  const street = properties.street || properties.name || "";
  const houseNumber = properties.housenumber || "";
  return {
    street,
    houseNumber,
    streetLine: buildStreetLine(street, houseNumber),
    colonia: properties.locality || properties.district || properties.neighbourhood || "",
    zipcode: cleanPostalCode(properties.postcode),
    city: properties.city || properties.county || "",
    state: properties.state || "",
    displayName: [
      properties.name,
      properties.street,
      properties.locality,
      properties.city,
      properties.state,
      properties.postcode,
      properties.country,
    ].filter(Boolean).join(", "),
    source: "photon",
  };
};

const mergeReverseComponents = (primary, fallback) => {
  const colonia = primary?.colonia || fallback?.colonia || primary?.city || fallback?.city || "";
  const merged = {
    street: primary?.street || fallback?.street || "",
    houseNumber: primary?.houseNumber || fallback?.houseNumber || "",
    streetLine: primary?.streetLine || fallback?.streetLine || "",
    colonia,
    coloniaIsApproximate: Boolean(colonia && !primary?.colonia && !fallback?.colonia),
    zipcode: primary?.zipcode || fallback?.zipcode || "",
    city: primary?.city || fallback?.city || "Guadalajara",
    state: primary?.state || fallback?.state || "Jalisco",
  };
  merged.missingFields = [
    !merged.streetLine && "calle",
    !merged.zipcode && "código postal",
    !merged.colonia && "colonia",
  ].filter(Boolean);
  return merged;
};

export const lookupPostalCode = async (postalCode) => {
  const cleanPostalCode = String(postalCode || "").replace(/\D/g, "").slice(0, 5);
  if (cleanPostalCode.length !== 5) return null;
  if (postalCodeCache.has(cleanPostalCode)) return postalCodeCache.get(cleanPostalCode);

  const localPlaces = getLocalColoniasByCode(cleanPostalCode);
  if (localPlaces.length) {
    const result = buildPostalResult(cleanPostalCode, localPlaces);
    postalCodeCache.set(cleanPostalCode, result);
    return result;
  }

  const response = await fetch(`${ZIPPOPOTAMUS_ENDPOINT}/${cleanPostalCode}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Postal code lookup responded with ${response.status}`);
  }

  const data = await response.json();
  const places = (data?.places || [])
    .map(normalizePostalPlace)
    .filter((place) => place.name && Number.isFinite(place.lat) && Number.isFinite(place.lon));
  const result = {
    postalCode: data?.["post code"] || cleanPostalCode,
    country: data?.country || "Mexico",
    state: places[0]?.state || "",
    places,
    deliveryAvailable: false,
    serviceAreaMessage: SERVICE_AREA_WARNING,
    primaryMunicipality: "",
    municipalities: [],
  };
  postalCodeCache.set(cleanPostalCode, result);
  return result;
};

const geocodeWithNominatim = async (query) => {
  if (!query) return null;
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    addressdetails: "0",
    countrycodes: "mx",
  });
  const data = await fetchNominatim(`${NOMINATIM_ENDPOINT}?${params.toString()}`);
  if (!Array.isArray(data) || data.length === 0) return null;
  const [hit] = data;
  const result = {
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    displayName: hit.display_name,
    source: "nominatim",
  };
  return Number.isFinite(result.lat) && Number.isFinite(result.lon) ? result : null;
};

const geocodeFromPostalCode = async (input) => {
  if (!input || typeof input !== "object") return null;
  const postalData = await lookupPostalCode(input.zipcode);
  if (!postalData?.places?.length) return null;
  const requestedColonia = String(input.colonia || "").trim().toLowerCase();
  const selectedPlace =
    postalData.places.find((place) => place.name.toLowerCase() === requestedColonia) ||
    postalData.places.find((place) => place.name.toLowerCase().includes(requestedColonia)) ||
    postalData.places[0];
  return {
    lat: selectedPlace.lat,
    lon: selectedPlace.lon,
    displayName: `${selectedPlace.name}, ${postalData.postalCode}, ${postalData.state}, México`,
    source: "postal-code",
    postalCode: postalData.postalCode,
    colonia: selectedPlace.name,
    state: postalData.state,
  };
};

export const geocodeAddress = async (input) => {
  const query = buildAddressQuery(input);
  if (!query) return null;
  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  let result = null;
  const candidates = [query];
  if (input && typeof input === "object") {
    const { street, colonia, zipcode, city, state } = input;
    candidates.push(
      [street, zipcode, city, state, "México"].filter(Boolean).join(", "),
      [colonia, zipcode, city, state, "México"].filter(Boolean).join(", "),
      [zipcode, city, state, "México"].filter(Boolean).join(", ")
    );
  }

  for (const candidate of [...new Set(candidates.filter(Boolean))]) {
    try {
      result = await geocodeWithNominatim(candidate);
      if (result) break;
    } catch {
      break;
    }
  }

  if (!result) result = await geocodeFromPostalCode(input);
  if (!result) return null;
  if (isCacheable(query)) geocodeCache.set(cacheKey, result);
  return result;
};

export const reverseGeocode = async ({ lat, lon }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  try {
    const googleResult = await reverseGeocodeWithGoogle({ lat, lon });
    if (googleResult?.components?.zipcode) return googleResult;
  } catch (error) {
    console.warn("Google reverse geocode failed, using fallback geocoders", error);
  }

  const nominatimParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    zoom: "18",
    addressdetails: "1",
  });
  const photonParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  const [nominatimResult, photonResult] = await Promise.allSettled([
    fetchNominatim(`${NOMINATIM_REVERSE_ENDPOINT}?${nominatimParams.toString()}`),
    fetchNominatim(`${PHOTON_REVERSE_ENDPOINT}?${photonParams.toString()}`),
  ]);
  const nominatimData = nominatimResult.status === "fulfilled" ? nominatimResult.value : null;
  const photonData = photonResult.status === "fulfilled" ? photonResult.value : null;
  if (!nominatimData?.display_name && !photonData?.features?.length) return null;
  const nominatimComponents = normalizeNominatimReverse(nominatimData);
  const photonComponents = normalizePhotonReverse(photonData?.features?.[0]);
  const components = mergeReverseComponents(nominatimComponents, photonComponents);
  const nearestLocalPostalPlace = findNearestPostalPlace({ lat, lon });
  const geocoderPostalPlace = findNearestPostalPlaceByCode(
    components.zipcode,
    { lat, lon }
  );
  const shouldTrustGeocoderPostalPlace =
    geocoderPostalPlace &&
    (!nearestLocalPostalPlace ||
      geocoderPostalPlace.distanceKm <=
        nearestLocalPostalPlace.distanceKm + GEOCODER_POSTAL_DISTANCE_MARGIN_KM);
  const nearestPostalPlace = shouldTrustGeocoderPostalPlace
    ? geocoderPostalPlace
    : nearestLocalPostalPlace;
  if (nearestPostalPlace) {
    components.zipcode = nearestPostalPlace.postalCode;
    components.colonia = nearestPostalPlace.name;
    components.coloniaIsApproximate = nearestPostalPlace.distanceKm > 1.5;
    components.postalSource = "local-jalisco";
    components.postalDistanceKm = nearestPostalPlace.distanceKm;
    components.missingFields = [
      !components.streetLine && "calle",
      !components.zipcode && "código postal",
      !components.colonia && "colonia",
    ].filter(Boolean);
  } else if (components.zipcode && !getLocalPostalPlacesByCode(components.zipcode).length) {
    components.zipcode = "";
    components.postalSource = "untrusted-geocoder";
    components.missingFields = [
      !components.streetLine && "calle",
      "código postal",
      !components.colonia && "colonia",
    ].filter(Boolean);
  }
  return {
    lat: Number(nominatimData?.lat) || lat,
    lon: Number(nominatimData?.lon) || lon,
    displayName: nominatimData?.display_name || photonComponents.displayName,
    address: nominatimData?.address || {},
    components,
    sources: {
      nominatim: nominatimComponents,
      photon: photonComponents,
    },
  };
};

export const getStoreCoordinates = async () => {
  const { storeCoordinates, storeAddress } = getStoreConfig();
  if (storeCoordinates) return storeCoordinates;
  const geocoded = await geocodeAddress(storeAddress);
  if (geocoded) return { lat: geocoded.lat, lon: geocoded.lon };
  return FALLBACK_STORE_COORDINATES;
};

export const computeQuote = async (customerInput, orderSubtotal = 0) => {
  const config = getStoreConfig();
  const origin = await getStoreCoordinates();
  const mapCoordinates = customerInput?.coordinates
    ? {
        lat: Number(customerInput.coordinates.lat),
        lon: Number(customerInput.coordinates.lon),
      }
    : null;
  const hasValidMapCoordinates =
    Number.isFinite(mapCoordinates?.lat) &&
    Number.isFinite(mapCoordinates?.lon) &&
    mapCoordinates.lat >= -90 &&
    mapCoordinates.lat <= 90 &&
    mapCoordinates.lon >= -180 &&
    mapCoordinates.lon <= 180;
  const destination = hasValidMapCoordinates
    ? {
        lat: mapCoordinates.lat,
        lon: mapCoordinates.lon,
        displayName: "Ubicación marcada en el mapa",
        source: "map",
      }
    : await geocodeAddress(customerInput);
  if (!destination) {
    return {
      origin,
      destination: null,
      distanceKm: null,
      feeMxn: 0,
      chargeableKm: 0,
      promotionApplied: false,
      rateMxn: 0,
      status: "unresolved",
      message: "No pudimos ubicar la dirección. Te contactaremos para confirmar el costo de envío.",
      config,
    };
  }
  const distanceKm = haversineKm(origin, destination);
  const { feeMxn, chargeableKm, promotionApplied, rateMxn } = calculateDeliveryFee(
    distanceKm,
    config,
    orderSubtotal
  );
  return {
    origin,
    destination,
    distanceKm,
    feeMxn,
    chargeableKm,
    promotionApplied,
    rateMxn,
    status: "ok",
    precision:
      destination.source === "map"
        ? "map"
        : destination.source === "postal-code"
          ? "postal-code"
          : "address",
    message: null,
    config,
  };
};

export const formatQuote = (quote) => {
  if (!quote) return "—";
  if (quote.status === "unresolved" || !Number.isFinite(quote.distanceKm)) {
    return "Por confirmar";
  }
  const distance = formatNumber(quote.distanceKm);
  if (quote.feeMxn <= 0) return `Gratis (${distance} km)`;
  return `${distance} km · ${formatNumber(quote.feeMxn)} MXN`;
};

export const formatDistance = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return "—";
  return `${formatNumber(distanceKm)} km`;
};

export const formatFee = (feeMxn) => {
  const amount = Math.ceil(Number(feeMxn) || 0);
  const formatted = amount.toLocaleString("es-MX", { maximumFractionDigits: 0 });
  return `$${formatted} MXN`;
};

export const clearGeocodeCache = () => {
  geocodeCache.clear();
  postalCodeCache.clear();
};

// Build a public OpenStreetMap "static map" preview URL. The free staticmap.openstreetmap.de
// service renders a simple PNG marker overlay; no API key required, but it should be used
// sparingly (cached on the consumer side).
export const buildStaticMapUrl = (origin, destination, { width = 600, height = 240, zoom = 13 } = {}) => {
  if (!origin || !destination) return null;
  const safeWidth = Math.min(1200, Math.max(160, Math.round(width)));
  const safeHeight = Math.min(800, Math.max(120, Math.round(height)));
  const safeZoom = Math.min(18, Math.max(3, Math.round(zoom)));
  // staticmap.openstreetmap.de uses lat,lon,lat,lon bbox, with a width/height/zoom.
  const bbox = `${origin.lat},${origin.lon},${destination.lat},${destination.lon}`;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${origin.lat},${origin.lon}&zoom=${safeZoom}&size=${safeWidth}x${safeHeight}&maptype=mapnik&markers=${origin.lat},${origin.lon},lightblue|${destination.lat},${destination.lon},lightblue1&bbox=${bbox}`;
};
