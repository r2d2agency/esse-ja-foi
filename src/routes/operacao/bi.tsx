import { createFileRoute } from "@tanstack/react-router";
const BackofficeLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { useAuthStore } from "@/hooks/use-auth";
import { 
  TrendingUp, 
  Users, 
  Car, 
  Target, 
  ChevronRight, 
  BarChart3, 
  Clock, 
  AlertCircle 
} from "lucide-react";
import { formatCurrency } from "@/lib/brasil";

export const Route = createFileRoute("/operacao/bi")({
  head: () => ({
    meta: [
      { title: "Dashboard BI | ESSE JÁ FOI" },
      { name: "description", content: "Metas vs Realizado, indicadores de performance e funil de conversão." },
    ],
  }),
  component: DashboardBI,
});

function DashboardBI() {
  const { user } = useAuthStore();

  const cards = [
    { title: "Ticket Médio", value: formatCurrency(84500), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Vistorias/Mês", value: "128", icon: Car, color: "text-teal-600", bg: "bg-teal-50" },
    { title: "Taxa de Conversão", value: "12.4%", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Novos Leads", value: "45", icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Intelligence</h1>
          <p className="text-slate-500 text-sm">Acompanhamento de metas, performance operacional e saúde do negócio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className={`${c.bg} p-2.5 rounded-lg`}>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Últimos 30 dias</span>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 text-xs font-bold uppercase">{c.title}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{c.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 uppercase text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-800" /> Metas vs Realizado (Anual)
              </h3>
              <select className="text-xs border-none bg-slate-50 rounded p-1 font-bold text-slate-500">
                <option>2026</option>
              </select>
            </div>
            
            <div className="space-y-5">
              {[
                { label: "Vendas", meta: 100, realizado: 85, color: "bg-teal-600" },
                { label: "Vistorias", meta: 500, realizado: 420, color: "bg-blue-600" },
                { label: "Novos Parceiros", meta: 12, realizado: 15, color: "bg-purple-600" },
              ].map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="text-slate-600">{m.label}</span>
                    <span className="text-slate-400">{m.realizado} / {m.meta}</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${m.color} transition-all duration-1000`} 
                      style={{ width: `${Math.min((m.realizado / m.meta) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-900 uppercase text-sm mb-6 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" /> Gargalos Operacionais
            </h3>
            <div className="space-y-4">
              {[
                { title: "Tempo Médio para Laudo", info: "2.4 dias", status: "Dentro da meta", type: "success" },
                { title: "Aguardando Vistoria", info: "14 veículos", status: "Atenção: Aumentando", type: "warning" },
                { title: "Tempo em Leilão", info: "5.8 dias", status: "Meta: 5 dias", type: "error" },
              ].map((g, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{g.title}</p>
                    <p className="text-[10px] text-slate-500">{g.status}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${g.type === 'warning' ? 'text-amber-600' : g.type === 'error' ? 'text-red-600' : 'text-teal-900'}`}>{g.info}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-[11px] text-red-800 leading-tight">
                <strong>Alerta Crítico:</strong> 5 veículos estão parados há mais de 15 dias no status "CADASTRADO" sem agendamento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
