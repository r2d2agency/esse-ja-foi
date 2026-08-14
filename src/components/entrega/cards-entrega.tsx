import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listarEntregasVendedorFn, listarEntregasCompradorFn } from "@/lib/entregas.functions";
import { StatusEntrega } from "@/components/entrega/status-entrega";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck } from "lucide-react";

const ATIVAS = ["ENTREGA_CONFIRMADA", "LIBERADO_PARA_REPASSE", "ENTREGA_CANCELADA"];

function data(e: any) {
  return e.data_entrega ? format(new Date(`${String(e.data_entrega).slice(0, 10)}T12:00:00`), "dd 'de' MMMM", { locale: ptBR }) : "A agendar";
}

export function CardsEntregaVendedor({ vendedorId }: { vendedorId?: string | undefined }) {
  const { data: lista } = useQuery({
    queryKey: ["entregas-vendedor", vendedorId],
    queryFn: async () => (await listarEntregasVendedorFn({ data: vendedorId! })) as any[],
    enabled: !!vendedorId,
  });
  const ativas = (lista || []).filter((e) => !ATIVAS.includes(e.status));
  if (!ativas.length) return null;
  return (
    <div className="space-y-3">
      {ativas.map((e) => (
        <div key={e.id} className="rounded-2xl border-2 border-teal-200 bg-teal-50/50 p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-teal-700"><Truck className="h-3.5 w-3.5" /> Entrega do seu veículo</p>
          <p className="text-base font-black text-slate-900">{e.veiculo_titulo}</p>
          <p className="text-sm font-bold text-slate-600">{data(e)}{e.hora_inicio ? ` • ${String(e.hora_inicio).slice(0, 5)} às ${String(e.hora_fim).slice(0, 5)}` : ""}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusEntrega status={e.status} />
            <Button asChild size="sm" className="bg-teal-600 font-bold">
              <Link to="/vendedor/entrega/$id" params={{ id: e.id }}>Abrir entrega</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardsEntregaComprador({ compradorId }: { compradorId?: string | undefined }) {
  const { data: lista } = useQuery({
    queryKey: ["entregas-comprador", compradorId],
    queryFn: async () => (await listarEntregasCompradorFn({ data: compradorId! })) as any[],
    enabled: !!compradorId,
  });
  const ativas = (lista || []).filter((e) => e.status !== "ENTREGA_CANCELADA");
  if (!ativas.length) return null;
  return (
    <div className="space-y-3">
      {ativas.map((e) => (
        <div key={e.id} className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700"><Truck className="h-3.5 w-3.5" /> Recebimento do veículo</p>
          <p className="text-base font-black text-slate-900">{e.veiculo_titulo}</p>
          <p className="text-sm font-bold text-slate-600">{data(e)}{e.hora_inicio ? ` • ${String(e.hora_inicio).slice(0, 5)} às ${String(e.hora_fim).slice(0, 5)}` : ""}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusEntrega status={e.status} />
            <Button asChild size="sm" className="bg-slate-900 font-bold">
              <Link to="/comprador/entrega/$id" params={{ id: e.id }}>Abrir</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
