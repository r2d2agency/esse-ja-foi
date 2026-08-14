import { cn } from "@/lib/utils";

export const STATUS_CONTRATO_LABEL: Record<string, string> = {
  NAO_GERADO: "Não gerado",
  GERADO: "Gerado",
  ENVIADO: "Enviado",
  VISUALIZADO: "Visualizado",
  ASSINADO: "Assinado",
  RECUSADO: "Recusado",
  EXPIRADO: "Expirado",
  CANCELADO: "Cancelado",
};

const STYLES: Record<string, string> = {
  NAO_GERADO: "bg-slate-100 text-slate-600 border-slate-200",
  GERADO: "bg-blue-50 text-blue-700 border-blue-200",
  ENVIADO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VISUALIZADO: "bg-amber-50 text-amber-700 border-amber-200",
  ASSINADO: "bg-teal-50 text-teal-700 border-teal-200",
  RECUSADO: "bg-red-50 text-red-700 border-red-200",
  EXPIRADO: "bg-orange-50 text-orange-700 border-orange-200",
  CANCELADO: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};

export function StatusContrato({ status, className }: { status?: string | null; className?: string }) {
  const s = status || "NAO_GERADO";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        STYLES[s] || STYLES["NAO_GERADO"],
        className,
      )}
    >
      {s === "ASSINADO" && <span aria-hidden>✓</span>}
      {STATUS_CONTRATO_LABEL[s] || s}
    </span>
  );
}

export const FILTROS_CONTRATO = [
  { valor: "TODOS", label: "Todos" },
  { valor: "NAO_GERADO", label: "Não gerados" },
  { valor: "GERADO", label: "Gerados" },
  { valor: "ENVIADO", label: "Enviados" },
  { valor: "VISUALIZADO", label: "Visualizados" },
  { valor: "ASSINADO", label: "Assinados" },
  { valor: "PENDENTES", label: "Pendentes" },
  { valor: "RECUSADO", label: "Recusados" },
  { valor: "EXPIRADO", label: "Expirados" },
  { valor: "CANCELADO", label: "Cancelados" },
];

export function mascararCpf(cpf?: string | null) {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.***.***-${d.slice(9)}`;
}
