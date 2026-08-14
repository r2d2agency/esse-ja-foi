import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getIndicadoresFinanceirosFn, listarRepassesAdminFn } from '@/lib/financeiro.functions';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/pagamentos')({
  component: PagamentosAdminPage,
});

function PagamentosAdminPage() {
  const { data: indicadores } = useQuery({
    queryKey: ['financeiro-indicadores'],
    queryFn: () => getIndicadoresFinanceirosFn(),
  });

  const { data: repasses } = useQuery({
    queryKey: ['repasses-lista'],
    queryFn: () => listarRepassesAdminFn(),
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro - Repasses</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Vendido</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{formatCurrency(indicadores?.total_vendido || 0)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Comissões Retidas</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{formatCurrency(indicadores?.total_comissoes || 0)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aguardando Repasse</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-amber-600">{indicadores?.aguardando_repasse || 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Repasses Concluídos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-teal-600">{indicadores?.repasses_concluidos || 0}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Lista de Repasses</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negociação</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repasses?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-bold text-slate-700">{r.negociacao_codigo}</TableCell>
                    <TableCell>{r.vendedor_nome}</TableCell>
                    <TableCell>{formatCurrency(r.valor_liquido)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'CONCLUIDO' ? 'default' : 'secondary'} className={cn(
                        r.status === 'CONCLUIDO' && "bg-teal-500 hover:bg-teal-600",
                        r.status === 'AGUARDANDO' && "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
                      )}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to="/admin/pagamento.$id" params={{ id: r.id }} className="text-teal-600 font-semibold hover:text-teal-700">
                        Detalhes
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!repasses || repasses.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">Nenhum repasse encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
