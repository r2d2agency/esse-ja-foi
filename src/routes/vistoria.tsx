import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { meusAgendamentosFn, statusAgendamentoFn } from "@/lib/agendamentos.functions";
import { toast } from "sonner";
import { Gavel, Camera, History, User } from "lucide-react";

export const Route = createFileRoute("/vistoria")({
  component: VistoriaMobileLayout,
  head: () => ({
    meta: [
      { title: "App do vistoriador | ESSE JÁ FOI" },
      { name: "description", content: "Agenda diária do vistoriador com as vistorias atribuídas." },
      { property: "og:title", content: "App do vistoriador | ESSE JÁ FOI" },
      { property: "og:description", content: "Vistorias do dia, endereço e início da checagem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = Record<string, any>;

function VistoriaMobileLayout() {
  const { user } = useAuthStore();
  const [grupos, setGrupos] = useState<Array<{ data: string; itens: Row[] }>>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    if (!user?.id) {
      setCarregando(false);
      return;
    }
    const res = await meusAgendamentosFn({ data: { vistoriadorId: user.id } });
    setGrupos(res.data ?? []);
    setCarregando(false);
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const iniciar = async (id: string) => {
    const res = await statusAgendamentoFn({ data: { id, status: "EM_ANDAMENTO" } });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success("Vistoria iniciada.");
    void carregar();
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-900">
            <Gavel className="h-4 w-4 text-amber-500" />
          </div>
          <span className="font-bold text-teal-900">VISTORIA</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-500">Vistoriador</p>
            <p className="text-xs font-bold text-slate-900">{user?.name || "Operador"}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-4 pb-20">
        <div className="space-y-4">
          {carregando && <p className="text-sm text-slate-500">Carregando sua agenda...</p>}
          {!carregando && grupos.length === 0 && (
            <p className="text-sm text-slate-500">Você não tem vistorias agendadas no momento.</p>
          )}

          {grupos.map((grupo) => (
            <div key={grupo.data} className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">
                {grupo.data.split("-").reverse().join("/")}
              </h2>
              {grupo.itens.map((item) => (
                <div
                  key={String(item['id'])}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {new Date(String(item['data_hora'])).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {item['placa']}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900">{item['marca']} {item['modelo']}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {[item['unidade'], item['parceiro_nome'], item['cidade']].filter(Boolean).join(" · ") || "Local a confirmar"}
                  </p>
                  {item['observacao'] && <p className="text-xs text-slate-400 mt-1">{item['observacao']}</p>}
                  <button
                    onClick={() => void iniciar(String(item['id']))}
                    className="mt-4 w-full py-4 bg-teal-900 text-white rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Camera className="h-6 w-6" /> INICIAR VISTORIA
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-2 flex items-center justify-between pb-safe">
        <button className="flex flex-col items-center gap-1 text-teal-900">
          <Gavel className="h-5 w-5" />
          <span className="text-[10px] font-bold">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <History className="h-5 w-5" />
          <span className="text-[10px] font-medium">Histórico</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
