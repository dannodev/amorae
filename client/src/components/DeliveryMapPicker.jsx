import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/googleMaps";

const formatCoords = (coords) =>
  `${Number(coords.lat).toFixed(5)}, ${Number(coords.lon).toFixed(5)}`;

const DeliveryMapPicker = ({ origin, selectedLocation, estimatedLocation, onSelect }) => {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const mapProviderRef = useRef(null);
  const leafletRef = useRef(null);
  const googleMapsRef = useRef(null);
  const customerMarkerRef = useRef(null);

  useEffect(() => {
    let active = true;

    const setupMap = async () => {
      if (!mapElementRef.current || mapRef.current) return;
      const center = selectedLocation || estimatedLocation || origin;

      if (isGoogleMapsConfigured()) {
        try {
          const maps = await loadGoogleMaps();
          if (!active || !mapElementRef.current) return;
          googleMapsRef.current = maps;
          mapProviderRef.current = "google";

          const map = new maps.Map(mapElementRef.current, {
            center: { lat: center.lat, lng: center.lon },
            zoom: selectedLocation ? 16 : 13,
            clickableIcons: false,
            disableDefaultUI: true,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            zoomControl: true,
          });

          if (selectedLocation || estimatedLocation) {
            const initial = selectedLocation || estimatedLocation;
            customerMarkerRef.current = new maps.Marker({
              map,
              position: { lat: initial.lat, lng: initial.lon },
              title: selectedLocation ? "Tu ubicación" : "Ubicación estimada",
            });
          }

          map.addListener("click", (event) => {
            const nextLocation = {
              lat: event.latLng.lat(),
              lon: event.latLng.lng(),
            };
            const position = { lat: nextLocation.lat, lng: nextLocation.lon };
            if (customerMarkerRef.current) {
              customerMarkerRef.current.setPosition(position);
            } else {
              customerMarkerRef.current = new maps.Marker({
                map,
                position,
                title: "Tu ubicación",
              });
            }
            onSelect(nextLocation);
          });

          mapRef.current = map;
          return;
        } catch (error) {
          console.warn("Google Maps unavailable, using OpenStreetMap fallback", error);
        }
      }

      const L = await import("leaflet");
      if (!active || !mapElementRef.current) return;
      leafletRef.current = L;
      mapProviderRef.current = "leaflet";

      const map = L.map(mapElementRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([center.lat, center.lon], selectedLocation ? 16 : 13);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control
        .attribution({ prefix: false, position: "bottomleft" })
        .addAttribution("&copy; OpenStreetMap")
        .addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const customerIcon = L.divIcon({
        className: "",
        html: '<span class="map-pin map-pin-customer"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      if (selectedLocation || estimatedLocation) {
        const initial = selectedLocation || estimatedLocation;
        customerMarkerRef.current = L.marker([initial.lat, initial.lon], { icon: customerIcon })
          .addTo(map)
          .bindPopup(selectedLocation ? "Tu ubicación" : "Ubicación estimada");
      }

      map.on("click", (event) => {
        const nextLocation = {
          lat: event.latlng.lat,
          lon: event.latlng.lng,
        };
        if (customerMarkerRef.current) {
          customerMarkerRef.current.setLatLng(event.latlng);
        } else {
          customerMarkerRef.current = L.marker(event.latlng, { icon: customerIcon }).addTo(map);
        }
        customerMarkerRef.current.bindPopup("Tu ubicación").openPopup();
        onSelect(nextLocation);
      });

      setTimeout(() => map.invalidateSize(), 120);
      mapRef.current = map;
    };

    setupMap();

    return () => {
      active = false;
    };
  }, [estimatedLocation, onSelect, origin, selectedLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const provider = mapProviderRef.current;
    const next = selectedLocation || estimatedLocation;
    if (!next) {
      if (customerMarkerRef.current) {
        if (provider === "google") {
          customerMarkerRef.current.setMap(null);
        } else {
          map.removeLayer(customerMarkerRef.current);
        }
        customerMarkerRef.current = null;
      }
      return;
    }

    if (provider === "google") {
      const maps = googleMapsRef.current;
      if (!maps) return;
      const position = { lat: next.lat, lng: next.lon };
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setPosition(position);
      } else {
        customerMarkerRef.current = new maps.Marker({
          map,
          position,
          title: selectedLocation ? "Tu ubicación" : "Ubicación estimada",
        });
      }
      map.setCenter(position);
      if (selectedLocation) map.setZoom(16);
      return;
    }

    const L = leafletRef.current;
    if (!L) return;

    const latLng = [next.lat, next.lon];
    if (customerMarkerRef.current) {
      customerMarkerRef.current.setLatLng(latLng);
    } else {
      const customerIcon = L.divIcon({
        className: "",
        html: '<span class="map-pin map-pin-customer"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      customerMarkerRef.current = L.marker(latLng, { icon: customerIcon }).addTo(map);
    }
    map.setView(latLng, selectedLocation ? 16 : map.getZoom());
  }, [estimatedLocation, selectedLocation]);

  const displayedLocation = selectedLocation || estimatedLocation;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-primary-dull/10 bg-white shadow-sm">
      <div
        ref={mapElementRef}
        className="delivery-map h-64 w-full bg-[#efe2d0] sm:h-72"
        aria-label="Mapa para seleccionar ubicación de entrega"
      />
      <div className="flex flex-col gap-2 border-t border-primary-dull/10 bg-[#fffaf2] px-4 py-3 text-xs text-stone-600 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {selectedLocation
            ? `Pin seleccionado: ${formatCoords(selectedLocation)}`
            : displayedLocation
              ? "Toca el mapa para afinar tu punto de entrega."
              : "Toca el mapa para marcar tu punto exacto."}
        </span>
        {selectedLocation && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="w-fit cursor-pointer rounded-full bg-white px-3 py-1.5 font-bold text-primary-dull shadow-sm"
          >
            Quitar pin
          </button>
        )}
      </div>
    </div>
  );
};

export default DeliveryMapPicker;
