import { createFileRoute } from "@tanstack/react-router";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

const mockData = [
  { id: 1, placa: "ABC-1234", modelo: "Toyota Corolla", status: "Em Vistoria", data: "2024-05-15" },
  { id: 2, placa: "XYZ-5678", modelo: "Honda Civic", status: "Aguardando Leilão", data: "2024-05-16" },
  { id: 3, placa: "KJH-9900", modelo: "Fiat Pulse", status: "Vendido", data: "2024-05-14" },
];

function AdminDashboard() {
  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="text-slate-500">Gestão central da plataforma ESSE JÁ FOI.</p>
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

        <DataTable 
          title="Veículos Recentes"
          data={mockData}
          onAdd={() => console.log("Add new")}
          onSearch={(t) => console.log("Search", t)}
          columns={[
            { header: "Placa", accessor: "placa" },
            { header: "Modelo", accessor: "modelo" },
            { 
              header: "Status", 
              accessor: (row) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  row.status === "Vendido" ? "bg-green-100 text-green-700" :
                  row.status === "Em Vistoria" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {row.status}
                </span>
              )
            },
            { header: "Data", accessor: "data" },
            {
              header: "Ações",
              accessor: () => (
                <button className="text-teal-700 hover:underline text-sm font-medium">Ver detalhes</button>
              )
            }
          ]}
        />
      </div>
    </BackofficeLayout>
  );
}

