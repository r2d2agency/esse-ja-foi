import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVeiculoDetalheAdminFn, assumirAnaliseVeiculoFn, atualizarStatusAnaliseFn, atualizarStatusDocumentoVeiculoFn } from "@/lib/admin-veiculo-detalhe.functions";
import { salvarConfiguracaoLeilao } from "@/lib/leilao.functions";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Car, 
  User, 
  MapPin, 
  DollarSign, 
  FileText, 
  Camera, 
  ShieldCheck, 
  History, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  RotateCcw,
  Maximize2,
  Calendar,
  Gavel,
  MessageSquare,
  Calculator
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/veiculo/$id")({
  component: DetalheVeiculoAdminPage,
});

function DetalheVeiculoAdminPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("resumo");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectObservation, setRejectObservation] = useState("");
  const queryClient = useQueryClient();
  
  const getDetalhe = useServerFn(getVeiculoDetalheAdminFn);
  const assumir = useServerFn(assumirAnaliseVeiculoFn);
  const atualizarStatus = useServerFn(atualizarStatusAnaliseFn);
  const atualizarStatusDoc = useServerFn(atualizarStatusDocumentoVeiculoFn);

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["admin-veiculo-detalhe", id],
    queryFn: () => getDetalhe({ data: { id } })
  });

  if (isLoading) return <div className="p-8">Carregando detalhes...</div>;
  if (!res?.ok || !res.data) return <div className="p-8 text-red-500">Erro: {res?.message || "Veículo não encontrado"}</div>;

  const v = res.data;
  const historico = res.historico || [];

  const handleAssumir = async () => {
    if (!user?.id) return;
    const toastId = toast.loading("Assumindo análise...");
    try {
      const res = await assumir({ data: { veiculoId: id, responsavelId: user.id } });
      if (res.ok) {
        toast.success("Você agora é o responsável por esta análise.", { id: toastId });
        refetch();
      } else {
        toast.error("Erro ao assumir análise", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro técnico ao assumir análise.", { id: toastId });
    }
  };

  const handleMudarStatus = async (novoStatus: string) => {
    if (!user?.id) return;
    const toastId = toast.loading("Atualizando status...");
    try {
      const res = await atualizarStatus({ 
        data: { 
          veiculoId: id, 
          status: novoStatus, 
          responsavelId: user.id 
        } 
      });
      if (res.ok) {
        toast.success(`Status alterado para ${novoStatus}`, { id: toastId });
        refetch();
      } else {
        toast.error("Erro ao atualizar status", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro técnico", { id: toastId });
    }
  };

  const handleAprovarDocumento = async () => {
    if (!user?.id) return;
    const toastId = toast.loading("Aprovando CRLV-e...");
    try {
      const res = await atualizarStatusDoc({ 
        data: { 
          veiculoId: id, 
          perfilId: v.perfil_id,
          documentoTipo: 'CRLV',
          status: 'APROVADO',
          responsavelId: user.id
        } 
      });
      if (res.ok) {
        toast.success("CRLV-e aprovado com sucesso.", { id: toastId });
        setShowApproveDialog(false);
        queryClient.invalidateQueries({ queryKey: ["admin-veiculo-detalhe", id] });
        queryClient.invalidateQueries({ queryKey: ["onboarding-status", v.perfil_id] });
      } else {
        toast.error("Erro ao aprovar documento", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro técnico.", { id: toastId });
    }
  };

  const handleSolicitarNovoEnvio = async () => {
    if (!user?.id) return;
    if (!rejectReason) {
      toast.error("Por favor, selecione um motivo.");
      return;
    }
    const toastId = toast.loading("Enviando solicitação...");
    try {
      const res = await atualizarStatusDoc({ 
        data: { 
          veiculoId: id, 
          perfilId: v.perfil_id,
          documentoTipo: 'CRLV',
          status: 'NOVO_ENVIO_SOLICITADO',
          motivo: rejectReason,
          observacao: rejectObservation,
          responsavelId: user.id
        } 
      });
      if (res.ok) {
        toast.success("Solicitação enviada com sucesso.", { id: toastId });
        setShowRejectDialog(false);
        setRejectReason("");
        setRejectObservation("");
        queryClient.invalidateQueries({ queryKey: ["admin-veiculo-detalhe", id] });
        queryClient.invalidateQueries({ queryKey: ["onboarding-status", v.perfil_id] });
      } else {
        toast.error("Erro ao solicitar novo envio", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro técnico.", { id: toastId });
    }
  };

  const fotos = typeof v.fotos === 'string' ? JSON.parse(v.fotos) : (v.fotos || []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin/veiculos" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-950 uppercase">{v.marca} {v.modelo}</h1>
              <Badge variant="outline" className="font-mono">{v.placa}</Badge>
              <Badge className={cn(
                "uppercase font-bold text-[10px]",
                v.status_analise === 'PRONTO_PARA_VISTORIA' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                v.status_analise === 'AGUARDANDO_ANALISE' ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                "bg-blue-100 text-blue-700 hover:bg-blue-100"
              )}>
                {v.status_analise.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              ID: VEI-{v.id.substring(0,6).toUpperCase()} • {v.ano_modelo || 'N/A'} • {v.km ? `${v.km.toLocaleString()} km` : 'KM não informado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="font-bold border-teal-200 text-teal-700 hover:bg-teal-50"
            onClick={() => navigate({ to: "/admin/comunicacoes" as any })}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Divulgar no WhatsApp
          </Button>

          {!v.responsavel_analise_id ? (
            <Button onClick={handleAssumir} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              <User className="mr-2 h-4 w-4" /> Assumir análise
            </Button>
          ) : (
            <div className="text-right mr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</p>
              <p className="text-sm font-bold text-slate-700">{v.responsavel_nome}</p>
            </div>
          )}
          
          <Button variant="outline" className="font-bold border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleMudarStatus('REPROVADO')}>
            <XCircle className="mr-2 h-4 w-4" /> Reprovar
          </Button>
          
          {v.status_analise === 'VISTORIADO' ? (
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              onClick={() => navigate({ to: `/admin/veiculo/${id}/pos-vistoria` } as any)}
            >
              <Calculator className="mr-2 h-4 w-4" /> Análise Pós-Vistoria
            </Button>
          ) : v.status_analise === 'PRONTO_PARA_VISTORIA' ? (
            <Button 
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              onClick={() => navigate({ to: "/admin/vistorias" })}
            >
              <Calendar className="mr-2 h-4 w-4" /> Agendar vistoria
            </Button>
          ) : (
            <Button 
              className="bg-slate-950 hover:bg-slate-900 text-white font-bold"
              disabled={v.status_analise === 'PRONTO_PARA_VISTORIA' || !res.validacao?.ready}
              onClick={() => handleMudarStatus('PRONTO_PARA_VISTORIA')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Liberar para vistoria
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
            <TabsList className="bg-transparent border-none h-12 gap-6 p-0">
              {["Resumo", "Dados", "Documentação", "Condição", "Fotos", "Valores", "Análise", "Histórico"].map((tab) => (
                <TabsTrigger 
                  key={tab} 
                  value={tab.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}
                  className="bg-transparent border-none p-0 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-600 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none font-bold text-xs uppercase tracking-wider text-slate-400"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <TabsContent value="resumo" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-slate-200 shadow-none">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                        <Car className="h-3 w-3" /> Veículo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <p className="text-xl font-black text-slate-950">{v.marca} {v.modelo}</p>
                        <p className="text-sm font-bold text-slate-500">{v.ano_fabricacao || '-'}/{v.ano_modelo || '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div><p className="text-slate-400 font-medium">Placa</p><p className="font-bold font-mono">{v.placa}</p></div>
                        <div><p className="text-slate-400 font-medium">KM</p><p className="font-bold">{v.km ? v.km.toLocaleString() : '-'} km</p></div>
                        <div><p className="text-slate-400 font-medium">Cor</p><p className="font-bold">{v.cor || '-'}</p></div>
                        <div><p className="text-slate-400 font-medium">Câmbio</p><p className="font-bold">{v.cambio || '-'}</p></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-none">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                        <User className="h-3 w-3" /> Vendedor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                          {v.vendedor_nome?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-950">{v.vendedor_nome}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="h-3 w-3 text-green-600" />
                            <span className="text-[10px] font-bold text-green-600 uppercase">Verificado</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div><p className="text-slate-400 font-medium">Compliance</p><p className="font-bold text-teal-600">✓ Aprovado</p></div>
                        <div><p className="text-slate-400 font-medium">Contrato</p><p className="font-bold text-teal-600">✓ Assinado</p></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-200 shadow-none">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                      <DollarSign className="h-3 w-3" /> Valores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-950">R$ {v.valor_interesse_cliente?.toLocaleString()}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Valor desejado pelo vendedor</span>
                    </div>
                  </CardContent>
                </Card>

                {v.status_analise === 'APROVADO' && (
                  <AuctionConfigCard veiculo={v} />
                )}
              </TabsContent>


              <TabsContent value="dados" className="mt-0">
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100">
                      {[
                        { label: "Placa", value: v.placa },
                        { label: "Renavam", value: v.renavam || "Não informado" },
                        { label: "Marca", value: v.marca },
                        { label: "Modelo", value: v.modelo },
                        { label: "Versão", value: v.versao || "-" },
                        { label: "Ano Fabricação", value: v.ano_fabricacao || "-" },
                        { label: "Ano Modelo", value: v.ano_modelo || "-" },
                        { label: "Cor", value: v.cor || "-" },
                        { label: "Combustível", value: v.combustivel || "-" },
                        { label: "Câmbio", value: v.cambio || "-" },
                        { label: "KM", value: v.km ? v.km.toLocaleString() : "-" },
                        { label: "Cidade/UF", value: `${v.cidade || '-'}/${v.uf || '-'}` },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                          <p className="text-sm font-bold text-slate-700">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 space-y-4">
                      <h3 className="text-sm font-black uppercase text-slate-950">Proprietário</h3>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-teal-500 bg-teal-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <span className="text-sm font-bold text-slate-700">Veículo em nome do vendedor</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documentacao" className="mt-0 space-y-6">
                <Card className="border-slate-200 shadow-none">
                  <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                      <FileText className="h-3 w-3" /> CRLV-e
                    </CardTitle>
                    <Badge className={cn(
                      "uppercase text-[10px] font-bold",
                      v.vendedor_crlv_status === 'APROVADO' ? "bg-green-100 text-green-700" :
                      v.vendedor_crlv_status === 'NOVO_ENVIO_SOLICITADO' ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {v.vendedor_crlv_status === 'APROVADO' ? '✓ Aprovado' : 
                       v.vendedor_crlv_status === 'NOVO_ENVIO_SOLICITADO' ? 'Novo envio solicitado' : 
                       'Aguardando Análise'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex gap-8">
                      <div className="flex-1 max-w-sm aspect-[3/4] bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center group cursor-pointer hover:bg-slate-50 transition-colors">
                        {v.vendedor_crlv ? (
                          <div className="w-full h-full relative group">
                            <img src={v.vendedor_crlv} alt="CRLV" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="secondary" size="sm" className="font-bold">
                                <Eye className="mr-2 h-4 w-4" /> Visualizar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <FileText className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-sm font-bold">Nenhum documento anexado</p>
                          </>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dados para conferência</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-500 font-medium">Placa</span>
                              <span className="text-sm font-bold font-mono">{v.placa}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-500 font-medium">Renavam</span>
                              <span className="text-sm font-bold">{v.renavam || 'Não informado'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-500 font-medium">Proprietário</span>
                              <span className="text-sm font-bold">{v.vendedor_nome}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {v.vendedor_crlv_status !== 'APROVADO' && (
                            <>
                              <Button 
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold w-full"
                                onClick={() => setShowApproveDialog(true)}
                              >
                                Aprovar documento
                              </Button>
                              <Button 
                                variant="outline" 
                                className="font-bold w-full"
                                onClick={() => setShowRejectDialog(true)}
                              >
                                Solicitar novo envio
                              </Button>
                            </>
                          )}
                          {v.vendedor_crlv_status === 'APROVADO' && (
                            <Button 
                              variant="outline" 
                              className="font-bold w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => setShowRejectDialog(true)}
                            >
                              Reabrir análise / Solicitar novo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fotos" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {fotos.length > 0 ? fotos.map((foto: string, idx: number) => (
                    <div key={idx} className="aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden group relative">
                      <img src={foto} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <div className="flex gap-1">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white p-1 h-6 w-6"><ShieldCheck className="h-3 w-3" /></Button>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white p-1 h-6 w-6"><RotateCcw className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-white/90 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase text-slate-500 text-center truncate">Categoria foto</p>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-12 text-center text-slate-400">Nenhuma foto cadastrada.</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analise" className="mt-0 space-y-6">
                <Card className="border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase text-slate-950">Checklist de conclusão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vendedor</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-bold text-slate-700">Compliance</span>
                          <span className="text-xs font-black text-green-600 uppercase">✓ Aprovado</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-bold text-slate-700">Contrato</span>
                          <span className="text-xs font-black text-green-600 uppercase">✓ Assinado</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Veículo</h4>
                      <div className="space-y-2">
                        {[
                          { 
                            label: "Dados cadastrais", 
                            status: res.progresso?.dadosCadastrais?.isCompleto ? "CONCLUÍDO" : "PENDENTE", 
                            color: res.progresso?.dadosCadastrais?.isCompleto ? "text-green-600" : "text-amber-600",
                            pendencias: res.progresso?.dadosCadastrais?.pendencias
                          },
                          { 
                            label: "CRLV-e", 
                            status: v.vendedor_crlv_status === 'APROVADO' ? "CONCLUÍDO" : "PENDENTE", 
                            color: v.vendedor_crlv_status === 'APROVADO' ? "text-green-600" : "text-amber-600" 
                          },
                          { 
                            label: "Fotos obrigatórias", 
                            status: res.progresso?.fotos?.isCompleto ? "CONCLUÍDO" : "PENDENTE", 
                            color: res.progresso?.fotos?.isCompleto ? "text-green-600" : "text-amber-600",
                            info: `${res.progresso?.fotos?.total || 0} de ${res.progresso?.fotos?.minimo || 4} enviadas`
                          },
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm font-bold text-slate-700">{item.label}</span>
                              <div className="flex items-center gap-3">
                                {item.label === "Dados cadastrais" && item.status === "PENDENTE" && (
                                  <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] font-black uppercase text-teal-600"
                                    onClick={() => setActiveTab("dados")}
                                  >
                                    Revisar dados
                                  </Button>
                                )}
                                <span className={cn("text-xs font-black uppercase", item.color)}>{item.status}</span>
                              </div>
                            </div>
                            
                            {item.info && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{item.info}</p>
                            )}

                            {item.pendencias && item.pendencias.length > 0 && (
                              <div className="pl-2 border-l-2 border-amber-200 mt-1">
                                <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Pendências:</p>
                                <ul className="space-y-0.5">
                                  {item.pendencias.map((p: string, i: number) => (
                                    <li key={i} className="text-[10px] text-amber-600 font-medium">• {p}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button 
                        className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black h-12 uppercase tracking-tight" 
                        disabled={v.status_analise === 'PRONTO_PARA_VISTORIA' || !res.validacao?.ready} 
                        onClick={() => handleMudarStatus('PRONTO_PARA_VISTORIA')}
                      >
                        {res.validacao?.ready ? "Liberar para vistoria" : "Requisitos pendentes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="historico" className="mt-0">
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="p-6">
                    <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                      {historico.length > 0 ? historico.map((log: any, idx: number) => (
                        <div key={idx} className="relative pl-8">
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-slate-200" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(log.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                            <p className="text-sm font-bold text-slate-700">{log.acao}</p>
                            <p className="text-xs text-slate-500">{log.detalhe}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-slate-400 italic text-sm">Nenhum histórico registrado.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>
      </div>
      {/* Modais de Documentação */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar CRLV-e?</DialogTitle>
            <DialogDescription>
              Confirme que o documento foi conferido e está válido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAprovarDocumento}>Aprovar documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar novo CRLV-e</DialogTitle>
            <DialogDescription>
              Informe o motivo pelo qual o documento foi rejeitado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da solicitação</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Documento ilegível">Documento ilegível</SelectItem>
                  <SelectItem value="Documento incompleto">Documento incompleto</SelectItem>
                  <SelectItem value="Documento divergente">Documento divergente</SelectItem>
                  <SelectItem value="Documento desatualizado">Documento desatualizado</SelectItem>
                  <SelectItem value="Dados não conferem">Dados não conferem</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(rejectReason === 'Outro' || rejectReason) && (
              <div className="space-y-2">
                <Label>Observação complementar</Label>
                <Textarea 
                  placeholder={rejectReason === 'Outro' ? "Descreva o motivo..." : "Observações adicionais..."}
                  value={rejectObservation}
                  onChange={(e) => setRejectObservation(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSolicitarNovoEnvio}>Solicitar novo envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuctionConfigCard({ veiculo }: { veiculo: any }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    lance_inicial: veiculo.valor_anuncio || 0,
    incremento_minimo: 500,
    inicio_em: new Date().toISOString().slice(0, 16),
    fim_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    prorrogacao_ativa: true,
    prorrogacao_janela_segundos: 120,
    prorrogacao_tempo_segundos: 120,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => salvarConfiguracaoLeilao({ data }),
    onSuccess: () => {
      toast.success("Leilão configurado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-veiculo-detalhe", veiculo.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao configurar leilão.");
    }
  });

  return (
    <Card className="border-teal-100 bg-teal-50/30 shadow-none mt-6">
      <CardHeader className="pb-3 border-b border-teal-100/50">
        <CardTitle className="text-xs font-black uppercase text-teal-600 flex items-center gap-2">
          <Gavel className="h-3 w-3" /> Configurar Leilão Competitivo
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Lance Inicial (R$)</Label>
            <Input 
              type="number" 
              value={config.lance_inicial} 
              onChange={e => setConfig({...config, lance_inicial: Number(e.target.value)})}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Incremento Mínimo (R$)</Label>
            <Input 
              type="number" 
              value={config.incremento_minimo} 
              onChange={e => setConfig({...config, incremento_minimo: Number(e.target.value)})}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Início</Label>
            <Input 
              type="datetime-local" 
              value={config.inicio_em} 
              onChange={e => setConfig({...config, inicio_em: e.target.value})}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Encerramento</Label>
            <Input 
              type="datetime-local" 
              value={config.fim_em} 
              onChange={e => setConfig({...config, fim_em: e.target.value})}
              className="bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-teal-100">
          <div className="space-y-0.5">
            <Label className="text-xs font-bold text-slate-700">Prorrogação Automática (Anti-Sniping)</Label>
            <p className="text-[10px] text-slate-500">Adiciona tempo se houver lances no final.</p>
          </div>
          <Switch 
            checked={config.prorrogacao_ativa} 
            onCheckedChange={checked => setConfig({...config, prorrogacao_ativa: checked})} 
          />
        </div>

        <Button 
          onClick={() => mutation.mutate({ ...config, anuncio_id: veiculo.anuncio_id || veiculo.id })}
          disabled={mutation.isPending}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black uppercase tracking-tight h-12"
        >
          {mutation.isPending ? "Configurando..." : "Ativar Leilão Agora"}
        </Button>
      </CardContent>
    </Card>
  );
}
