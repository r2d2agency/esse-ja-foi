import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  criarAgendamentoVistoriaFn,
  getSlotsUnidadeDisponiveisFn,
  getUnidadesCadastroFn,
  getUnidadesDisponiveisFn,
  getVeiculosAguardandoVistoriaFn,
  getVistoriadoresCadastroFn,
  getVistoriasAdminFn,
  salvarUnidadeCadastroFn,
  salvarVistoriadorCadastroFn,
} from "@/lib/vistorias.functions";
import { getFilaAnalisePosVistoriaFn } from "@/lib/analise-pos-vistoria.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { 
  Search, 
  Calendar,
  Clock,
  MapPin,
  User,
  Building2,
  UserCog,
  UserPlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buscarCep, geocodificar, maskCep } from "@/lib/brasil";
import MapaLocalizacao from "@/components/shared/MapaLocalizacao";

const DIAS_ATENDIMENTO = [
  { key: "1", label: "Segunda" },
  { key: "2", label: "Terça" },
  { key: "3", label: "Quarta" },
  { key: "4", label: "Quinta" },
  { key: "5", label: "Sexta" },
  { key: "6", label: "Sábado" },
  { key: "0", label: "Domingo" },
] as const;

function criarPeriodoPadrao() {
  return { inicio: "08:00", fim: "18:00" };
}

function criarHorarioAtendimentoForm() {
  return DIAS_ATENDIMENTO.reduce<Record<string, Array<{ inicio: string; fim: string }>>>((acc, dia) => {
    acc[dia.key] = [];
    return acc;
  }, {});
}

function normalizarHorarioAtendimentoForm(value: any) {
  const base = criarHorarioAtendimentoForm();
  if (!value || typeof value !== "object") return base;
  for (const dia of DIAS_ATENDIMENTO) {
    const faixa = value[dia.key];
    if (Array.isArray(faixa)) {
      base[dia.key] = faixa
        .filter((item) => item && typeof item === "object")
        .map((item: any) => ({
          inicio: typeof item.inicio === "string" ? item.inicio : "08:00",
          fim: typeof item.fim === "string" ? item.fim : "18:00",
        }));
      continue;
    }
    if (!faixa || typeof faixa !== "object") continue;
    if (typeof faixa.inicio === "string" && typeof faixa.fim === "string") {
      base[dia.key] = [{ inicio: faixa.inicio, fim: faixa.fim }];
    }
  }
  return base;
}

function extrairHorarioAtendimentoPayload(value: Record<string, Array<{ inicio: string; fim: string }>>) {
  return Object.entries(value).reduce<Record<string, Array<{ inicio: string; fim: string }>>>((acc, [dia, faixas]) => {
    const periodos = faixas.filter((faixa) => faixa.inicio && faixa.fim);
    if (periodos.length === 0) return acc;
    acc[dia] = periodos;
    return acc;
  }, {});
}

function horarioParaMinutos(value: string) {
  const [hora, minuto] = String(value || "00:00").split(":").map(Number);
  return (hora || 0) * 60 + (minuto || 0);
}

function resumirHorarioAtendimento(value: any) {
  const horario = normalizarHorarioAtendimentoForm(value);
  const ativos = DIAS_ATENDIMENTO.filter((dia) => (horario[dia.key] || []).length > 0);
  if (ativos.length === 0) return "Sem horários configurados";
  return ativos
    .map((dia) => `${dia.label.slice(0, 3)} ${(horario[dia.key] || []).map((faixa) => `${faixa.inicio}-${faixa.fim}`).join(", ")}`)
    .join(" | ");
}

export const Route = createFileRoute("/admin/vistorias")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    veiculoId: typeof search.veiculoId === "string" ? search.veiculoId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Vistorias | ESSE JÁ FOI" }],
  }),
  component: VistoriasAdminPage,
});

function normalizarIdStr(value: unknown): string {
  if (value == null) return "";
  const raw = typeof value === "string" ? value : (value as any)?.toString?.() ?? String(value);
  return raw.trim().toLowerCase();
}

function idsIguais(a: unknown, b: unknown): boolean {
  const na = normalizarIdStr(a);
  const nb = normalizarIdStr(b);
  if (!na || !nb) return false;
  return na === nb;
}

function VistoriasAdminPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/vistorias" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initialTab = search.tab || (search.status ? "agendamentos" : "aguardando_analise");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [buscaFila, setBuscaFila] = useState("");
  const [buscaAgendamento, setBuscaAgendamento] = useState("");
  const [buscaAgendaCriada, setBuscaAgendaCriada] = useState("");
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<any | null>(null);
  const [unidadeId, setUnidadeId] = useState("");
  const [dataVistoria, setDataVistoria] = useState("");
  const [horarioVistoria, setHorarioVistoria] = useState("");
  const [unidadeModalOpen, setUnidadeModalOpen] = useState(false);
  const [vistoriadorModalOpen, setVistoriadorModalOpen] = useState(false);
  const [unidadeForm, setUnidadeForm] = useState({
    id: "",
    nome: "",
    cnpj: "",
    cep: "",
    endereco: "",
    cidade: "",
    estado: "",
    latitude: null as number | null,
    longitude: null as number | null,
    telefone: "",
    whatsapp: "",
    email: "",
    responsavel: "",
    horario_atendimento: criarHorarioAtendimentoForm(),
    duracao_padrao_minutos: 60,
    intervalo_entre_vistorias_minutos: 30,
    ativo: true,
  });
  const [buscandoCepUnidade, setBuscandoCepUnidade] = useState(false);
  const [geocodificandoUnidade, setGeocodificandoUnidade] = useState(false);
  const [vistoriadorForm, setVistoriadorForm] = useState({
    usuario_id: "",
    unidade_id: "",
    status: "ATIVO",
  });
  
  const getVistorias = useServerFn(getVistoriasAdminFn);
  const getAguardando = useServerFn(getVeiculosAguardandoVistoriaFn);
  const getFilaPosVistoria = useServerFn(getFilaAnalisePosVistoriaFn);
  const getSlotsUnidade = useServerFn(getSlotsUnidadeDisponiveisFn);
  const getUnidades = useServerFn(getUnidadesDisponiveisFn);
  const criarAgendamento = useServerFn(criarAgendamentoVistoriaFn);
  const getUnidadesCadastro = useServerFn(getUnidadesCadastroFn);
  const getVistoriadoresCadastro = useServerFn(getVistoriadoresCadastroFn);
  const salvarUnidadeCadastro = useServerFn(salvarUnidadeCadastroFn);
  const salvarVistoriadorCadastro = useServerFn(salvarVistoriadorCadastroFn);

  useEffect(() => {
    setActiveTab(search.tab || (search.status ? "agendamentos" : "aguardando_analise"));
  }, [search.tab, search.status]);

  const updateSearch = (next: { tab?: string; status?: string; veiculoId?: string }) => {
    navigate({
      search: {
        tab: next.tab,
        status: next.status,
        veiculoId: next.veiculoId,
      } as any,
    });
  };

  const statusAgendamento = useMemo(
    () => (activeTab === "agendamentos" ? search.status : undefined),
    [activeTab, search.status],
  );

  const { data: agendamentosRes, isLoading: loadingAgendamentos } = useQuery({
    queryKey: ["admin-vistorias", statusAgendamento || "TODOS"],
    queryFn: () => getVistorias({ data: { status: statusAgendamento } }),
    enabled: activeTab === "agendamentos",
  });

  const { data: aguardandoRes, isLoading: loadingAguardando } = useQuery({
    queryKey: ["admin-veiculos-aguardando-vistoria"],
    queryFn: () => getAguardando(),
    enabled: activeTab === 'aguardando'
  });

  const { data: posVistoriaRes, isLoading: loadingPosVistoria } = useQuery({
    queryKey: ["admin-veiculos-aguardando-analise-pos"],
    queryFn: () => getFilaPosVistoria(),
    enabled: activeTab === 'aguardando_analise'
  });

  const { data: unidadesRes, isLoading: loadingUnidades } = useQuery({
    queryKey: ["unidades-vistoria", veiculoSelecionado?.vendedor_cidade || ""],
    queryFn: () => getUnidades({ data: { cidade: veiculoSelecionado?.vendedor_cidade } }),
    enabled: agendaOpen && !!veiculoSelecionado,
  });

  const { data: slotsRes, isLoading: loadingSlots } = useQuery({
    queryKey: ["slots-unidade-vistoria", unidadeId, dataVistoria],
    queryFn: () => getSlotsUnidade({
      data: {
        unidadeId,
        data: dataVistoria,
        vistoriadorId: null,
      },
    }),
    enabled: agendaOpen && !!unidadeId && !!dataVistoria && !!(unidadesRes?.data || []).some((unidade: any) => idsIguais(unidade.id, unidadeId)),
  });

  const { data: unidadesCadastroRes, isLoading: loadingUnidadesCadastro } = useQuery({
    queryKey: ["cadastro-unidades-vistoria"],
    queryFn: () => getUnidadesCadastro(),
    enabled: activeTab === "cadastros",
  });

  const { data: vistoriadoresCadastroRes, isLoading: loadingVistoriadoresCadastro } = useQuery({
    queryKey: ["cadastro-vistoriadores"],
    queryFn: () => getVistoriadoresCadastro(),
    enabled: activeTab === "cadastros",
  });

  const agendamentos = agendamentosRes?.data || [];
  const aguardando = aguardandoRes?.data || [];
  const filaPosVistoria = posVistoriaRes?.data || [];
  const unidades = unidadesRes?.data || [];
  const unidadesCadastro = unidadesCadastroRes?.data || [];
  const vistoriadoresCadastro = vistoriadoresCadastroRes?.data || [];
  const unidadeSelecionada = unidades.find((unidade: any) => idsIguais(unidade.id, unidadeId)) || null;
  const slotsDisponiveis = slotsRes?.slots || [];
  const termoFila = buscaFila.trim().toLowerCase();
  const termoAgendamento = buscaAgendamento.trim().toLowerCase();
  const termoAgendaCriada = buscaAgendaCriada.trim().toLowerCase();

  const statusAgendamentoConfig: Record<string, { label: string; className: string }> = {
    AGUARDANDO_CONFIRMACAO: {
      label: "Aguardando confirmação",
      className: "bg-orange-50 text-orange-700 hover:bg-orange-50",
    },
    CONFIRMADA: {
      label: "Confirmada",
      className: "bg-teal-50 text-teal-700 hover:bg-teal-50",
    },
    EM_ANDAMENTO: {
      label: "Em andamento",
      className: "bg-blue-50 text-blue-700 hover:bg-blue-50",
    },
    CONCLUIDA: {
      label: "Concluída",
      className: "bg-green-50 text-green-700 hover:bg-green-50",
    },
    REAGENDAMENTO_SOLICITADO: {
      label: "Reagendamento solicitado",
      className: "bg-amber-50 text-amber-700 hover:bg-amber-50",
    },
  };

  const filtroAgendamentos = [
    { value: undefined, label: "Todos" },
    { value: "AGUARDANDO_CONFIRMACAO", label: "Aguardando confirmação" },
    { value: "CONFIRMADA", label: "Confirmadas" },
    { value: "EM_ANDAMENTO", label: "Em andamento" },
    { value: "CONCLUIDA", label: "Concluídas" },
  ];

  const agendamentosFiltrados = agendamentos.filter((v: any) =>
    !termoAgendaCriada ||
    `${v.marca || ""} ${v.modelo || ""} ${v.placa || ""} ${v.vendedor_nome || ""} ${v.vistoriador_nome || ""} ${v.unidade_nome || ""}`
      .toLowerCase()
      .includes(termoAgendaCriada)
  );

  const filaPosVistoriaFiltrada = filaPosVistoria.filter((v: any) =>
    !termoFila ||
    `${v.marca || ""} ${v.modelo || ""} ${v.placa || ""} ${v.vendedor_nome || ""} ${v.vistoriador_nome || ""} ${v.unidade_nome || ""}`
      .toLowerCase()
      .includes(termoFila)
  );
  const aguardandoFiltrado = aguardando.filter((v: any) =>
    !termoAgendamento ||
    `${v.marca || ""} ${v.modelo || ""} ${v.placa || ""} ${v.vendedor_nome || ""} ${v.vendedor_cidade || ""} ${v.vendedor_uf || ""}`
      .toLowerCase()
      .includes(termoAgendamento)
  );

  const resetAgendaForm = () => {
    setUnidadeId("");
    setDataVistoria("");
    setHorarioVistoria("");
  };

  const resetUnidadeForm = () => {
    setUnidadeForm({
      id: "",
      nome: "",
      cnpj: "",
      cep: "",
      endereco: "",
      cidade: "",
      estado: "",
      latitude: null,
      longitude: null,
      telefone: "",
      whatsapp: "",
      email: "",
      responsavel: "",
      horario_atendimento: criarHorarioAtendimentoForm(),
      duracao_padrao_minutos: 60,
      intervalo_entre_vistorias_minutos: 30,
      ativo: true,
    });
  };

  const resetVistoriadorForm = () => {
    setVistoriadorForm({
      usuario_id: "",
      unidade_id: "",
      status: "ATIVO",
    });
  };

  const abrirAgenda = (veiculo: any) => {
    setVeiculoSelecionado(veiculo);
    resetAgendaForm();
    setAgendaOpen(true);
  };

  const fecharAgenda = () => {
    setAgendaOpen(false);
    setVeiculoSelecionado(null);
    resetAgendaForm();
    if (search.veiculoId) {
      updateSearch({ tab: activeTab, status: search.status, veiculoId: undefined });
    }
  };

  const abrirCadastroUnidade = (unidade?: any) => {
    if (unidade) {
      setUnidadeForm({
        id: unidade.id || "",
        nome: unidade.nome || "",
        cnpj: unidade.cnpj || "",
        cep: unidade.cep || "",
        endereco: unidade.endereco || "",
        cidade: unidade.cidade || "",
        estado: unidade.estado || "",
        latitude: unidade.latitude != null ? Number(unidade.latitude) : null,
        longitude: unidade.longitude != null ? Number(unidade.longitude) : null,
        telefone: unidade.telefone || "",
        whatsapp: unidade.whatsapp || "",
        email: unidade.email || "",
        responsavel: unidade.responsavel || "",
        horario_atendimento: normalizarHorarioAtendimentoForm(unidade.horario_atendimento),
        duracao_padrao_minutos: Number(unidade.duracao_padrao_minutos || 60),
        intervalo_entre_vistorias_minutos: Number(unidade.intervalo_entre_vistorias_minutos || 30),
        ativo: unidade.ativo ?? true,
      });
    } else {
      resetUnidadeForm();
    }
    setUnidadeModalOpen(true);
  };

  const adicionarPeriodoDia = (dia: string) => {
    setUnidadeForm((current) => ({
      ...current,
      horario_atendimento: {
        ...current.horario_atendimento,
        [dia]: [...(current.horario_atendimento[dia] || []), criarPeriodoPadrao()],
      },
    }));
  };

  const removerPeriodoDia = (dia: string, index: number) => {
    setUnidadeForm((current) => ({
      ...current,
      horario_atendimento: {
        ...current.horario_atendimento,
        [dia]: (current.horario_atendimento[dia] || []).filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const atualizarPeriodoDia = (dia: string, index: number, campo: "inicio" | "fim", valor: string) => {
    setUnidadeForm((current) => ({
      ...current,
      horario_atendimento: {
        ...current.horario_atendimento,
        [dia]: (current.horario_atendimento[dia] || []).map((periodo, itemIndex) =>
          itemIndex === index ? { ...periodo, [campo]: valor } : periodo
        ),
      },
    }));
  };

  const preencherCoordenadasUnidade = async (form = unidadeForm) => {
    const partes = [
      form.endereco,
      form.cidade,
      form.estado,
      form.cep,
      "Brasil",
    ].filter(Boolean);
    if (partes.length < 3) return;

    setGeocodificandoUnidade(true);
    try {
      const coords = await geocodificar(partes.join(", "));
      if (coords) {
        setUnidadeForm((current) => ({
          ...current,
          latitude: coords.lat,
          longitude: coords.lng,
        }));
      } else {
        toast.error("Não consegui localizar esse endereço no mapa.");
      }
    } finally {
      setGeocodificandoUnidade(false);
    }
  };

  const handleCepUnidadeChange = async (value: string) => {
    const cep = maskCep(value);
    setUnidadeForm((current) => ({ ...current, cep }));

    if (cep.replace(/\D/g, "").length !== 8) return;

    setBuscandoCepUnidade(true);
    try {
      const endereco = await buscarCep(cep);
      if (!endereco) {
        toast.error("CEP não encontrado.");
        return;
      }

      const enderecoFormatado = [endereco.logradouro].filter(Boolean).join(", ");
      const proximoForm = {
        ...unidadeForm,
        cep: endereco.cep,
        endereco: enderecoFormatado || unidadeForm.endereco,
        cidade: endereco.cidade,
        estado: endereco.uf,
      };

      setUnidadeForm((current) => ({
        ...current,
        cep: endereco.cep,
        endereco: enderecoFormatado || current.endereco,
        cidade: endereco.cidade,
        estado: endereco.uf,
      }));

      await preencherCoordenadasUnidade(proximoForm);
    } finally {
      setBuscandoCepUnidade(false);
    }
  };

  const abrirCadastroVistoriador = (vistoriador?: any) => {
    if (vistoriador) {
      setVistoriadorForm({
        usuario_id: vistoriador.usuario_id || "",
        unidade_id: vistoriador.unidade_id || "",
        status: vistoriador.status || "ATIVO",
      });
    } else {
      resetVistoriadorForm();
    }
    setVistoriadorModalOpen(true);
  };

  useEffect(() => {
    if (!agendaOpen) return;
    if (unidades.length === 0) {
      if (unidadeId) setUnidadeId("");
      return;
    }

    const unidadeAindaExiste = unidades.some((unidade: any) => unidade.id === unidadeId);
    if (!unidadeAindaExiste) {
      setUnidadeId(unidades[0].id);
    }
  }, [agendaOpen, unidades, unidadeId]);

  useEffect(() => {
    setHorarioVistoria("");
  }, [unidadeId, dataVistoria]);

  useEffect(() => {
    if (!slotsDisponiveis.length) return;
    if (slotsDisponiveis.some((slot: any) => slot.value === horarioVistoria)) return;
    if (slotsDisponiveis.length === 1) {
      setHorarioVistoria(slotsDisponiveis[0].value);
    }
  }, [slotsDisponiveis, horarioVistoria]);

  useEffect(() => {
    if (activeTab !== "aguardando" || !search.veiculoId || aguardando.length === 0) return;
    if (agendaOpen && veiculoSelecionado?.id === search.veiculoId) return;

    const alvo = aguardando.find((item: any) => item.id === search.veiculoId);
    if (alvo) abrirAgenda(alvo);
  }, [activeTab, search.veiculoId, aguardando, agendaOpen, veiculoSelecionado]);

  const handleCriarAgendamento = async () => {
    if (!user?.id || !veiculoSelecionado) {
      toast.error("Usuário ou veículo inválido para o agendamento.");
      return;
    }
    if (!unidadeSelecionada || !dataVistoria || !horarioVistoria) {
      toast.error("Selecione unidade, data e um slot disponível.");
      return;
    }

    const toastId = toast.loading("Criando agendamento...");
    try {
      const response = await criarAgendamento({
        data: {
          veiculo_id: veiculoSelecionado.id,
          vendedor_id: veiculoSelecionado.vendedor_id,
          unidade_id: unidadeSelecionada.id,
          vistoriador_id: null,
          data_vistoria: dataVistoria,
          horario_vistoria: horarioVistoria,
          usuario_id: user.id,
        },
      });

      if (!response?.ok) {
        toast.error(response?.message || "Não foi possível criar o agendamento.", { id: toastId });
        return;
      }

      toast.success("Vistoria agendada com sucesso.", { id: toastId });
      await queryClient.invalidateQueries({ queryKey: ["admin-veiculos-aguardando-vistoria"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-vistorias"] });
      fecharAgenda();
      updateSearch({ tab: "agendamentos", status: "AGUARDANDO_CONFIRMACAO", veiculoId: undefined });
    } catch {
      toast.error("Erro técnico ao criar agendamento.", { id: toastId });
    }
  };

  const handleSalvarUnidade = async () => {
    if (!unidadeForm.nome || !unidadeForm.endereco || !unidadeForm.cidade || !unidadeForm.estado) {
      toast.error("Preencha nome, endereço, cidade e UF da unidade.");
      return;
    }
    if (unidadeForm.latitude == null || unidadeForm.longitude == null) {
      toast.error("Confirme a localização da unidade no mapa.");
      return;
    }
    const horarioAtendimento = extrairHorarioAtendimentoPayload(unidadeForm.horario_atendimento);
    if (Object.keys(horarioAtendimento).length === 0) {
      toast.error("Selecione pelo menos um dia e horário de atendimento da unidade.");
      return;
    }
    const faixaInvalida = Object.entries(unidadeForm.horario_atendimento).find(([, faixas]) =>
      faixas.some((faixa) => horarioParaMinutos(faixa.fim) <= horarioParaMinutos(faixa.inicio))
    );
    if (faixaInvalida) {
      toast.error("Revise os horários da unidade. O horário final precisa ser maior que o inicial.");
      return;
    }
    const faixaSobreposta = Object.entries(unidadeForm.horario_atendimento).find(([, faixas]) => {
      const ordenadas = [...faixas]
        .map((faixa) => ({ ...faixa, inicioMin: horarioParaMinutos(faixa.inicio), fimMin: horarioParaMinutos(faixa.fim) }))
        .sort((a, b) => a.inicioMin - b.inicioMin);
      return ordenadas.some((faixa, index) => index > 0 && faixa.inicioMin < ordenadas[index - 1].fimMin);
    });
    if (faixaSobreposta) {
      toast.error("Existem períodos sobrepostos no mesmo dia. Revise a disponibilidade da unidade.");
      return;
    }
    if (!Number.isFinite(unidadeForm.duracao_padrao_minutos) || unidadeForm.duracao_padrao_minutos < 15) {
      toast.error("A duração mínima da vistoria deve ser de 15 minutos.");
      return;
    }
    if (!Number.isFinite(unidadeForm.intervalo_entre_vistorias_minutos) || unidadeForm.intervalo_entre_vistorias_minutos < 0) {
      toast.error("O intervalo entre vistorias não pode ser negativo.");
      return;
    }

    const toastId = toast.loading(unidadeForm.id ? "Atualizando unidade..." : "Criando unidade...");
    try {
      const response = await salvarUnidadeCadastro({
        data: {
          ...unidadeForm,
          horario_atendimento: horarioAtendimento,
          duracao_padrao_minutos: Number(unidadeForm.duracao_padrao_minutos),
          intervalo_entre_vistorias_minutos: Number(unidadeForm.intervalo_entre_vistorias_minutos),
          estado: unidadeForm.estado.toUpperCase(),
          email: unidadeForm.email || null,
        },
      });

      if (!response?.ok) {
        toast.error(response?.message || "Não foi possível salvar a unidade.", { id: toastId });
        return;
      }

      toast.success(unidadeForm.id ? "Unidade atualizada." : "Unidade cadastrada.", { id: toastId });
      setUnidadeModalOpen(false);
      resetUnidadeForm();
      await queryClient.invalidateQueries({ queryKey: ["cadastro-unidades-vistoria"] });
      await queryClient.invalidateQueries({ queryKey: ["unidades-vistoria"] });
    } catch {
      toast.error("Erro técnico ao salvar a unidade.", { id: toastId });
    }
  };

  const handleSalvarVistoriador = async () => {
    if (!vistoriadorForm.usuario_id || !vistoriadorForm.unidade_id) {
      toast.error("Selecione o vistoriador e a unidade.");
      return;
    }

    const toastId = toast.loading("Salvando vínculo do vistoriador...");
    try {
      const response = await salvarVistoriadorCadastro({ data: vistoriadorForm as any });

      if (!response?.ok) {
        toast.error(response?.message || "Não foi possível salvar o vistoriador.", { id: toastId });
        return;
      }

      toast.success("Vistoriador vinculado com sucesso.", { id: toastId });
      setVistoriadorModalOpen(false);
      resetVistoriadorForm();
      await queryClient.invalidateQueries({ queryKey: ["cadastro-vistoriadores"] });
    } catch {
      toast.error("Erro técnico ao salvar o vistoriador.", { id: toastId });
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Vistorias</h1>
          <p className="text-slate-500 font-medium">Gestão das filas operacionais de agendamento e análise pós-vistoria.</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          updateSearch({
            tab: value,
            status: value === "agendamentos" ? search.status : undefined,
            veiculoId: value === "aguardando" ? search.veiculoId : undefined,
          });
        }}
        className="space-y-6"
      >
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 gap-8">
          {[
            { id: "agendamentos", label: "Agenda" },
            { id: "aguardando_analise", label: "Aguardando análise" },
            { id: "aguardando", label: "Aguardando agendamento" },
            { id: "cadastros", label: "Cadastros" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="bg-transparent border-none p-0 pb-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 font-bold text-xs uppercase tracking-widest text-slate-400"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="agendamentos" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {filtroAgendamentos.map((filtro) => {
                  const ativo = (search.status || undefined) === filtro.value;
                  return (
                    <button
                      key={filtro.label}
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition-colors",
                        ativo
                          ? "border-teal-200 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      )}
                      onClick={() => updateSearch({ tab: "agendamentos", status: filtro.value, veiculoId: undefined })}
                    >
                      {filtro.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative w-80 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por veículo, vendedor ou unidade..."
                  className="pl-10 h-10 border-slate-200 bg-white"
                  value={buscaAgendaCriada}
                  onChange={(e) => setBuscaAgendaCriada(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-slate-200 shadow-none overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Veículo</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Agenda</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade / Vistoriador</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {agendamentosFiltrados.map((v: any) => {
                      const badge = statusAgendamentoConfig[v.status] || {
                        label: String(v.status || "Sem status").replaceAll("_", " "),
                        className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
                      };

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{v.marca} {v.modelo}</span>
                              <span className="text-[10px] font-mono text-slate-500 uppercase">{v.placa}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_nome}</td>
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-slate-700">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-bold">{format(new Date(v.data_vistoria), "dd/MM/yyyy")}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>{String(v.horario_vistoria).slice(0, 5)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-slate-700">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-bold">{v.unidade_nome}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span>{v.vistoriador_nome || "A definir"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={cn("text-[10px] font-black uppercase", badge.className)}>
                              {badge.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button asChild size="sm" variant="outline" className="font-bold">
                              <Link to="/admin/veiculo/$id" params={{ id: v.veiculo_id }}>
                                Ver veículo
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {agendamentosFiltrados.length === 0 && !loadingAgendamentos && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          Nenhuma vistoria encontrada para esse filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aguardando_analise" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">Fila de análise pós-vistoria</h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar na fila..."
                  className="pl-10 h-10 border-slate-200 bg-white"
                  value={buscaFila}
                  onChange={(e) => setBuscaFila(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-slate-200 shadow-none overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Veículo / Placa</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vistoriador / Unidade</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Conclusão</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filaPosVistoriaFiltrada.map((v: any) => (
                      <tr key={v.vistoria_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{v.marca} {v.modelo}</span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{v.placa}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_nome}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{v.vistoriador_nome || 'N/I'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">{v.unidade_nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">
                              {v.concluido_em ? format(new Date(v.concluido_em), 'dd/MM HH:mm') : '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">
                              {v.concluido_em ? "Concluída" : "Sem horário"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {v.responsavel_nome ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-tight">
                              {v.responsavel_nome}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Livre</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-8 rounded-lg">
                            <Link to="/admin/analise-vistoria/$id" params={{ id: v.veiculo_id }}>Analisar</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filaPosVistoriaFiltrada.length === 0 && !loadingPosVistoria && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          Nenhuma vistoria aguardando análise.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aguardando" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">Fila de espera</h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por placa ou vendedor..."
                  className="pl-10 h-10 border-slate-200 bg-white"
                  value={buscaAgendamento}
                  onChange={(e) => setBuscaAgendamento(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-slate-200 shadow-none overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Veículo</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Placa</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {aguardandoFiltrado.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-900">{v.marca} {v.modelo}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono text-[11px] border-slate-200">{v.placa}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_nome}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_cidade}/{v.vendedor_uf}</td>
                        <td className="px-6 py-4">
                          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px] font-black uppercase">Aguardando</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            className="bg-slate-900 hover:bg-teal-700 text-white font-bold h-8 rounded-lg"
                            onClick={() => abrirAgenda(v)}
                          >
                            Agendar
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {aguardandoFiltrado.length === 0 && !loadingAguardando && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          Nenhum veículo aguardando agendamento no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cadastros" className="mt-0">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <Card className="border-slate-200 shadow-none">
                <CardContent className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-wider text-slate-900">Rede credenciada e equipe</p>
                    <p className="text-sm text-slate-500">
                      Cadastre as unidades de vistoria e vincule os vistoriadores para que eles apareçam na agenda de agendamento.
                    </p>
                  </div>
                  <Button asChild variant="outline" className="font-bold">
                    <Link to="/admin/usuarios" search={{ role: "vistoriador", open: "novo" }}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar login de vistoriador
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-none">
                <CardContent className="p-5 space-y-2">
                  <p className="text-sm font-black uppercase tracking-wider text-slate-900">Como liberar na agenda</p>
                  <ol className="space-y-1 text-sm text-slate-600 list-decimal pl-5">
                    <li>crie o usuário com perfil `vistoriador`</li>
                    <li>cadastre a unidade/credenciado</li>
                    <li>vincule o vistoriador a uma unidade ativa</li>
                  </ol>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-slate-200 shadow-none overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Unidades / Credenciados</h2>
                      <p className="text-xs text-slate-500">Locais disponíveis para receber agendamentos.</p>
                    </div>
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold" onClick={() => abrirCadastroUnidade()}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Nova unidade
                    </Button>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {unidadesCadastro.map((unidade: any) => (
                        <tr key={unidade.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{unidade.nome}</span>
                              <span className="text-[10px] text-slate-500 uppercase">
                                {unidade.total_vistoriadores || 0} vistoriador(es) ativo(s)
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {resumirHorarioAtendimento(unidade.horario_atendimento)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {unidade.cidade}/{unidade.estado}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-sm text-slate-600">
                              <span>{unidade.responsavel || "Sem responsável"}</span>
                              <span className="text-xs text-slate-400">{unidade.whatsapp || unidade.telefone || unidade.email || "Sem contato"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={cn(
                              "text-[10px] font-black uppercase",
                              unidade.ativo ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                            )}>
                              {unidade.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="outline" size="sm" className="font-bold" onClick={() => abrirCadastroUnidade(unidade)}>
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {unidadesCadastro.length === 0 && !loadingUnidadesCadastro && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                            Nenhuma unidade credenciada cadastrada ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-none overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Vistoriadores</h2>
                      <p className="text-xs text-slate-500">Equipe disponível para ser puxada na agenda.</p>
                    </div>
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold" onClick={() => abrirCadastroVistoriador()}>
                      <UserCog className="mr-2 h-4 w-4" />
                      Vincular vistoriador
                    </Button>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {vistoriadoresCadastro.map((vistoriador: any) => (
                        <tr key={vistoriador.usuario_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{vistoriador.nome}</span>
                              <span className="text-[10px] text-slate-500">{vistoriador.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {vistoriador.whatsapp || "Sem WhatsApp"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {vistoriador.unidade_nome || "Sem unidade"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge className={cn(
                                "w-fit text-[10px] font-black uppercase",
                                vistoriador.status
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-50"
                              )}>
                                {vistoriador.status || "Não vinculado"}
                              </Badge>
                              {!vistoriador.usuario_ativo && (
                                <span className="text-[10px] text-red-600 font-bold uppercase">Usuário inativo</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="outline" size="sm" className="font-bold" onClick={() => abrirCadastroVistoriador(vistoriador)}>
                              {vistoriador.status ? "Editar" : "Vincular"}
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {vistoriadoresCadastro.length === 0 && !loadingVistoriadoresCadastro && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                            Nenhum usuário com perfil de vistoriador foi criado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={agendaOpen} onOpenChange={(open) => (open ? setAgendaOpen(true) : fecharAgenda())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agendar vistoria</DialogTitle>
            <DialogDescription>
              Defina a unidade, a data e escolha um horário disponível. O vistoriador será alocado automaticamente a partir da equipe da unidade.
            </DialogDescription>
          </DialogHeader>

          {veiculoSelecionado && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">
                  {veiculoSelecionado.marca} {veiculoSelecionado.modelo}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="font-mono">{veiculoSelecionado.placa}</span>
                  <span>{veiculoSelecionado.vendedor_nome}</span>
                  <span>{veiculoSelecionado.vendedor_cidade}/{veiculoSelecionado.vendedor_uf}</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Unidade de vistoria</Label>
                  <Select value={normalizarIdStr(unidadeId)} onValueChange={(value) => setUnidadeId(normalizarIdStr(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingUnidades ? "Carregando unidades..." : "Selecione a unidade credenciada"} />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade: any) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome} - {unidade.cidade}/{unidade.estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!loadingUnidades && unidades.length === 0 && (
                    <p className="text-xs text-amber-700">Nenhuma unidade ativa encontrada para essa cidade. Cadastre uma unidade na aba "Unidades e Equipe".</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Data da vistoria</Label>
                  <Input
                    type="date"
                    value={dataVistoria}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDataVistoria(e.target.value)}
                  />
                  {unidadeSelecionada && (
                    <p className="text-xs text-slate-500">
                      Equipe: alocada automaticamente com base na agenda da unidade.
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Slots disponíveis</Label>
                      <p className="text-xs text-slate-500">
                        Escolha um horário dentro da janela configurada da unidade.
                      </p>
                    </div>
                    {slotsRes?.configuracao && (
                      <p className="text-[11px] text-slate-500 text-right">
                        {(slotsRes.configuracao.periodos || []).map((periodo: any) => `${periodo.inicio} às ${periodo.fim}`).join(" | ") || "Sem períodos configurados"}
                        <br />
                        Vistoria {slotsRes.configuracao.duracao_padrao_minutos} min + janela de {slotsRes.configuracao.intervalo_entre_vistorias_minutos} min
                      </p>
                    )}
                  </div>

                  {!dataVistoria ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                      Escolha uma data para ver os slots disponíveis.
                    </div>
                  ) : loadingSlots ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando slots dessa unidade...
                    </div>
                  ) : slotsDisponiveis.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {slotsDisponiveis.map((slot: any) => {
                        const ativo = horarioVistoria === slot.value;
                        return (
                          <button
                            key={slot.value}
                            type="button"
                            className={cn(
                              "rounded-lg border px-3 py-3 text-left transition-colors",
                              ativo
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            )}
                            onClick={() => setHorarioVistoria(slot.value)}
                          >
                            <p className="text-sm font-bold">{slot.value}</p>
                            <p className="text-[11px] text-slate-500">vai at&eacute; {slot.fim}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
                      {slotsRes?.message || "Nenhum slot disponível para essa data."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={fecharAgenda}>Cancelar</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => void handleCriarAgendamento()}
              disabled={!veiculoSelecionado || !unidadeSelecionada || !dataVistoria || !horarioVistoria}
            >
              Confirmar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unidadeModalOpen}
        onOpenChange={(open) => {
          setUnidadeModalOpen(open);
          if (!open) resetUnidadeForm();
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{unidadeForm.id ? "Editar unidade credenciada" : "Nova unidade credenciada"}</DialogTitle>
            <DialogDescription>
              Cadastre o local que ficará disponível para receber agendamentos de vistoria.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-11rem)] overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome da unidade</Label>
                <Input value={unidadeForm.nome} onChange={(e) => setUnidadeForm((current) => ({ ...current, nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={unidadeForm.cnpj} onChange={(e) => setUnidadeForm((current) => ({ ...current, cnpj: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="relative">
                  <Input value={unidadeForm.cep} onChange={(e) => void handleCepUnidadeChange(e.target.value)} placeholder="00000-000" />
                  {(buscandoCepUnidade || geocodificandoUnidade) && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço</Label>
                <Input value={unidadeForm.endereco} onChange={(e) => setUnidadeForm((current) => ({ ...current, endereco: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={unidadeForm.cidade} onChange={(e) => setUnidadeForm((current) => ({ ...current, cidade: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input maxLength={2} value={unidadeForm.estado} onChange={(e) => setUnidadeForm((current) => ({ ...current, estado: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={unidadeForm.telefone} onChange={(e) => setUnidadeForm((current) => ({ ...current, telefone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={unidadeForm.whatsapp} onChange={(e) => setUnidadeForm((current) => ({ ...current, whatsapp: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={unidadeForm.email} onChange={(e) => setUnidadeForm((current) => ({ ...current, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={unidadeForm.responsavel} onChange={(e) => setUnidadeForm((current) => ({ ...current, responsavel: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Status</Label>
                <Select
                  value={unidadeForm.ativo ? "ATIVA" : "INATIVA"}
                  onValueChange={(value) => setUnidadeForm((current) => ({ ...current, ativo: value === "ATIVA" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVA">Ativa</SelectItem>
                    <SelectItem value="INATIVA">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 md:col-span-2 rounded-xl border border-slate-200 p-4">
                <div className="space-y-1">
                  <Label>Disponibilidade da unidade</Label>
                  <p className="text-xs text-slate-500">
                    Defina os períodos de atendimento de cada dia. Você pode cadastrar mais de uma janela no mesmo dia.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Duração padrão da vistoria (min)</Label>
                    <Input
                      type="number"
                      min={15}
                      step={5}
                      value={unidadeForm.duracao_padrao_minutos}
                      onChange={(e) => setUnidadeForm((current) => ({ ...current, duracao_padrao_minutos: Number(e.target.value || 0) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Janela entre vistorias (min)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={unidadeForm.intervalo_entre_vistorias_minutos}
                      onChange={(e) => setUnidadeForm((current) => ({ ...current, intervalo_entre_vistorias_minutos: Number(e.target.value || 0) }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {DIAS_ATENDIMENTO.map((dia) => {
                    const periodos = unidadeForm.horario_atendimento[dia.key] || [];
                    return (
                      <div key={dia.key} className="rounded-lg border border-slate-200 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{dia.label}</p>
                            <p className="text-xs text-slate-500">
                              {periodos.length > 0 ? `${periodos.length} período(s) configurado(s)` : "Sem períodos configurados"}
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="font-bold" onClick={() => adicionarPeriodoDia(dia.key)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar período
                          </Button>
                        </div>

                        {periodos.length > 0 ? (
                          <div className="space-y-2">
                            {periodos.map((periodo, index) => (
                              <div key={`${dia.key}-${index}`} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-500">Início</Label>
                                  <Input
                                    type="time"
                                    value={periodo.inicio}
                                    onChange={(e) => atualizarPeriodoDia(dia.key, index, "inicio", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-500">Fim</Label>
                                  <Input
                                    type="time"
                                    value={periodo.fim}
                                    onChange={(e) => atualizarPeriodoDia(dia.key, index, "fim", e.target.value)}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-slate-500 hover:text-red-600"
                                  onClick={() => removerPeriodoDia(dia.key, index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                            Nenhum período configurado para {dia.label.toLowerCase()}.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Localização confirmada</Label>
                    <p className="text-xs text-slate-500">
                      O CEP tenta posicionar automaticamente. Se necessário, arraste o pino ou clique no mapa para ajustar.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-bold"
                    onClick={() => void preencherCoordenadasUnidade()}
                    disabled={geocodificandoUnidade}
                  >
                    {geocodificandoUnidade ? "Localizando..." : "Atualizar no mapa"}
                  </Button>
                </div>
                <MapaLocalizacao
                  lat={unidadeForm.latitude}
                  lng={unidadeForm.longitude}
                  onChange={({ lat, lng }) =>
                    setUnidadeForm((current) => ({ ...current, latitude: lat, longitude: lng }))
                  }
                  height={300}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input value={unidadeForm.latitude ?? ""} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input value={unidadeForm.longitude ?? ""} readOnly />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnidadeModalOpen(false)}>Cancelar</Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => void handleSalvarUnidade()}>
              Salvar unidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={vistoriadorModalOpen}
        onOpenChange={(open) => {
          setVistoriadorModalOpen(open);
          if (!open) resetVistoriadorForm();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Vincular vistoriador</DialogTitle>
            <DialogDescription>
              Escolha o usuário vistoriador e defina em qual unidade ele ficará disponível para a agenda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário vistoriador</Label>
              <Select value={vistoriadorForm.usuario_id} onValueChange={(value) => setVistoriadorForm((current) => ({ ...current, usuario_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vistoriador" />
                </SelectTrigger>
                <SelectContent>
                  {vistoriadoresCadastro.map((vistoriador: any) => (
                    <SelectItem key={vistoriador.usuario_id} value={vistoriador.usuario_id}>
                      {vistoriador.nome}{vistoriador.unidade_nome ? ` - ${vistoriador.unidade_nome}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unidade credenciada</Label>
              <Select value={vistoriadorForm.unidade_id} onValueChange={(value) => setVistoriadorForm((current) => ({ ...current, unidade_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesCadastro
                    .filter((unidade: any) => unidade.ativo)
                    .map((unidade: any) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome} - {unidade.cidade}/{unidade.estado}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status do vínculo</Label>
              <Select value={vistoriadorForm.status} onValueChange={(value) => setVistoriadorForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVistoriadorModalOpen(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => void handleSalvarVistoriador()}>
              Salvar vistoriador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
