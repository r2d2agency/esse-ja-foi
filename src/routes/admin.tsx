import { createFileRoute } from "@tanstack/react-router";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="text-slate-500">Bem-vindo ao painel de gestão da ESSE JÁ FOI.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-4">
          {[
            ["Vistorias Hoje", "12", "text-blue-600"],
            ["Leilões Ativos", "4", "text-amber-600"],
            ["Veículos Captados", "28", "text-teal-600"],
            ["Aguardando Laudo", "7", "text-orange-600"],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </BackofficeLayout>
  );
}
