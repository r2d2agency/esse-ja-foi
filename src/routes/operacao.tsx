import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout as BackofficeLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/shared/DataTable";
import { dashboardOperacaoFn } from "@/lib/dashboard.functions";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/operacao")({
  head: () => ({
    meta: [
      { title: "Operação | ESSE JÁ FOI" },
      { name: "description", content: "Fila operacional de captação, agendamento e vistoria de veículos na plataforma ESSE JÁ FOI." },
      { property: "og:title", content: "Operação | ESSE JÁ FOI" },
      { property: "og:description", content: "Acompanhe o pátio, os agendamentos e as vistorias em andamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperacaoDashboard,
});

function OperacaoDashboard() {
  const carregar = useServerFn(dashboardOperacaoFn);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-operacao"], queryFn: () => carregar() });
  const i = data?.indicadores;

  const cards: Array<[string, number, string]> = [
    ["Aguardando vistoria", i?.emVistoria ?? 0, "text-blue-600"],
    ["Pátio (veículos)", i?.veiculos ?? 0, "text-slate-600"],
    ["Aguardando laudo", i?.aguardandoLaudo ?? 0, "text-amber-600"],
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operação</h1>
          <p className="text-slate-500">Gestão de pátio e acompanhamento de leilões.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{isLoading ? "—" : val}</p>
            </div>
          ))}
        </div>

        <DataTable
          title="Fila operacional"
          data={(data?.fila ?? []) as Array<Record<string, any>>}
          emptyMessage={isLoading ? "Carregando..." : "Nenhum veículo na fila operacional."}
          columns={[
            { header: "Entrada", accessor: (row) => (row['criado_em'] ? formatDate(row['criado_em']) : "—") },
            { header: "Placa", accessor: "placa" },
            { header: "Veículo", accessor: (row) => `${row['marca'] ?? ""} ${row['modelo'] ?? ""}`.trim() },
            { header: "Cliente", accessor: (row) => row['cliente_nome'] ?? "—" },
            { header: "Cidade", accessor: (row) => row['cidade'] ?? "—" },
            {
              header: "Status",
              accessor: (row) => (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  {String(row['status'] ?? "").replace(/_/g, " ")}
                </span>
              ),
            },
          ]}
        />
      </div>
    </BackofficeLayout>
  );
}
