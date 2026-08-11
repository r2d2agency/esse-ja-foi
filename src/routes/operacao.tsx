import { createFileRoute } from "@tanstack/react-router";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";

export const Route = createFileRoute("/operacao")({
  component: OperacaoDashboard,
});

function OperacaoDashboard() {
  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operação</h1>
          <p className="text-slate-500">Gestão de pátio e acompanhamento de leilões.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="text-sm font-medium text-slate-500 mb-4">Ações Rápidas</h3>
             <div className="space-y-2">
               <button className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg">Novo Agendamento</button>
               <button className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg">Verificar Pagamentos</button>
               <button className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg">Liberar Veículo</button>
             </div>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
