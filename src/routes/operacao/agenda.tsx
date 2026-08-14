import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
const BackofficeLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  agendaSemanaFn,
  cancelarAgendamentoFn,
  listarParceirosFn,
  listarVistoriadoresFn,
  remarcarAgendamentoFn,
} from "@/lib/agendamentos.functions";

export const Route = createFileRoute("/operacao/agenda")({
  component: AgendaPage,
  head: () => ({
    meta: [
      { title: "Agenda de vistorias | ESSE JÁ FOI" },
      { name: "description", content: "Calendário semanal de vistorias com filtros por vistoriador, parceiro e cidade." },
      { property: "og:title", content: "Agenda de vistorias | ESSE JÁ FOI" },
      { property: "og:description", content: "Organize as vistorias da semana e remarque com motivo registrado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = Record<string, any>;

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function hojeISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function statusCor(status: string) {
  if (status === "CANCELADO") return "bg-red-100 text-red-800";
  if (status === "REALIZADO") return "bg-emerald-100 text-emerald-800";
  if (status === "NAO_COMPARECEU") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-900";
}

function AgendaPage() {
  const [referencia, setReferencia] = useState(hojeISO());
  const [dias, setDias] = useState<Array<{ data: string; itens: Row[] }>>([]);
  const [vistoriadores, setVistoriadores] = useState<Row[]>([]);
  const [parceiros, setParceiros] = useState<Row[]>([]);
  const [fVistoriador, setFVistoriador] = useState("");
  const [fParceiro, setFParceiro] = useState("");
  const [fCidade, setFCidade] = useState("");
  const [diaSelecionado, setDiaSelecionado] = useState(hojeISO());
  const [erroDb, setErroDb] = useState<string | null>(null);

  const [acao, setAcao] = useState<{ tipo: "remarcar" | "cancelar"; item: Row } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("09:00");

  const carregar = useCallback(async () => {
    const res = await agendaSemanaFn({
      data: {
        referencia,
        vistoriadorId: fVistoriador || null,
        parceiroId: fParceiro || null,
        cidade: fCidade || null,
      },
    });
    setDias(res.data?.dias ?? []);
    setErroDb(res.ok ? null : (res as { message: string }).message);
  }, [referencia, fVistoriador, fParceiro, fCidade]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    void (async () => {
      const [v, p] = await Promise.all([listarVistoriadoresFn(), listarParceirosFn()]);
      setVistoriadores(v.data ?? []);
      setParceiros(p.data ?? []);
    })();
  }, []);

  const mover = (dias: number) => {
    const d = new Date(`${referencia}T12:00:00`);
    d.setDate(d.getDate() + dias);
    setReferencia(d.toISOString().slice(0, 10));
  };

  const abrirAcao = (tipo: "remarcar" | "cancelar", item: Row) => {
    setAcao({ tipo, item });
    setMotivo("");
    const dt = new Date(String(item['data_hora']));
    setNovaData(dt.toISOString().slice(0, 10));
    setNovaHora(dt.toTimeString().slice(0, 5));
  };

  const confirmar = async () => {
    if (!acao) return;
    if (motivo.trim().length < 5) {
      toast.error("Informe o motivo (mínimo 5 caracteres).");
      return;
    }
    const id = String(acao.item['id']);
    const res =
      acao.tipo === "remarcar"
        ? await remarcarAgendamentoFn({
            data: { id, motivo, dataHora: new Date(`${novaData}T${novaHora}:00`).toISOString() },
          })
        : await cancelarAgendamentoFn({ data: { id, motivo } });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success(acao.tipo === "remarcar" ? "Agendamento remarcado." : "Agendamento cancelado.");
    setAcao(null);
    void carregar();
  };

  const itensDoDia = dias.find((d) => d.data === diaSelecionado)?.itens ?? [];

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda de vistorias</h1>
            <p className="text-sm text-slate-500">Semana de {dias[0]?.data ?? "—"} a {dias[6]?.data ?? "—"}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={fVistoriador || "TODOS"} onValueChange={(v) => setFVistoriador(v === "TODOS" ? "" : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Vistoriador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos vistoriadores</SelectItem>
                {vistoriadores.map((v) => (
                  <SelectItem key={String(v['id'])} value={String(v['id'])}>{v['nome']}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fParceiro || "TODOS"} onValueChange={(v) => setFParceiro(v === "TODOS" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Parceiro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos parceiros</SelectItem>
                {parceiros.map((p) => (
                  <SelectItem key={String(p['id'])} value={String(p['id'])}>{p['nome']}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="w-40" placeholder="Cidade" value={fCidade} onChange={(e) => setFCidade(e.target.value)} />
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => mover(-7)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setReferencia(hojeISO())}>Hoje</Button>
              <Button variant="outline" size="icon" onClick={() => mover(7)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        {erroDb && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{erroDb}</div>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {dias.map((dia, i) => (
            <button
              key={dia.data}
              onClick={() => setDiaSelecionado(dia.data)}
              className={`rounded-xl border p-3 text-left transition ${
                diaSelecionado === dia.data ? "border-teal-900 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500">{DIAS[i]}</div>
              <div className="text-lg font-bold text-slate-900">{dia.data.slice(8, 10)}/{dia.data.slice(5, 7)}</div>
              <div className="mt-2 space-y-1">
                {dia.itens.slice(0, 3).map((it) => (
                  <div key={String(it['id'])} className="truncate rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">
                    {new Date(String(it['data_hora'])).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {it['placa']}
                  </div>
                ))}
                {dia.itens.length > 3 && <div className="text-[11px] text-slate-500">+{dia.itens.length - 3} vistorias</div>}
                {dia.itens.length === 0 && <div className="text-[11px] text-slate-400">Livre</div>}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4" /> Vistorias de {diaSelecionado.split("-").reverse().join("/")}
          </div>
          {itensDoDia.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma vistoria agendada para este dia.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {itensDoDia.map((it) => (
                <li key={String(it['id'])} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">{it['placa']}</span>
                      <span className="text-sm text-slate-600">{it['marca']} {it['modelo']}</span>
                      <Badge className={statusCor(String(it['status']))}>{String(it['status']).replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(String(it['data_hora'])).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                      {it['vistoriador_nome'] ?? "sem vistoriador"} · {it['parceiro_nome'] ?? "sem parceiro"} ·{" "}
                      {it['cidade'] ?? it['veiculo_cidade'] ?? "-"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => abrirAcao("remarcar", it)}>Remarcar</Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => abrirAcao("cancelar", it)}>
                      Cancelar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Sheet open={acao !== null} onOpenChange={(o) => !o && setAcao(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{acao?.tipo === "remarcar" ? "Remarcar vistoria" : "Cancelar vistoria"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {acao?.tipo === "remarcar" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nova data</Label>
                  <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
                </div>
                <div>
                  <Label>Novo horário</Label>
                  <Input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <Label>Motivo (obrigatório)</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
              {acao?.tipo === "cancelar" && (
                <p className="mt-1 text-xs text-slate-500">O veículo retorna para o status CADASTRADO.</p>
              )}
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAcao(null)}>Voltar</Button>
            <Button className="bg-teal-900 hover:bg-teal-950" onClick={() => void confirmar()}>Confirmar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </BackofficeLayout>
  );
}
