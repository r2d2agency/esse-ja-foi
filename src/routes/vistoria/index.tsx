import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { meusAgendamentosFn } from "@/lib/agendamentos.functions";
import { RefreshCw, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/vistoria/")({
  component: MinhaAgenda,
});

type Row = Record<string, any>;

const selos: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-800",
  CONFIRMADO: "bg-teal-100 text-teal-800",
  EM_ANDAMENTO: "bg-amber-100 text-amber-800",
  CONCLUIDO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-red-100 text-red-800",
};

function MinhaAgenda() {
  const { user } = useAuthStore();
  const [grupos, setGrupos] = useState<Array<{ data: string; itens: Row[] }>>([]);
  const [carregando, setCarregando] = useState(true);
  const [puxando, setPuxando] = useState(false);

  const carregar = useCallback(async () => {
    if (!user?.id) {
      setCarregando(false);
      return;
    }
    const res = await meusAgendamentosFn({ data: { vistoriadorId: user.id } });
    setGrupos(res.data ?? []);
    setCarregando(false);
    setPuxando(false);
  }, [user?.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Puxar para atualizar (gesto nativo no topo da lista)
  useEffect(() => {
    let inicio = 0;
    const inicioToque = (e: TouchEvent) => {
      inicio = window.scrollY === 0 ? (e.touches[0]?.clientY ?? 0) : 0;
    };
    const fimToque = (e: TouchEvent) => {
      const fim = e.changedTouches[0]?.clientY ?? 0;
      if (inicio > 0 && fim - inicio > 90) {
        setPuxando(true);
        void carregar();
      }
      inicio = 0;
    };
    window.addEventListener("touchstart", inicioToque, { passive: true });
    window.addEventListener("touchend", fimToque, { passive: true });
    return () => {
      window.removeEventListener("touchstart", inicioToque);
      window.removeEventListener("touchend", fimToque);
    };
  }, [carregar]);

  const pendentes = grupos
    .flatMap((g) => g.itens)
    .filter((i) => ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO"].includes(String(i['status']).toUpperCase())).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-teal-900 p-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-teal-200">Vistorias pendentes</p>
          <p className="text-3xl font-bold">{pendentes}</p>
        </div>
        <button
          onClick={() => {
            setPuxando(true);
            void carregar();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-800 active:scale-95"
          aria-label="Atualizar agenda"
        >
          <RefreshCw className={`h-6 w-6 ${puxando ? "animate-spin" : ""}`} />
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-400">Puxe a tela para baixo para atualizar</p>

      {carregando && <p className="text-sm text-slate-500">Carregando sua agenda...</p>}
      {!carregando && grupos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Você não tem vistorias agendadas no momento.
        </p>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.data} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{grupo.data.split("-").reverse().join("/")}</h2>
          {grupo.itens.map((item) => (
            <Link
              key={String(item['id'])}
              to="/vistoria/$agendamentoId"
              params={{ agendamentoId: String(item['id']) }}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="rounded bg-slate-900 px-2 py-1 text-sm font-bold text-white">
                  {new Date(String(item['data_hora'])).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                    selos[String(item['status']).toUpperCase()] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {String(item['status']).replace(/_/g, " ")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {item['marca']} {item['modelo']}
              </h3>
              <p className="text-sm font-semibold text-slate-700">{item['placa']}</p>
              <p className="mt-1 text-sm text-slate-500">{item['cliente_nome'] ?? "Cliente não informado"}</p>
              <p className="text-sm text-slate-500">
                {[item['unidade'], item['parceiro_nome'], item['cidade'] ?? item['veiculo_cidade']].filter(Boolean).join(" · ") ||
                  "Local a confirmar"}
              </p>
              <span className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-900 text-base font-bold text-white">
                Abrir vistoria <ChevronRight className="h-5 w-5" />
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}