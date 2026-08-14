import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listarEntregasAdminFn, getEntregaAdminFn, agendarEntregaFn, cancelarAgendamentoFn,
  registrarNaoComparecimentoFn, decidirDivergenciaFn, adicionarObservacaoEntregaFn, regerarCodigoFn,
} from "@/lib/entregas.functions";
import { useAuth } from "@/hooks/use-auth";
import { StatusEntrega, ROTULO_ENTREGA, ITENS_CHECKLIST } from "@/components/entrega/status-entrega";
import { brl } from "@/components/negociacao/prazo-pagamento";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, MapPin, KeyRound, AlertTriangle, Check } from "lucide-react";

export const Route = createFileRoute("/admin/entregas")({
  head: () => ({
    meta: [
      { title: "Entregas de veículos | Admin Esse Já Foi" },
      { name: "description", content: "Organize agendamentos, acompanhe entregas, código de confirmação, divergências e liberação para repasse." },
    ],
  }),
  component: AdminEntregas,
});

const ABAS = [
  { id: "agendamento", rotulo: "Aguardando agendamento", filtro: (e: any) => ["AGUARDANDO_AGENDAMENTO", "AGUARDANDO_ORGANIZACAO", "REAGENDAMENTO_SOLICITADO"].includes(e.status) },
  { id: "agendadas", rotulo: "Agendadas", filtro: (e: any) => ["ENTREGA_AGENDADA", "AGUARDANDO_ENTREGA", "EM_PROCESSO_DE_ENTREGA"].includes(e.status) },
  { id: "hoje", rotulo: "Hoje", filtro: (e: any) => e.data_entrega && String(e.data_entrega).slice(0, 10) === new Date().toISOString().slice(0, 10) },
  { id: "confirmacao", rotulo: "Aguardando confirmação", filtro: (e: any) => e.status === "AGUARDANDO_CONFIRMACAO_COMPRADOR" },
  { id: "divergencia", rotulo: "Com divergência", filtro: (e: any) => ["DIVERGENCIA_NA_ENTREGA", "NAO_COMPARECIMENTO_VENDEDOR", "NAO_COMPARECIMENTO_COMPRADOR"].includes(e.status) },
  { id: "concluidas", rotulo: "Concluídas", filtro: (e: any) => ["ENTREGA_CONFIRMADA", "LIBERADO_PARA_REPASSE"].includes(e.status) },
];

function AdminEntregas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [aberta, setAberta] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<null | "agendar" | "cancelar" | "ausencia" | "decisao">(null);
  const [ausenteParte, setAusenteParte] = useState<"VENDEDOR" | "COMPRADOR">("VENDEDOR");
  const [decisao, setDecisao] = useState("LIBERAR");
  const [texto, setTexto] = useState("");
  const [form, setForm] = useState<any>({ tipo_local: "COMPRADOR", hora_inicio: "14:00", hora_fim: "16:00" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-entregas"],
    queryFn: async () => (await listarEntregasAdminFn()) as any,
    refetchInterval: 30000,
  });

  const { data: detalhe } = useQuery({
    queryKey: ["admin-entrega", aberta],
    queryFn: async () => (await getEntregaAdminFn({ data: aberta! })) as any,
    enabled: !!aberta,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["admin-entregas"] });
    qc.invalidateQueries({ queryKey: ["admin-entrega"] });
  };
  const fechar = () => { setDialogo(null); setTexto(""); };

  const agendar = useMutation({
    mutationFn: () => agendarEntregaFn({ data: { ...form, entrega_id: aberta, admin_id: user!.id, motivo: texto || undefined } }),
    onSuccess: () => { toast.success("Entrega agendada."); fechar(); invalidar(); },
    onError: (e: any) => toast.error(e?.message || "Não foi possível agendar."),
  });
  const cancelar = useMutation({
    mutationFn: () => cancelarAgendamentoFn({ data: { entrega_id: aberta!, motivo: texto, admin_id: user!.id } }),
    onSuccess: () => { toast.success("Agendamento cancelado."); fechar(); invalidar(); },
    onError: (e: any) => toast.error(e?.message),
  });
  const ausencia = useMutation({
    mutationFn: () => registrarNaoComparecimentoFn({ data: { entrega_id: aberta!, parte: ausenteParte, observacao: texto, autor_id: user!.id } }),
    onSuccess: () => { toast.success("Registrado."); fechar(); invalidar(); },
    onError: (e: any) => toast.error(e?.message),
  });
  const decidir = useMutation({
    mutationFn: () => decidirDivergenciaFn({ data: { entrega_id: aberta!, decisao: decisao as any, observacao: texto, admin_id: user!.id } }),
    onSuccess: () => { toast.success("Decisão registrada."); fechar(); invalidar(); },
    onError: (e: any) => toast.error(e?.message),
  });
  const observar = useMutation({
    mutationFn: (t: string) => adicionarObservacaoEntregaFn({ data: { entrega_id: aberta!, texto: t, autor_id: user!.id } }),
    onSuccess: () => { toast.success("Observação registrada."); setTexto(""); invalidar(); },
  });
  const regerar = useMutation({
    mutationFn: () => regerarCodigoFn({ data: { entrega_id: aberta!, admin_id: user!.id } }),
    onSuccess: () => { toast.success("Novo código gerado para o comprador."); invalidar(); },
  });

  const lista: any[] = data?.lista || [];
  const ind = data?.indicadores || {};

  const abrirAgendamento = (e: any) => {
    setForm({
      tipo_local: e.tipo_local || "COMPRADOR",
      local_nome: e.local_nome || e.comprador_nome || "",
      cep: e.cep || "", endereco: e.endereco || "", numero: e.numero || "", complemento: e.complemento || "",
      bairro: e.bairro || "", cidade: e.cidade || e.comprador_cidade || "", uf: e.uf || e.comprador_uf || "",
      responsavel_recebimento: e.responsavel_recebimento || "", telefone_contato: e.telefone_contato || e.comprador_whatsapp || "",
      orientacao: e.orientacao || "",
      data_entrega: e.data_entrega ? String(e.data_entrega).slice(0, 10) : "",
      hora_inicio: e.hora_inicio || "14:00", hora_fim: e.hora_fim || "16:00",
    });
    setDialogo("agendar");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Entregas</h1>
        <p className="text-sm font-medium text-slate-500">Organize a entrega dos veículos com pagamento confirmado.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador rotulo="Aguardando agendamento" valor={ind.aguardando_agendamento} />
        <Indicador rotulo="Entregas de hoje" valor={ind.hoje} />
        <Indicador rotulo="Aguardando confirmação" valor={ind.aguardando_confirmacao} />
        <Indicador rotulo="Divergências" valor={ind.divergencias} />
        <Indicador rotulo="Liberados para repasse" valor={ind.liberadas_repasse} />
      </div>

      <Tabs defaultValue="agendamento">
        <TabsList className="flex flex-wrap bg-slate-100 p-1">
          {ABAS.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.rotulo}</TabsTrigger>)}
        </TabsList>
        {ABAS.map((a) => (
          <TabsContent key={a.id} value={a.id}>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center gap-2 p-10 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
                ) : (
                  <Tabela linhas={lista.filter(a.filtro)} onAbrir={setAberta} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Sheet open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>Detalhe da entrega</SheetTitle></SheetHeader>
          {!detalhe ? (
            <p className="p-4 text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="space-y-5 py-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{detalhe.negociacao_codigo}</p>
                <p className="text-lg font-black text-slate-900">{detalhe.veiculo_titulo}</p>
                <p className="text-sm font-bold text-slate-500">{detalhe.placa} • {brl(detalhe.valor_venda)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusEntrega status={detalhe.status} />
                  {detalhe.repasse_bloqueado && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Repasse bloqueado</span>}
                  {detalhe.repasse_liberado && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Liberado para repasse</span>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Bloco titulo="Vendedor" linhas={[detalhe.vendedor_nome, detalhe.vendedor_whatsapp]} />
                <Bloco titulo="Comprador" linhas={[detalhe.comprador_nome, detalhe.responsavel_recebimento, detalhe.telefone_contato]} />
                <Bloco titulo="Local" linhas={[detalhe.local_nome, [detalhe.endereco, detalhe.numero].filter(Boolean).join(", "), [detalhe.bairro, detalhe.cidade, detalhe.uf].filter(Boolean).join(" • ")]} />
                <Bloco titulo="Data" linhas={[detalhe.data_entrega ? format(new Date(`${String(detalhe.data_entrega).slice(0, 10)}T12:00:00`), "dd/MM/yyyy", { locale: ptBR }) : "A agendar", detalhe.hora_inicio ? `${String(detalhe.hora_inicio).slice(0, 5)} às ${String(detalhe.hora_fim).slice(0, 5)}` : null]} />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500"><KeyRound className="h-4 w-4" /> Código de entrega</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{detalhe.codigo_gerado ? "Código gerado" : "Ainda não gerado"} {detalhe.codigo_validado_em && "• validado"}</p>
                <p className="text-xs text-slate-500">Visível apenas ao comprador. Tentativas inválidas: {detalhe.codigo_tentativas}{detalhe.codigo_bloqueado && " • bloqueado"}</p>
                <Button size="sm" variant="outline" className="mt-2 font-bold" onClick={() => regerar.mutate()}>Gerar novo código</Button>
              </div>

              {detalhe.registrada_em && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Registro do vendedor</p>
                  <p className="text-sm font-bold text-slate-800">Quilometragem: {detalhe.km_entrega} km {detalhe.km_conferencia && <span className="text-amber-600">⚠ Necessita conferência</span>}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {ITENS_CHECKLIST.filter((i) => detalhe.checklist?.[i.chave]).map((i) => (
                      <li key={i.chave} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> {i.rotulo}</li>
                    ))}
                  </ul>
                  {!!detalhe.fotos?.length && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {detalhe.fotos.map((f: any, i: number) => (
                        <img key={i} src={f.url} alt={`Evidência da entrega — ${f.categoria}`} className="h-24 w-full rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detalhe.status === "DIVERGENCIA_NA_ENTREGA" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-700"><AlertTriangle className="h-4 w-4" /> Divergência</p>
                  <p className="text-sm font-bold text-slate-800">{detalhe.divergencia_motivo}</p>
                  <p className="text-sm text-slate-700">{detalhe.divergencia_descricao}</p>
                  <Button size="sm" className="mt-3 bg-slate-900 font-bold" onClick={() => setDialogo("decisao")}>Analisar</Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button className="bg-slate-900 font-bold" onClick={() => abrirAgendamento(detalhe)}>
                  {detalhe.data_entrega ? "Reagendar entrega" : "Organizar entrega"}
                </Button>
                <Button variant="outline" className="font-bold" onClick={() => setDialogo("cancelar")}>Cancelar agendamento</Button>
                <Button variant="outline" className="font-bold" onClick={() => setDialogo("ausencia")}>Registrar não comparecimento</Button>
                <Button asChild variant="ghost" className="font-bold">
                  <Link to="/admin/negociacao/$id" params={{ id: detalhe.negociacao_id }}>Ver negociação</Link>
                </Button>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Histórico da entrega</p>
                <div className="space-y-2 border-l-2 border-slate-100 pl-4">
                  {(detalhe.eventos || []).map((ev: any, i: number) => (
                    <div key={i}>
                      <p className="text-sm font-bold text-slate-800">{ev.evento}</p>
                      {ev.detalhe && <p className="text-xs text-slate-500">{ev.detalhe}</p>}
                      <p className="text-[11px] text-slate-400">{format(new Date(ev.criado_em), "dd/MM HH:mm", { locale: ptBR })}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Observação interna</Label>
                <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Registre uma observação interna." />
                <Button size="sm" variant="outline" className="font-bold" disabled={texto.trim().length < 3} onClick={() => observar.mutate(texto)}>Adicionar observação</Button>
                {(detalhe.observacoes || []).map((o: any, i: number) => (
                  <p key={i} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{o.texto} — {o.autor || "Equipe"}</p>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogo === "agendar"} onOpenChange={(o) => !o && fechar()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agendar entrega</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo className="sm:col-span-2" rotulo="Local da entrega">
              <Select value={form.tipo_local} onValueChange={(v) => setForm({ ...form, tipo_local: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPRADOR">Endereço do comprador</SelectItem>
                  <SelectItem value="UNIDADE">Unidade Esse Já Foi</SelectItem>
                  <SelectItem value="OUTRO">Outro local autorizado</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo className="sm:col-span-2" rotulo="Nome do local"><Input value={form.local_nome || ""} onChange={(e) => setForm({ ...form, local_nome: e.target.value })} /></Campo>
            <Campo rotulo="CEP"><Input value={form.cep || ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></Campo>
            <Campo rotulo="Endereço"><Input value={form.endereco || ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></Campo>
            <Campo rotulo="Número"><Input value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></Campo>
            <Campo rotulo="Bairro"><Input value={form.bairro || ""} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></Campo>
            <Campo rotulo="Cidade"><Input value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></Campo>
            <Campo rotulo="UF"><Input maxLength={2} value={form.uf || ""} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></Campo>
            <Campo rotulo="Data"><Input type="date" value={form.data_entrega || ""} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} /></Campo>
            <Campo rotulo="Horário">
              <div className="flex items-center gap-2">
                <Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
                <span className="text-xs font-bold text-slate-400">às</span>
                <Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
            </Campo>
            <Campo rotulo="Responsável pelo recebimento"><Input value={form.responsavel_recebimento || ""} onChange={(e) => setForm({ ...form, responsavel_recebimento: e.target.value })} /></Campo>
            <Campo rotulo="Telefone de contato"><Input value={form.telefone_contato || ""} onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })} /></Campo>
            <Campo className="sm:col-span-2" rotulo="Orientação (opcional)">
              <Textarea value={form.orientacao || ""} onChange={(e) => setForm({ ...form, orientacao: e.target.value })} placeholder="Procurar Carlos na recepção da loja." />
            </Campo>
          </div>
          <DialogFooter>
            <Button className="bg-slate-900 font-bold" disabled={!form.data_entrega || agendar.isPending} onClick={() => agendar.mutate()}>Confirmar agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "cancelar" || dialogo === "ausencia" || dialogo === "decisao"} onOpenChange={(o) => !o && fechar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogo === "cancelar" ? "Cancelar agendamento" : dialogo === "ausencia" ? "Registrar não comparecimento" : "Decisão sobre a divergência"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialogo === "ausencia" && (
              <Select value={ausenteParte} onValueChange={(v) => setAusenteParte(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDEDOR">Vendedor não compareceu</SelectItem>
                  <SelectItem value="COMPRADOR">Comprador não compareceu</SelectItem>
                </SelectContent>
              </Select>
            )}
            {dialogo === "decisao" && (
              <Select value={decisao} onValueChange={setDecisao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIBERAR">Divergência resolvida — liberar repasse</SelectItem>
                  <SelectItem value="MANTER_BLOQUEIO">Manter repasse bloqueado</SelectItem>
                  <SelectItem value="TRATATIVA_MANUAL">Encaminhar para tratativa manual</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Descreva o motivo / observação interna." />
          </div>
          <DialogFooter>
            <Button
              className="bg-slate-900 font-bold"
              disabled={texto.trim().length < 3}
              onClick={() => (dialogo === "cancelar" ? cancelar.mutate() : dialogo === "ausencia" ? ausencia.mutate() : decidir.mutate())}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tabela({ linhas, onAbrir }: { linhas: any[]; onAbrir: (id: string) => void }) {
  if (!linhas.length) return <p className="p-10 text-center text-sm text-slate-500">Nenhuma entrega nesta situação.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Negociação</TableHead><TableHead>Veículo</TableHead><TableHead>Vendedor</TableHead>
          <TableHead>Comprador</TableHead><TableHead>Cidade</TableHead><TableHead>Data</TableHead>
          <TableHead>Status</TableHead><TableHead>Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((e) => (
          <TableRow key={e.id} className="cursor-pointer" onClick={() => onAbrir(e.id)}>
            <TableCell className="font-bold text-slate-800">{e.negociacao_codigo}</TableCell>
            <TableCell className="text-slate-600">{e.veiculo_titulo}</TableCell>
            <TableCell className="text-slate-600">{e.vendedor_nome || "—"}</TableCell>
            <TableCell className="text-slate-600">{e.comprador_nome || "—"}</TableCell>
            <TableCell className="text-slate-600">{[e.cidade || e.comprador_cidade, e.uf || e.comprador_uf].filter(Boolean).join("/") || "—"}</TableCell>
            <TableCell className="text-slate-600">{e.data_entrega ? format(new Date(`${String(e.data_entrega).slice(0, 10)}T12:00:00`), "dd/MM/yyyy") : "—"}</TableCell>
            <TableCell><StatusEntrega status={e.status} /></TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost" className="font-bold">{e.data_entrega ? "Abrir" : "Organizar entrega"}</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{rotulo}</p>
      <p className="text-2xl font-black text-slate-900">{valor ?? 0}</p>
    </div>
  );
}

function Bloco({ titulo, linhas }: { titulo: string; linhas: (string | null | undefined)[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400"><MapPin className="h-3 w-3" /> {titulo}</p>
      {linhas.filter(Boolean).map((l, i) => <p key={i} className="text-sm font-bold text-slate-700">{l}</p>)}
      {!linhas.filter(Boolean).length && <p className="text-sm text-slate-400">A definir</p>}
    </div>
  );
}

function Campo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{rotulo}</Label>
      {children}
    </div>
  );
}

export { ROTULO_ENTREGA };
