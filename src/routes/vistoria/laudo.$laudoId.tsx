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
  const [abaAtiva, setAbaAtiva] = useState<string>("checklist");
  const [dados, setDados] = useState<Row | null>(null);
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});
  const [acessorios, setAcessorios] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Array<Row>>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pendencias, setPendencias] = useState<Array<{ titulo: string; motivo: string; itemId: string | null }>>([]);
  const [sucesso, setSucesso] = useState<{ protocolo: string; data: string } | null>(null);

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
    const check = await pendenciasLaudoFn({ data: { laudoId } });
    if (check.ok && check.data.length > 0) {
      setPendencias(check.data);
      setEnviando(false);
      toast.error("Existem pendências no laudo.");
      return;
    }
    const res = await enviarLaudoFn({ data: { laudoId, vistoriadorId: user?.id ?? null } });
    setEnviando(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setSucesso({ protocolo: (res.data as Row)?.['protocolo'], data: new Date().toLocaleString() });
  };

  if (carregando) return <p className="text-sm text-slate-500">Carregando laudo...</p>;
  if (!dados) return <p className="text-sm text-slate-500">Laudo não encontrado.</p>;

  if (sucesso) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laudo Enviado!</h1>
          <p className="text-slate-500">O veículo foi movido para avaliação.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-400">Protocolo</p>
          <p className="font-mono text-xl font-bold text-teal-900">{sucesso.protocolo}</p>
          <p className="mt-2 text-xs text-slate-400">{sucesso.data}</p>
        </div>
        <button
          onClick={() => void navigate({ to: "/vistoria" })}
          className="flex min-h-14 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-teal-900 text-lg font-bold text-white"
        >
          Voltar para Agenda
        </button>
      </div>
    );
  }

  const contexto = dados["contexto"] as Row | null;
  const fotosDoItem = (itemId: string) => fotos.filter((f) => String(f["item_id"]) === itemId).length;

  return (
    <div className="space-y-4 pb-24">
      <div className="sticky top-[57px] z-20 -mx-4 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <button
          onClick={() => void navigate({ to: "/vistoria" })}
          className="flex min-h-12 items-center gap-2 font-semibold text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" /> Agenda
        </button>
        <IndicadorSalvamento estado={estado} pendentes={pendentes} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Veículo em Vistoria</p>
        <h1 className="text-lg font-bold text-slate-900">
          {contexto?.["marca"]} {contexto?.["modelo"]} · {contexto?.["placa"]}
        </h1>
      </div>

      <div className="sticky top-[114px] z-20 -mx-4 bg-white px-4 pb-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {["checklist", "acessorios", "fotos", "resumo"].map((tab) => (
          <button
            key={tab}
            onClick={() => setAbaAtiva(tab)}
            className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-bold transition-all ${
              abaAtiva === tab ? "bg-white text-teal-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        </div>
      </div>

      {abaAtiva === "checklist" && (
        <div className="space-y-6">
          {categorias.map(([categoria, itens]) => {
            const preenchidos = itens.filter((i) => !!respostas[String(i["id"])]?.resposta).length;
            return (
              <section key={categoria} className="space-y-3">
                <ProgressBar label={categoria.replace(/_/g, " ")} total={itens.length} preenchidos={preenchidos} />
                {itens.map((item) => {
                  const id = String(item["id"]);
                  const r = respostas[id] ?? {};
                  const avaria = (r.resposta ?? "").toUpperCase() === "AVARIA";
                  return (
                    <div key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-base font-semibold text-slate-900">{item["titulo"]}</p>
                          {item["ajuda"] && <p className="text-xs text-slate-500">{item["ajuda"]}</p>}
                        </div>
                        {respostas[id]?.resposta && <Check className="h-5 w-5 text-emerald-500 shrink-0" />}
                      </div>

                      {String(item["tipo"]).toUpperCase() === "TEXTO" ? (
                        <textarea
                          disabled={bloqueado}
                          value={r.resposta ?? ""}
                          onChange={(e) => atualizar(id, { resposta: e.target.value })}
                          className="mt-3 min-h-24 w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-base"
                        />
                      ) : (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {["OK", "AVARIA", "NA"].map((opcao) => (
                            <button
                              key={opcao}
                              disabled={bloqueado}
                              onClick={() => atualizar(id, { resposta: opcao })}
                              className={`min-h-12 rounded-xl border-2 text-xs font-bold transition-all ${
                                (r.resposta ?? "").toUpperCase() === opcao
                                  ? opcao === "AVARIA"
                                    ? "border-red-600 bg-red-600 text-white"
                                    : "border-teal-900 bg-teal-900 text-white"
                                  : "border-slate-100 bg-slate-50 text-slate-500"
                              }`}
                            >
                              {opcao === "NA" ? "N/A" : opcao}
                            </button>
                          ))}
                        </div>
                      )}

                      {avaria && (
                        <div className="mt-3 space-y-3 rounded-xl bg-red-50 p-3 ring-1 ring-inset ring-red-100">
                          <p className="text-xs font-bold uppercase text-red-600">Avaria Detectada</p>
                          <div className="grid grid-cols-3 gap-2">
                            {["LEVE", "MEDIA", "GRAVE"].map((g) => (
                              <button
                                key={g}
                                disabled={bloqueado}
                                onClick={() => atualizar(id, { gravidade: g })}
                                className={`min-h-12 rounded-xl border-2 text-[10px] font-bold ${
                                  r.gravidade === g
                                    ? "border-red-600 bg-red-600 text-white"
                                    : "border-red-100 bg-white text-red-700"
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
                            className="min-h-20 w-full rounded-xl border-2 border-red-100 p-3 text-sm"
                          />
                        </div>
                      )}

                      {(avaria || item["exige_foto"] === true) && (
                        <button
                          disabled={bloqueado}
                          onClick={() => void anexarFoto(id)}
                          className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                            fotosDoItem(id) > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-100 bg-slate-50 text-slate-500"
                          }`}
                        >
                          <Camera className="h-5 w-5" /> {fotosDoItem(id) > 0 ? `Alterar Foto (${fotosDoItem(id)})` : "Capturar Foto"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      {abaAtiva === "acessorios" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Catálogo de Acessórios</h2>
            <p className="text-xs text-slate-500">Marque o estado de cada item disponível no veículo.</p>
          </div>
          <div className="grid gap-3">
            {(dados["catalogoAcessorios"] as Array<Row>).map((a) => {
              const id = String(a["id"]);
              return (
                <div key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{a["nome"]}</p>
                    {acessorios[id] && <Check className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {["FUNCIONANDO", "COM_DEFEITO"].map((estado) => (
                      <button
                        key={estado}
                        disabled={bloqueado}
                        onClick={() => void alternarAcessorio(id, estado)}
                        className={`min-h-10 rounded-xl border-2 text-[10px] font-bold uppercase tracking-wider ${
                          acessorios[id] === estado
                            ? estado === "COM_DEFEITO"
                              ? "border-amber-500 bg-amber-500 text-slate-900"
                              : "border-teal-900 bg-teal-900 text-white"
                            : "border-slate-50 bg-slate-50 text-slate-400"
                        }`}
                      >
                        {estado.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {abaAtiva === "fotos" && (
        <RoteiroFotos
          laudoId={laudoId}
          fotosExistentes={fotos as any}
          bloqueado={bloqueado}
          onUpload={async (itemId, blob) => {
            const res = await salvarFotoFn({
              data: {
                laudoId,
                itemId,
                chave: `laudos/${laudoId}/${itemId}/${Date.now()}.jpg`,
                vistoriadorId: user?.id ?? null,
              },
            });
            if (res.ok) {
              setFotos((f) => [...f, res.data as Row]);
              toast.success("Foto salva com sucesso!");
            }
          }}
        />
      )}

      {abaAtiva === "resumo" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 text-center">Revisão Final</h2>
            <p className="text-sm text-slate-500 text-center mt-1">Verifique as pendências antes de enviar.</p>
          </div>

          <div className="space-y-2">
            {pendencias.length > 0 ? (
              pendencias.map((p, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (p.itemId) setAbaAtiva("checklist");
                    else if (p.motivo.includes("placa")) void navigate({ to: `/vistoria/${dados?.["agendamento_id"]}` });
                  }}
                  className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 active:scale-[0.98] transition-transform"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">{p.titulo || "Geral"}</p>
                    <p className="opacity-80">{p.motivo}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center text-emerald-700">
                <Check className="h-10 w-10 mx-auto mb-2" />
                <p className="font-bold">Tudo pronto!</p>
                <p className="text-sm opacity-80">Você preencheu todos os itens obrigatórios.</p>
              </div>
            )}
          </div>

          {!bloqueado && (
            <button
              onClick={() => void enviar()}
              disabled={enviando}
              className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-teal-900 text-lg font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
            >
              {enviando ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
              {enviando ? "Processando..." : "Enviar Laudo para Avaliação"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IndicadorSalvamento({ estado, pendentes }: { estado: string; pendentes: number }) {
  if (pendentes > 0 || estado === "pendente")
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
        <CloudOff className="h-3 w-3" /> {pendentes} na fila
      </span>
    );
  if (estado === "salvando")
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Salvando
      </span>
    );
  if (estado === "salvo")
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
        <Check className="h-3 w-3" /> Sincronizado
      </span>
    );
  return <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Offline-ready</span>;
}