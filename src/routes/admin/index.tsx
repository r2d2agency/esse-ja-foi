import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { dashboardAdminFn } from "@/lib/dashboard.functions";
import { checkSystemHealthFn } from "@/lib/admin.functions";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
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
  const carregarSaude = useServerFn(checkSystemHealthFn);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-admin"], queryFn: () => carregar() });
  const { data: healthData, isLoading: loadingHealth } = useQuery({ queryKey: ["system-health"], queryFn: () => carregarSaude() });

  const health = healthData?.data || {};
  const hasCriticalIssue = Object.values(health).some(v => v === false);

  const i = data?.indicadores;
  const cards: Array<[string, number, string]> = [
    ["Leads novos", data?.leadsTotais?.novos ?? 0, "text-emerald-600"],
    ["Em vistoria", i?.emVistoria ?? 0, "text-blue-600"],
    ["Leilões ativos", i?.leiloesAtivos ?? 0, "text-amber-600"],
    ["Veículos captados", i?.veiculos ?? 0, "text-teal-600"],
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="text-slate-500">Gestão central da plataforma ESSE JÁ FOI.</p>
        </div>

        {hasCriticalIssue && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-800 font-bold">
              <AlertTriangle className="h-5 w-5" />
              Problemas de Integridade Detectados
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(health).map(([table, ok]) => (
                <div key={table} className="flex items-center gap-2 text-xs">
                  {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-red-600" />}
                  <span className={ok ? "text-emerald-700" : "text-red-700 font-medium"}>{table}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && data.bancoOk === false && !hasCriticalIssue && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Banco de dados não conectado (DATABASE_URL ausente).
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-4">
          {cards.map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{isLoading ? "—" : val}</p>
            </div>
          ))}
        </div>

        <DataTable
          title="Leads recebidos pela landing page"
          data={(data?.leads ?? []) as Array<Record<string, any>>}
          emptyMessage={isLoading ? "Carregando..." : "Nenhum lead recebido ainda."}
          columns={[
            { header: "Nome", accessor: "nome" },
            { header: "WhatsApp", accessor: "whatsapp" },
            { header: "Cidade", accessor: (row) => row['cidade'] ?? "—" },
            { header: "Veículo", accessor: (row) => `${row['marca'] ?? ""} ${row['modelo'] ?? ""} ${row['ano'] ?? ""}`.trim() || "—" },
            { header: "Origem", accessor: (row) => row['origem'] ?? "—" },
            { header: "Status", accessor: (row) => String(row['status'] ?? "").replace(/_/g, " ") },
            { header: "Recebido em", accessor: (row) => (row['criado_em'] ? formatDate(row['criado_em']) : "—") },
          ]}
        />
        <div className="flex gap-4">
          <Link to="/operacao/leads" className="inline-block text-sm font-medium text-teal-700 hover:underline">
            Ver todos os leads →
          </Link>
          <Link to="/admin/usuarios" className="inline-block text-sm font-medium text-teal-700 hover:underline">
            Gestão de Vendedores →
          </Link>
          <Link to="/admin/configuracoes" className="inline-block text-sm font-medium text-amber-700 hover:underline">
            Configurações do Sistema →
          </Link>
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
