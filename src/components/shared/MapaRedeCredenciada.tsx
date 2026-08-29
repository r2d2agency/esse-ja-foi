import { useEffect, useRef } from "react";

export interface UnidadeMapa {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  endereco?: string | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
  responsavel?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  total_vistoriadores?: number | null;
}

interface MapaRedeCredenciadaProps {
  unidades: UnidadeMapa[];
  unidadeSelecionadaId?: string | null;
  onSelecionarUnidade?: (unidadeId: string) => void;
  height?: number;
}

const BRASIL_CENTRO = { lat: -15.7801, lng: -47.9292 };
const ZOOM_BRASIL = 4;
const ZOOM_CIDADE = 12;
const ZOOM_UNICO = 14;

function latLngValida(u: UnidadeMapa) {
  return (
    u.latitude != null &&
    !Number.isNaN(Number(u.latitude)) &&
    u.longitude != null &&
    !Number.isNaN(Number(u.longitude))
  );
}

/** Cria icone custom DIV com fallback para o icone padrao azul do Leaflet se falhar (evita _initIcon appendChild undefined). */
function criarIconeSeguro(L: any, ativo: boolean, destacado: boolean) {
  try {
    const corFundo = ativo ? (destacado ? "#0f766e" : "#0ea5e9") : "#94a3b8";
    const corBorda = ativo ? (destacado ? "#134e4a" : "#0369a1") : "#475569";
    const tamanho = destacado ? 24 : 20;
    const sombra = destacado
      ? "0 0 0 4px rgba(20,184,166,.25), 0 2px 8px rgba(0,0,0,.35)"
      : "0 2px 6px rgba(0,0,0,.35)";
    const html = `<div style="width:${tamanho}px;height:${tamanho}px;border-radius:9999px;background:${corFundo};border:3px solid ${corBorda};box-shadow:${sombra};transition:all .15s ease"></div>`;
    const icon = L.divIcon({
      className: "rede-credenciada-icon",
      html,
      iconSize: [tamanho, tamanho],
      iconAnchor: [tamanho / 2, tamanho / 2],
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

/** Garante que o mapa ainda esta vivo (nao sofreu map.remove() de um cleanup Strict Mode). */
function mapaVivo(map: any): boolean {
  return !!(map && map._container && !map._removed);
}

export default function MapaRedeCredenciada({
  unidades,
  unidadeSelecionadaId = null,
  onSelecionarUnidade,
  height = 680,
}: MapaRedeCredenciadaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const idsNoMapaRef = useRef<Set<string>>(new Set());
  const unidadeAnteriorRef = useRef<string | null>(null);
  const mountIdRef = useRef(0);

  // ============================================================
  // Efeito 1: Inicializacao do mapa (com protecao Strict Mode 2x mount)
  // ============================================================
  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;
    if (mapRef.current && mapaVivo(mapRef.current)) return;

    mountIdRef.current += 1;
    const meuMountId = mountIdRef.current;
    let meuMapa: any = null;

    const iniciar = async () => {
      try {
        const leaflet = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Outra montagem/subsequente substituiu o meu id — aborta (Strict Mode)
        if (meuMountId !== mountIdRef.current) return;
        if (!containerRef.current) return;

        const L = leaflet.default;

        // Limpa qualquer mapa anterior que tenha ficado órfão (Strict Mode 1ª montagem)
        try {
          if (mapRef.current && mapRef.current !== meuMapa) {
            mapRef.current.remove();
            mapRef.current = null;
          }
        } catch {}

        meuMapa = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        }).setView([BRASIL_CENTRO.lat, BRASIL_CENTRO.lng], ZOOM_BRASIL);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(meuMapa);

        // Só grava no mapRef se EU ainda sou a montagem atual
        if (meuMountId === mountIdRef.current && containerRef.current) {
          mapRef.current = meuMapa;
          try {
            setTimeout(() => {
              if (mapaVivo(mapRef.current)) mapRef.current.invalidateSize();
            }, 250);
          } catch {}
        } else {
          // Eu não sou mais a montagem atual — removo meu mapa imediatamente
          try { meuMapa.remove(); } catch {}
        }
      } catch (err) {
        try { if (meuMapa) meuMapa.remove(); } catch {}
        if (meuMountId === mountIdRef.current) mapRef.current = null;
        console.warn("[MapaRedeCredenciada] inicializacao falhou:", err);
      }
    };

    void iniciar();

    return () => {
      // Cleanup: só removo SE o mapRef.current ainda é o MEU mapa (o que eu criei)
      if (meuMountId === mountIdRef.current) {
        try { if (meuMapa) meuMapa.remove(); } catch {}
        if (mapRef.current === meuMapa) {
          mapRef.current = null;
        }
        markersRef.current = {};
        idsNoMapaRef.current = new Set();
        unidadeAnteriorRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // Efeito 2: Add / remove marcadores e ajusta bounds
  // ============================================================
  useEffect(() => {
    let cancelado = false;

    void (async () => {
      try {
        const map = mapRef.current as any;
        if (!mapaVivo(map)) return;

        const leaflet = await import("leaflet");
        const L = leaflet.default;

        if (cancelado || !mapaVivo(map)) return;
        const selecionadoId = unidadeSelecionadaId;

        // Remove marcadores de unidades que nao existem mais
        const idsAtuais = new Set(unidades.map((u) => u.id));
        for (const idExistente of Array.from(idsNoMapaRef.current)) {
          if (!idsAtuais.has(idExistente)) {
            const markerVelho = markersRef.current[idExistente];
            if (markerVelho) {
              try { map.removeLayer(markerVelho); } catch {}
            }
            delete markersRef.current[idExistente];
            idsNoMapaRef.current.delete(idExistente);
          }
        }

        const pontos: Array<[number, number]> = [];
        for (const unidade of unidades) {
          if (!latLngValida(unidade)) continue;
          if (cancelado || !mapaVivo(map)) return;

          const lat = Number(unidade.latitude);
          const lng = Number(unidade.longitude);
          pontos.push([lat, lng]);

          const destacado = idsIguais(unidade.id, selecionadoId);
          const icon = criarIconeSeguro(L, !!unidade.ativo, destacado);
          const popupHtml = criarPopupHtml(unidade);

          let marker = markersRef.current[unidade.id];
          try {
            if (!marker) {
              const markerOpts: any = icon ? { icon, draggable: false } : { draggable: false };
              marker = L.marker([lat, lng], markerOpts).addTo(map);
              marker.on("click", () => {
                if (!cancelado) onSelecionarUnidade?.(unidade.id);
              });
              markersRef.current[unidade.id] = marker;
              idsNoMapaRef.current.add(unidade.id);
            } else {
              try { marker.setLatLng([lat, lng]); } catch {}
              if (icon) {
                try { marker.setIcon(icon); } catch {}
              }
            }
            const popup = L.popup({ maxWidth: 320, className: "cred-map-popup" }).setContent(popupHtml);
            try { marker.bindPopup(popup); } catch {}
          } catch (err) {
            console.warn("[MapaRedeCredenciada] marker falhou:", err);
          }
        }

        if (cancelado || !mapaVivo(map)) return;

        if (selecionadoId && markersRef.current[selecionadoId]) {
          const sel = unidades.find((u) => idsIguais(u.id, selecionadoId));
          if (sel && latLngValida(sel)) {
            try {
              map.setView([Number(sel.latitude), Number(sel.longitude)], ZOOM_UNICO, { animate: true });
            } catch {}
            try {
              setTimeout(() => {
                if (!cancelado && mapaVivo(map) && markersRef.current[selecionadoId]) {
                  try { markersRef.current[selecionadoId].openPopup(); } catch {}
                }
              }, 80);
            } catch {}
          }
          if (
            unidadeAnteriorRef.current &&
            unidadeAnteriorRef.current !== selecionadoId &&
            markersRef.current[unidadeAnteriorRef.current]
          ) {
            const uAnterior = unidades.find((u) => idsIguais(u.id, unidadeAnteriorRef.current));
            if (uAnterior) {
              try {
                const iconeAnterior = criarIconeSeguro(L, !!uAnterior.ativo, false);
                if (iconeAnterior) markersRef.current[unidadeAnteriorRef.current].setIcon(iconeAnterior);
              } catch {}
            }
          }
        } else if (pontos.length > 0) {
          try {
            if (pontos.length === 1) {
              map.setView(pontos[0], ZOOM_CIDADE, { animate: true });
            } else {
              const bounds = L.latLngBounds(pontos);
              map.fitBounds(bounds, { padding: [48, 48], maxZoom: ZOOM_CIDADE, animate: true });
            }
          } catch {}
        } else {
          try {
            map.setView([BRASIL_CENTRO.lat, BRASIL_CENTRO.lng], ZOOM_BRASIL, { animate: true });
          } catch {}
        }

        // Atualiza icones de todos (reflete ativo/inativo e destaque corretamente)
        for (const u of unidades) {
          const marker = markersRef.current[u.id];
          if (!marker) continue;
          const destacado = idsIguais(u.id, selecionadoId);
          const iconeAtualizado = criarIconeSeguro(L, !!u.ativo, destacado);
          if (iconeAtualizado) {
            try { marker.setIcon(iconeAtualizado); } catch {}
          }
        }

        unidadeAnteriorRef.current = selecionadoId;
      } catch (err) {
        console.warn("[MapaRedeCredenciada] useEffect marcadores falhou:", err);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [unidades, unidadeSelecionadaId, onSelecionarUnidade]);

  // ============================================================
  // Efeito 3: InvalidateSize ao trocar unidades / altura
  // ============================================================
  useEffect(() => {
    const map = mapRef.current as any;
    if (!mapaVivo(map)) return;
    const t = setTimeout(() => {
      if (mapaVivo(map)) {
        try { map.invalidateSize(); } catch {}
      }
    }, 350);
    return () => clearTimeout(t);
  }, [unidades.length, height]);

  const totalCoords = unidades.filter(latLngValida).length;
  const semCoordenada = unidades.length - totalCoords;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-slate-900">Mapa da rede credenciada</p>
            <p className="text-xs text-slate-500">
              {totalCoords > 0 ? `${totalCoords} unidade(s) localizada(s)` : "Nenhuma unidade com GPS cadastrado"}
              {semCoordenada > 0 && <> · <span className="font-semibold text-amber-700">{semCoordenada} sem GPS</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="h-3 w-3 rounded-full border-2 border-sky-800 bg-sky-500" />
            Ativa
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="h-3 w-3 rounded-full border-2 border-slate-700 bg-slate-400" />
            Inativa
          </div>
        </div>
      </div>
      <div ref={containerRef} style={{ height }} className="w-full z-0" />
      {semCoordenada > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
          <strong>Dica:</strong> para exibir a unidade no mapa, abra em <strong>Editar</strong> e preencha os campos <em>Latitude</em> e <em>Longitude</em> (clique no mapa do formulário para marcar).
        </div>
      )}
    </div>
  );
}

function criarPopupHtml(u: UnidadeMapa) {
  const statusClasse = u.ativo
    ? "background:#d1fae5;color:#065f46;border:1px solid #6ee7b7"
    : "background:#e2e8f0;color:#475569;border:1px solid #cbd5e1";
  const statusLabel = u.ativo ? "ATIVA" : "INATIVA";
  const enderecoLinha = u.endereco ? `${escapeHtml(u.endereco)} · ` : "";
  const responsavelLinha = u.responsavel
    ? `<p style="margin:0;font-size:12px;color:#334155"><strong style="color:#0f172a">Resp.:</strong> ${escapeHtml(u.responsavel)}</p>`
    : "";
  const contatos = [u.whatsapp, u.telefone].filter(Boolean) as string[];
  const contatoLinha = contatos.length
    ? `<p style="margin:4px 0 0;font-size:12px;color:#334155"><strong style="color:#0f172a">Contato:</strong> ${escapeHtml(contatos.join(" / "))}</p>`
    : "";
  const equipeLinha =
    u.total_vistoriadores != null && u.total_vistoriadores > 0
      ? `<p style="margin:4px 0 0;font-size:12px;color:#334155"><strong style="color:#0f172a">Equipe:</strong> ${u.total_vistoriadores} vistoriador(es)</p>`
      : "";
  return `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;min-width:240px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;line-height:1.2">${escapeHtml(u.nome)}</p>
        <span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:9999px;letter-spacing:.08em;${statusClasse}">${statusLabel}</span>
      </div>
      <p style="margin:0;font-size:12px;color:#475569">${enderecoLinha}<strong style="color:#0f172a">${escapeHtml(u.cidade)}/${escapeHtml(u.estado)}</strong></p>
      ${responsavelLinha}
      ${contatoLinha}
      ${equipeLinha}
    </div>
  `;
}

function escapeHtml(v: string) {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function idsIguais(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
