import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, statusVeiculo } from "@/components/vendedor/StatusBadge";

export function CardVeiculo({
  veiculo,
  onAbrir,
  onEditar,
}: {
  veiculo: any;
  onAbrir: () => void;
  onEditar?: (() => void) | undefined;
}) {
  const foto: string | undefined = (veiculo.fotos && veiculo.fotos[0]) || undefined;
  const enviadoEm = veiculo.criado_em ? new Date(veiculo.criado_em).toLocaleDateString("pt-BR") : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="relative flex aspect-[16/9] items-center justify-center bg-slate-100">
        {foto ? (
          <img src={foto} alt={`${veiculo.marca} ${veiculo.modelo}`} className="h-full w-full object-cover" />
        ) : (
          <Car className="h-10 w-10 text-slate-300" />
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge status={statusVeiculo(veiculo.status)} />
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-lg font-black text-slate-900 leading-tight">
            {veiculo.marca} {veiculo.modelo}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {veiculo.placa}
            </span>
            {veiculo.ano_modelo && (
              <span className="text-[10px] font-bold text-slate-500">
                • {veiculo.ano_modelo}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="h-10 w-full rounded-xl text-xs font-bold" onClick={onAbrir}>
            Ver acompanhamento
          </Button>
          {onEditar && (
            <Button className="h-10 w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white shadow-sm shadow-teal-600/20" onClick={onEditar}>
              Ajustar Cadastro
            </Button>
          )}
        </div>
        
        {enviadoEm && (
          <p className="mt-3 text-[10px] text-center text-slate-400">
            Cadastrado em {enviadoEm}
          </p>
        )}
      </div>
    </article>
  );
}
