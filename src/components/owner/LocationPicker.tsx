"use client";

import "leaflet/dist/leaflet.css";
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
type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

const defaultPoint: [number, number] = [26.1445, 91.7362];

export function LocationPicker({
  value,
  address,
  onChange,
}: {
  value: LocationValue;
  address: string;
  onChange: (patch: AddressPatch) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  const applyAddress = async (latitude: number, longitude: number) => {
    setMessage("Finding address…");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const result = (await response.json()) as SearchResult;
      const item = result.address || {};
      const house = [item.house_number, item.building].filter(Boolean).join(" ");
      const area =
        item.suburb || item.neighbourhood || item.quarter || item.road || "";
      onChange({
        latitude,
        longitude,
        house,
        area,
        postalCode: item.postcode || "",
        city: item.city || item.town || item.village || item.county || "",
        state: item.state || "",
        country: item.country || "",
        address: result.display_name || address,
        mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
      });
      setQuery(result.display_name || "");
      setMessage("Location pin selected");
    } catch {
      onChange({
        latitude,
        longitude,
        mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
      });
      setMessage("Pin saved; complete the address fields manually.");
    }
  };

  useEffect(() => {
    let active = true;
    void import("leaflet").then((leaflet) => {
      if (!active || !mapElement.current || mapRef.current) return;
      const point: [number, number] = [
        value.latitude || defaultPoint[0],
        value.longitude || defaultPoint[1],
      ];
      const map = leaflet.map(mapElement.current, { zoomControl: true }).setView(point, 15);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        })
        .addTo(map);
      const icon = leaflet.divIcon({
        className: "property-map-pin",
        html: "<span></span>",
        iconSize: [34, 44],
        iconAnchor: [17, 42],
      });
      const marker = leaflet.marker(point, { draggable: true, icon }).addTo(map);
      map.on("click", (event: import("leaflet").LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        void applyAddress(event.latlng.lat, event.latlng.lng);
      });
      marker.on("dragend", () => {
        const selected = marker.getLatLng();
        void applyAddress(selected.lat, selected.lng);
      });
      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 50);
    });
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once; later point changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value.latitude || !value.longitude || !mapRef.current || !markerRef.current) return;
    const point: [number, number] = [value.latitude, value.longitude];
    markerRef.current.setLatLng(point);
    mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 15));
  }, [value.latitude, value.longitude]);

  useEffect(() => {
    if (query.trim().length < 3) {
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`,
          { headers: { "Accept-Language": "en" } },
        );
        setResults((await response.json()) as SearchResult[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const selectResult = (result: SearchResult) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const item = result.address || {};
    setQuery(result.display_name);
    setResults([]);
    onChange({
      latitude,
      longitude,
      house: [item.house_number, item.building].filter(Boolean).join(" "),
      area: item.suburb || item.neighbourhood || item.road || "",
      postalCode: item.postcode || "",
      city: item.city || item.town || item.village || item.county || "",
      state: item.state || "",
      country: item.country || "India",
      address: result.display_name,
      mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    });
    setMessage("Location pin selected");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setMessage("Location is not supported by this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void applyAddress(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        setMessage("Allow location permission in your browser and try again.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div className="property-location-picker">
      <section className="property-location-fields">
        <div className="property-location-note"><Info />Use the same address shown on your ownership or identity document.</div>
        <label className="property-location-search">
          <Search />
          <input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 3) setResults([]); }} placeholder="Search property name, street or area" />
          {searching && <span>Searching…</span>}
        </label>
        {results.length > 0 && (
          <div className="property-location-results">
            {results.map((result) => <button type="button" key={result.place_id} onClick={() => selectResult(result)}><MapPin /><span>{result.display_name}</span></button>)}
          </div>
        )}
        <button type="button" className="property-current-location" onClick={useCurrentLocation}><Crosshair />{locating ? "Finding your location…" : "Use My Current Location"}</button>
        {message && <p className="property-location-message">{message}</p>}
      </section>
      <section className="property-map-panel">
        <div ref={mapElement} className="property-map-canvas" />
        <div className="property-map-help"><MapPin />Click the map or drag the pin to the exact entrance</div>
      </section>
    </div>
  );
}
