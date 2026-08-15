import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft, Printer, Download, Maximize2, ZoomIn, ZoomOut, Send, XCircle,
  History, Mail, MessageCircle, LayoutDashboard, CheckCircle2, RefreshCw,
} from "lucide-react";
import {
  obterContratoFn, enviarContratoFn, cancelarContratoFn, registrarRetornoAssinaturaFn,
} from "@/lib/contratos.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusContrato } from "@/components/contratos/StatusContrato";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/contrato/$id")({
  head: () => ({
    meta: [
      { title: "Contrato | ESSE JÁ FOI" },
      { name: "description", content: "Visualização, envio e acompanhamento do contrato do vendedor." },
      { property: "og:title", content: "Contrato | ESSE JÁ FOI" },
      { property: "og:description", content: "Documento, status e histórico completo do contrato." },
    ],
  }),
  component: ContratoDetalhe,
});

const CANAIS = [
  { valor: "EMAIL", label: "E-mail", icon: Mail },
  { valor: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { valor: "PORTAL", label: "Portal do Vendedor", icon: LayoutDashboard },
];

function ContratoDetalhe() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const carregar = useServerFn(obterContratoFn);
  const enviar = useServerFn(enviarContratoFn);
  const cancelar = useServerFn(cancelarContratoFn);
  const retorno = useServerFn(registrarRetornoAssinaturaFn);

  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [canais, setCanais] = useState<string[]>(["EMAIL", "PORTAL"]);
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["admin-contrato", id],
    queryFn: () => carregar({ data: { id } }),
  });

  if (isLoading) return <div className="p-8 text-slate-400">Carregando contrato...</div>;
  if (!res || !(res as any).ok) return <div className="p-8 text-red-600">{(res as any)?.message || "Contrato não encontrado."}</div>;

  const { contrato, eventos } = (res as any).data;

  const acao = async (fn: () => Promise<any>, sucesso: string) => {
    const t = toast.loading("Processando...");
    try {
      const r = await fn();
      if (r && r.ok === false) toast.error(r.message);
      else toast.success(sucesso);
      await refetch();
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Falha na operação.");
    } finally {
      toast.dismiss(t);
    }
  };

  const podeEnviar = ["GERADO", "EXPIRADO"].includes(contrato.status);
  const podeCancelar = !["CANCELADO", "ASSINADO"].includes(contrato.status);

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to="/admin/contratos"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">{contrato.identificador}</h1>
            <p className="text-slate-500 font-medium">{contrato.vendedor_nome} • {contrato.modelo_nome} v{contrato.modelo_versao}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {podeEnviar && (
            <Button onClick={() => setModalEnvio(true)} className="bg-teal-600 hover:bg-teal-700 font-bold">
              <Send className="mr-2 h-4 w-4" /> {contrato.status === "EXPIRADO" ? "Reenviar" : "Enviar para assinatura"}
            </Button>
          )}
          {contrato.status === "RECUSADO" && (
            <>
              <Button asChild variant="outline"><Link to="/admin/vendedor/$id" params={{ id: contrato.vendedor_id }}>Entrar em contato</Link></Button>
              <Button asChild className="bg-slate-950 hover:bg-slate-900">
                <Link to="/admin/vendedor/$id" params={{ id: contrato.vendedor_id }}>Gerar novo contrato</Link>
              </Button>
            </>
          )}
          {contrato.status === "EXPIRADO" && (
            <Button asChild variant="outline"><Link to="/admin/vendedor/$id" params={{ id: contrato.vendedor_id }}>Gerar novo contrato</Link></Button>
          )}
          {podeCancelar && (
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setModalCancelar(true)}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar contrato
            </Button>
          )}
        </div>
      </div>

      {contrato.status === "RECUSADO" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
          O vendedor recusou o contrato.{contrato.comentario_recusa ? ` Comentário: “${contrato.comentario_recusa}”` : ""}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Visualizador */}
        <Card className="border-slate-200 shadow-none overflow-hidden">
          <div className="flex items-center justify-between border-b bg-white px-4 py-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(60, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-xs font-bold text-slate-500 w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(200, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setFullscreen(true)}><Maximize2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-3 w-3" /> Imprimir</Button>
              {contrato.arquivo_assinado_url && (
                <Button asChild variant="outline" size="sm">
                  <a href={contrato.arquivo_assinado_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-3 w-3" /> Arquivo assinado</a>
                </Button>
              )}
            </div>
          </div>
          <CardContent className="p-0 bg-slate-100">
            <div className="max-h-[70vh] overflow-auto p-8 flex justify-center">
              <pre
                className="bg-white shadow-sm border border-slate-200 p-10 whitespace-pre-wrap font-serif text-slate-800 w-[720px] origin-top"
                style={{ transform: `scale(${zoom / 100})` }}
              >
                {contrato.conteudo}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Painel lateral */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-5 space-y-4 text-sm">
              <Campo titulo="Contrato" valor={contrato.identificador} />
              <Campo titulo="Vendedor" valor={contrato.vendedor_nome} />
              <Campo titulo="Modelo" valor={contrato.modelo_nome} />
              <Campo titulo="Versão" valor={String(contrato.versao)} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <StatusContrato status={contrato.status} className="mt-1" />
              </div>
              <Campo titulo="Criado em" valor={format(new Date(contrato.gerado_em), "dd/MM/yyyy HH:mm")} />
              {contrato.enviado_em && <Campo titulo="Enviado em" valor={format(new Date(contrato.enviado_em), "dd/MM/yyyy HH:mm")} />}
              {contrato.visualizado_em && <Campo titulo="Visualizado em" valor={format(new Date(contrato.visualizado_em), "dd/MM/yyyy 'às' HH:mm")} />}
              {contrato.assinado_em && <Campo titulo="Assinado em" valor={format(new Date(contrato.assinado_em), "dd/MM/yyyy 'às' HH:mm")} />}
              {contrato.motivo_cancelamento && <Campo titulo="Motivo do cancelamento" valor={contrato.motivo_cancelamento} />}
              {contrato.transacao_externa_id && <Campo titulo="Transação externa" valor={contrato.transacao_externa_id} />}
            </CardContent>
          </Card>

          {["ENVIADO", "VISUALIZADO"].includes(contrato.status) && (
            <Card className="border-dashed border-slate-300 shadow-none">
              <CardContent className="p-5 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Retorno da integração de assinatura</p>
                <p className="text-xs text-slate-500">Enquanto a integração externa não estiver conectada, registre manualmente o retorno recebido do provedor.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="text-teal-700" onClick={() => acao(() => retorno({ data: { contratoId: id, evento: "ASSINADO" } }), "Assinatura registrada.")}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Assinado
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => acao(() => retorno({ data: { contratoId: id, evento: "RECUSADO" } }), "Recusa registrada.")}>
                    Recusado
                  </Button>
                  <Button size="sm" variant="outline" className="text-orange-600" onClick={() => acao(() => retorno({ data: { contratoId: id, evento: "EXPIRADO" } }), "Expiração registrada.")}>
                    <RefreshCw className="mr-1 h-3 w-3" /> Expirado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><History className="h-3 w-3" /> Histórico do contrato</p>
              <div className="space-y-5">
                {eventos.map((e: any) => (
                  <div key={e.id} className="relative pl-5 border-l border-slate-100">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-500" />
                    <p className="text-[11px] font-bold text-slate-400">{format(new Date(e.criado_em), "dd/MM/yyyy — HH:mm")}</p>
                    <p className="text-sm text-slate-700 font-medium">{e.descricao}</p>
                  </div>
                ))}
                {eventos.length === 0 && <p className="text-sm text-slate-400 italic">Sem eventos registrados.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal envio */}
      {modalEnvio && (
        <Modal titulo="Enviar contrato" onClose={() => setModalEnvio(false)}>
          <p className="text-sm font-bold text-slate-800">Enviar contrato para {contrato.vendedor_nome}?</p>
          <div className="space-y-2">
            {CANAIS.map((c) => (
              <label key={c.valor} className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer", canais.includes(c.valor) ? "border-teal-500 bg-teal-50" : "border-slate-200")}>
                <input
                  type="checkbox"
                  checked={canais.includes(c.valor)}
                  onChange={(e) => setCanais((prev) => (e.target.checked ? [...prev, c.valor] : prev.filter((x) => x !== c.valor)))}
                />
                <c.icon className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">{c.label}</span>
              </label>
            ))}
          </div>
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
            disabled={canais.length === 0}
            onClick={async () => {
              await acao(() => enviar({ data: { contratoId: id, canais, autorId: user?.id, autorNome: user?.nome } }), "Contrato enviado.");
              setModalEnvio(false);
            }}
          >
            Enviar contrato
          </Button>
        </Modal>
      )}

      {/* Modal cancelamento */}
      {modalCancelar && (
        <Modal titulo="Cancelar contrato" onClose={() => setModalCancelar(false)}>
          <p className="text-sm font-bold text-slate-800">Deseja realmente cancelar este contrato?</p>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Motivo do cancelamento</label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Observação interna</label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} />
          </div>
          <Button
            variant="destructive"
            className="w-full font-bold"
            disabled={motivo.trim().length < 3}
            onClick={async () => {
              await acao(() => cancelar({ data: { contratoId: id, motivo, observacao, autorId: user?.id, autorNome: user?.nome } }), "Contrato cancelado.");
              setModalCancelar(false);
            }}
          >
            Confirmar cancelamento
          </Button>
        </Modal>
      )}

      {/* Tela cheia */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 p-6 overflow-auto">
          <div className="flex justify-end mb-4">
            <Button variant="secondary" onClick={() => setFullscreen(false)}>Fechar</Button>
          </div>
          <pre className="bg-white mx-auto p-12 whitespace-pre-wrap font-serif text-slate-800 max-w-3xl rounded">{contrato.conteudo}</pre>
        </div>
      )}
    </div>
  );
}

function Campo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className="font-semibold text-slate-800">{valor}</p>
    </div>
  );
}

function Modal({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black text-slate-950">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
