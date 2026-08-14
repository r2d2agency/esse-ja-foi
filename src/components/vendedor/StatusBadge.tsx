import { cn } from "@/lib/utils";

export type StatusTipo =
  | "incompleto"
  | "analise"
  | "aguardando"
  | "aprovado"
  | "reprovado";

const MAP: Record<StatusTipo, { label: string; className: string }> = {
  incompleto: { label: "Cadastro incompleto", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  analise: { label: "Em análise", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  aguardando: { label: "Aguardando ação", className: "bg-orange-50 text-orange-700 ring-orange-200" },
  aprovado: { label: "Aprovado", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  reprovado: { label: "Reprovado", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusTipo;
  label?: string;
  className?: string;
}) {
  const cfg = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        cfg.className,
        className
      )}
    >
      {label ?? cfg.label}
    </span>
  );
}

export function statusVeiculo(status?: string): StatusTipo {
  switch (status) {
    case "AGUARDANDO_APROVACAO":
      return "analise";
    case "CADASTRADO":
    case "AGENDADO":
    case "VENDIDO":
      return "aprovado";
    case "REPROVADO":
      return "reprovado";
    default:
      return "incompleto";
  }
}
