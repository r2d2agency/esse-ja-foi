import { cn } from "@/lib/utils";

interface OpcaoBotoesProps {
  label: string;
  opcoes: string[];
  value?: string;
  onChange: (valor: string) => void;
  colunas?: number;
}

export function OpcaoBotoes({ label, opcoes, value, onChange, colunas = 2 }: OpcaoBotoesProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-900">{label}</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}
      >
        {opcoes.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => onChange(op)}
            className={cn(
              "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
              value === op
                ? "border-teal-700 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-teal-200",
            )}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
}
