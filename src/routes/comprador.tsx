import { createFileRoute } from "@tanstack/react-router";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";

export const Route = createFileRoute("/comprador")({
  component: CompradorDashboard,
});

function CompradorDashboard() {
  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha Conta</h1>
          <p className="text-slate-500">Acompanhe seus lances e veículos arrematados.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold mb-4">Status da Habilitação</h3>
            <div className="flex items-center gap-2 text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-600" />
              <span className="text-sm font-medium">Habilitado para lances</span>
            </div>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
