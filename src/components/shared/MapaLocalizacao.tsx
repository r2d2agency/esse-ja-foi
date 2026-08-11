import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapaLocalizacaoProps {
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: number;
}

const PADRAO = { lat: -23.5505, lng: -46.6333 };

/** Mapa OpenStreetMap com pino arrastável (sem custo de API). */
export default function MapaLocalizacao({ lat, lng, onChange, height = 260 }: MapaLocalizacaoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const centro = lat != null && lng != null ? { lat, lng } : PADRAO;
    const map = L.map(containerRef.current).setView([centro.lat, centro.lng], lat != null ? 16 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border-radius:9999px;background:#f59e0b;border:3px solid #134e4a;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const marker = L.marker([centro.lat, centro.lng], { draggable: true, icon }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChange({ lat: Number(pos.lat.toFixed(7)), lng: Number(pos.lng.toFixed(7)) });
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChange({ lat: Number(e.latlng.lat.toFixed(7)), lng: Number(e.latlng.lng.toFixed(7)) });
    });

    mapRef.current = map;
    markerRef.current = marker;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15));
  }, [lat, lng]);

  return <div ref={containerRef} style={{ height }} className="w-full rounded-lg border border-slate-200 z-0" />;
}
