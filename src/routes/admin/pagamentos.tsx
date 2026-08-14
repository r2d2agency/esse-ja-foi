import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getIndicadoresFinanceirosFn, listarRepassesAdminFn } from '@/lib/financeiro.functions';
import { AdminLayout } from '@/components/admin/layout';
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
    <AdminLayout title="Financeiro - Repasses">
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Vendido</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(indicadores?.total_vendido || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Comissões Retidas</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(indicadores?.total_comissoes || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Aguardando Repasse</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{indicadores?.aguardando_repasse || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Repasses Concluídos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{indicadores?.repasses_concluidos || 0}</CardContent>
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
                  <TableCell className="font-mono">{r.negociacao_codigo}</TableCell>
                  <TableCell>{r.vendedor_nome}</TableCell>
                  <TableCell>{formatCurrency(r.valor_liquido)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'CONCLUIDO' ? 'default' : 'secondary'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link to="/admin/pagamento.$id" params={{ id: r.id }} className="text-teal-600 hover:underline">Ver detalhe</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
