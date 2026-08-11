import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { AlertTriangle, History, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TIPOS_EXPECTATIVA,
  TRANSICOES,
  VEICULO_STATUS,
  calcPercentualSobreFipe,
  formatPlaca,
  isValidPlaca,
  normalizePlaca,
} from "@/lib/validators";
import {
  alterarStatusVeiculoFn,
  listarClientesFn,
  listarVeiculosFn,
  removerVeiculoFn,
  salvarVeiculoFn,
  timelineVeiculoFn,
} from "@/lib/cadastro.functions";

export const Route = createFileRoute("/operacao/veiculos")({
  component: VeiculosPage,
  head: () => ({
    meta: [
      { title: "Veículos | ESSE JÁ FOI" },
      {
        name: "description",
        content: "Cadastro de veículos com validação de placa, expectativa de preço e fluxo de status.",
      },
      { property: "og:title", content: "Veículos | ESSE JÁ FOI" },
      { property: "og:description", content: "Controle completo do ciclo do veículo, da captação ao leilão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = Record<string, any>;

const vazio = {
  id: undefined as string | undefined,
  placa: "",
  marca: "",
  modelo: "",
  versao: "",
  cor: "",
  km: "",
  anoFabricacao: "",
  anoModelo: "",
  combustivel: "",
  cambio: "",
  clienteId: "",
  valorFipe: "",
  valorInteresseCliente: "",
  tipoExpectativa: "",
  cienteExpectativa: false,
  cep: "",
  endereco: "",
  cidade: "",
  uf: "",
  latitude: "",
  longitude: "",
  observacoes: "",
};

const num = (v: string) => {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n !== 0 ? n : null;
};

function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Row[]>([]);
  const [clientes, setClientes] = useState<Row[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [cidade, setCidade] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("TODOS");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erroDb, setErroDb] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{ veiculo: Row; itens: Row[] } | null>(null);

  const carregar = useCallback(async () => {
    const res = await listarVeiculosFn({
      data: {
        busca,
        cidade,
        status: status === "TODOS" ? null : status,
        clienteId: clienteFiltro === "TODOS" ? null : clienteFiltro,
      },
    });
    setVeiculos(res.data ?? []);
    setErroDb(res.ok ? null : res.message);
  }, [busca, cidade, status, clienteFiltro]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    void listarClientesFn({ data: {} }).then((r) => setClientes(r.data ?? []));
  }, []);

  const set = (k: keyof typeof vazio, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const fipe = num(form.valorFipe);
  const interesse = num(form.valorInteresseCliente);
  const percentual = fipe && interesse ? calcPercentualSobreFipe(fipe, interesse) : null;
  const alerta = percentual !== null && percentual >= 15;

  const salvar = async () => {
    if (!isValidPlaca(form.placa)) {
      toast.error("Placa inválida. Use ABC1234 ou ABC1D23.");
      return;
    }
    setSalvando(true);
    const res = await salvarVeiculoFn({
      data: {
        id: form.id,
        placa: normalizePlaca(form.placa),
        marca: form.marca,
        modelo: form.modelo,
        versao: form.versao || null,
        cor: form.cor || null,
        km: num(form.km),
        anoFabricacao: form.anoFabricacao || null,
        anoModelo: form.anoModelo || null,
        combustivel: form.combustivel || null,
        cambio: form.cambio || null,
        clienteId: form.clienteId || null,
        valorFipe: fipe,
        valorInteresseCliente: interesse,
        tipoExpectativa: form.tipoExpectativa || null,
        cienteExpectativa: form.cienteExpectativa,
        cep: form.cep || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        uf: form.uf || null,
        latitude: num(form.latitude),
        longitude: num(form.longitude),
        observacoes: form.observacoes || null,
      } as never,
    });
    setSalvando(false);
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success(form.id ? "Veículo atualizado." : "Veículo cadastrado.");
    setOpen(false);
    setForm(vazio);
    void carregar();
  };

  const mudarStatus = async (id: string, novo: string) => {
    const res = await alterarStatusVeiculoFn({ data: { id, status: novo } });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success(`Status alterado para ${novo}.`);
    void carregar();
  };

  const abrirTimeline = async (v: Row) => {
    const res = await timelineVeiculoFn({ data: { id: v['id'] } });
    setTimeline({ veiculo: v, itens: res.data ?? [] });
  };

  const excluir = async (id: string) => {
    const res = await removerVeiculoFn({ data: { id } });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success("Veículo excluído.");
    void carregar();
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Veículos</h1>
          <p className="text-slate-500">Placa única, expectativa de preço e fluxo de status auditado.</p>
        </div>

        {erroDb && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erroDb}</div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {VEICULO_STATUS.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Filtrar por cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
            <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c['id']} value={c['id']}>{c['nome']}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          title={`${veiculos.length} veículo(s)`}
          data={veiculos}
          onSearch={setBusca}
          onAdd={() => {
            setForm(vazio);
            setOpen(true);
          }}
          columns={[
            {
              header: "Placa",
              accessor: (r) => (
                <span className="font-mono font-bold text-slate-900">{formatPlaca(String(r['placa'] ?? ""))}</span>
              ),
            },
            {
              header: "Veículo",
              accessor: (r) => (
                <div>
                  <p className="font-medium text-slate-900">{r['marca']} {r['modelo']}</p>
                  <p className="text-xs text-slate-500">{[r['ano_fabricacao'], r['ano_modelo']].filter(Boolean).join("/")}</p>
                </div>
              ),
            },
            { header: "Cliente", accessor: (r) => r['cliente_nome'] || "—" },
            {
              header: "Expectativa",
              accessor: (r) =>
                r['percentual_sobre_fipe'] == null ? (
                  <span className="text-xs text-slate-400">Pendente</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm">{Number(r['percentual_sobre_fipe']).toFixed(2)}%</span>
                    {r['alerta_expectativa'] && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Alerta
                      </Badge>
                    )}
                  </div>
                ),
            },
            {
              header: "Status",
              accessor: (r) => {
                const atual = String(r['status'] ?? "CADASTRADO").toUpperCase();
                const proximos = TRANSICOES[atual as keyof typeof TRANSICOES] ?? [];
                return (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{atual.replace(/_/g, " ")}</Badge>
                    {proximos.length > 0 && (
                      <Select value="" onValueChange={(v) => void mudarStatus(r['id'], v)}>
                        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Avançar" /></SelectTrigger>
                        <SelectContent>
                          {proximos.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              },
            },
            {
              header: "Ações",
              accessor: (r) => (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => void abrirTimeline(r)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setForm({
                        id: r['id'],
                        placa: r['placa'] ?? "",
                        marca: r['marca'] ?? "",
                        modelo: r['modelo'] ?? "",
                        versao: r['versao'] ?? "",
                        cor: r['cor'] ?? "",
                        km: r['km'] != null ? String(r['km']) : "",
                        anoFabricacao: r['ano_fabricacao'] ?? "",
                        anoModelo: r['ano_modelo'] ?? "",
                        combustivel: r['combustivel'] ?? "",
                        cambio: r['cambio'] ?? "",
                        clienteId: r['cliente_id'] ?? "",
                        valorFipe: r['valor_fipe'] != null ? String(r['valor_fipe']) : "",
                        valorInteresseCliente:
                          r['valor_interesse_cliente'] != null ? String(r['valor_interesse_cliente']) : "",
                        tipoExpectativa: r['tipo_expectativa'] ?? "",
                        cienteExpectativa: Boolean(r['ciente_expectativa']),
                        cep: r['cep'] ?? "",
                        endereco: r['endereco'] ?? "",
                        cidade: r['cidade'] ?? "",
                        uf: r['uf'] ?? "",
                        latitude: r['latitude'] != null ? String(r['latitude']) : "",
                        longitude: r['longitude'] != null ? String(r['longitude']) : "",
                        observacoes: r['observacoes'] ?? "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void excluir(r['id'])}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar veículo" : "Novo veículo"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Placa</Label>
                <Input
                  value={form.placa}
                  onChange={(e) => set("placa", normalizePlaca(e.target.value))}
                  placeholder="ABC1D23"
                  className="font-mono uppercase"
                />
                {form.placa && !isValidPlaca(form.placa) && (
                  <p className="text-xs text-red-600">Formato inválido (ABC1234 ou ABC1D23).</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Proprietário</Label>
                <Select value={form.clienteId} onValueChange={(v) => set("clienteId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c['id']} value={c['id']}>{c['nome']}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Ano fab.</Label>
                <Input value={form.anoFabricacao} onChange={(e) => set("anoFabricacao", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Ano mod.</Label>
                <Input value={form.anoModelo} onChange={(e) => set("anoModelo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>KM</Label>
                <Input value={form.km} onChange={(e) => set("km", e.target.value)} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-900">Expectativa de preço (obrigatória para agendar)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Valor FIPE (R$)</Label>
                  <Input value={form.valorFipe} onChange={(e) => set("valorFipe", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Interesse do cliente (R$)</Label>
                  <Input
                    value={form.valorInteresseCliente}
                    onChange={(e) => set("valorInteresseCliente", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Tipo de expectativa</Label>
                <Select value={form.tipoExpectativa} onValueChange={(v) => set("tipoExpectativa", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_EXPECTATIVA.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {percentual !== null && (
                <div className="text-sm">
                  <p className="text-slate-600">
                    Percentual sobre FIPE: <strong className="tabular-nums">{percentual.toFixed(2)}%</strong>{" "}
                    <span className="text-slate-400">
                      ({formatCurrency(fipe ?? 0)} → {formatCurrency(interesse ?? 0)})
                    </span>
                  </p>
                  {alerta && (
                    <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <Checkbox
                        checked={form.cienteExpectativa}
                        onCheckedChange={(c) => set("cienteExpectativa", Boolean(c))}
                      />
                      <span className="text-xs text-amber-900">
                        Expectativa acima do limite configurado. Confirmo que o cliente está ciente — sem isso o
                        agendamento será rejeitado.
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input maxLength={2} value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <Input value={form.cor} onChange={(e) => set("cor", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Latitude</Label>
                <Input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Longitude</Label>
                <Input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </div>

          <SheetFooter>
            <Button className="w-full bg-teal-900 hover:bg-teal-950" disabled={salvando} onClick={() => void salvar()}>
              {salvando ? "Salvando..." : "Salvar veículo"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!timeline} onOpenChange={(o) => !o && setTimeline(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              Histórico — {formatPlaca(String(timeline?.veiculo?.['placa'] ?? ""))}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {(timeline?.itens ?? []).length === 0 && (
              <p className="text-sm text-slate-500">Nenhum evento registrado.</p>
            )}
            {(timeline?.itens ?? []).map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{String(item['acao'])}</span>
                  <span className="text-xs text-slate-400">{formatDate(String(item['criado_em']))}</span>
                </div>
                {(item['de'] || item['para']) && (
                  <p className="mt-1 text-xs text-slate-600">
                    {String(item['de'] ?? "—")} → <strong>{String(item['para'] ?? "—")}</strong>
                  </p>
                )}
                {item['detalhe'] && <p className="mt-1 text-xs text-slate-500">{String(item['detalhe'])}</p>}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </BackofficeLayout>
  );
}