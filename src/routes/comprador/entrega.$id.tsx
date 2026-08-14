import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getEntregaCompradorFn, confirmarAgendamentoFn, solicitarReagendamentoFn,
  confirmarRecebimentoFn, registrarDivergenciaFn,
} from "@/lib/entregas.functions";
import { useAuth } from "@/hooks/use-auth";
import { StatusEntrega, ITENS_CHECKLIST, MOTIVOS_DIVERGENCIA } from "@/components/entrega/status-entrega";
import { FotoSlot } from "@/components/veiculo/FotoSlot";
import { brl } from "@/components/negociacao/prazo-pagamento";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, KeyRound, Check, Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/comprador/entrega/$id")({
  head: () => ({
    meta: [
      { title: "Recebimento do veículo | Esse Já Foi" },
      { name: "description", content: "Confirme o horário, use seu código de entrega e confirme o recebimento do veículo arrematado." },
    ],
  }),
  component: EntregaComprador,
});

function EntregaComprador() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [divergindo, setDivergindo] = useState(false);
  const [motivoDiv, setMotivoDiv] = useState(MOTIVOS_DIVERGENCIA[0]!);
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<(string | null)[]>([null, null]);
  const [pedindo, setPedindo] = useState(false);
  const [motivo, setMotivo] = useState("");

  const { data: e, isLoading } = useQuery({
    queryKey: ["entrega-comprador", id],
    queryFn: async () => (await getEntregaCompradorFn({ data: { entrega_id: id, comprador_id: user!.id } })) as any,
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["entrega-comprador", id] });

  const confirmarHorario = useMutation({
    mutationFn: () => confirmarAgendamentoFn({ data: { entrega_id: id, papel: "COMPRADOR", autor_id: user!.id } }),
    onSuccess: () => { toast.success("Horário confirmado."); invalidar(); },
  });
  const reagendar = useMutation({
    mutationFn: () => solicitarReagendamentoFn({ data: { entrega_id: id, papel: "COMPRADOR", motivo, autor_id: user!.id } }),
    onSuccess: () => { toast.success("Solicitação enviada."); setPedindo(false); setMotivo(""); invalidar(); },
  });
  const confirmarReceb = useMutation({
    mutationFn: () => confirmarRecebimentoFn({ data: { entrega_id: id, comprador_id: user!.id } }),
    onSuccess: () => { toast.success("Recebimento confirmado."); setConfirmando(false); invalidar(); },
    onError: (err: any) => toast.error(err?.message || "Não foi possível confirmar."),
  });
  const divergir = useMutation({
    mutationFn: () =>
      registrarDivergenciaFn({
        data: {
          entrega_id: id, comprador_id: user!.id, motivo: motivoDiv, descricao,
          fotos: fotos.filter(Boolean).map((u) => ({ url: u as string })),
        },
      }),
    onSuccess: () => { toast.success("Divergência enviada para análise."); setDivergindo(false); invalidar(); },
    onError: (err: any) => toast.error(err?.message),
  });

  if (isLoading) return <div className="flex items-center gap-2 p-10 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  if (!e) return <p className="p-10 text-center text-sm text-slate-500">Entrega não encontrada.</p>;

  const dataFmt = e.data_entrega ? format(new Date(`${String(e.data_entrega).slice(0, 10)}T12:00:00`), "dd/MM/yyyy", { locale: ptBR }) : null;
  const concluida = e.status === "ENTREGA_CONFIRMADA" || e.status === "LIBERADO_PARA_REPASSE";

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-28">
      <Link to="/comprador/negociacoes" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="rounded-3xl bg-slate-900 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Recebimento do veículo</p>
        <h1 className="text-xl font-black">{e.veiculo_titulo}</h1>
        <p className="text-sm font-bold text-white/60">{e.negociacao_codigo} • {brl(e.valor_venda)}</p>
        <div className="mt-3"><StatusEntrega status={e.status} /></div>
      </div>

      {concluida ? (
        <div className="space-y-2 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-lg font-black text-emerald-800">Veículo recebido</p>
          <p className="text-sm font-bold text-emerald-700">✓ Entrega concluída</p>
          <p className="text-sm text-emerald-700">Valor pago: {brl(e.valor_venda)}{dataFmt ? ` • ${dataFmt}` : ""}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Status: Compra concluída</p>
          <Button asChild variant="outline" className="mt-2 font-bold"><Link to="/comprador/negociacoes">Ver detalhes da negociação</Link></Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-teal-600" /> {dataFmt || "Aguardando agendamento"}</p>
            {e.hora_inicio && <p className="text-sm font-bold text-slate-600">{String(e.hora_inicio).slice(0, 5)} às {String(e.hora_fim).slice(0, 5)}</p>}
            {e.data_entrega && !e.confirmado_comprador_em && (
              <div className="flex flex-col gap-2">
                <Button className="h-12 bg-teal-600 font-black" onClick={() => confirmarHorario.mutate()}>Confirmar horário</Button>
                <Button variant="ghost" className="font-bold" onClick={() => setPedindo(true)}>Solicitar alteração</Button>
              </div>
            )}
            {e.confirmado_comprador_em && <p className="flex items-center gap-1 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" /> Horário confirmado</p>}
          </div>

          {e.codigo && (
            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700"><KeyRound className="h-4 w-4" /> Seu código de entrega</p>
              <p className="my-2 text-4xl font-black tracking-[0.3em] text-slate-900">{e.codigo}</p>
              <p className="text-sm font-bold text-amber-800">Informe este código ao vendedor somente no momento da entrega.</p>
            </div>
          )}

          {e.registrada_em && (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-slate-900">Confirme o recebimento</h2>
              <p className="text-sm text-slate-600">O vendedor registrou a entrega. Confira o veículo e confirme o recebimento.</p>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p><strong>Veículo:</strong> {e.veiculo_titulo}</p>
                <p><strong>Quilometragem registrada:</strong> {e.km_entrega} km</p>
                <p><strong>Data:</strong> {format(new Date(e.registrada_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                <ul className="mt-2 space-y-1">
                  {ITENS_CHECKLIST.filter((i) => e.checklist?.[i.chave]).map((i) => (
                    <li key={i.chave} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> {i.rotulo}</li>
                  ))}
                </ul>
              </div>
              {!!e.fotos?.length && (
                <div className="grid grid-cols-3 gap-2">
                  {e.fotos.map((f: any, i: number) => (
                    <img key={i} src={f.url} alt={`Foto da entrega — ${f.categoria}`} className="h-24 w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <Button className="h-14 w-full bg-teal-600 text-base font-black" onClick={() => setConfirmando(true)}>Recebi e está tudo certo</Button>
              <Button variant="outline" className="h-12 w-full border-red-200 font-bold text-red-600" onClick={() => setDivergindo(true)}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Existe uma divergência
              </Button>
            </div>
          )}

          {e.status === "DIVERGENCIA_NA_ENTREGA" && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-black text-red-800">Divergência em análise</p>
              <p className="text-sm text-red-700">{e.divergencia_motivo} — nossa equipe entrará em contato.</p>
            </div>
          )}
        </>
      )}

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar recebimento?</DialogTitle></DialogHeader>
          <label className="flex items-start gap-3">
            <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(!!v)} />
            <span className="text-sm font-bold text-slate-700">Confirmo que recebi o veículo e os itens registrados na entrega.</span>
          </label>
          <DialogFooter>
            <Button className="bg-teal-600 font-black" disabled={!aceite || confirmarReceb.isPending} onClick={() => confirmarReceb.mutate()}>Confirmar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={divergindo} onOpenChange={setDivergindo}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Qual o problema?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={motivoDiv} onValueChange={setMotivoDiv}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOTIVOS_DIVERGENCIA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={descricao} onChange={(ev) => setDescricao(ev.target.value)} placeholder="Descreva o que aconteceu" />
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((f, i) => (
                <FotoSlot key={i} label={`Foto ${i + 1}`} value={f} onChange={(url) => setFotos(fotos.map((x, j) => (j === i ? url : x)))} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-slate-900 font-bold" disabled={descricao.trim().length < 5 || divergir.isPending} onClick={() => divergir.mutate()}>Enviar para análise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pedindo} onOpenChange={setPedindo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar alteração</DialogTitle></DialogHeader>
          <Textarea value={motivo} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Conte o que precisa ser ajustado." />
          <DialogFooter>
            <Button className="bg-slate-900 font-bold" disabled={motivo.trim().length < 3} onClick={() => reagendar.mutate()}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
