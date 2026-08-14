import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, statusVeiculo } from "@/components/vendedor/StatusBadge";

export function CardVeiculo({
  veiculo,
  onAbrir,
}: {
  veiculo: any;
  onAbrir: () => void;
}) {
  const foto: string | undefined = (veiculo.fotos && veiculo.fotos[0]) || undefined;
  const enviadoEm = veiculo.criado_em ? new Date(veiculo.criado_em).toLocaleDateString("pt-BR") : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
        {foto ? (
          <img src={foto} alt={`${veiculo.marca} ${veiculo.modelo}`} className="h-full w-full object-cover" />
        ) : (
          <Car className="h-8 w-8 text-slate-300" />
        )}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900">
              {veiculo.marca} {veiculo.modelo}
            </p>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              {veiculo.ano_modelo ? `${veiculo.ano_modelo} · ` : ""}
              {veiculo.placa}
            </p>
          </div>
          <StatusBadge status={statusVeiculo(veiculo.status)} />
        </div>
        {enviadoEm && <p className="text-xs text-slate-400">Enviado em {enviadoEm}</p>}
        <Button variant="outline" className="h-11 w-full rounded-xl" onClick={onAbrir}>
          Ver acompanhamento
        </Button>
      </div>
    </article>
  );
}
