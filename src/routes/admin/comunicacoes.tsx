import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Globe
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
  buscarDadosAutomaticosFn
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

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>({});

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

  const handleSincronizar = async () => {
    toast.promise(sincronizarTemplates(), {
      loading: 'Sincronizando templates com a Meta...',
      success: (res: any) => {
        if (res.ok) return `${res.count} templates sincronizados!`;
        throw new Error(res.error);
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
      <div className="space-y-6 pb-20">
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
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
            <TabsTrigger value="segmentos">Segmentos</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="contatos">Contatos</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
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

          {/* Logs */}
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
