import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRepasseFn, autorizarRepasseFn, confirmarConclusaoRepasseFn } from '@/lib/financeiro.functions';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/admin/pagamento/$id')({
  component: RepasseDetalheAdminPage,
});

function RepasseDetalheAdminPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: repasse, isLoading } = useQuery({
    queryKey: ['repasse-detalhe', id],
    queryFn: () => getRepasseFn({ data: id }),
  });

  const autorizarMutation = useMutation({
    mutationFn: (repasseId: string) => autorizarRepasseFn({ data: { repasseId, adminId: user?.id || '' } }),
    onSuccess: () => {
      toast.success("Repasse autorizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['repasse-detalhe', id] });
    }
  });

  const concluirMutation = useMutation({
    mutationFn: (repasseId: string) => confirmarConclusaoRepasseFn({ data: { repasseId } }),
    onSuccess: () => {
      toast.success("Repasse confirmado como concluído!");
      queryClient.invalidateQueries({ queryKey: ['repasse-detalhe', id] });
    }
  });

  if (isLoading) return <AdminLayout title="Carregando...">...</AdminLayout>;
  if (!repasse) return <AdminLayout title="Não encontrado">Repasse não encontrado.</AdminLayout>;

  return (
    <AdminLayout title={`Repasse: ${repasse.negociacao_codigo}`}>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin/pagamentos">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold">{repasse.veiculo_titulo}</h2>
          <p className="text-muted-foreground">Vendedor: {repasse.vendedor_nome}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {repasse.status === 'AGUARDANDO' && (
            <Button 
              onClick={() => autorizarMutation.mutate(repasse.id)}
              disabled={autorizarMutation.isPending}
            >
              Autorizar Repasse
            </Button>
          )}
          {repasse.status === 'AUTORIZADO' && (
            <Button 
              onClick={() => concluirMutation.mutate(repasse.id)}
              className="bg-green-600 hover:bg-green-700"
              disabled={concluirMutation.isPending}
            >
              Confirmar Pagamento Realizado
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Valores e Regras</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Valor da Venda</p>
                <p className="text-2xl font-bold">{formatCurrency(repasse.valor_venda)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Comissão ({repasse.comissao_regra})</p>
                <p className="text-2xl font-bold text-red-600">-{formatCurrency(repasse.valor_comissao)}</p>
              </div>
              <div className="p-4 bg-teal-50 border border-teal-100 rounded-lg col-span-2">
                <p className="text-sm text-teal-800">Valor Líquido a Repassar</p>
                <p className="text-3xl font-bold text-teal-700">{formatCurrency(repasse.valor_liquido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dados Pix do Vendedor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase">Tipo de Chave</p>
              <p>{repasse.dados_bancarios_json?.tipo_chave}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase">Chave Pix</p>
              <p className="font-mono text-lg select-all bg-muted p-2 rounded">{repasse.dados_bancarios_json?.chave_pix}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase">Titular</p>
              <p>{repasse.dados_bancarios_json?.titular_nome}</p>
              <p className="text-sm text-muted-foreground">{repasse.dados_bancarios_json?.titular_documento}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader><CardTitle>Histórico e Auditoria</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {repasse.logs?.map((log: any) => (
                <div key={log.id} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="mt-1">
                    {log.acao.includes('AUTORIZACAO') ? <CheckCircle2 className="text-green-500 h-5 w-5" /> : <Clock className="text-blue-500 h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{log.acao}</p>
                    <p className="text-sm text-muted-foreground">{log.detalhe}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.criado_em).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
