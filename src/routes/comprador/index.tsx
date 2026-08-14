import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
const BackofficeLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { listarLeiloesAtivosFn } from "@/lib/leiloes.functions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Gavel, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/comprador/")({
  component: CompradorLeiloes,
});

function CompradorLeiloes() {
  const listar = useServerFn(listarLeiloesAtivosFn);
  const { data, isLoading } = useQuery({
    queryKey: ["leiloes-ativos"],
    queryFn: () => listar(),
  });

  const leiloes = (data?.data ?? []) as any[];

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leilões Ativos</h1>
          <p className="text-slate-500">Confira as oportunidades disponíveis e dê seu lance.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
            ))}
          </div>
        ) : leiloes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Gavel className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Nenhum leilão ativo</h3>
            <p className="text-slate-500">Fique atento, novas oportunidades surgem a qualquer momento.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {leiloes.map((leilao) => (
              <div key={leilao.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-lg">
                <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center relative">
                  <span className="absolute top-3 left-3 bg-teal-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    AO VIVO
                  </span>
                  <Gavel className="h-12 w-12 text-slate-300" />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate">
                        {leilao.marca} {leilao.modelo}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{leilao.placa}</p>
                    </div>
                    <BadgeLeilao status={leilao.status} />
                  </div>
                  
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <TrendingUp className="h-4 w-4" />
                        <span>Lance Atual</span>
                      </div>
                      <span className="font-bold text-teal-700">
                        {formatCurrency(Number(leilao.maior_lance ?? leilao.lance_inicial))}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>Termina em</span>
                      </div>
                      <span className="font-medium text-slate-700">
                        {formatDate(leilao.fim_em)}
                      </span>
                    </div>
                  </div>

                  <Button asChild className="w-full mt-6 bg-teal-900 hover:bg-teal-950 text-white font-bold">
                    <Link to="/comprador/leilao/$id" params={{ id: leilao.id }}>
                      Ver Detalhes e Lances
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BackofficeLayout>
  );
}

function BadgeLeilao({ status }: { status: string }) {
  const s = String(status).toUpperCase();
  if (s === 'ABERTO') return <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">ABERTO</span>;
  return <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{s}</span>;
}
