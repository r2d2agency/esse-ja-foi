import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboardDataFn } from "@/lib/admin-dashboard.functions";
import { 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  Car, 
  Camera, 
  FileText,
  ChevronRight,
  Clock,
  ArrowRight
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    title: "Visão Geral | ESSE JÁ FOI",
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const loadData = useServerFn(getAdminDashboardDataFn);
  const { data: res, isLoading } = useQuery({ 
    queryKey: ["admin-dashboard"], 
    queryFn: () => loadData() 
  });

  const dashboard = res?.data;

  const stats = [
    { label: "Novos vendedores", value: dashboard?.stats?.novos_vendedores ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Compliance em análise", value: dashboard?.stats?.compliance_analise ?? 0, icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Pendências", value: dashboard?.stats?.pendencias ?? 0, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Veículos em análise", value: dashboard?.stats?.veiculos_analise ?? 0, icon: Car, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Prontos para vistoria", value: dashboard?.stats?.prontos_vistoria ?? 0, icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Contratos pendentes", value: dashboard?.stats?.contratos_pendentes ?? 0, icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const funnel = [
    { label: "Cadastro", value: dashboard?.funnel?.cadastro ?? 0 },
    { label: "Compliance", value: dashboard?.funnel?.compliance ?? 0 },
    { label: "Contrato", value: dashboard?.funnel?.contrato ?? 0 },
    { label: "Análise Veículo", value: dashboard?.funnel?.analise_veiculo ?? 0 },
    { label: "Vistoria", value: dashboard?.funnel?.vistoria ?? 0 },
    { label: "Anúncio", value: dashboard?.funnel?.anuncio ?? 0 },
    { label: "Venda", value: dashboard?.funnel?.venda ?? 0 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Visão geral</h1>
        <p className="text-slate-500 font-medium">Acompanhe o que está acontecendo na operação do Esse Já Foi.</p>
      </div>

      {/* Indicadores Compactos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <button 
            key={stat.label} 
            className="flex flex-col p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-500 transition-all text-left group"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-colors", stat.bg)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="text-2xl font-black text-slate-950">{isLoading ? "..." : stat.value}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Funil Operacional */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
          Fluxo da operação
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
          <div className="flex items-center min-w-[800px]">
            {funnel.map((step, idx) => (
              <div key={step.label} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xl font-black text-teal-600">{isLoading ? "-" : step.value}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1 text-center">{step.label}</span>
                </div>
                {idx < funnel.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-slate-300 mx-2 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Atenção e Fila */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Precisa da sua atenção</h3>
            <Card className="border-slate-200 shadow-none overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {[
                  { label: "Documentos aguardando análise", count: dashboard?.stats?.compliance_analise ?? 0 },
                  { label: "Veículos aguardando análise", count: dashboard?.stats?.veiculos_analise ?? 0 },
                  { label: "Veículos prontos para vistoria", count: dashboard?.stats?.prontos_vistoria ?? 0 },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400 font-medium">{item.count} pendências</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-teal-600 font-bold text-xs group-hover:bg-teal-50">
                      Ver fila <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Minha fila</h3>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compliance</p>
                    <p className="text-xl font-black text-slate-950 mt-1">0 processos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Veículos</p>
                    <p className="text-xl font-black text-slate-950 mt-1">0 processos</p>
                  </div>
                </div>
                <Button className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-6">
                  Ver minha fila
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Atividade Recente */}
        <section className="space-y-4">
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Atividade recente</h3>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-6">
              <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                {(dashboard?.activity ?? []).map((log: any, idx: number) => (
                  <div key={idx} className="relative pl-8 group">
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-slate-200 group-hover:bg-teal-500 transition-colors z-10" />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">{formatDate(log.criado_em)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{log.entidade}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700">{log.acao}</p>
                      <p className="text-xs text-slate-500">{log.detalhe}</p>
                      {log.usuario && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          <Users className="h-3 w-3" />
                          <span>Responsável: {log.usuario}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!dashboard?.activity || dashboard.activity.length === 0) && (
                  <p className="text-sm text-slate-400 italic py-4 text-center">Nenhuma atividade recente.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
