import { useEffect, useState } from "react";

/** Contador baseado no horário do servidor (nunca no relógio do dispositivo). */
export function usePrazoServidor(prazoISO?: string | null, servidorAgoraISO?: string | null) {
  const [restanteMs, setRestanteMs] = useState<number>(0);

  useEffect(() => {
    if (!prazoISO) return;
    const base = servidorAgoraISO ? new Date(servidorAgoraISO).getTime() : Date.now();
    const offset = base - Date.now(); // diferença entre servidor e dispositivo
    const fim = new Date(prazoISO).getTime();

    const tick = () => setRestanteMs(fim - (Date.now() + offset));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [prazoISO, servidorAgoraISO]);

  const expirado = restanteMs <= 0;
  const horas = Math.max(0, Math.floor(restanteMs / 3600000));
  const minutos = Math.max(0, Math.floor((restanteMs % 3600000) / 60000));
  const label = expirado ? "Prazo encerrado" : `${String(horas).padStart(2, "0")}h : ${String(minutos).padStart(2, "0")}m`;

  return { restanteMs, expirado, horas, minutos, label };
}

export function PrazoPagamento({ prazo, servidorAgora, compacto }: { prazo?: string | null; servidorAgora?: string | null; compacto?: boolean }) {
  const { label, expirado } = usePrazoServidor(prazo, servidorAgora);
  if (compacto) {
    return <span className={expirado ? "font-bold text-red-600" : "font-bold text-slate-700"}>{label}</span>;
  }
  return (
    <div className={`rounded-2xl border p-5 ${expirado ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Prazo para pagamento</div>
      <div className={`mt-1 text-3xl font-black tabular-nums ${expirado ? "text-red-600" : "text-slate-900"}`}>{label}</div>
      <p className="mt-2 text-xs font-medium text-slate-600">
        Conclua o pagamento dentro do prazo informado para manter a negociação ativa.
      </p>
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_EM_PROCESSAMENTO: "Pagamento em processamento",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  PAGAMENTO_NAO_REALIZADO: "Pagamento não realizado",
  CANCELADA: "Cancelada",
};

export const STATUS_CLASSE: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "bg-amber-100 text-amber-700",
  PAGAMENTO_EM_PROCESSAMENTO: "bg-blue-100 text-blue-700",
  PAGAMENTO_CONFIRMADO: "bg-teal-100 text-teal-700",
  PAGAMENTO_NAO_REALIZADO: "bg-red-100 text-red-700",
  CANCELADA: "bg-slate-200 text-slate-600",
};

export const brl = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
