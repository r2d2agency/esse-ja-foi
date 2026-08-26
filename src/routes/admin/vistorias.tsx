import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  criarAgendamentoVistoriaFn,
  getUnidadesCadastroFn,
  getUnidadesDisponiveisFn,
  getVeiculosAguardandoVistoriaFn,
  getVistoriadoresCadastroFn,
  getVistoriadoresUnidadeFn,
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
  const [vistoriadorId, setVistoriadorId] = useState("");
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
    telefone: "",
    whatsapp: "",
    email: "",
    responsavel: "",
    ativo: true,
  });
  const [vistoriadorForm, setVistoriadorForm] = useState({
    usuario_id: "",
    unidade_id: "",
    status: "ATIVO",
  });
  
  const getVistorias = useServerFn(getVistoriasAdminFn);
  const getAguardando = useServerFn(getVeiculosAguardandoVistoriaFn);
  const getFilaPosVistoria = useServerFn(getFilaAnalisePosVistoriaFn);
  const getUnidades = useServerFn(getUnidadesDisponiveisFn);
  const getVistoriadores = useServerFn(getVistoriadoresUnidadeFn);
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

  const { data: vistoriadoresRes, isLoading: loadingVistoriadores } = useQuery({
    queryKey: ["vistoriadores-unidade", unidadeId],
    queryFn: () => getVistoriadores({ data: { unidadeId } }),
    enabled: agendaOpen && !!unidadeId,
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
  const vistoriadores = vistoriadoresRes?.data || [];
  const unidadesCadastro = unidadesCadastroRes?.data || [];
  const vistoriadoresCadastro = vistoriadoresCadastroRes?.data || [];
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
    setVistoriadorId("");
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
      telefone: "",
      whatsapp: "",
      email: "",
      responsavel: "",
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
        telefone: unidade.telefone || "",
        whatsapp: unidade.whatsapp || "",
        email: unidade.email || "",
        responsavel: unidade.responsavel || "",
        ativo: unidade.ativo ?? true,
      });
    } else {
      resetUnidadeForm();
    }
    setUnidadeModalOpen(true);
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
    if (unidades.length === 1 && !unidadeId) {
      setUnidadeId(unidades[0].id);
    }
  }, [unidades, unidadeId]);

  useEffect(() => {
    if (vistoriadores.length === 1 && !vistoriadorId) {
      setVistoriadorId(vistoriadores[0].id);
    }
  }, [vistoriadores, vistoriadorId]);

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
    if (!unidadeId || !dataVistoria || !horarioVistoria) {
      toast.error("Preencha unidade, data e horário.");
      return;
    }

    const toastId = toast.loading("Criando agendamento...");
    const vistoriadorIdNormalizado = vistoriadorId === "__sem_vistoriador__" ? null : (vistoriadorId || null);
    try {
      const response = await criarAgendamento({
        data: {
          veiculo_id: veiculoSelecionado.id,
          vendedor_id: veiculoSelecionado.vendedor_id,
          unidade_id: unidadeId,
          vistoriador_id: vistoriadorIdNormalizado,
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

    const toastId = toast.loading(unidadeForm.id ? "Atualizando unidade..." : "Criando unidade...");
    try {
      const response = await salvarUnidadeCadastro({
        data: {
          ...unidadeForm,
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
      await queryClient.invalidateQueries({ queryKey: ["vistoriadores-unidade"] });
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
                    <Link to="/admin/usuarios">
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
              Defina unidade, vistoriador, data e horário para o veículo seguir da triagem para a inspeção física.
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
                  <Select value={unidadeId} onValueChange={setUnidadeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingUnidades ? "Carregando unidades..." : "Selecione a unidade"} />
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
                    <p className="text-xs text-amber-700">Nenhuma unidade ativa encontrada para essa cidade.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Vistoriador</Label>
                  <Select value={vistoriadorId} onValueChange={setVistoriadorId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingVistoriadores ? "Carregando vistoriadores..." : "Selecione ou deixe em aberto"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__sem_vistoriador__">Definir depois</SelectItem>
                      {vistoriadores.map((vistoriador: any) => (
                        <SelectItem key={vistoriador.id} value={vistoriador.id}>
                          {vistoriador.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!!vistoriadorId && vistoriadorId === "__sem_vistoriador__" && (
                    <p className="text-xs text-slate-500">O agendamento será criado sem vistoriador fixo.</p>
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
                </div>

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={horarioVistoria}
                    onChange={(e) => setHorarioVistoria(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={fecharAgenda}>Cancelar</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => void handleCriarAgendamento()}
              disabled={!veiculoSelecionado || !unidadeId || !dataVistoria || !horarioVistoria}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{unidadeForm.id ? "Editar unidade credenciada" : "Nova unidade credenciada"}</DialogTitle>
            <DialogDescription>
              Cadastre o local que ficará disponível para receber agendamentos de vistoria.
            </DialogDescription>
          </DialogHeader>

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
              <Input value={unidadeForm.cep} onChange={(e) => setUnidadeForm((current) => ({ ...current, cep: e.target.value }))} />
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
