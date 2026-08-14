import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDetalheAnaliseVistoriaFn, enviarPropostaVendedorFn } from "@/lib/analise-pos-vistoria.functions";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, Info, Camera, 
  FileText, LayoutDashboard, History, Comparison, DollarSign,
  Gavel, Check, X, Search
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analise-vistoria/$id")({
  component: DetalheAnaliseVistoriaPage,
});

function DetalheAnaliseVistoriaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("resumo");
  const [comissaoPercent, setComissaoPercent] = useState(5);
  const [valorMinimo, setValorMinimo] = useState(0);
  const [valorReferencia, setValorReferencia] = useState(0);

  const getDetalhe = useServerFn(getDetalheAnaliseVistoriaFn);
  const enviarProposta = useServerFn(enviarPropostaVendedorFn);

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["admin-analise-vistoria", id],
    queryFn: () => getDetalhe({ data: { veiculoId: id } })
  });

  const liquidEstimado = useMemo(() => {
    const comissao = (valorMinimo * comissaoPercent) / 100;
    return valorMinimo - comissao;
  }, [valorMinimo, comissaoPercent]);

  if (isLoading) return <div className="p-8">Carregando análise...</div>;
  if (!res?.ok || !res.data) return <div className="p-8 text-red-500">Erro: {res?.message || "Veículo não encontrado"}</div>;

  const { veiculo, vistoria, checklist, fotos, propostas } = res.data;

  const handleEnviar = async () => {
    if (!valorMinimo) {
      toast.error("Informe o valor mínimo.");
      return;
    }

    const tId = toast.loading("Enviando proposta...");
    try {
      const resEnvia = await enviarProposta({
        data: {
          veiculo_id: id,
          valor_referencia: valorReferencia || 0,
          valor_minimo_acordado: valorMinimo,
          comissao_tipo: 'PERCENTUAL',
          comissao_valor: (valorMinimo * comissaoPercent) / 100,
          valor_liquido_vendedor: liquidEstimado,
          usuario_id: user?.id || ''
        }
      });
      if (resEnvia.ok) {
        toast.success("Proposta enviada ao vendedor!", { id: tId });
        refetch();
      } else {
        toast.error(resEnvia.message, { id: tId });
      }
    } catch (err) {
      toast.error("Erro técnico.", { id: tId });
    }
  };

  const statusConformidade = (itemStatus: string) => {
    switch (itemStatus) {
      case 'CONFORME': return <Badge className="bg-green-50 text-green-700 hover:bg-green-50 text-[10px] font-bold">CONFORME</Badge>;
      case 'COM_OBSERVACAO': return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px] font-bold">COM OBSERVAÇÃO</Badge>;
      case 'NAO_CONFORME': return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 text-[10px] font-bold">NÃO CONFORME</Badge>;
      default: return <Badge variant="outline" className="text-[10px] font-bold">N/A</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin/vistorias" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
             <h1 className="text-xl font-black text-slate-950 uppercase">{veiculo.marca} {veiculo.modelo}</h1>
             <div className="flex items-center gap-2 mt-1">
               <Badge variant="outline" className="font-mono text-[10px]">{veiculo.placa}</Badge>
               <Badge className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                 {veiculo.status_analise.replace(/_/g, ' ')}
               </Badge>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="font-bold border-red-200 text-red-600 hover:bg-red-50">
             Solicitar revisão
           </Button>
           <Button onClick={() => setActiveTab('decisao')} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
             Concluir Análise
           </Button>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
        <TabsList className="bg-transparent border-none h-12 gap-6 p-0">
          {["Resumo", "Checklist", "Fotos", "Comparativo", "Valores", "Decisao", "Historico"].map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab.toLowerCase()}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={cn(
                "bg-transparent border-none p-0 h-full rounded-none font-bold text-xs uppercase tracking-wider",
                activeTab === tab.toLowerCase() ? "text-teal-600 border-b-2 border-teal-600" : "text-slate-400"
              )}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'resumo' && (
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-slate-200 shadow-none">
                <CardHeader><CardTitle className="text-xs font-black uppercase text-slate-400">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Itens verificados</span>
                    <span className="font-black text-slate-900">{checklist.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Conformes</span>
                    <span className="font-black text-green-600">{checklist.filter((i:any) => i.status === 'CONFORME').length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Apontamentos</span>
                    <span className="font-black text-red-600">{checklist.filter((i:any) => i.status !== 'CONFORME').length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-slate-200 shadow-none">
                <CardHeader><CardTitle className="text-xs font-black uppercase text-slate-400 tracking-wider">Observação Geral do Vistoriador</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-slate-700 italic">
                    "{vistoria?.observacao_geral || 'Nenhuma observação registrada.'}"
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'checklist' && (
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-0">
                 <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Etapa / Item</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {checklist.map((item: any) => (
                        <tr key={item.id} className={cn("hover:bg-slate-50/50", item.status !== 'CONFORME' && "bg-amber-50/20")}>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                               <span className="text-[10px] text-slate-400 font-black uppercase">{item.etapa}</span>
                               <span className="text-sm font-bold text-slate-900">{item.item_chave.replace(/_/g, ' ')}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">{statusConformidade(item.status)}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{item.observacao || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'valores' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="grid grid-cols-2 gap-4">
                 <Card className="bg-slate-50 border-none">
                    <CardContent className="p-6">
                       <p className="text-[10px] font-black uppercase text-slate-400">Desejado pelo Vendedor</p>
                       <p className="text-2xl font-black text-slate-900">R$ {Number(veiculo.valor_interesse_cliente).toLocaleString()}</p>
                    </CardContent>
                 </Card>
                 <Card className="bg-teal-50 border-none">
                    <CardContent className="p-6">
                       <p className="text-[10px] font-black uppercase text-teal-600">Líquido Vendedor (Estimado)</p>
                       <p className="text-2xl font-black text-teal-600">R$ {liquidEstimado.toLocaleString()}</p>
                    </CardContent>
                 </Card>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-500">Valor de Referência (Anúncio)</label>
                     <Input 
                       type="number" 
                       placeholder="Ex: 108000" 
                       value={valorReferencia} 
                       onChange={(e) => setValorReferencia(Number(e.target.value))}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-500">Valor Mínimo Acordado</label>
                     <Input 
                       type="number" 
                       placeholder="Ex: 103000"
                       value={valorMinimo} 
                       onChange={(e) => setValorMinimo(Number(e.target.value))}
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500">Comissão Esse Já Foi (%)</label>
                       <Input 
                         type="number" 
                         value={comissaoPercent} 
                         onChange={(e) => setComissaoPercent(Number(e.target.value))} 
                       />
                    </div>
                 </div>

                 <div className="space-y-2 pt-4">
                    <Button onClick={handleEnviar} className="w-full h-12 bg-slate-950 hover:bg-slate-900 text-white font-bold text-base uppercase tracking-widest">
                       Enviar proposta ao vendedor
                    </Button>
                    <p className="text-[10px] text-center text-slate-400 font-medium">O Vendedor receberá as condições comerciais para aceite ou recusa.</p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
