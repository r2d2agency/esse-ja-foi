import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { iniciarPagamentoFn, verificarPagamentoFn, getComprovanteFn } from "@/lib/pagamentos.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PrazoPagamento, brl } from "@/components/negociacao/prazo-pagamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/comprador/pagamento/$id")({
  head: () => ({
    meta: [
      { title: "Pagamento da negociação | Esse Já Foi" },
      { name: "description", content: "Conclua o pagamento via Pix da negociação vencida, com QR Code, Pix Copia e Cola e prazo em tempo real." },
    ],
  }),
  component: PagamentoComprador,
});

function PagamentoComprador() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiado, setCopiado] = useState(false);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["pagamento", id, user?.id],
    queryFn: async () => (await iniciarPagamentoFn({ data: { negociacao_id: id, comprador_id: user!.id } })) as any,
    enabled: !!user?.id,
    retry: false,
    refetchInterval: (q) => ((q.state.data as any)?.cobranca?.status === "PAGO" ? false : 15000),
  });

  const verificar = useMutation({
    mutationFn: () => verificarPagamentoFn({ data: data.cobranca.id }),
    onSuccess: (r: any) => {
      if (r?.status === "PAGO") toast.success("Pagamento confirmado!");
      else toast.info("Estamos verificando a confirmação junto à instituição financeira.");
      queryClient.invalidateQueries({ queryKey: ["pagamento", id] });
    },
  });

  const { data: comprovante } = useQuery({
    queryKey: ["comprovante", data?.cobranca?.id],
    queryFn: async () => (await getComprovanteFn({ data: { cobranca_id: data.cobranca.id, comprador_id: user!.id } })) as any,
    enabled: comprovanteAberto && !!data?.cobranca?.id && !!user?.id,
  });

  if (isLoading) {
    return <div className="flex flex-col items-center gap-3 p-16 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /> Gerando seu pagamento...</div>;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <p className="font-bold text-slate-800">Não foi possível gerar o pagamento agora. Tente novamente em alguns instantes.</p>
        <Button onClick={() => refetch()} className="bg-slate-900 font-bold">
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const neg = data?.negociacao;
  const cob = data?.cobranca;
  const pago = cob?.status === "PAGO" || neg?.status === "PAGAMENTO_CONFIRMADO";
  const expirado = !cob && (neg?.status === "PAGAMENTO_NAO_REALIZADO");

  const copiar = async () => {
    await navigator.clipboard.writeText(cob.copia_e_cola);
    setCopiado(true);
    toast.success("Código Pix copiado");
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pagamento da negociação</p>
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{neg?.titulo}</h1>
        <p className="text-xs font-bold text-slate-400">{neg?.codigo_publico} • {neg?.codigo}</p>
      </header>

      {pago ? (
        <Card className="border-emerald-200">
          <CardContent className="space-y-5 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-7 w-7" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Pagamento confirmado</p>
            <p className="text-4xl font-black text-slate-900">{brl(cob?.valor_recebido ?? neg?.valor_venda)}</p>
            <p className="text-sm font-medium text-slate-600">
              Recebemos o pagamento desta negociação. Agora vamos seguir para a etapa de entrega do veículo.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" className="font-bold" onClick={() => setComprovanteAberto(true)}>Ver comprovante</Button>
              <Button className="bg-teal-600 font-bold hover:bg-teal-700" onClick={() => navigate({ to: "/comprador/negociacoes" })}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : expirado ? (
        <Card className="border-red-200">
          <CardContent className="space-y-3 p-8 text-center">
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Prazo encerrado</h2>
            <p className="font-bold text-slate-700">O prazo para pagamento desta negociação terminou.</p>
            <p className="text-sm text-slate-500">Aguarde uma atualização da equipe Esse Já Foi.</p>
          </CardContent>
        </Card>
      ) : cob ? (
        <>
          <Card className="border-slate-200">
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valor da compra</p>
                <p className="text-4xl font-black text-slate-900">{brl(neg.valor_venda)}</p>
                <span className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  Aguardando pagamento
                </span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">Pague com Pix</p>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <QRCodeSVG value={cob.copia_e_cola} size={220} level="M" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pix Copia e Cola</p>
                <div className="rounded-xl bg-slate-50 p-3 font-mono text-[11px] leading-relaxed break-all text-slate-500 select-all">
                  {cob.copia_e_cola}
                </div>
                <Button onClick={copiar} className="h-14 w-full bg-slate-900 text-base font-black uppercase tracking-tight hover:bg-slate-800">
                  {copiado ? <><Check className="mr-2 h-5 w-5" /> Código Pix copiado</> : <><Copy className="mr-2 h-5 w-5" /> Copiar código Pix</>}
                </Button>
              </div>

              <PrazoPagamento prazo={cob.expira_em} servidorAgora={data.servidor_agora} />

              <Button
                variant="outline"
                className="h-12 w-full font-bold"
                disabled={verificar.isPending}
                onClick={() => verificar.mutate()}
              >
                {verificar.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando pagamento...</> : "Já fiz o pagamento"}
              </Button>
              {isFetching && <p className="text-center text-xs text-slate-400">Atualizando status automaticamente...</p>}
            </CardContent>
          </Card>

          <p className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> A confirmação é feita diretamente com a instituição financeira.
          </p>
        </>
      ) : (
        <Card><CardContent className="p-8 text-center text-slate-500">Não há pagamento pendente nesta negociação.</CardContent></Card>
      )}

      <Dialog open={comprovanteAberto} onOpenChange={setComprovanteAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Comprovante de pagamento</DialogTitle></DialogHeader>
          {!comprovante ? (
            <p className="text-sm text-slate-500">Carregando comprovante...</p>
          ) : (
            <div className="space-y-3 text-sm">
              <Linha rotulo="Negociação" valor={comprovante.codigo} />
              <Linha rotulo="Veículo" valor={`${comprovante.titulo} (${comprovante.codigo_publico})`} />
              <Linha rotulo="Comprador" valor={comprovante.comprador_nome} />
              <Linha rotulo="Valor" valor={brl(comprovante.valor_recebido ?? comprovante.valor_esperado)} />
              <Linha rotulo="Data e hora" valor={format(new Date(comprovante.confirmado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              <Linha rotulo="Forma" valor={comprovante.forma} />
              <Linha rotulo="Status" valor="Pago" />
              <Linha rotulo="Transação" valor={comprovante.id_externo} />
              <Button disabled variant="outline" className="w-full font-bold">Baixar comprovante (em breve)</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{rotulo}</span>
      <span className="text-right font-bold text-slate-800">{valor || "—"}</span>
    </div>
  );
}
