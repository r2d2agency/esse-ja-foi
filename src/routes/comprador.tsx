import { createFileRoute } from "@tanstack/react-router";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/comprador")({
  component: CompradorDashboard,
});

const mockLances = [
  { id: 1, lote: "Lote 042 - Corolla XEI", seuLance: 95000, lanceAtual: 96500, status: "Superado" },
  { id: 2, lote: "Lote 115 - Honda Civic", seuLance: 82000, lanceAtual: 82000, status: "Vencendo" },
];

function CompradorDashboard() {
  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Minha Conta</h1>
            <p className="text-slate-500">Acompanhe seus lances e veículos arrematados.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Habilitado</span>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Lances Ativos", "2", "text-amber-600"],
            ["Arrematados", "0", "text-teal-600"],
            ["Crédito Disponível", "R$ 250k", "text-slate-600"],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        <DataTable 
          title="Meus Lances em Aberto"
          data={mockLances}
          columns={[
            { header: "Lote / Veículo", accessor: "lote" },
            { 
              header: "Seu Lance", 
              accessor: (row) => formatCurrency(row.seuLance) 
            },
            { 
              header: "Lance Atual", 
              accessor: (row) => (
                <span className={row.seuLance === row.lanceAtual ? "text-teal-600 font-bold" : "text-amber-600 font-bold"}>
                  {formatCurrency(row.lanceAtual)}
                </span>
              )
            },
            { 
              header: "Status", 
              accessor: (row) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  row.status === "Vencendo" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {row.status}
                </span>
              )
            },
            {
              header: "Ação",
              accessor: () => (
                <button className="bg-teal-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-teal-950">Cobrir Lance</button>
              )
            }
          ]}
        />
      </div>
    </BackofficeLayout>
  );
}
