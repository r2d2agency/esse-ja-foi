import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getEntregaVendedorFn, confirmarAgendamentoFn, solicitarReagendamentoFn,
  iniciarEntregaFn, registrarChegadaFn, validarCodigoFn, registrarEntregaFn,
} from "@/lib/entregas.functions";
import { useAuth } from "@/hooks/use-auth";
import { StatusEntrega, ITENS_CHECKLIST } from "@/components/entrega/status-entrega";
import { FotoSlot } from "@/components/veiculo/FotoSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, MapPin, KeyRound, Check, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/vendedor/entrega/$id")({
  head: () => ({
    meta: [
      { title: "Entrega do seu veículo | Esse Já Foi" },
      { name: "description", content: "Confirme o horário, inicie a entrega, valide o código do comprador e registre a entrega do veículo." },
    ],
  }),
  component: EntregaVendedor,
});

const FOTOS = [
  { categoria: "LOCAL", rotulo: "Veículo no local da entrega", obrigatoria: true },
  { categoria: "PAINEL", rotulo: "Painel / quilometragem", obrigatoria: true },
  { categoria: "FRENTE", rotulo: "Frente ou lateral do veículo", obrigatoria: true },
  { categoria: "COMPLEMENTAR", rotulo: "Foto complementar (opcional)" },
];

function EntregaVendedor() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState("");
  const [km, setKm] = useState("");
  const [check, setCheck] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<Record<string, string | null>>({});
  const [confirmo, setConfirmo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pedindo, setPedindo] = useState(false);

  const { data: e, isLoading } = useQuery({
    queryKey: ["entrega-vendedor", id],
    queryFn: async () => (await getEntregaVendedorFn({ data: { entrega_id: id, vendedor_id: user!.id } })) as any,
    enabled: !!user?.id,
    refetchInterval: 20000,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["entrega-vendedor", id] });

  const confirmar = useMutation({
    mutationFn: () => confirmarAgendamentoFn({ data: { entrega_id: id, papel: "VENDEDOR", autor_id: user!.id } }),
    onSuccess: () => { toast.success("Horário confirmado."); invalidar(); },
  });
  const reagendar = useMutation({
    mutationFn: () => solicitarReagendamentoFn({ data: { entrega_id: id, papel: "VENDEDOR", motivo, autor_id: user!.id } }),
    onSuccess: () => { toast.success("Solicitação enviada à equipe."); setPedindo(false); setMotivo(""); invalidar(); },
  });
  const iniciar = useMutation({
    mutationFn: async () => {
      const coords = await new Promise<{ lat?: number; lng?: number }>((resolve) => {
        if (!navigator.geolocation) return resolve({});
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve({}),
          { timeout: 5000 },
        );
      });
      return iniciarEntregaFn({ data: { entrega_id: id, vendedor_id: user!.id, ...coords } });
    },
    onSuccess: () => { toast.success("Entrega iniciada."); invalidar(); },
  });
  const chegada = useMutation({
    mutationFn: () => registrarChegadaFn({ data: { entrega_id: id, vendedor_id: user!.id } }),
    onSuccess: () => { toast.success("Chegada registrada."); invalidar(); },
  });
  const validar = useMutation({
    mutationFn: () => validarCodigoFn({ data: { entrega_id: id, vendedor_id: user!.id, codigo } }),
    onSuccess: (r: any) => {
      if (r?.ok) { toast.success("Código confirmado."); setCodigo(""); invalidar(); }
      else if (r?.bloqueado) toast.error("Tentativas excedidas. Solicite um novo código à equipe.");
      else if (r?.expirado) toast.error("Código expirado. Solicite um novo código à equipe.");
      else toast.error("Código inválido. Confira com o comprador e tente novamente.");
      invalidar();
    },
  });
  const registrar = useMutation({
    mutationFn: () =>
      registrarEntregaFn({
        data: {
          entrega_id: id, vendedor_id: user!.id, km_entrega: Number(km.replace(/\D/g, "")),
          checklist: check,
          fotos: FOTOS.filter((f) => fotos[f.categoria]).map((f) => ({ categoria: f.categoria, url: fotos[f.categoria]! })),
        },
      }),
    onSuccess: () => { toast.success("Entrega registrada. Aguardando confirmação do comprador."); invalidar(); },
    onError: (err: any) => toast.error(err?.message || "Não foi possível registrar a entrega."),
  });

  if (isLoading) return <div className="flex items-center gap-2 p-10 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  if (!e) return <p className="p-10 text-center text-sm text-slate-500">Entrega não encontrada.</p>;

  const codigoOk = !!e.codigo_validado_em;
  const obrigatoriasOk = FOTOS.filter((f) => f.obrigatoria).every((f) => fotos[f.categoria]);
  const checklistOk = ITENS_CHECKLIST.filter((i) => i.obrigatorio).every((i) => check[i.chave]);
  const podeRegistrar = codigoOk && obrigatoriasOk && checklistOk && Number(km.replace(/\D/g, "")) > 0 && confirmo;
  const dataFmt = e.data_entrega ? format(new Date(`${String(e.data_entrega).slice(0, 10)}T12:00:00`), "dd 'de' MMMM", { locale: ptBR }) : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-28">
      <Link to="/vendedor/veiculos" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="rounded-3xl bg-slate-900 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Entrega do seu veículo</p>
        <h1 className="text-xl font-black">{e.veiculo_titulo}</h1>
        <p className="text-sm font-bold text-white/60">{e.placa}</p>
        <div className="mt-3"><StatusEntrega status={e.status} /></div>
      </div>

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-teal-600" /> {dataFmt || "Aguardando agendamento"}</p>
        {e.hora_inicio && <p className="text-sm font-bold text-slate-600">{String(e.hora_inicio).slice(0, 5)} às {String(e.hora_fim).slice(0, 5)}</p>}
        <div className="flex gap-2 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>
            <strong className="block text-slate-900">{e.local_nome || "Local a definir"}</strong>
            {[e.endereco, e.numero].filter(Boolean).join(", ")}<br />
            {[e.bairro, e.cidade, e.uf].filter(Boolean).join(" • ")}
            {e.responsavel_recebimento && <><br />Falar com {e.responsavel_recebimento}{e.telefone_contato ? ` • ${e.telefone_contato}` : ""}</>}
          </span>
        </div>
        {e.orientacao && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{e.orientacao}</p>}

        {e.data_entrega && !e.confirmado_vendedor_em && (
          <div className="flex flex-col gap-2 pt-2">
            <Button className="h-12 bg-teal-600 font-black" onClick={() => confirmar.mutate()}>Confirmar entrega</Button>
            <Button variant="ghost" className="font-bold" onClick={() => setPedindo(true)}>Preciso alterar o horário</Button>
          </div>
        )}
        {e.confirmado_vendedor_em && <p className="flex items-center gap-1 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" /> Você confirmou o horário</p>}
      </div>

      {e.confirmado_vendedor_em && !e.registrada_em && (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Entrega de hoje</h2>
          {!e.iniciada_em ? (
            <Button className="h-14 w-full bg-slate-900 text-base font-black" onClick={() => iniciar.mutate()}>Iniciar entrega</Button>
          ) : !e.chegada_em ? (
            <Button className="h-14 w-full bg-slate-900 text-base font-black" onClick={() => chegada.mutate()}>Cheguei ao local</Button>
          ) : !codigoOk ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><KeyRound className="h-4 w-4 text-amber-600" /> Solicite ao comprador o código de entrega para continuar.</p>
              <Input
                inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000"
                value={codigo} onChange={(ev) => setCodigo(ev.target.value.replace(/\D/g, ""))}
                className="h-16 text-center text-3xl font-black tracking-[0.4em]"
              />
              <Button className="h-14 w-full bg-teal-600 text-base font-black" disabled={codigo.length !== 6 || validar.isPending} onClick={() => validar.mutate()}>
                Validar código
              </Button>
              {e.codigo_bloqueado && <p className="text-sm font-bold text-red-600">Tentativas excedidas. A equipe precisa gerar um novo código.</p>}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> Código confirmado. Agora confira os itens da entrega com o comprador.
            </p>
          )}
        </div>
      )}

      {codigoOk && !e.registrada_em && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Checklist da entrega</h2>
          {ITENS_CHECKLIST.map((i) => (
            <label key={i.chave} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <Checkbox checked={!!check[i.chave]} onCheckedChange={(v) => setCheck({ ...check, [i.chave]: !!v })} />
              <span className="text-sm font-bold text-slate-700">{i.rotulo}{i.obrigatorio && <span className="text-red-500"> *</span>}</span>
            </label>
          ))}

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Quilometragem atual</Label>
            <Input inputMode="numeric" className="h-12 text-lg font-black" placeholder="43012" value={km} onChange={(ev) => setKm(ev.target.value.replace(/\D/g, ""))} />
            <p className="text-[11px] text-slate-400">Quilometragem na vistoria: {e.km_vistoria ?? "—"} km</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FOTOS.map((f) => (
              <FotoSlot
                key={f.categoria}
                label={f.rotulo}
                value={fotos[f.categoria] ?? null}
                onChange={(url) => setFotos({ ...fotos, [f.categoria]: url })}
              />
            ))}
          </div>

          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
            <Checkbox checked={confirmo} onCheckedChange={(v) => setConfirmo(!!v)} />
            <span className="text-sm font-bold text-slate-700">Confirmo que entreguei o veículo e os itens informados ao comprador.</span>
          </label>

          <Button className="h-14 w-full bg-teal-600 text-base font-black" disabled={!podeRegistrar || registrar.isPending} onClick={() => registrar.mutate()}>
            Registrar entrega
          </Button>
        </div>
      )}

      {e.registrada_em && e.status !== "ENTREGA_CONFIRMADA" && e.status !== "LIBERADO_PARA_REPASSE" && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-black text-amber-800">Entrega registrada</p>
          <p className="text-sm text-amber-700">Aguardando a confirmação de recebimento do comprador.</p>
        </div>
      )}

      {(e.status === "ENTREGA_CONFIRMADA" || e.status === "LIBERADO_PARA_REPASSE") && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">Veículo entregue</p>
          <p className="text-sm text-emerald-700">O comprador confirmou o recebimento. A negociação agora seguirá para a etapa de repasse.</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Status: Aguardando repasse</p>
        </div>
      )}

      <Dialog open={pedindo} onOpenChange={setPedindo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar alteração de horário</DialogTitle></DialogHeader>
          <Textarea value={motivo} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Conte o que precisa ser ajustado." />
          <DialogFooter>
            <Button className="bg-slate-900 font-bold" disabled={motivo.trim().length < 3} onClick={() => reagendar.mutate()}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
