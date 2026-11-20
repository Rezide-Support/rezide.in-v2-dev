"use client";

import { useCallback, useMemo, useState } from "react";
import { GoogleMap, InfoWindowF, MarkerF, useLoadScript } from "@react-google-maps/api";
import type { LocalityLandmark } from "@/lib/listing-locality";

export function LocalityMap({ apiKey, coords, landmarks }: { apiKey: string; coords: [number, number]; landmarks: LocalityLandmark[] }) {
  const { isLoaded, loadError } = useLoadScript({ id: "rezide-google-maps", googleMapsApiKey: apiKey });
  const center = useMemo(() => ({ lat: coords[0], lng: coords[1] }), [coords]);
  const [selectedMarker, setSelectedMarker] = useState<LocalityLandmark | null>(null);
  const fitLandmarks = useCallback((map: google.maps.Map) => {
    if (!landmarks.length) return;
    const bounds = new google.maps.LatLngBounds();
    landmarks.forEach(item => bounds.extend({ lat: item.latitude, lng: item.longitude }));
    map.fitBounds(bounds);
  }, [landmarks]);
  if (loadError) return <div role="alert" className="grid h-[300px] place-items-center rounded-lg bg-gray-100 p-5 text-center text-sm">Google Maps could not load. Please check the Maps configuration and reload.</div>;
  if (!isLoaded) return <div role="status" className="grid h-[300px] place-items-center rounded-lg bg-gray-100 text-sm">Loading map?</div>;
  return <div className="h-[300px] overflow-hidden rounded-lg"><GoogleMap key={landmarks.map(item => item._id).join(",")} mapContainerStyle={{ width: "100%", height: "300px" }} center={center} zoom={14} options={{ clickableIcons: false, disableDefaultUI: false }} onLoad={fitLandmarks}>
    {landmarks.map(item => <MarkerF key={item._id} position={{ lat: item.latitude, lng: item.longitude }} title={item.placeName} onClick={() => setSelectedMarker(item)} />)}
    {selectedMarker && <InfoWindowF position={{ lat: selectedMarker.latitude, lng: selectedMarker.longitude }} onCloseClick={() => setSelectedMarker(null)}><div><strong>{selectedMarker.placeName}</strong><p>Distance: {selectedMarker.distance.toFixed(2)} km</p></div></InfoWindowF>}
  </GoogleMap></div>;
}
