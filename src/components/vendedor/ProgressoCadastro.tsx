import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EtapaCadastro {
  id: string;
  label: string;
  concluida: boolean;
}

export function montarEtapas(profile: any): EtapaCadastro[] {
  const p = profile || {};
  return [
    { id: "conta", label: "Conta criada", concluida: true },
    { id: "dados", label: "Dados pessoais", concluida: Boolean(p.cpf && p.whatsapp) },
    { id: "endereco", label: "Endereço", concluida: Boolean(p.cidade && p.uf) },
    { id: "documentos", label: "Documentos", concluida: Boolean(p.cnh_frente_url || p.doc_frente_url) },
    { id: "validacao", label: "Validação", concluida: Boolean(p.cadastro_completo) },
  ];
}

export function percentual(etapas: EtapaCadastro[]) {
  return Math.round((etapas.filter((e) => e.concluida).length / etapas.length) * 100);
}

export function ProgressoCadastro({
  etapas,
  compacto = false,
}: {
  etapas: EtapaCadastro[];
  compacto?: boolean;
}) {
  const pct = percentual(etapas);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-700">Seu cadastro</span>
        <span className="text-sm font-bold text-teal-700">{pct}% concluído</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {!compacto && (
        <ul className="mt-5 space-y-3">
          {etapas.map((e) => (
            <li key={e.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition-colors",
                  e.concluida
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-200 bg-white text-slate-300"
                )}
              >
                {e.concluida ? <Check className="h-3.5 w-3.5" /> : "○"}
              </span>
              <span className={cn("text-sm", e.concluida ? "text-slate-800" : "text-slate-500")}>
                {e.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
