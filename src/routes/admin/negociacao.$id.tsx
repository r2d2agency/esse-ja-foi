import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNegociacaoFn, cancelarNegociacaoFn } from "@/lib/negociacoes.functions";
import { confirmarPagamentoManualFn } from "@/lib/pagamentos.functions";
import { useAuth } from "@/hooks/use-auth";
import { useState, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Ban, Trophy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PrazoPagamento, STATUS_LABEL, STATUS_CLASSE, brl } from "@/components/negociacao/prazo-pagamento";

export const Route = createFileRoute("/admin/negociacao/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da negociação | Esse Já Foi" },
      { name: "description", content: "Valores, prazo de pagamento, vencedor e histórico completo da negociação." },
    ],
  }),
  component: AdminNegociacaoDetalhe,
});

function AdminNegociacaoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [msgComprador, setMsgComprador] = useState("");
  const [msgVendedor, setMsgVendedor] = useState("");
  const [aberto, setAberto] = useState(false);
  const [abertoManual, setAbertoManual] = useState(false);
  const [valorManual, setValorManual] = useState("");
  const [refManual, setRefManual] = useState("");

  const { data: n, isLoading } = useQuery({
    queryKey: ["admin-negociacao", id],
    queryFn: async () => (await getNegociacaoFn({ data: id })) as any,
    refetchInterval: 30000,
  });

  const cancelar = useMutation({
    mutationFn: () =>
      cancelarNegociacaoFn({
        data: { id, motivo, mensagem_comprador: msgComprador || undefined, mensagem_vendedor: msgVendedor || undefined, admin_id: user!.id },
      }),
    onSuccess: () => {
      toast.success("Negociação cancelada. Histórico preservado.");
      setAberto(false);
      queryClient.invalidateQueries({ queryKey: ["admin-negociacao", id] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível cancelar."),
  });

  const confirmarManual = useMutation({
    mutationFn: () =>
      confirmarPagamentoManualFn({
        data: {
          negociacao_id: id,
          valor: Number(valorManual),
          referencia: refManual,
          admin_id: user!.id,
        },
      }),
    onSuccess: () => {
      toast.success("Pagamento manual confirmado com sucesso.");
      setAbertoManual(false);
      queryClient.invalidateQueries({ queryKey: ["admin-negociacao", id] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao confirmar pagamento manual."),
  });

  if (isLoading) return <div className="p-8 text-slate-500">Carregando negociação...</div>;
  if (!n) return <div className="p-8 text-red-600">Negociação não encontrada.</div>;

  const ranking: any[] = Array.isArray(n.ranking) ? n.ranking : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin/negociacoes" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{n.codigo}</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{n.titulo} • {n.codigo_publico}</p>
        </div>
        <Badge className={STATUS_CLASSE[n.status]}>{STATUS_LABEL[n.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-black uppercase text-slate-400">Resumo da negociação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6 pt-6 md:grid-cols-3">
              <Info label="Veículo" valor={String(n.titulo ?? "")} sub={n.codigo_publico ?? undefined} />
              <Info label="Vendedor" valor={String(n.vendedor_nome ?? "")} />
              <Info label="Comprador vencedor" valor={String(n.comprador_nome ?? "")} />
              <Info label="Lance vencedor" valor={brl(n.valor_venda)} destaque />
              <Info label="Comissão prevista" valor={brl(n.valor_comissao)} />
              <Info label="Valor previsto ao vendedor" valor={brl(n.valor_previsto_vendedor)} />
              <Info label="Status" valor={STATUS_LABEL[n.status] ?? n.status} />
              <Info label="Prazo" valor={format(new Date(n.prazo_pagamento_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              <Info label="Criada em" valor={format(new Date(n.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-black uppercase text-slate-400">Histórico da negociação</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative space-y-5 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-slate-100">
                {(n.timeline || []).map((t: any, i: number) => (
                  <div key={i} className="relative pl-8">
                    <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-teal-500" />
                    <span className="text-[10px] font-bold text-slate-400">
                      {format(new Date(t.criado_em), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </span>
                    <p className="text-sm font-bold text-slate-700">{t.evento}</p>
                    {t.detalhe && <p className="text-xs text-slate-500">{t.detalhe}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                <Trophy className="h-3.5 w-3.5" /> Ranking final dos lances (uso interno)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              {ranking.length === 0 && <p className="text-sm italic text-slate-400">Ranking indisponível.</p>}
              {ranking.map((r) => (
                <div key={r.posicao} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm">
                  <span className="font-bold text-slate-600">{r.posicao}º — {r.nome}</span>
                  <span className="font-mono font-bold text-slate-800">{brl(r.valor)}</span>
                </div>
              ))}
              <p className="pt-2 text-[11px] font-medium text-slate-400">
                O segundo colocado não é promovido automaticamente em caso de inadimplência.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {n.status === "AGUARDANDO_PAGAMENTO" && <PrazoPagamento prazo={n.prazo_pagamento_em} servidorAgora={n.servidor_agora} />}

          <Card className="border-slate-200 bg-slate-50 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase text-slate-500">Ações administrativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={aberto} onOpenChange={setAberto}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={n.status === "CANCELADA"} className="w-full border-red-100 font-bold text-red-600 hover:bg-red-50">
                    <Ban className="mr-2 h-4 w-4" /> Cancelar negociação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cancelar negociação {n.codigo}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Motivo interno (obrigatório)</Label>
                      <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Mensagem ao comprador</Label>
                      <Textarea value={msgComprador} onChange={(e) => setMsgComprador(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Mensagem ao vendedor</Label>
                      <Textarea value={msgVendedor} onChange={(e) => setMsgVendedor(e.target.value)} rows={2} />
                    </div>
                    <p className="text-[11px] font-medium text-slate-400">A negociação nunca é apagada: o histórico permanece registrado.</p>
                  </div>
                  <DialogFooter>
                    <Button disabled={motivo.trim().length < 3 || cancelar.isPending} onClick={() => cancelar.mutate()} className="bg-red-600 font-bold hover:bg-red-700">
                      Confirmar cancelamento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={abertoManual} onOpenChange={setAbertoManual}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={n.status !== "AGUARDANDO_PAGAMENTO" && n.status !== "PAGAMENTO_NAO_REALIZADO"} 
                    className="w-full border-teal-100 font-bold text-teal-600 hover:bg-teal-50"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Baixa manual (TED/Pix externo)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Baixa Manual - {n.codigo}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">Use esta opção somente se o cliente já pagou por fora da plataforma.</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Valor Recebido (R$)</Label>
                      <Input 
                        type="number" 
                        value={valorManual} 
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setValorManual(e.target.value)} 
                        placeholder={String(n.valor_venda)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Referência / Comprovante</Label>
                      <Input 
                        value={refManual} 
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setRefManual(e.target.value)} 
                        placeholder="Ex: TED Banco X - 12/08" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      disabled={!valorManual || !refManual || confirmarManual.isPending} 
                      onClick={() => confirmarManual.mutate()} 
                      className="bg-teal-600 font-bold hover:bg-teal-700"
                    >
                      Confirmar Recebimento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {n.motivo_cancelamento && (
                <div className="rounded-lg border border-red-100 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase text-red-500">Motivo do cancelamento</p>
                  <p className="text-sm text-slate-700">{n.motivo_cancelamento}</p>
                </div>
              )}
              <p className="text-[11px] font-medium text-slate-400">
                Resultado imutável: valor, horário e vencedor não podem ser alterados. Exceções exigem procedimento auditado.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, valor, sub, destaque }: { label: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={destaque ? "text-lg font-black text-teal-700" : "text-sm font-bold text-slate-800"}>{valor}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
