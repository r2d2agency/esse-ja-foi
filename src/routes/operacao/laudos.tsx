import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { devolverLaudoFn, listarLaudosFn, obterLaudoFn } from "@/lib/laudos.functions";
import { useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/operacao/laudos")({
  head: () => ({
    meta: [
      { title: "Laudos de vistoria | ESSE JÁ FOI" },
      { name: "description", content: "Revise laudos enviados pelos vistoriadores e devolva com motivo quando necessário." },
      { property: "og:title", content: "Laudos de vistoria | ESSE JÁ FOI" },
      { property: "og:description", content: "Revisão e devolução de laudos de vistoria veicular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LaudosOperacao,
});

type Row = Record<string, any>;

function LaudosOperacao() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState("");
  const [lista, setLista] = useState<Array<Row>>([]);
  const [detalhe, setDetalhe] = useState<Row | null>(null);
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    const res = await listarLaudosFn({ data: { status: status || null } });
    setLista(res.data ?? []);
  }, [status]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrir = async (id: string) => {
    const res = await obterLaudoFn({ data: { id } });
    if (!res.ok || !res.data) {
      toast.error(res.message);
      return;
    }
    setDetalhe(res.data as Row);
    setMotivo("");
  };

  const devolver = async () => {
    if (!detalhe) return;
    const res = await devolverLaudoFn({
      data: { laudoId: String(detalhe['laudo']['id']), motivo, usuario: user?.id ?? null },
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Laudo devolvido ao vistoriador.");
    setDetalhe(null);
    void carregar();
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laudos de vistoria</h1>
          <p className="text-slate-500">Revise os laudos enviados e devolva com motivo quando houver correções.</p>
        </div>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 p-2 text-sm">
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="ENVIADO">Enviado</option>
          <option value="DEVOLVIDO">Devolvido</option>
        </select>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Protocolo</th>
                  <th className="p-3">Veículo</th>
                  <th className="p-3">Vistoriador</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">Nenhum laudo encontrado.</td>
                  </tr>
                )}
                {lista.map((l) => (
                  <tr key={String(l['id'])} className="border-t border-slate-100">
                    <td className="p-3 font-mono text-xs">{l['protocolo'] ?? "—"}</td>
                    <td className="p-3">{l['marca']} {l['modelo']} · {l['placa']}</td>
                    <td className="p-3">{l['vistoriador_nome'] ?? "—"}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{l['status']}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => void abrir(String(l['id']))} className="text-teal-700 hover:underline">Abrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detalhe && (
            <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs uppercase text-slate-500">Protocolo</p>
                <p className="font-mono text-sm">{detalhe['laudo']['protocolo'] ?? "rascunho"}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {detalhe['contexto']?.['marca']} {detalhe['contexto']?.['modelo']} · {detalhe['contexto']?.['placa']}
                </h2>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto">
                {(detalhe['respostas'] as Array<Row>).map((r) => (
                  <div key={String(r['id'])} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-800">{r['titulo'] ?? r['item_id']}</p>
                    <p className="text-slate-600">
                      {r['resposta']} {r['gravidade'] ? `· ${r['gravidade']}` : ""}
                    </p>
                    {r['observacao'] && <p className="text-xs text-slate-500">{r['observacao']}</p>}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo da devolução (obrigatório)"
                  className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
                <button
                  disabled={motivo.trim().length < 3}
                  onClick={() => void devolver()}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Devolver ao vistoriador
                </button>
                <button onClick={() => setDetalhe(null)} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm">
                  Fechar
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}