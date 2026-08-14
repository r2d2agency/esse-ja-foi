import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listarPagamentosAdminFn, getPagamentoFn, gerarNovaCobrancaFn, prorrogarPrazoPagamentoFn } from "@/lib/pagamentos.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { brl, PrazoPagamento } from "@/components/negociacao/prazo-pagamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos dos compradores | Admin Esse Já Foi" },
      { name: "description", content: "Acompanhe cobranças Pix, conciliação, divergências e prazos de pagamento das negociações." },
    ],
  }),
  component: AdminPagamentos,
});

const CLASSE: Record<string, string> = {
  AGUARDANDO: "bg-amber-50 text-amber-700",
  PROCESSANDO: "bg-blue-50 text-blue-700",
  PAGO: "bg-emerald-50 text-emerald-700",
  EXPIRADO: "bg-red-50 text-red-700",
  FALHOU: "bg-red-50 text-red-700",
  CANCELADO: "bg-slate-100 text-slate-600",
  DIVERGENCIA: "bg-orange-50 text-orange-700",
  DUPLICADO: "bg-orange-50 text-orange-700",
};
const ROTULO: Record<string, string> = {
  AGUARDANDO: "Aguardando pagamento",
  PROCESSANDO: "Em processamento",
  PAGO: "Pago",
  EXPIRADO: "Expirado",
  FALHOU: "Falhou",
  CANCELADO: "Cancelado",
  DIVERGENCIA: "Divergência",
  DUPLICADO: "Duplicado",
};

function AdminPagamentos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<string | undefined>();
  const [busca, setBusca] = useState("");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<null | "nova" | "prazo">(null);
  const [motivo, setMotivo] = useState("");
  const [horas, setHoras] = useState(24);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pagamentos", filtro],
    queryFn: async () => (await listarPagamentosAdminFn({ data: filtro })) as any,
    refetchInterval: 30000,
  });

  const { data: detalhe } = useQuery({
    queryKey: ["admin-pagamento", detalheId],
    queryFn: async () => (await getPagamentoFn({ data: detalheId! })) as any,
    enabled: !!detalheId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pagamentos"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pagamento"] });
  };

  const novaCobranca = useMutation({
    mutationFn: () => gerarNovaCobrancaFn({ data: { negociacao_id: detalhe.negociacao_id, motivo, admin_id: user!.id } }),
    onSuccess: () => { toast.success("Nova cobrança gerada."); setDialogo(null); setMotivo(""); invalidar(); },
    onError: (e: any) => toast.error(e?.message || "Não foi possível gerar a cobrança."),
  });

  const prorrogar = useMutation({
    mutationFn: () => prorrogarPrazoPagamentoFn({ data: { negociacao_id: detalhe.negociacao_id, horas, motivo, admin_id: user!.id } }),
    onSuccess: () => { toast.success("Prazo prorrogado."); setDialogo(null); setMotivo(""); invalidar(); },
    onError: (e: any) => toast.error(e?.message || "Não foi possível prorrogar."),
  });

  const ind = data?.indicadores || {};
  const lista = ((data?.lista || []) as any[]).filter((c) =>
    !busca || [c.codigo, c.titulo, c.comprador_nome, c.referencia].join(" ").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Pagamentos</h1>
        <p className="text-sm font-medium text-slate-500">Cobranças Pix, conciliação e prazos das negociações.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador rotulo="Aguardando" valor={ind.aguardando} onClick={() => setFiltro("AGUARDANDO")} />
        <Indicador rotulo="Em processamento" valor={ind.processando} onClick={() => setFiltro("PROCESSANDO")} />
        <Indicador rotulo="Pagos" valor={ind.pagos} onClick={() => setFiltro("PAGO")} />
        <Indicador rotulo="Expirados" valor={ind.expirados} onClick={() => setFiltro("EXPIRADO")} />
        <Indicador rotulo="Em análise" valor={ind.analise} onClick={() => setFiltro("DIVERGENCIA")} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por negociação, veículo ou comprador" className="pl-9" />
        </div>
        {filtro && <Button variant="ghost" className="font-bold" onClick={() => setFiltro(undefined)}>Limpar filtro</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 p-10 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : lista.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">Nenhum pagamento encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negociação</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetalheId(c.id)}>
                    <TableCell className="font-bold text-slate-800">{c.codigo}</TableCell>
                    <TableCell className="text-slate-600">{c.titulo}</TableCell>
                    <TableCell className="text-slate-600">{c.comprador_nome || "—"}</TableCell>
                    <TableCell className="font-bold">{brl(c.valor_esperado)}</TableCell>
                    <TableCell><Badge className={CLASSE[c.status]}>{ROTULO[c.status] || c.status}</Badge></TableCell>
                    <TableCell><PrazoPagamento compacto prazo={c.expira_em} servidorAgora={data.servidor_agora} /></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="ghost" className="font-bold">Abrir</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!detalheId} onOpenChange={(o) => !o && setDetalheId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>Detalhe do pagamento</SheetTitle></SheetHeader>
          {!detalhe ? (
            <p className="p-4 text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="space-y-5 py-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-3xl font-black text-slate-900">{brl(detalhe.valor_recebido ?? detalhe.valor_esperado)}</p>
                <Badge className={`mt-2 ${CLASSE[detalhe.status]}`}>{ROTULO[detalhe.status] || detalhe.status}</Badge>
                {detalhe.motivo && <p className="mt-2 text-xs font-medium text-orange-700">{detalhe.motivo}</p>}
              </div>

              <div className="space-y-2 text-sm">
                <Linha rotulo="Negociação" valor={detalhe.codigo} />
                <Linha rotulo="Veículo" valor={`${detalhe.titulo} (${detalhe.codigo_publico})`} />
                <Linha rotulo="Comprador" valor={detalhe.comprador_nome} />
                <Linha rotulo="Referência" valor={detalhe.referencia} />
                <Linha rotulo="Provedor" valor={detalhe.provedor} />
                <Linha rotulo="Transação" valor={detalhe.id_externo} />
                <Linha rotulo="Valor esperado" valor={brl(detalhe.valor_esperado)} />
                <Linha rotulo="Valor recebido" valor={detalhe.valor_recebido ? brl(detalhe.valor_recebido) : "—"} />
                <Linha rotulo="Expira em" valor={format(new Date(detalhe.expira_em), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
                {detalhe.confirmado_em && <Linha rotulo="Confirmado em" valor={format(new Date(detalhe.confirmado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })} />}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="font-bold">
                  <Link to="/admin/negociacao/$id" params={{ id: detalhe.negociacao_id }}>Ver negociação</Link>
                </Button>
                <Button variant="outline" className="font-bold" onClick={() => setDialogo("prazo")}>Prorrogar prazo</Button>
                <Button className="bg-slate-900 font-bold" onClick={() => setDialogo("nova")}>Gerar nova cobrança</Button>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Auditoria</p>
                <div className="space-y-2">
                  {(detalhe.logs || []).map((l: any, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{l.acao}</p>
                      {l.detalhe && <p className="text-sm text-slate-700">{l.detalhe}</p>}
                      <p className="text-[11px] text-slate-400">{format(new Date(l.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!dialogo} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogo === "prazo" ? "Prorrogar prazo de pagamento" : "Gerar nova cobrança"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {dialogo === "prazo" && (
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Horas adicionais</label>
                <Input type="number" min={1} max={240} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Motivo interno</label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Registre o motivo desta ação." />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-slate-900 font-bold"
              disabled={motivo.trim().length < 3 || novaCobranca.isPending || prorrogar.isPending}
              onClick={() => (dialogo === "prazo" ? prorrogar.mutate() : novaCobranca.mutate())}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Indicador({ rotulo, valor, onClick }: { rotulo: string; valor?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-400">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{rotulo}</p>
      <p className="text-2xl font-black text-slate-900">{valor ?? 0}</p>
    </button>
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
