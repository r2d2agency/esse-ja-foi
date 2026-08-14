import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
const BackofficeLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { devolverLaudoFn, listarLaudosFn, obterLaudoFn } from "@/lib/laudos.functions";
import { calcularDepreciacaoFn, obterHistoricoDepreciacaoFn } from "@/lib/depreciacao.functions";
import { useAuthStore } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/brasil";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  Calculator,
  History,
  X,
  FileText
} from "lucide-react";
import { gerarPdfLaudoFn } from "@/lib/pdf.functions";


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
  const [calculandoId, setCalculandoId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Array<Row>>([]);
  const [historicoVeiculoId, setHistoricoVeiculoId] = useState<string | null>(null);

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

  const calcular = async (veiculoId: string) => {
    setCalculandoId(veiculoId);
    const res = await calcularDepreciacaoFn({ data: { veiculoId, usuarioId: user?.id } });
    setCalculandoId(null);
    if (res.ok) {
      toast.success("Depreciação calculada com sucesso!");
      void carregar();
      void abrirHistorico(veiculoId);
    } else {
      toast.error(res.message);
    }
  };

  const abrirHistorico = async (veiculoId: string) => {
    const res = await obterHistoricoDepreciacaoFn({ data: { veiculoId } });
    if (res.ok) {
      setHistorico(res.data as Row[]);
      setHistoricoVeiculoId(veiculoId);
    } else {
      toast.error(res.message);
    }
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Protocolo</th>
                  <th className="p-3">Veículo</th>
                  <th className="p-3">Vistoriador</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">Nenhum laudo encontrado.</td>
                  </tr>
                )}
                {lista.map((l) => (
                  <tr key={String(l['id'])} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-xs">{l['protocolo'] ?? "—"}</td>
                    <td className="p-3">{l['marca']} {l['modelo']} · {l['placa']}</td>
                    <td className="p-3">{l['vistoriador_nome'] ?? "—"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        l['status'] === 'ENVIADO' ? 'bg-emerald-100 text-emerald-700' :
                        l['status'] === 'DEVOLVIDO' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {l['status']}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => void abrir(String(l['id']))} 
                          className="p-1.5 text-slate-400 hover:text-teal-900 transition-colors"
                          title="Abrir Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {String(l['status']).toUpperCase() === "ENVIADO" && (
                          <button
                            onClick={() => void calcular(String(l['veiculo_id']))}
                            disabled={calculandoId === String(l['veiculo_id'])}
                            className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-30"
                            title="Calcular Depreciação"
                          >
                            <Calculator className={`h-4 w-4 ${calculandoId === String(l['veiculo_id']) ? "animate-spin" : ""}`} />
                          </button>
                        )}
                        <button
                          onClick={() => void abrirHistorico(String(l['veiculo_id']))}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Histórico de Preços"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const res = await gerarPdfLaudoFn({ data: { laudoId: String(l['id']) } });
                            toast.info(res.message);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Gerar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detalhe && (
            <aside className="sticky top-20 h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400">Protocolo</p>
                  <p className="font-mono text-sm text-slate-600">{detalhe['laudo']['protocolo'] ?? "RASCUNHO"}</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {detalhe['contexto']?.['marca']} {detalhe['contexto']?.['modelo']} · {detalhe['contexto']?.['placa']}
                  </h2>
                </div>
                <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                {(detalhe['respostas'] as Array<Row>).map((r) => (
                  <div key={String(r['id'])} className={`rounded-lg border p-3 text-sm ${
                    String(r['resposta']).toUpperCase() === 'AVARIA' ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-white'
                  }`}>
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800">{r['titulo'] || "Item"}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        String(r['resposta']).toUpperCase() === 'AVARIA' ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r['resposta']}
                      </span>
                    </div>
                    {r['gravidade'] && <p className="text-[10px] font-bold text-red-600 mt-1 uppercase">Gravidade: {r['gravidade']}</p>}
                    {r['observacao'] && <p className="mt-1 text-xs text-slate-500 italic">"{r['observacao']}"</p>}
                  </div>
                ))}
              </div>

              {String(detalhe['laudo']['status']).toUpperCase() === "ENVIADO" && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ação da Operação</p>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Descreva o motivo caso vá devolver este laudo..."
                      className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-teal-900 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={motivo.trim().length < 5}
                      onClick={() => void devolver()}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-40"
                    >
                      Devolver
                    </button>
                    <button
                      onClick={() => void calcular(String(detalhe['laudo']['veiculo_id']))}
                      className="rounded-lg bg-teal-900 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 transition-colors"
                    >
                      Calcular Sugestão
                    </button>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* Modal Histórico Depreciação */}
      {historicoVeiculoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Histórico de Preços Sugeridos</h3>
                <p className="text-sm text-slate-500">Cálculos baseados na matriz de depreciação do sistema.</p>
              </div>
              <button onClick={() => setHistoricoVeiculoId(null)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {historico.length > 0 ? (
                historico.map((calc, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white hover:border-teal-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">{new Date(String(calc['criado_em'])).toLocaleString('pt-BR')}</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">Calculado por: {calc['usuario_nome'] || 'Sistema'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-teal-900 leading-tight">{formatCurrency(calc['valor_final'])}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor Sugerido</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50">
                      <div className="text-xs">
                        <span className="text-slate-400 block font-bold uppercase text-[9px]">Valor FIPE</span>
                        <span className="text-slate-900 font-semibold">{formatCurrency(calc['valor_fipe'])}</span>
                      </div>
                      {calc['fora_da_curva'] === true && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md h-fit w-fit">
                          <AlertTriangle className="h-3 w-3" /> FORA DA CURVA (TETO)
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg">
                      {((calc['detalhamento'] as any[]) || []).map((d, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] items-center">
                          <span className="text-slate-600 font-medium">{d.titulo} {d.info ? <span className="text-[10px] text-slate-400 font-normal">· {d.info}</span> : ''}</span>
                          <span className={d.tipo === 'DESCONTO' || d.tipo === 'MARGEM' || d.tipo === 'TETO' ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {d.tipo === 'DESCONTO' || d.tipo === 'MARGEM' || d.tipo === 'TETO' ? '-' : '+'}{formatCurrency(d.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 italic">Nenhum cálculo realizado para este veículo.</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => setHistoricoVeiculoId(null)} className="text-sm font-bold text-teal-900 hover:underline">
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </BackofficeLayout>
  );
}
