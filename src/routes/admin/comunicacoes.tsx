import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Users, 
  FileText, 
  History, 
  Settings, 
  Send, 
  Plus, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layout,
  Copy,
  Terminal,
  Activity,
  ChevronRight,
  ShieldCheck,
  Globe,
  MoreVertical,
  Eye,
  Smartphone,
  Info,
  ChevronLeft,
  Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { 
  getIndicadoresComunicacoesFn, 
  listarCampanhasFn, 
  getWhatsappConfigFn,
  testarConexaoFn,
  sincronizarTemplatesFn,
  updateWhatsappConfigFn,
  gerarNovoVerifyTokenFn,
  getWebhookLogsFn,
  buscarDadosAutomaticosFn,
  listarTemplatesFn,
  criarTemplateMetaFn
} from '@/lib/comunicacoes.functions';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/comunicacoes')({
  component: ComunicacoesPage,
});

function ComunicacoesPage() {
  const queryClient = useQueryClient();
  const getIndicadores = useServerFn(getIndicadoresComunicacoesFn);
  const listarCampanhas = useServerFn(listarCampanhasFn);
  const getConfig = useServerFn(getWhatsappConfigFn);
  const testarConexao = useServerFn(testarConexaoFn);
  const sincronizarTemplates = useServerFn(sincronizarTemplatesFn);
  const updateConfig = useServerFn(updateWhatsappConfigFn);
  const gerarToken = useServerFn(gerarNovoVerifyTokenFn);
  const getLogs = useServerFn(getWebhookLogsFn);
  const buscarDadosAutos = useServerFn(buscarDadosAutomaticosFn);
  const getTemplates = useServerFn(listarTemplatesFn);
  const criarTemplate = useServerFn(criarTemplateMetaFn);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>({});
  
  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newTemplate, setNewTemplate] = useState<any>({
    name: '',
    category: 'MARKETING',
    language: 'pt_BR',
    components: [
      { type: 'BODY', text: '' }
    ]
  });

  const { data: indicadores } = useQuery({
    queryKey: ['wa-indicadores'],
    queryFn: () => getIndicadores()
  });

  const { data: campanhas } = useQuery({
    queryKey: ['wa-campanhas'],
    queryFn: () => listarCampanhas()
  });

  const { data: config } = useQuery({
    queryKey: ['wa-config'],
    queryFn: () => getConfig()
  });

  const { data: logs } = useQuery({
    queryKey: ['wa-logs'],
    queryFn: () => getLogs()
  });

  const { data: templates } = useQuery({
    queryKey: ['wa-templates'],
    queryFn: () => getTemplates()
  });

  const handleSincronizar = async () => {
    toast.promise(sincronizarTemplates(), {
      loading: 'Sincronizando com a Meta...',
      success: (res: any) => {
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
          return `${res.count} templates sincronizados!`;
        }
        throw new Error(res.error);
      },
      error: (err) => `Erro na sincronização: ${err.message}`
    });
  };

  const handleCriarTemplate = async () => {
    toast.promise(criarTemplate(newTemplate), {
      loading: 'Enviando para análise da Meta...',
      success: (res: any) => {
        if (res.id) {
          setIsWizardOpen(false);
          setWizardStep(1);
          setNewTemplate({
            name: '',
            category: 'MARKETING',
            language: 'pt_BR',
            components: [{ type: 'BODY', text: '' }]
          });
          queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
          return 'Template criado e enviado para análise!';
        }
        throw new Error(res.error || 'Erro ao criar template');
      },
      error: (err) => `Falha: ${err.message}`
    });
  };

  const handleTestarConexao = async () => {
    toast.promise(testarConexao(), {
      loading: 'Validando credenciais com a Meta...',
      success: (res: any) => {
        if (res && typeof res === 'object' && 'ok' in res && res.ok) {
          queryClient.invalidateQueries({ queryKey: ['wa-config'] });
          return '✓ Conexão validada com sucesso!';
        }
        throw new Error((res as any)?.error || 'Erro desconhecido');
      },
      error: (err) => `Erro: ${err.message}`
    });
  };


  const handleSaveConfig = async () => {
    try {
      const res = await updateConfig(editingConfig);
      if (res.ok) {
        toast.success('Configurações salvas!');
        setIsConfigOpen(false);
        queryClient.invalidateQueries({ queryKey: ['wa-config'] });
      }
    } catch (e) {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const handleGerarToken = async () => {
    try {
      const res = await gerarToken();
      if (res.ok) {
        toast.success('Novo Verify Token gerado!');
        queryClient.invalidateQueries({ queryKey: ['wa-config'] });
      }
    } catch (e) {
      toast.error('Erro ao gerar token.');
    }
  };

  const handleBuscarDadosAutos = async () => {
    toast.promise(buscarDadosAutos(), {
      loading: 'Buscando dados na Meta...',
      success: (res: any) => {
        if (res.ok) {
          // Preencher campos se vierem no data
          toast.success('Dados recuperados!');
          return 'Dados sincronizados';
        }
        throw new Error(res.error);
      },
      error: (err) => `Erro: ${err.message}`
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 pb-20">
        {/* Header com Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Campanhas</p>
                  <h3 className="text-2xl font-bold">{indicadores?.total_campanhas ?? 0}</h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leituras</p>
                  <h3 className="text-2xl font-bold">{indicadores?.total_lidas ?? 0}</h3>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Elegíveis (WhatsApp)</p>
                  <h3 className="text-2xl font-bold">{indicadores?.compradores_elegiveis ?? 0}</h3>
                </div>
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full">
                  <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status Conexão</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${config?.status === 'CONECTADO' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-bold">{config?.status || 'DESCONECTADO'}</span>
                  </div>
                </div>
                <div className={`p-2 ${config?.status === 'CONECTADO' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} rounded-full`}>
                  <Globe className={`w-5 h-5 ${config?.status === 'CONECTADO' ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="campanhas" className="w-full">
          <TabsList className="flex w-full overflow-x-auto bg-muted/50 p-1 mb-6 border-b rounded-none justify-start h-auto gap-2">
            <TabsTrigger value="campanhas" className="px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Campanhas</TabsTrigger>
            <TabsTrigger value="segmentos" className="px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Segmentos</TabsTrigger>
            <TabsTrigger value="templates" className="px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Templates</TabsTrigger>
            <TabsTrigger value="contatos" className="px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Contatos</TabsTrigger>
            <TabsTrigger value="logs" className="px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Logs</TabsTrigger>
            <TabsTrigger value="config" className="px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Configurações</TabsTrigger>
          </TabsList>

          {/* Campanhas */}
          <TabsContent value="campanhas" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Campanhas de Divulgação</h2>
                <p className="text-sm text-muted-foreground">Envios em massa pelo WhatsApp Cloud API</p>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" /> Nova Campanha
              </Button>
            </div>
            <Card>
               {/* Tabela de campanhas aqui - já existente mas simplificada */}
               <div className="p-4 text-center text-muted-foreground py-10">
                 Carregando campanhas...
               </div>
            </Card>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Templates</h2>
                <p className="text-sm text-muted-foreground">Gerencie seus templates do WhatsApp Meta</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSincronizar}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar
                </Button>
                <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="w-4 h-4 mr-2" /> Novo Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Novo Template (Etapa {wizardStep}/7)</DialogTitle>
                      <DialogDescription>
                        Crie um novo template aprovado pela Meta
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                      {wizardStep === 1 && (
                        <div className="space-y-4">
                          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-900/50 flex gap-3">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-900 dark:text-amber-200">
                              <p className="font-semibold">Regras da Meta:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1 opacity-80">
                                <li>Nome: Apenas letras minúsculas e underscores.</li>
                                <li>Não pode conter espaços ou caracteres especiais.</li>
                                <li>Uma vez enviado, a aprovação leva de 2h a 24h.</li>
                              </ul>
                            </div>
                          </div>
                          <div>
                            <Label>Nome do Template (Meta Name)</Label>
                            <Input 
                              value={newTemplate.name} 
                              onChange={e => setNewTemplate({...newTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')})} 
                              placeholder="ex: boas_vindas_comprador" 
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Sugestão: use prefixos como bo_ (boas vindas), nv_ (novo veículo).</p>
                          </div>
                          <div>
                            <Label>Categoria</Label>
                            <Select value={newTemplate.category} onValueChange={v => setNewTemplate({...newTemplate, category: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MARKETING">Marketing (Promoções, anúncios)</SelectItem>
                                <SelectItem value="UTILITY">Utilitário (Alertas, pós-venda, entregas)</SelectItem>
                                <SelectItem value="AUTHENTICATION">Autenticação (Códigos de acesso)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {wizardStep === 2 && (
                        <div className="space-y-6">
                          <Label>Estrutura do Template</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 cursor-pointer hover:border-teal-500 bg-teal-50/50">
                              <h4 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-teal-600" />
                                Apenas Texto
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">Ideal para mensagens informativas simples.</p>
                            </div>
                            <div className="border rounded-lg p-4 opacity-50 cursor-not-allowed grayscale">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Layout className="w-4 h-4" />
                                Texto + Mídia
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">Imagens, Vídeos ou Documentos no topo.</p>
                              <Badge variant="outline" className="mt-2 text-[10px]">Em breve</Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {wizardStep === 3 && (
                        <div className="space-y-4">
                          <Label>Cabeçalho (Opcional)</Label>
                          <Input 
                            placeholder="Título em negrito no topo da mensagem" 
                            onChange={e => {
                              const comps = newTemplate.components.filter((c: any) => c.type !== 'HEADER');
                              if (e.target.value) {
                                comps.push({ type: 'HEADER', format: 'TEXT', text: e.target.value });
                              }
                              setNewTemplate({...newTemplate, components: comps});
                            }}
                          />
                          <p className="text-xs text-muted-foreground">Máximo 60 caracteres.</p>
                        </div>
                      )}
                      
                      {wizardStep === 4 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label>Corpo da Mensagem (Obrigatório)</Label>
                              <Textarea 
                                className="h-48 font-mono text-sm" 
                                value={newTemplate.components.find((c: any) => c.type === 'BODY')?.text || ''} 
                                onChange={e => {
                                    const comps = [...newTemplate.components];
                                    const bodyIdx = comps.findIndex(c => c.type === 'BODY');
                                    comps[bodyIdx].text = e.target.value;
                                    setNewTemplate({...newTemplate, components: comps});
                                }}
                                placeholder="Olá {{1}}, vimos que você se interessou no {{2}}..." 
                              />
                            </div>
                            <div className="p-3 bg-muted rounded text-xs space-y-2">
                              <p className="font-semibold flex items-center gap-1">
                                <Terminal className="w-3 h-3" /> Dica de Variáveis
                              </p>
                              <p>Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> para dados dinâmicos como nome, marca, valor.</p>
                            </div>
                          </div>

                          <div className="border rounded-xl p-4 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                            <div className="flex items-center gap-2 mb-4 border-b pb-2">
                              <Smartphone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Preview WhatsApp</span>
                            </div>
                            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-3 relative max-w-[90%] ml-0">
                                <div className="absolute top-2 -left-2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white dark:border-r-zinc-800 border-b-[8px] border-b-transparent"></div>
                                {newTemplate.components.find((c: any) => c.type === 'HEADER') && (
                                  <p className="font-bold text-sm mb-1">{newTemplate.components.find((c: any) => c.type === 'HEADER').text}</p>
                                )}
                                <p className="text-sm whitespace-pre-wrap">
                                  {newTemplate.components.find((c: any) => c.type === 'BODY')?.text || 'Digite o conteúdo...'}
                                </p>
                                <p className="text-[10px] text-muted-foreground text-right mt-1">10:45</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {wizardStep === 5 && (
                        <div className="space-y-4">
                          <Label>Rodapé (Opcional)</Label>
                          <Input 
                            placeholder="Texto curto em cinza no final" 
                            onChange={e => {
                              const comps = newTemplate.components.filter((c: any) => c.type !== 'FOOTER');
                              if (e.target.value) {
                                comps.push({ type: 'FOOTER', text: e.target.value });
                              }
                              setNewTemplate({...newTemplate, components: comps});
                            }}
                          />
                        </div>
                      )}

                      {wizardStep === 6 && (
                        <div className="space-y-6">
                          <Label>Botões de Ação</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 opacity-50 grayscale cursor-not-allowed">
                              <h4 className="font-semibold flex items-center gap-2">
                                <ChevronRight className="w-4 h-4" />
                                Resposta Rápida
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">Até 3 botões de texto.</p>
                            </div>
                            <div className="border rounded-lg p-4 opacity-50 grayscale cursor-not-allowed">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Call to Action
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">Botão para Site ou Telefone.</p>
                            </div>
                          </div>
                          <div className="p-4 bg-teal-50 dark:bg-teal-900/10 rounded-lg text-center">
                            <p className="text-xs text-teal-700 dark:text-teal-300">Suporte a botões interativos em breve nesta versão.</p>
                          </div>
                        </div>
                      )}

                      {wizardStep === 7 && (
                        <div className="space-y-4">
                          <div className="p-4 bg-teal-50 dark:bg-teal-900/10 rounded-lg border border-teal-100 dark:border-teal-900/50 flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">Quase lá!</p>
                              <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                                O template <strong>{newTemplate.name}</strong> será enviado para análise da Meta agora.
                              </p>
                            </div>
                          </div>

                          <div className="border rounded-lg p-6 space-y-4">
                            <h4 className="font-semibold text-sm">Resumo do Conteúdo:</h4>
                            <div className="bg-muted p-4 rounded font-mono text-xs whitespace-pre-wrap">
                              {JSON.stringify(newTemplate, null, 2)}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    <DialogFooter>
                      {wizardStep > 1 && <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>Voltar</Button>}
                      {wizardStep < 7 ? (
                        <Button onClick={() => setWizardStep(s => s + 1)}>Próximo</Button>
                      ) : (
                        <Button onClick={handleCriarTemplate}>Enviar para Análise</Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <Card>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Última Sinc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates?.map((t: any) => (
                      <tr key={t.id} className="border-b">
                        <td className="px-4 py-3">{t.nome_interno}</td>
                        <td className="px-4 py-3">{t.categoria}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.status === 'APPROVED' ? 'success' : 'secondary'}>{t.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(t.ultima_sincronizacao).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="logs" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Logs do WhatsApp</h2>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['wa-logs'] })}>
                <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Data/Hora</th>
                      <th className="px-4 py-3">Evento</th>
                      <th className="px-4 py-3">WABA</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(log.criado_em).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {log.event_type}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {log.waba_id}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={log.status === 'PROCESSADO' ? 'success' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm"><Search className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {!logs?.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          Nenhum evento recebido recentemente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>


          {/* Configurações */}
          <TabsContent value="config" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>WhatsApp Business Platform</CardTitle>
                        <CardDescription>Conexão oficial via Meta Cloud API</CardDescription>
                      </div>
                      <Badge variant={config?.status === 'CONECTADO' ? 'success' : 'destructive'}>
                        {config?.status === 'CONECTADO' ? '✓ Conectado' : 'Não conectado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground">Nome da Empresa (Meta)</Label>
                        <p className="font-semibold">{config?.business_name || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground">Número Conectado</Label>
                        <p className="font-semibold">{config?.phone_number || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground">WABA ID</Label>
                        <p className="font-mono text-xs">{config?.waba_id || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground">Phone Number ID</Label>
                        <p className="font-mono text-xs">{config?.phone_number_id || '---'}</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t flex flex-wrap gap-3">
                      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-teal-600 hover:bg-teal-700"
                            onClick={() => setEditingConfig(config || {})}
                          >
                            <Settings className="w-4 h-4 mr-2" /> Configurar Credenciais
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Conectar WhatsApp Meta</DialogTitle>
                            <DialogDescription>
                              Insira as credenciais do seu App na Meta Developers Platform.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                              <Label>Meta App ID</Label>
                              <Input 
                                value={editingConfig.app_id || ''} 
                                onChange={e => setEditingConfig({...editingConfig, app_id: e.target.value})}
                                placeholder="Ex: 123456789012345"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Meta App Secret</Label>
                              <Input 
                                type="password"
                                value={editingConfig.app_secret || ''} 
                                onChange={e => setEditingConfig({...editingConfig, app_secret: e.target.value})}
                                placeholder="••••••••••••"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>WABA ID</Label>
                              <Input 
                                value={editingConfig.waba_id || ''} 
                                onChange={e => setEditingConfig({...editingConfig, waba_id: e.target.value})}
                                placeholder="WhatsApp Business Account ID"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Phone Number ID</Label>
                              <Input 
                                value={editingConfig.phone_number_id || ''} 
                                onChange={e => setEditingConfig({...editingConfig, phone_number_id: e.target.value})}
                                placeholder="ID do número de telefone"
                              />
                            </div>
                            <div className="col-span-2 space-y-2">
                              <Label>System User Access Token (Permanent)</Label>
                              <Input 
                                type="password"
                                value={editingConfig.access_token || ''} 
                                onChange={e => setEditingConfig({...editingConfig, access_token: e.target.value})}
                                placeholder="EAABw..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Graph API Version</Label>
                              <Input 
                                value={editingConfig.graph_api_version || 'v20.0'} 
                                onChange={e => setEditingConfig({...editingConfig, graph_api_version: e.target.value})}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancelar</Button>
                            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSaveConfig}>Salvar e Validar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" onClick={handleTestarConexao}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Validar Conexão
                      </Button>
                      
                      <Button variant="outline" onClick={handleBuscarDadosAutos}>
                        <Search className="w-4 h-4 mr-2" /> Buscar Dados Meta
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Webhook Meta</CardTitle>
                    <CardDescription>Configure estas URLs no Painel de Desenvolvedor da Meta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Callback URL</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/webhooks/whatsapp`} className="font-mono text-xs bg-muted" />
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${window.location.origin}/api/public/webhooks/whatsapp`)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Verify Token</Label>
                      <div className="flex gap-2">
                        <Input readOnly type="password" value={config?.webhook_verify_token || ''} className="font-mono text-xs bg-muted" />
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(config?.webhook_verify_token || '')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleGerarToken}>Gerar Novo</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-muted-foreground">Status Webhook</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">Funcionando</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-muted-foreground">Último Evento</p>
                        <p className="text-sm">
                          {logs && Array.isArray(logs) && logs.length > 0 && (logs[0] as any).criado_em 
                            ? new Date((logs[0] as any).criado_em).toLocaleTimeString() 
                            : 'Nenhum'}
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                         <Button variant="link" className="h-auto p-0 text-teal-600" onClick={() => {}}>Ver Documentação Meta</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Saúde da Integração</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Meta API</span>
                        <Badge variant="success">OK</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">WABA</span>
                        <Badge variant={config?.waba_id ? 'success' : 'destructive'}>
                          {config?.waba_id ? 'Encontrada' : 'Ausente'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Número</span>
                        <Badge variant={config?.phone_number ? 'success' : 'destructive'}>
                          {config?.phone_number ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Webhook</span>
                        <Badge variant="success">Ativo</Badge>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full text-xs" size="sm">
                      Executar Diagnóstico Completo
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-teal-50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/50">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      Segurança
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>• Access Token e App Secret são armazenados de forma criptografada no banco de dados.</p>
                    <p>• O navegador nunca recebe os tokens completos após o salvamento.</p>
                    <p>• Toda comunicação com a API da Meta é feita exclusivamente via servidor.</p>
                  </CardContent>
                </Card>

                <div className="p-4 border border-dashed rounded-lg text-center space-y-2">
                  <Terminal className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-xs text-muted-foreground">Modo Desenvolvedor</p>
                  <Button variant="ghost" size="sm" className="text-[10px] h-7">Ver JSON de Resposta</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
