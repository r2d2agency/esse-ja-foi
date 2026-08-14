import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listarMeusVeiculosFn } from '@/lib/vendedor.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/vendedor')({
  component: DashboardVendedor,
});

function DashboardVendedor() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const listarVeiculos = useServerFn(listarMeusVeiculosFn);

  const { data: veiculosResult, isLoading: veiculosLoading } = useSuspenseQuery({
    queryKey: ['meus-veiculos', user?.id],
    queryFn: () => listarVeiculos({ 
      data: { perfilId: user?.id || "" } 
    }),
  });
  
  const veiculos = veiculosResult?.data || [];
  const profile = (veiculosResult as any)?.profile || {};

  if (authLoading || veiculosLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || user.role !== 'vendedor') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Acesso restrito.</p>
        <Link to="/" className="text-teal-600 underline">Voltar para Home</Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_APROVACAO':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"><Clock className="w-3 h-3 mr-1" /> Em Análise</Badge>;
      case 'CADASTRADO':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'AGENDADO':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">Agendado</Badge>;
      case 'VENDIDO':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Vendido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-900 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-amber-400" />
          </div>
          <span className="font-display font-bold text-teal-900">ÁREA DO VENDEDOR</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 hidden md:inline">Olá, <strong>{user.nome}</strong></span>
          <Button variant="outline" size="sm" onClick={() => logout()}>Sair</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-6">
        {!profile?.cadastro_completo && (
          <Card className="mb-8 border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Seu cadastro não está finalizado!</h4>
                  <p className="text-amber-800/70 text-xs">Ainda falta 1 passo: envie fotos dos seus documentos para liberar as vendas.</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  console.log("Navigating to onboarding...");
                  navigate({ to: '/vendedor/onboarding' });
                }}

                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
              >
                Concluir Agora
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-teal-900">Meus Veículos</h1>
            <p className="text-slate-500">Acompanhe o status dos seus anúncios e vistorias.</p>
          </div>
          <Button 
            className="bg-teal-900 hover:bg-teal-950 text-white" 
            onClick={() => navigate({ to: '/vendedor/cadastrar' })}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Veículo
          </Button>

        </div>

        {veiculos?.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Car className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-semibold text-slate-900">Nenhum veículo cadastrado</h3>
              <p className="text-slate-500 max-w-xs mt-1">
                Você ainda não enviou nenhum carro para avaliação. Clique no botão acima para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {veiculos?.map((v: any) => (
              <Card key={v.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Car className="w-8 h-8 text-teal-900" />
                    </div>
                    <div>
                      <h4 className="font-bold text-teal-900 text-lg">{v.marca} {v.modelo}</h4>
                      <div className="flex gap-3 text-sm text-slate-500">
                        <span>Placa: <strong>{v.placa}</strong></span>
                        <span>Ano: {v.ano_modelo || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    {getStatusBadge(v.status)}
                    <span className="text-xs text-slate-400">Cadastrado em {new Date(v.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                {v.status === 'AGUARDANDO_APROVACAO' && (
                  <div className="bg-amber-50 px-6 py-3 border-t border-amber-100 flex items-center gap-2 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4" />
                    <span>Estamos analisando os dados do seu veículo. Entraremos em contato em breve.</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
