import { useEffect, useRef } from "react";

interface MapaLocalizacaoProps {
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: number;
}

const PADRAO = { lat: -23.5505, lng: -46.6333 };

function mapaVivo(map: any): boolean {
  return !!(map && map._container && !map._removed);
}

function criarIconeSeguro(L: any) {
  try {
    const icon = L.divIcon({
      className: "mapa-localizacao-icon",
      html: '<div style="width:18px;height:18px;border-radius:9999px;background:#f59e0b;border:3px solid #134e4a;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    return icon;
  } catch {
    try {
      return new L.Icon.Default();
    } catch {
      return null;
    }
  }
}

/** Mapa OpenStreetMap com pino arrastavel (sem custo de API). Protegido Strict Mode 2x mount. */
export default function MapaLocalizacao({ lat, lng, onChange, height = 260 }: MapaLocalizacaoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mountIdRef = useRef(0);

  // Efeito 1: Inicializacao mapa + marker arrastavel
  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;
    if (mapRef.current && mapaVivo(mapRef.current)) return;

    mountIdRef.current += 1;
    const meuMountId = mountIdRef.current;
    let meuMapa: any = null;
    let meuMarker: any = null;

    const iniciar = async () => {
      try {
        const leaflet = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        if (meuMountId !== mountIdRef.current) return;
        if (!containerRef.current) return;

        const L = leaflet.default;

        // Remove mapa orfao (Strict Mode 1ª montagem)
        try {
          if (mapRef.current && mapRef.current !== meuMapa) {
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
          }
        } catch {}

        const centro = lat != null && lng != null ? { lat, lng } : PADRAO;
        meuMapa = L.map(containerRef.current).setView(
          [centro.lat, centro.lng],
          lat != null ? 16 : 11,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(meuMapa);

        const icon = criarIconeSeguro(L);
        const markerOpts: any = { draggable: true };
        if (icon) markerOpts.icon = icon;
        meuMarker = L.marker([centro.lat, centro.lng], markerOpts).addTo(meuMapa);

        meuMarker.on("dragend", () => {
          try {
            const pos = meuMarker.getLatLng();
            onChange({ lat: Number(pos.lat.toFixed(7)), lng: Number(pos.lng.toFixed(7)) });
          } catch {}
        });
        meuMapa.on("click", (e: any) => {
          try {
            if (!mapaVivo(meuMapa)) return;
            meuMarker.setLatLng(e.latlng);
            onChange({ lat: Number(e.latlng.lat.toFixed(7)), lng: Number(e.latlng.lng.toFixed(7)) });
          } catch {}
        });

        if (meuMountId === mountIdRef.current && containerRef.current) {
          mapRef.current = meuMapa;
          markerRef.current = meuMarker;
          try {
            setTimeout(() => {
              if (mapaVivo(mapRef.current)) mapRef.current.invalidateSize();
            }, 180);
          } catch {}
        } else {
          try { meuMarker.remove(); } catch {}
          try { meuMapa.remove(); } catch {}
        }
      } catch (err) {
        try { if (meuMarker) meuMarker.remove(); } catch {}
        try { if (meuMapa) meuMapa.remove(); } catch {}
        if (meuMountId === mountIdRef.current) {
          mapRef.current = null;
          markerRef.current = null;
        }
        console.warn("[MapaLocalizacao] inicializacao falhou:", err);
      }
    };

    void iniciar();

    return () => {
      if (meuMountId === mountIdRef.current) {
        try { if (meuMarker) meuMarker.remove(); } catch {}
        try { if (meuMapa) meuMapa.remove(); } catch {}
        if (mapRef.current === meuMapa) {
          mapRef.current = null;
        }
        if (markerRef.current === meuMarker) {
          markerRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efeito 2: Atualiza marker quando lat/lng mudam externamente
  useEffect(() => {
    if (lat == null || lng == null) return;
    if (!mapaVivo(mapRef.current) || !markerRef.current) return;

    let cancelado = false;
    try {
      markerRef.current.setLatLng([lat, lng]);
      const mapaAtual = mapRef.current as any;
      const zoom = Math.max(mapaAtual.getZoom?.() || 15, 15);
      setTimeout(() => {
        if (cancelado || !mapaVivo(mapaAtual)) return;
        try {
          mapaAtual.setView([lat, lng], zoom, { animate: true });
        } catch {}
      }, 50);
    } catch (err) {
      console.warn("[MapaLocalizacao] update latlng falhou:", err);
    }
    return () => { cancelado = true; };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-lg border border-slate-200 z-0"
    />
  );
}
