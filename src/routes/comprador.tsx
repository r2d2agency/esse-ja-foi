import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
const BackofficeLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { DataTable } from "@/components/shared/DataTable";
import { dashboardCompradorFn } from "@/lib/dashboard.functions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/comprador")({
  head: () => ({
    meta: [
      { title: "Minha conta | ESSE JÁ FOI" },
      { name: "description", content: "Acompanhe seus lances e os leilões abertos de veículos na plataforma ESSE JÁ FOI." },
      { property: "og:title", content: "Minha conta | ESSE JÁ FOI" },
      { property: "og:description", content: "Lances em aberto, leilões ativos e veículos arrematados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompradorDashboard,
});

function CompradorDashboard() {
  const user = useAuthStore((s) => s.user);
  const email = user?.email ?? "";
  const carregar = useServerFn(dashboardCompradorFn);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-comprador", email],
    queryFn: () => carregar({ data: { email } }),
  });

  const lances = (data?.lances ?? []) as Array<Record<string, any>>;
  const abertos = (data?.abertos ?? []) as Array<Record<string, any>>;

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Minha Conta</h1>
            <p className="text-slate-500">Acompanhe seus lances e veículos arrematados.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Lances ativos", String(lances.length), "text-amber-600"],
            ["Leilões abertos", String(abertos.length), "text-teal-600"],
            [
              "Maior lance seu",
              lances.length ? formatCurrency(Math.max(...lances.map((l) => Number(l['meu_lance'] ?? 0)))) : "—",
              "text-slate-600",
            ],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{isLoading ? "—" : val}</p>
            </div>
          ))}
        </div>

        <DataTable
          title="Meus lances em aberto"
          data={lances}
          emptyMessage={isLoading ? "Carregando..." : "Você ainda não deu lances."}
          columns={[
            { header: "Veículo", accessor: (row) => `${row['placa']} — ${row['marca'] ?? ""} ${row['modelo'] ?? ""}`.trim() },
            { header: "Seu lance", accessor: (row) => formatCurrency(Number(row['meu_lance'] ?? 0)) },
            {
              header: "Lance atual",
              accessor: (row) => (
                <span className={Number(row['meu_lance']) >= Number(row['lance_atual']) ? "text-teal-600 font-bold" : "text-amber-600 font-bold"}>
                  {formatCurrency(Number(row['lance_atual'] ?? 0))}
                </span>
              ),
            },
            { header: "Situação", accessor: (row) => (Number(row['meu_lance']) >= Number(row['lance_atual']) ? "Vencendo" : "Superado") },
          ]}
        />

        <DataTable
          title="Leilões abertos"
          data={abertos}
          emptyMessage={isLoading ? "Carregando..." : "Nenhum leilão aberto no momento."}
          columns={[
            { header: "Veículo", accessor: (row) => `${row['placa']} — ${row['marca'] ?? ""} ${row['modelo'] ?? ""}`.trim() },
            { header: "Lance inicial", accessor: (row) => formatCurrency(Number(row['lance_inicial'] ?? 0)) },
            { header: "Maior lance", accessor: (row) => (row['maior_lance'] ? formatCurrency(Number(row['maior_lance'])) : "—") },
            { header: "Encerra em", accessor: (row) => (row['fim_em'] ? formatDate(row['fim_em']) : "—") },
          ]}
        />
      </div>
    </BackofficeLayout>
  );
}
