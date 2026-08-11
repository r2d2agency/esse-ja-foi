import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, CalendarPlus, MapPin, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TIPOS_EXPECTATIVA,
  TRANSICOES,
  VEICULO_STATUS,
  calcPercentualSobreFipe,
  formatPlaca,
  isValidPlaca,
  normalizePlaca,
  onlyDigits,
} from "@/lib/validators";
import { buscarCep, geocodificar, maskCep, maskPlaca } from "@/lib/brasil";
import {
  alterarStatusVeiculoFn,
  listarClientesFn,
  listarVeiculosFn,
  removerVeiculoFn,
  salvarVeiculoFn,
  timelineVeiculoFn,
} from "@/lib/cadastro.functions";
import {
  criarAgendamentoFn,
  horariosOcupadosFn,
  listarParceirosFn,
  listarVistoriadoresFn,
} from "@/lib/agendamentos.functions";

const Mapa = lazy(() => import("@/components/shared/MapaLocalizacao"));

export const Route = createFileRoute("/operacao/veiculos")({
  component: VeiculosPage,
  head: () => ({
    meta: [
      { title: "Veículos | ESSE JÁ FOI" },
      {
        name: "description",
        content: "Cadastro de veículos com placa validada, expectativa de preço, mapa da vistoria e fluxo de status.",
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
  renavam: "",
  marca: "",
  modelo: "",
  versao: "",
  anoFabricacao: "",
  anoModelo: "",
  km: "",
  cor: "",
  cambio: "",
  combustivel: "",
  clienteId: "",
  valorFipe: "",
  valorInteresseCliente: "",
  tipoExpectativa: "",
  cienteExpectativa: false,
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  cidade: "",
  uf: "",
  latitude: null as number | null,
  longitude: null as number | null,
  observacoes: "",
};

const TRILHA = ["CADASTRADO", "AGENDADO", "EM_VISTORIA", "EM_AVALIACAO", "APROVADO", "EM_LEILAO", "ENCERRADO", "VENDIDO"];

function statusCor(status: string) {
  if (status === "RECUSADO") return "bg-red-100 text-red-800";
  if (status === "VENDIDO") return "bg-emerald-100 text-emerald-800";
  if (status === "EM_LEILAO") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Row[]>([]);
  const [clientes, setClientes] = useState<Row[]>([]);
  const [vistoriadores, setVistoriadores] = useState<Row[]>([]);
  const [parceiros, setParceiros] = useState<Row[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [erroDb, setErroDb] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("dados");
  const [timeline, setTimeline] = useState<Row[]>([]);

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agVeiculo, setAgVeiculo] = useState<Row | null>(null);
  const [ag, setAg] = useState({ vistoriadorId: "", parceiroId: "", unidade: "", data: "", hora: "09:00", observacao: "", responsavel: "" });
  const [ocupados, setOcupados] = useState<Row[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  const carregar = useCallback(async () => {
    const res = await listarVeiculosFn({
      data: { busca, status: filtroStatus || null, cidade: filtroCidade || null },
    });
    setVeiculos(res.data ?? []);
    setErroDb(res.ok ? null : (res as { message: string }).message);
  }, [busca, filtroStatus, filtroCidade]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    void (async () => {
      const [c, v, p] = await Promise.all([
        listarClientesFn({ data: {} }),
        listarVistoriadoresFn(),
        listarParceirosFn(),
      ]);
      setClientes(c.data ?? []);
      setVistoriadores(v.data ?? []);
      setParceiros(p.data ?? []);
    })();
  }, []);

  const set = <K extends keyof typeof vazio>(k: K, v: (typeof vazio)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const fipe = Number(form.valorFipe.replace(/\./g, "").replace(",", ".")) || 0;
  const interesse = Number(form.valorInteresseCliente.replace(/\./g, "").replace(",", ".")) || 0;
  const percentual = fipe > 0 && interesse > 0 ? calcPercentualSobreFipe(fipe, interesse) : null;
  const alerta = percentual !== null && percentual >= 15;
  const placaValida = isValidPlaca(form.placa);

  const abrirNovo = () => {
    setForm(vazio);
    setTimeline([]);
    setAba("dados");
    setOpen(true);
  };

  const editar = async (v: Row) => {
    setForm({
      ...vazio,
      id: v['id'],
      placa: maskPlaca(String(v['placa'] ?? "")),
      renavam: v['renavam'] ?? "",
      marca: v['marca'] ?? "",
      modelo: v['modelo'] ?? "",
      versao: v['versao'] ?? "",
      anoFabricacao: v['ano_fabricacao'] ?? "",
      anoModelo: v['ano_modelo'] ?? "",
      km: v['km'] != null ? String(v['km']) : "",
      cor: v['cor'] ?? "",
      cambio: v['cambio'] ?? "",
      combustivel: v['combustivel'] ?? "",
      clienteId: v['cliente_id'] ?? "",
      valorFipe: v['valor_fipe'] != null ? String(v['valor_fipe']) : "",
      valorInteresseCliente: v['valor_interesse_cliente'] != null ? String(v['valor_interesse_cliente']) : "",
      tipoExpectativa: v['tipo_expectativa'] ?? "",
      cienteExpectativa: v['ciente_expectativa'] === true,
      cep: maskCep(String(v['cep'] ?? "")),
      endereco: v['endereco'] ?? "",
      cidade: v['cidade'] ?? "",
      uf: v['uf'] ?? "",
      latitude: v['latitude'] != null ? Number(v['latitude']) : null,
      longitude: v['longitude'] != null ? Number(v['longitude']) : null,
      observacoes: v['observacoes'] ?? "",
    });
    setAba("dados");
    setOpen(true);
    const t = await timelineVeiculoFn({ data: { id: String(v['id']) } });
    setTimeline(t.data ?? []);
  };

  const usarEnderecoCliente = async () => {
    const cliente = clientes.find((c) => c['id'] === form.clienteId);
    if (!cliente) {
      toast.error("Selecione o cliente proprietário primeiro.");
      return;
    }
    setForm((f) => ({
      ...f,
      cep: maskCep(String(cliente['cep'] ?? "")),
      endereco: cliente['endereco'] ?? "",
      cidade: cliente['cidade'] ?? "",
      uf: cliente['uf'] ?? "",
    }));
    const coords = await geocodificar(
      [cliente['endereco'], cliente['cidade'], cliente['uf']].filter(Boolean).join(", "),
    );
    if (coords) setForm((f) => ({ ...f, latitude: coords.lat, longitude: coords.lng }));
  };

  const preencherCep = async (valor: string) => {
    set("cep", maskCep(valor));
    if (onlyDigits(valor).length !== 8) return;
    const endereco = await buscarCep(valor);
    if (!endereco) {
      toast.error("CEP não encontrado.");
      return;
    }
    setForm((f) => ({
      ...f,
      cep: endereco.cep,
      endereco: [endereco.logradouro, endereco.bairro].filter(Boolean).join(" - "),
      cidade: endereco.cidade,
      uf: endereco.uf,
    }));
    const coords = await geocodificar(`${endereco.logradouro}, ${endereco.cidade}, ${endereco.uf}`);
    if (coords) setForm((f) => ({ ...f, latitude: coords.lat, longitude: coords.lng }));
  };

  const salvar = async () => {
    if (!placaValida) {
      toast.error("Placa inválida. Use ABC-1234 ou ABC1D23.");
      return;
    }
    setSalvando(true);
    const enderecoCompleto = [form.endereco, form.numero, form.complemento].filter(Boolean).join(", ");
    const res = await salvarVeiculoFn({
      data: {
        id: form.id,
        placa: normalizePlaca(form.placa),
        marca: form.marca,
        modelo: form.modelo,
        versao: form.versao || null,
        cor: form.cor || null,
        km: form.km ? Number(onlyDigits(form.km)) : null,
        anoFabricacao: form.anoFabricacao || null,
        anoModelo: form.anoModelo || null,
        combustivel: form.combustivel || null,
        cambio: form.cambio || null,
        clienteId: form.clienteId || null,
        valorFipe: fipe || null,
        valorInteresseCliente: interesse || null,
        tipoExpectativa: form.tipoExpectativa || null,
        cienteExpectativa: form.cienteExpectativa,
        cep: form.cep || null,
        endereco: enderecoCompleto || null,
        cidade: form.cidade || null,
        uf: form.uf || null,
        latitude: form.latitude,
        longitude: form.longitude,
        observacoes: form.observacoes || null,
      } as never,
    });
    setSalvando(false);
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    if ((res as { alertaExpectativa?: boolean }).alertaExpectativa && !form.cienteExpectativa) {
      toast.warning("Expectativa acima do praticado — registre a ciência antes de agendar a vistoria.");
    } else {
      toast.success(form.id ? "Veículo atualizado." : "Veículo cadastrado.");
    }
    setOpen(false);
    void carregar();
  };

  const mudarStatus = async (id: string, status: string) => {
    const res = await alterarStatusVeiculoFn({ data: { id, status } });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success(`Status alterado para ${status}.`);
    void carregar();
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

  const abrirAgendar = (v: Row) => {
    setAgVeiculo(v);
    setAg({ vistoriadorId: "", parceiroId: "", unidade: "", data: "", hora: "09:00", observacao: "", responsavel: "" });
    setOcupados([]);
    setAgendarOpen(true);
  };

  useEffect(() => {
    if (!ag.vistoriadorId || !ag.data) {
      setOcupados([]);
      return;
    }
    void (async () => {
      const res = await horariosOcupadosFn({ data: { vistoriadorId: ag.vistoriadorId, dia: ag.data } });
      setOcupados(res.data ?? []);
    })();
  }, [ag.vistoriadorId, ag.data]);

  const agendar = async () => {
    if (!agVeiculo || !ag.vistoriadorId || !ag.data || !ag.hora) {
      toast.error("Selecione vistoriador, data e horário.");
      return;
    }
    const res = await criarAgendamentoFn({
      data: {
        veiculoId: String(agVeiculo['id']),
        vistoriadorId: ag.vistoriadorId,
        parceiroId: ag.parceiroId || null,
        unidade: ag.unidade || null,
        dataHora: new Date(`${ag.data}T${ag.hora}:00`).toISOString(),
        observacao: ag.observacao || null,
        responsavelInterno: ag.responsavel || null,
      },
    });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success("Vistoria agendada e vistoriador notificado.");
    setAgendarOpen(false);
    void carregar();
  };

  const cidades = useMemo(
    () => Array.from(new Set(veiculos.map((v) => String(v['cidade'] ?? "")).filter(Boolean))),
    [veiculos],
  );

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Veículos</h1>
            <p className="text-sm text-slate-500">Cadastro, expectativa de valor, localização da vistoria e fluxo de status.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filtroStatus || "TODOS"} onValueChange={(v) => setFiltroStatus(v === "TODOS" ? "" : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os status</SelectItem>
                {VEICULO_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroCidade || "TODAS"} onValueChange={(v) => setFiltroCidade(v === "TODAS" ? "" : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as cidades</SelectItem>
                {cidades.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {erroDb && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{erroDb}</div>
        )}

        <DataTable<Row>
          data={veiculos}
          onSearch={setBusca}
          onAdd={abrirNovo}
          emptyMessage="Nenhum veículo cadastrado ainda."
          columns={[
            {
              header: "Placa",
              accessor: (v) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{formatPlaca(String(v['placa'] ?? ""))}</span>
                  {v['alerta_expectativa'] === true && (
                    <Badge className="bg-red-100 text-red-800 gap-1">
                      <AlertTriangle className="h-3 w-3" /> Expectativa
                    </Badge>
                  )}
                </div>
              ),
            },
            { header: "Veículo", accessor: (v) => `${v['marca']} ${v['modelo']}` },
            { header: "Cliente", accessor: (v) => v['cliente_nome'] ?? "-" },
            { header: "Cidade", accessor: (v) => v['cidade'] ?? "-" },
            {
              header: "Status",
              accessor: (v) => (
                <Badge className={statusCor(String(v['status']))}>{String(v['status']).replace(/_/g, " ")}</Badge>
              ),
            },
            {
              header: "Ações",
              accessor: (v) => (
                <div className="flex items-center gap-1">
                  {String(v['status']).toUpperCase() === "CADASTRADO" && (
                    <Button size="icon" variant="ghost" title="Agendar vistoria" onClick={() => abrirAgendar(v)}>
                      <CalendarPlus className="h-4 w-4 text-teal-800" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => void editar(v)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void excluir(String(v['id']))}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Ficha do veículo */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? `Ficha do veículo ${formatPlaca(form.placa)}` : "Novo veículo"}</SheetTitle>
          </SheetHeader>

          {form.id && (
            <div className="mt-4 flex flex-wrap items-center gap-1">
              {TRILHA.map((s, i) => {
                const atual = veiculos.find((v) => v['id'] === form.id);
                const idx = TRILHA.indexOf(String(atual?.['status'] ?? "CADASTRADO"));
                return (
                  <div key={s} className="flex items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        i <= idx ? "bg-teal-900 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {s.replace(/_/g, " ")}
                    </span>
                    {i < TRILHA.length - 1 && <span className="text-slate-300">›</span>}
                  </div>
                );
              })}
            </div>
          )}

          <Tabs value={aba} onValueChange={setAba} className="mt-4">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="expectativa">Expectativa</TabsTrigger>
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="vistoria">Vistoria</TabsTrigger>
              <TabsTrigger value="depreciacao">Depreciação</TabsTrigger>
              <TabsTrigger value="anuncio">Anúncio</TabsTrigger>
              <TabsTrigger value="leilao">Leilão</TabsTrigger>
              <TabsTrigger value="venda">Venda</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Placa</Label>
                  <Input
                    value={form.placa}
                    onChange={(e) => set("placa", maskPlaca(e.target.value))}
                    placeholder="ABC-1234 ou ABC1D23"
                    className="font-mono uppercase"
                  />
                  {form.placa && !placaValida && <p className="mt-1 text-xs text-red-600">Placa inválida.</p>}
                </div>
                <div>
                  <Label>RENAVAM</Label>
                  <Input value={form.renavam} onChange={(e) => set("renavam", onlyDigits(e.target.value).slice(0, 11))} />
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>Versão</Label>
                  <Input value={form.versao} onChange={(e) => set("versao", e.target.value)} />
                </div>
                <div>
                  <Label>Ano fabricação</Label>
                  <Input value={form.anoFabricacao} onChange={(e) => set("anoFabricacao", onlyDigits(e.target.value).slice(0, 4))} />
                </div>
                <div>
                  <Label>Ano modelo</Label>
                  <Input value={form.anoModelo} onChange={(e) => set("anoModelo", onlyDigits(e.target.value).slice(0, 4))} />
                </div>
                <div>
                  <Label>Quilometragem</Label>
                  <Input value={form.km} onChange={(e) => set("km", onlyDigits(e.target.value))} />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input value={form.cor} onChange={(e) => set("cor", e.target.value)} />
                </div>
                <div>
                  <Label>Câmbio</Label>
                  <Select value={form.cambio || "-"} onValueChange={(v) => set("cambio", v === "-" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Não informado</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="AUTOMATICO">Automático</SelectItem>
                      <SelectItem value="CVT">CVT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Combustível</Label>
                  <Select value={form.combustivel || "-"} onValueChange={(v) => set("combustivel", v === "-" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Não informado</SelectItem>
                      <SelectItem value="FLEX">Flex</SelectItem>
                      <SelectItem value="GASOLINA">Gasolina</SelectItem>
                      <SelectItem value="ETANOL">Etanol</SelectItem>
                      <SelectItem value="DIESEL">Diesel</SelectItem>
                      <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                      <SelectItem value="ELETRICO">Elétrico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Cliente proprietário</Label>
                  <Select value={form.clienteId || "-"} onValueChange={(v) => set("clienteId", v === "-" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Sem cliente vinculado</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={String(c['id'])} value={String(c['id'])}>{c['nome']}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="expectativa" className="pt-4">
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> Expectativa do cliente
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor FIPE (R$)</Label>
                    <Input value={form.valorFipe} onChange={(e) => set("valorFipe", e.target.value)} placeholder="65000" />
                  </div>
                  <div>
                    <Label>Valor de interesse do cliente (R$)</Label>
                    <Input
                      value={form.valorInteresseCliente}
                      onChange={(e) => set("valorInteresseCliente", e.target.value)}
                      placeholder="72000"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Tipo de expectativa</Label>
                    <Select value={form.tipoExpectativa || "-"} onValueChange={(v) => set("tipoExpectativa", v === "-" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">Não informado</SelectItem>
                        {TIPOS_EXPECTATIVA.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Interesse sobre a FIPE</span>
                    <span className={`text-lg font-bold ${alerta ? "text-red-600" : "text-teal-900"}`}>
                      {percentual === null ? "—" : `${percentual > 0 ? "+" : ""}${percentual.toFixed(2)}%`}
                    </span>
                  </div>
                  {fipe > 0 && interesse > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                      FIPE {formatCurrency(fipe)} · interesse {formatCurrency(interesse)}
                    </div>
                  )}
                </div>

                {alerta && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-700">
                      Expectativa acima do praticado — avaliar antes de agendar vistoria
                    </p>
                    <label className="mt-2 flex items-center gap-2 text-sm text-red-800">
                      <Checkbox
                        checked={form.cienteExpectativa}
                        onCheckedChange={(v) => set("cienteExpectativa", v === true)}
                      />
                      Estou ciente da expectativa
                    </label>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="local" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin className="h-4 w-4" /> Localização da vistoria
                </div>
                <Button variant="outline" size="sm" onClick={() => void usarEnderecoCliente()}>
                  Usar endereço do cliente
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={(e) => void preencherCep(e.target.value)} placeholder="00000-000" />
                </div>
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} />
                </div>
                <div>
                  <Label>Cidade / UF</Label>
                  <div className="flex gap-2">
                    <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                    <Input className="w-16" maxLength={2} value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
                  </div>
                </div>
              </div>
              {montado ? (
              <Suspense fallback={<div className="h-[260px] animate-pulse rounded-lg bg-slate-100" />}>
                <Mapa
                  lat={form.latitude}
                  lng={form.longitude}
                  onChange={({ lat, lng }) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                />
              </Suspense>
              ) : (
                <div className="h-[260px] rounded-lg bg-slate-100" />
              )}
              <p className="text-xs text-slate-500">
                Arraste o pino ou clique no mapa para ajustar a posição exata.{" "}
                {form.latitude != null && `Lat ${form.latitude} · Lng ${form.longitude}`}
              </p>
            </TabsContent>

            <TabsContent value="historico" className="pt-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {timeline.map((t, i) => (
                    <li key={i} className="border-l-2 border-teal-800 pl-3">
                      <div className="text-sm font-medium text-slate-900">
                        {t['acao']} {t['de'] && t['para'] ? `· ${t['de']} → ${t['para']}` : ""}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(String(t['criado_em']))} {t['detalhe'] ? `· ${t['detalhe']}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            {["vistoria", "depreciacao", "anuncio", "leilao", "venda"].map((t) => (
              <TabsContent key={t} value={t} className="pt-4">
                <p className="text-sm text-slate-500">Este módulo será liberado nas próximas etapas.</p>
              </TabsContent>
            ))}
          </Tabs>

          {form.id && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <Label>Alterar status</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(TRANSICOES[
                  String(veiculos.find((v) => v['id'] === form.id)?.['status'] ?? "CADASTRADO") as keyof typeof TRANSICOES
                ] ?? []).map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => void mudarStatus(String(form.id), s)}>
                    {s.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            <Button className="bg-teal-900 hover:bg-teal-950" disabled={salvando} onClick={() => void salvar()}>
              {salvando ? "Salvando..." : "Salvar veículo"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Agendar vistoria */}
      <Sheet open={agendarOpen} onOpenChange={setAgendarOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Agendar vistoria {agVeiculo ? `· ${formatPlaca(String(agVeiculo['placa']))}` : ""}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label>Parceiro</Label>
              <Select value={ag.parceiroId || "-"} onValueChange={(v) => setAg((a) => ({ ...a, parceiroId: v === "-" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Sem parceiro</SelectItem>
                  {parceiros.map((p) => (
                    <SelectItem key={String(p['id'])} value={String(p['id'])}>{p['nome']}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vistoriador</Label>
              <Select value={ag.vistoriadorId} onValueChange={(v) => setAg((a) => ({ ...a, vistoriadorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {vistoriadores.length === 0 && <SelectItem value="-" disabled>Nenhum vistoriador ativo</SelectItem>}
                  {vistoriadores.map((v) => (
                    <SelectItem key={String(v['id'])} value={String(v['id'])}>{v['nome']}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={ag.unidade} onChange={(e) => setAg((a) => ({ ...a, unidade: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={ag.data} onChange={(e) => setAg((a) => ({ ...a, data: e.target.value }))} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={ag.hora} onChange={(e) => setAg((a) => ({ ...a, hora: e.target.value }))} />
              </div>
            </div>
            {ag.vistoriadorId && ag.data && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="font-semibold text-slate-700">Horários já ocupados neste dia</div>
                {ocupados.length === 0 ? (
                  <p className="text-slate-500">Nenhum — agenda livre.</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {ocupados.map((o) => (
                      <li key={String(o['id'])} className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                        {new Date(String(o['data_hora'])).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div>
              <Label>Responsável interno</Label>
              <Input value={ag.responsavel} onChange={(e) => setAg((a) => ({ ...a, responsavel: e.target.value }))} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={ag.observacao} onChange={(e) => setAg((a) => ({ ...a, observacao: e.target.value }))} rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAgendarOpen(false)}>Cancelar</Button>
            <Button className="bg-teal-900 hover:bg-teal-950" onClick={() => void agendar()}>Agendar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </BackofficeLayout>
  );
}
