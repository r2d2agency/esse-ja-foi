import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Layout
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { 
  getIndicadoresComunicacoesFn, 
  listarCampanhasFn, 
  getWhatsappConfigFn,
  testarConexaoFn,
  sincronizarTemplatesFn
} from '@/lib/comunicacoes.functions';
import { toast } from 'sonner';

export default function ComunicacoesPage() {
  const getIndicadores = useServerFn(getIndicadoresComunicacoesFn);
  const listarCampanhas = useServerFn(listarCampanhasFn);
  const getConfig = useServerFn(getWhatsappConfigFn);
  const testarConexao = useServerFn(testarConexaoFn);
  const sincronizarTemplates = useServerFn(sincronizarTemplatesFn);

  const { data: indicadores, isLoading: loadingIndicadores } = useQuery({
    queryKey: ['wa-indicadores'],
    queryFn: () => getIndicadores()
  });

  const { data: campanhas, isLoading: loadingCampanhas } = useQuery({
    queryKey: ['wa-campanhas'],
    queryFn: () => listarCampanhas()
  });

  const { data: config } = useQuery({
    queryKey: ['wa-config'],
    queryFn: () => getConfig()
  });

  const handleTestarConexao = async () => {
    try {
      const res = await testarConexao();
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error('Erro ao testar conexão.');
    }
  };

  const handleSincronizar = async () => {
    toast.promise(sincronizarTemplates(), {
      loading: 'Sincronizando templates com a Meta...',
      success: 'Templates atualizados!',
      error: 'Erro ao sincronizar templates.'
    });
  };

  return (
    <AdminLayout title="Comunicações">
      <div className="space-y-6">
        {/* Header com Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Campanhas</p>
                  <h3 className="text-2xl font-bold">{indicadores?.total_campanhas ?? 0}</h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enviadas</p>
                  <h3 className="text-2xl font-bold">{indicadores?.total_enviadas ?? 0}</h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Leitura</p>
                  <h3 className="text-2xl font-bold">
                    {indicadores?.total_enviadas > 0 
                      ? `${Math.round((indicadores.total_lidas / indicadores.total_enviadas) * 100)}%`
                      : '0%'}
                  </h3>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contatos Elegíveis</p>
                  <h3 className="text-2xl font-bold">{indicadores?.compradores_elegiveis ?? 0}</h3>
                </div>
                <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-full">
                  <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
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
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          {/* Campanhas */}
          <TabsContent value="campanhas" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Campanhas de Divulgação</h2>
                <p className="text-sm text-muted-foreground">Gerencie seus envios em massa pelo WhatsApp</p>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" /> Nova Campanha
              </Button>
            </div>

            <Card>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Nome / Veículo</th>
                      <th className="px-4 py-3">Público</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Progresso</th>
                      <th className="px-4 py-3">Engajamento</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campanhas?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.nome}</div>
                          {c.marca && (
                            <div className="text-xs text-muted-foreground">{c.marca} {c.modelo}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.total_destinatarios} contatos
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            c.status === 'CONCLUIDA' ? 'success' :
                            c.status === 'PROCESSANDO' ? 'warning' :
                            'secondary'
                          }>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-teal-500" 
                              style={{ width: `${(c.total_enviados / c.total_destinatarios) * 100 || 0}%` }}
                            />
                          </div>
                          <div className="text-[10px] mt-1 text-muted-foreground">
                            {c.total_enviados}/{c.total_destinatarios} enviadas
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <span className="text-[10px] flex items-center gap-1" title="Entregues">
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> {c.total_entregues}
                            </span>
                            <span className="text-[10px] flex items-center gap-1" title="Lidas">
                              <CheckCircle2 className="w-3 h-3 text-blue-500" /> {c.total_lidas}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm">Ver</Button>
                        </td>
                      </tr>
                    ))}
                    {!campanhas?.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma campanha encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Segmentos */}
          <TabsContent value="segmentos" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Segmentação de Compradores</h2>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Criar Segmento
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:border-teal-500 cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="text-md">Lojistas São Paulo</CardTitle>
                  <CardDescription>Dinâmico • Tipo PJ em SP</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold">142</span>
                    <span className="text-xs text-muted-foreground">compradores</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-teal-500 cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="text-md">Interessados em SUV</CardTitle>
                  <CardDescription>Dinâmico • Interesse em SUV</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold">87</span>
                    <span className="text-xs text-muted-foreground">compradores</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-teal-500 cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="text-md">VIP Rio Preto</CardTitle>
                  <CardDescription>Manual • Seleção manual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold">12</span>
                    <span className="text-xs text-muted-foreground">compradores</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Templates da Meta</h2>
              <Button variant="outline" onClick={handleSincronizar}>
                <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar templates
              </Button>
            </div>
            <Card className="p-8 text-center border-dashed">
              <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sincronize seus templates aprovados na Meta para usá-los nas campanhas.</p>
            </Card>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="config" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>WhatsApp Business Platform</CardTitle>
                    <CardDescription>Configure sua integração oficial com a API da Meta</CardDescription>
                  </div>
                  <Badge variant={config?.status === 'CONECTADO' ? 'success' : 'destructive'}>
                    {config?.status === 'CONECTADO' ? '✓ Conectado' : 'Não conectado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp Business Account ID</label>
                    <div className="p-2 bg-muted rounded text-sm font-mono truncate">
                      {config?.waba_id || '---'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number ID</label>
                    <div className="p-2 bg-muted rounded text-sm font-mono truncate">
                      {config?.phone_number_id || '---'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Credenciais privadas e tokens de acesso são mantidos exclusivamente no backend para sua segurança.
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                  <Button variant="outline" onClick={handleTestarConexao}>
                    Testar conexão
                  </Button>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Configurar Credenciais
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Meta</CardTitle>
                <CardDescription>URL para recebimento de eventos de entrega e leitura</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/public/webhooks/whatsapp
                  </div>
                  <Button variant="outline" onClick={() => {
                    const url = `${window.location.origin}/api/public/webhooks/whatsapp`;
                    navigator.clipboard.writeText(url);
                    toast.success('URL copiada!');
                  }}>Copiar</Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Utilize esta URL e o token de validação configurado no painel de desenvolvedor da Meta.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
