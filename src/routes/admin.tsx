import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { dashboardAdminFn } from "@/lib/dashboard.functions";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin | ESSE JÁ FOI" },
      { name: "description", content: "Painel administrativo da plataforma ESSE JÁ FOI: veículos, vistorias e leilões em tempo real." },
      { property: "og:title", content: "Dashboard Admin | ESSE JÁ FOI" },
      { property: "og:description", content: "Gestão central de captação, vistoria e leilão de veículos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

const statusClasses: Record<string, string> = {
  VENDIDO: "bg-green-100 text-green-700",
  EM_VISTORIA: "bg-blue-100 text-blue-700",
  RECUSADO: "bg-red-100 text-red-700",
};

function AdminDashboard() {
  const carregar = useServerFn(dashboardAdminFn);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-admin"], queryFn: () => carregar() });

  const i = data?.indicadores;
  const cards: Array<[string, number, string]> = [
    ["Em vistoria", i?.emVistoria ?? 0, "text-blue-600"],
    ["Leilões ativos", i?.leiloesAtivos ?? 0, "text-amber-600"],
    ["Veículos captados", i?.veiculos ?? 0, "text-teal-600"],
    ["Aguardando laudo", i?.aguardandoLaudo ?? 0, "text-orange-600"],
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="text-slate-500">Gestão central da plataforma ESSE JÁ FOI.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {cards.map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{isLoading ? "—" : val}</p>
            </div>
          ))}
        </div>

        <DataTable
          title="Veículos recentes"
          data={(data?.recentes ?? []) as Array<Record<string, any>>}
          emptyMessage={isLoading ? "Carregando..." : "Nenhum veículo cadastrado ainda."}
          columns={[
            { header: "Placa", accessor: "placa" },
            { header: "Modelo", accessor: (row) => `${row['marca'] ?? ""} ${row['modelo'] ?? ""}`.trim() },
            { header: "Cliente", accessor: (row) => row['cliente_nome'] ?? "—" },
            {
              header: "Status",
              accessor: (row) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusClasses[String(row['status'])] ?? "bg-amber-100 text-amber-700"}`}>
                  {String(row['status'] ?? "").replace(/_/g, " ")}
                </span>
              ),
            },
            { header: "Data", accessor: (row) => (row['criado_em'] ? formatDate(row['criado_em']) : "—") },
          ]}
        />
      </div>
    </BackofficeLayout>
  );
}
