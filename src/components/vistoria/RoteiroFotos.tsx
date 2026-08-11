import React, { useState } from "react";
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { compressImage } from "./ImageCompressor";

type EtapaFoto = {
  id: string;
  label: string;
  enquadramento: string;
};

const ETAPAS: EtapaFoto[] = [
  { id: "frente", label: "Frente", enquadramento: "Diagonal frontal" },
  { id: "traseira", label: "Traseira", enquadramento: "Diagonal traseira" },
  { id: "lateral_esq", label: "Lateral Esquerda", enquadramento: "Lateral completa" },
  { id: "lateral_dir", label: "Lateral Direita", enquadramento: "Lateral completa" },
  { id: "interior", label: "Interior", enquadramento: "Bancos dianteiros e console" },
  { id: "painel", label: "Painel Ligado", enquadramento: "Luzes de advertência" },
  { id: "hodometro", label: "Hodômetro", enquadramento: "Quilometragem legível" },
  { id: "motor", label: "Motor", enquadramento: "Compartimento aberto" },
  { id: "porta_malas", label: "Porta-malas", enquadramento: "Vão interno" },
  { id: "pneu_df", label: "Pneu Diant. Dir.", enquadramento: "Banda de rodagem" },
  { id: "pneu_ef", label: "Pneu Diant. Esq.", enquadramento: "Banda de rodagem" },
  { id: "pneu_dt", label: "Pneu Tras. Dir.", enquadramento: "Banda de rodagem" },
  { id: "pneu_et", label: "Pneu Tras. Esq.", enquadramento: "Banda de rodagem" },
];

export function RoteiroFotos({
  laudoId,
  fotosExistentes,
  onUpload,
  bloqueado,
}: {
  laudoId: string;
  fotosExistentes: Array<{ item_id?: string | null; chave: string }>;
  onUpload: (itemId: string, blob: Blob) => Promise<void>;
  bloqueado?: boolean;
}) {
  const [etapaIndex, setEtapaIndex] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const etapaAtual = ETAPAS[etapaIndex];
  if (!etapaAtual) return null;
  const fotoAtual = fotosExistentes.find((f) => f.item_id === etapaAtual.id);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    try {
      const comprimida = await compressImage(file);
      await onUpload(etapaAtual.id, comprimida);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Fotos Obrigatórias</h3>
        <span className="text-sm font-medium text-slate-500">
          {etapaIndex + 1} / {ETAPAS.length}
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
        {fotoAtual ? (
          <div className="flex h-full flex-col items-center justify-center space-y-2 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-12 w-12" />
            <p className="font-bold">Foto Capturada</p>
            {!bloqueado && (
              <label className="flex cursor-pointer items-center gap-1 text-sm font-semibold underline">
                <RefreshCw className="h-4 w-4" /> Substituir
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              </label>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
            <AlertCircle className="mb-2 h-10 w-10" />
            <p className="text-sm font-semibold">{etapaAtual.label}</p>
            <p className="text-xs">{etapaAtual.enquadramento}</p>
            {!bloqueado && (
              <label className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-900 font-bold text-white">
                {carregando ? "Processando..." : <><Camera className="h-5 w-5" /> Abrir Câmera</>}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFile}
                  disabled={carregando}
                />
              </label>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {ETAPAS.map((e, idx) => {
          const concluido = !!fotosExistentes.find((f) => f.item_id === e.id);
          return (
            <button
              key={e.id}
              onClick={() => setEtapaIndex(idx)}
              className={`min-h-10 min-w-[80px] shrink-0 rounded-lg border-2 text-xs font-bold transition-all ${
                idx === etapaIndex
                  ? "border-teal-900 bg-teal-900 text-white"
                  : concluido
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {e.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => setEtapaIndex(Math.max(0, etapaIndex - 1))}
          className="px-4 py-2 font-semibold text-slate-600"
        >
          Anterior
        </button>
        <button
          disabled={!fotoAtual && etapaIndex === ETAPAS.length - 1}
          onClick={() => setEtapaIndex(Math.min(ETAPAS.length - 1, etapaIndex + 1))}
          className="px-4 py-2 font-bold text-teal-900 disabled:opacity-30"
        >
          {etapaIndex === ETAPAS.length - 1 ? "Finalizar" : "Próxima"}
        </button>
      </div>
    </div>
  );
}
