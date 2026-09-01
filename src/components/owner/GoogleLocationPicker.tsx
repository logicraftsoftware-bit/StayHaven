"use client";

import { Crosshair, Info, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type LocationValue = {
  latitude?: number;
  longitude?: number;
  house?: string;
  area?: string;
  postalCode?: string;
  mapUrl?: string;
};
type AddressPatch = LocationValue & {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
};

let mapsLoader: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string) {
  if (typeof google !== "undefined" && google.maps?.places) return Promise.resolve();
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    const callback = `stayHavenMapsReady${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callback] = () => {
      delete (window as unknown as Record<string, unknown>)[callback];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&loading=async&callback=${callback}`;
    script.async = true;
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error("Google Maps could not load. Check the API key restrictions and enabled APIs."));
    };
    document.head.appendChild(script);
  });
  return mapsLoader;
}

const component = (
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
) => components?.find((item) => item.types.includes(type))?.long_name || "";

export function GoogleLocationPicker({
  apiKey,
  value,
  address,
  onChange,
  onLoadError,
}: {
  apiKey: string;
  value: LocationValue;
  address: string;
  onChange: (patch: AddressPatch) => void;
  onLoadError: (message: string) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const inputElement = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [message, setMessage] = useState("Google business and address search enabled");
  const [locating, setLocating] = useState(false);

  const applyResult = (
    latitude: number,
    longitude: number,
    formattedAddress: string,
    components?: google.maps.GeocoderAddressComponent[],
  ) => {
    const houseNumber = component(components, "street_number");
    const route = component(components, "route");
    const premise = component(components, "premise") || component(components, "subpremise");
    onChange({
      latitude,
      longitude,
      house: [premise, houseNumber].filter(Boolean).join(" "),
      area:
        component(components, "sublocality_level_1") ||
        component(components, "sublocality") ||
        route,
      postalCode: component(components, "postal_code"),
      city:
        component(components, "locality") ||
        component(components, "administrative_area_level_2"),
      state: component(components, "administrative_area_level_1"),
      country: component(components, "country"),
      address: formattedAddress || address,
      mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    });
    if (inputElement.current) inputElement.current.value = formattedAddress;
    setMessage("Exact Google Maps pin selected");
  };

  const reverseGeocode = (latitude: number, longitude: number) => {
    markerRef.current?.setPosition({ lat: latitude, lng: longitude });
    mapRef.current?.panTo({ lat: latitude, lng: longitude });
    geocoderRef.current?.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        const result = results?.[0];
        if (status === "OK" && result)
          applyResult(latitude, longitude, result.formatted_address, result.address_components);
        else {
          onChange({
            latitude,
            longitude,
            mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
          });
          setMessage("Pin saved; complete the address fields manually.");
        }
      },
    );
  };

  useEffect(() => {
    let active = true;
    void loadGoogleMaps(apiKey)
      .then(() => {
        if (!active || !mapElement.current || !inputElement.current) return;
        const point = {
          lat: value.latitude || 26.1445,
          lng: value.longitude || 91.7362,
        };
        const map = new google.maps.Map(mapElement.current, {
          center: point,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const marker = new google.maps.Marker({
          map,
          position: point,
          draggable: true,
          title: "Property entrance",
        });
        const geocoder = new google.maps.Geocoder();
        const autocomplete = new google.maps.places.Autocomplete(inputElement.current, {
          componentRestrictions: { country: "in" },
          fields: ["address_components", "formatted_address", "geometry", "name", "place_id"],
        });
        autocomplete.bindTo("bounds", map);
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!location) return setMessage("Select a result from the Google suggestions.");
          const latitude = location.lat();
          const longitude = location.lng();
          map.setCenter(location);
          map.setZoom(17);
          marker.setPosition(location);
          applyResult(
            latitude,
            longitude,
            place.formatted_address || place.name || "",
            place.address_components,
          );
        });
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          const location = event.latLng;
          if (location) reverseGeocode(location.lat(), location.lng());
        });
        marker.addListener("dragend", () => {
          const location = marker.getPosition();
          if (location) reverseGeocode(location.lat(), location.lng());
        });
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;
      })
      .catch((reason: Error) => onLoadError(reason.message));
    return () => {
      active = false;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
    // Google Maps is initialized only when this configured key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setMessage("Location is not supported by this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        reverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        setMessage("Allow browser location permission and try again.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div className="property-location-picker google-location-picker">
      <section className="property-location-fields">
        <div className="property-location-note"><Info />Use the same address shown on your ownership or identity document.</div>
        <label className="property-location-search"><Search /><input ref={inputElement} defaultValue={address} placeholder="Search Google business, hotel, street or area" /></label>
        <button type="button" className="property-current-location" onClick={useCurrentLocation}><Crosshair />{locating ? "Finding your location…" : "Use My Current Location"}</button>
        <p className="property-location-message">{message}</p>
      </section>
      <section className="property-map-panel">
        <div ref={mapElement} className="property-map-canvas" />
        <div className="property-map-help"><MapPin />Click the Google Map or drag the pin to the exact entrance</div>
      </section>
    </div>
  );
}
