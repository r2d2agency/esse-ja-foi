import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth";
import { useSalvamento } from "@/hooks/use-salvamento";
import {
  enviarLaudoFn,
  obterLaudoFn,
  salvarAcessoriosLaudoFn,
  salvarFotoFn,
  salvarRespostaFn,
  pendenciasLaudoFn,
} from "@/lib/laudos.functions";
import { ArrowLeft, Camera, Check, CloudOff, Loader2, Send, ChevronRight, AlertCircle } from "lucide-react";
import { ProgressBar } from "@/components/vistoria/ProgressBar";
import { RoteiroFotos } from "@/components/vistoria/RoteiroFotos";

export const Route = createFileRoute("/vistoria/laudo/$laudoId")({
  component: PreencherLaudo,
});

type Row = Record<string, any>;
type RespostaLocal = { resposta?: string; gravidade?: string; observacao?: string };

function PreencherLaudo() {
  const { laudoId } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [dados, setDados] = useState<Row | null>(null);
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});
  const [acessorios, setAcessorios] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Array<Row>>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pendencias, setPendencias] = useState<Array<{ titulo: string; motivo: string }>>([]);

  const enviarResposta = useCallback(
    async (payload: { laudoId: string; itemId: string; resposta?: string | null; gravidade?: string | null; observacao?: string | null }) => {
      const res = await salvarRespostaFn({ data: { ...payload, vistoriadorId: user?.id ?? null } });
      if (!res.ok) throw new Error(res.message);
    },
    [user?.id],
  );

  const { estado, pendentes, salvar } = useSalvamento(`laudo-fila-${laudoId}`, enviarResposta);

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    const res = await obterLaudoFn({ data: { id: laudoId, vistoriadorId: user.id } });
    if (!res.ok || !res.data) {
      toast.error(res.message);
      setCarregando(false);
      return;
    }
    const d = res.data as Row;
    setDados(d);
    const mapa: Record<string, RespostaLocal> = {};
    for (const r of d['respostas'] as Array<Row>) {
      mapa[String(r['item_id'])] = {
        resposta: (r['resposta'] as string) ?? "",
        gravidade: (r['gravidade'] as string) ?? "",
        observacao: (r['observacao'] as string) ?? "",
      };
    }
    setRespostas(mapa);
    const acc: Record<string, string> = {};
    for (const a of d['acessorios'] as Array<Row>) acc[String(a['acessorio_id'])] = String(a['estado']);
    setAcessorios(acc);
    setFotos(d['fotos'] as Array<Row>);
    setCarregando(false);
  }, [laudoId, user?.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const categorias = useMemo(() => {
    const itens = (dados?.['itens'] ?? []) as Array<Row>;
    const mapa = new Map<string, Array<Row>>();
    for (const item of itens) {
      const c = String(item['categoria']);
      mapa.set(c, [...(mapa.get(c) ?? []), item]);
    }
    return Array.from(mapa.entries());
  }, [dados]);

  const bloqueado = dados?.['laudo']?.['bloqueado'] === true;

  const atualizar = (itemId: string, patch: RespostaLocal) => {
    const atual = { ...(respostas[itemId] ?? {}), ...patch };
    setRespostas((r) => ({ ...r, [itemId]: atual }));
    if (atual.resposta?.toUpperCase() === "AVARIA" && (!atual.observacao?.trim() || !atual.gravidade)) return;
    salvar(itemId, {
      laudoId,
      itemId,
      resposta: atual.resposta ?? null,
      gravidade: atual.gravidade ?? null,
      observacao: atual.observacao ?? null,
    });
  };

  const anexarFoto = async (itemId: string | null) => {
    const chave = `laudos/${laudoId}/${itemId ?? "geral"}/${Date.now()}.jpg`;
    const res = await salvarFotoFn({ data: { laudoId, itemId, chave, vistoriadorId: user?.id ?? null } });
    if (!res.ok || !res.data) {
      toast.error(res.message);
      return;
    }
    setFotos((f) => [...f, res.data as Row]);
    toast.success("Foto vinculada ao laudo.");
  };

  const alternarAcessorio = async (acessorioId: string, estado: string) => {
    const novo = { ...acessorios };
    if (novo[acessorioId] === estado) delete novo[acessorioId];
    else novo[acessorioId] = estado;
    setAcessorios(novo);
    await salvarAcessoriosLaudoFn({
      data: {
        laudoId,
        itens: Object.entries(novo).map(([acessorioId2, est]) => ({ acessorioId: acessorioId2, estado: est })),
        vistoriadorId: user?.id ?? null,
      },
    });
  };

  const enviar = async () => {
    setEnviando(true);
    const res = await enviarLaudoFn({ data: { laudoId, vistoriadorId: user?.id ?? null } });
    setEnviando(false);
    if (!res.ok) {
      setPendencias(res.pendencias ?? []);
      toast.error(res.message);
      return;
    }
    setPendencias([]);
    toast.success(`Laudo enviado. Protocolo ${(res.data as Row)?.['protocolo']}`);
    void navigate({ to: "/vistoria" });
  };

  if (carregando) return <p className="text-sm text-slate-500">Carregando laudo...</p>;
  if (!dados) return <p className="text-sm text-slate-500">Laudo não encontrado.</p>;

  const contexto = dados['contexto'] as Row | null;
  const fotosDoItem = (itemId: string) => fotos.filter((f) => String(f['item_id']) === itemId).length;

  return (
    <div className="space-y-4 pb-8">
      <div className="sticky top-[57px] z-10 -mx-4 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <button onClick={() => void navigate({ to: "/vistoria" })} className="flex min-h-12 items-center gap-2 font-semibold text-slate-700">
          <ArrowLeft className="h-5 w-5" /> Agenda
        </button>
        <IndicadorSalvamento estado={estado} pendentes={pendentes} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Vistoria em andamento</p>
        <h1 className="text-lg font-bold text-slate-900">
          {contexto?.['marca']} {contexto?.['modelo']} · {contexto?.['placa']}
        </h1>
        {dados['laudo']['motivo_devolucao'] && (
          <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Devolvido pela operação: {dados['laudo']['motivo_devolucao']}
          </p>
        )}
        {bloqueado && (
          <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            Laudo enviado (protocolo {dados['laudo']['protocolo']}). Somente leitura.
          </p>
        )}
      </div>

      {pendencias.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-700">Pendências para enviar</p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {pendencias.map((p, i) => (
              <li key={i}>• {p.titulo}: {p.motivo}</li>
            ))}
          </ul>
        </div>
      )}

      {categorias.map(([categoria, itens]) => (
        <section key={categoria} className="space-y-3">
          <h2 className="text-base font-bold uppercase tracking-wide text-slate-600">{categoria.replace(/_/g, " ")}</h2>
          {itens.map((item) => {
            const id = String(item['id']);
            const r = respostas[id] ?? {};
            const avaria = (r.resposta ?? "").toUpperCase() === "AVARIA";
            return (
              <div key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-base font-semibold text-slate-900">{item['titulo']}</p>
                {item['ajuda'] && <p className="text-xs text-slate-500">{item['ajuda']}</p>}

                {String(item['tipo']).toUpperCase() === "TEXTO" ? (
                  <textarea
                    disabled={bloqueado}
                    value={r.resposta ?? ""}
                    onChange={(e) => atualizar(id, { resposta: e.target.value })}
                    className="mt-3 min-h-24 w-full rounded-xl border-2 border-slate-300 p-3 text-base"
                  />
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["OK", "AVARIA", "NA"].map((opcao) => (
                      <button
                        key={opcao}
                        disabled={bloqueado}
                        onClick={() => atualizar(id, { resposta: opcao })}
                        className={`min-h-12 rounded-xl border-2 text-base font-bold ${
                          (r.resposta ?? "").toUpperCase() === opcao
                            ? opcao === "AVARIA"
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-teal-900 bg-teal-900 text-white"
                            : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {opcao === "NA" ? "N/A" : opcao}
                      </button>
                    ))}
                  </div>
                )}

                {avaria && (
                  <div className="mt-3 space-y-3 rounded-xl bg-red-50 p-3">
                    <div className="grid grid-cols-3 gap-2">
                      {["LEVE", "MEDIA", "GRAVE"].map((g) => (
                        <button
                          key={g}
                          disabled={bloqueado}
                          onClick={() => atualizar(id, { gravidade: g })}
                          className={`min-h-12 rounded-xl border-2 text-sm font-bold ${
                            r.gravidade === g ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-white text-red-700"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    <textarea
                      disabled={bloqueado}
                      value={r.observacao ?? ""}
                      onChange={(e) => atualizar(id, { observacao: e.target.value })}
                      placeholder="Descreva a avaria (obrigatório)"
                      className="min-h-20 w-full rounded-xl border-2 border-red-200 p-3 text-base"
                    />
                  </div>
                )}

                {(avaria || item['exige_foto'] === true) && (
                  <button
                    disabled={bloqueado}
                    onClick={() => void anexarFoto(id)}
                    className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 text-base font-semibold text-slate-700"
                  >
                    <Camera className="h-5 w-5" /> Foto ({fotosDoItem(id)})
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-base font-bold uppercase tracking-wide text-slate-600">Acessórios</h2>
        {(dados['catalogoAcessorios'] as Array<Row>).map((a) => {
          const id = String(a['id']);
          return (
            <div key={id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{a['nome']}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["FUNCIONANDO", "COM_DEFEITO"].map((estado) => (
                  <button
                    key={estado}
                    disabled={bloqueado}
                    onClick={() => void alternarAcessorio(id, estado)}
                    className={`min-h-12 rounded-xl border-2 text-sm font-bold ${
                      acessorios[id] === estado
                        ? estado === "COM_DEFEITO"
                          ? "border-amber-600 bg-amber-500 text-slate-900"
                          : "border-teal-900 bg-teal-900 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {estado.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {(dados['catalogoAcessorios'] as Array<Row>).length === 0 && (
          <p className="text-sm text-slate-500">Nenhum acessório cadastrado no catálogo.</p>
        )}
      </section>

      {!bloqueado && (
        <button
          onClick={() => void enviar()}
          disabled={enviando}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-teal-900 text-lg font-bold text-white disabled:opacity-40"
        >
          <Send className="h-6 w-6" /> {enviando ? "Enviando..." : "Enviar laudo"}
        </button>
      )}
    </div>
  );
}

function IndicadorSalvamento({ estado, pendentes }: { estado: string; pendentes: number }) {
  if (pendentes > 0 || estado === "pendente")
    return (
      <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
        <CloudOff className="h-4 w-4" /> {pendentes} na fila
      </span>
    );
  if (estado === "salvando")
    return (
      <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Salvando
      </span>
    );
  if (estado === "salvo")
    return (
      <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
        <Check className="h-4 w-4" /> Salvo
      </span>
    );
  return <span className="text-sm text-slate-400">Pronto</span>;
}