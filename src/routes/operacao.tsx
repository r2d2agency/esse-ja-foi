import { createFileRoute } from "@tanstack/react-router";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";

export const Route = createFileRoute("/operacao")({
  component: OperacaoDashboard,
});

const mockVistorias = [
  { id: 1, placa: "ABC-1234", cliente: "João Silva", horario: "14:30", vistoriador: "Marcos Lima", status: "Confirmado" },
  { id: 2, placa: "XYZ-5678", cliente: "Maria Santos", horario: "16:00", vistoriador: "Pendente", status: "Aguardando" },
];

function OperacaoDashboard() {
  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operação</h1>
          <p className="text-slate-500">Gestão de pátio e acompanhamento de leilões.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Aguardando Vistoria", "5", "text-blue-600"],
            ["Pátio (Veículos)", "42", "text-slate-600"],
            ["Contratos Pendentes", "3", "text-amber-600"],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        <DataTable 
          title="Agendamentos do Dia"
          data={mockVistorias}
          onAdd={() => console.log("New booking")}
          columns={[
            { header: "Horário", accessor: "horario" },
            { header: "Placa", accessor: "placa" },
            { header: "Cliente", accessor: "cliente" },
            { header: "Vistoriador", accessor: "vistoriador" },
            { 
              header: "Status", 
              accessor: (row) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  row.status === "Confirmado" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-700"
                }`}>
                  {row.status}
                </span>
              )
            }
          ]}
        />
      </div>
    </BackofficeLayout>
  );
}
