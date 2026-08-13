import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { cadastrarMeuVeiculoFn } from '@/lib/vendedor.functions';
import { toast } from 'sonner';

export const Route = createFileRoute('/vendedor/cadastrar')({
  component: CadastrarVeiculoVendedor,
});

function CadastrarVeiculoVendedor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cadastrarVeiculo = useServerFn(cadastrarMeuVeiculoFn);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    anoFabricacao: '',
    anoModelo: '',
    km: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const result = await cadastrarVeiculo({
        ...form,
        perfilId: user.id,
      });

      if (result) {
        toast.success("Veículo enviado para análise com sucesso!");
        navigate({ to: '/vendedor' });
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar veículo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 text-slate-500 hover:text-teal-900" 
          onClick={() => navigate({ to: '/vendedor' })}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <Card>
          <CardHeader className="border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-teal-900 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-amber-400" />
              </div>
              <CardTitle className="text-2xl text-teal-900">Cadastrar Veículo</CardTitle>
            </div>
            <p className="text-slate-500">Preencha as informações básicas para avaliação.</p>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Placa</label>
                  <Input 
                    required 
                    placeholder="ABC1D23" 
                    value={form.placa}
                    onChange={e => setForm({...form, placa: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">KM Atual</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={form.km}
                    onChange={e => setForm({...form, km: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marca</label>
                  <Input 
                    required 
                    placeholder="Ex: Toyota" 
                    value={form.marca}
                    onChange={e => setForm({...form, marca: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modelo</label>
                  <Input 
                    required 
                    placeholder="Ex: Corolla" 
                    value={form.modelo}
                    onChange={e => setForm({...form, modelo: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano Fabricação</label>
                  <Input 
                    placeholder="2020" 
                    value={form.anoFabricacao}
                    onChange={e => setForm({...form, anoFabricacao: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano Modelo</label>
                  <Input 
                    placeholder="2021" 
                    value={form.anoModelo}
                    onChange={e => setForm({...form, anoModelo: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate({ to: '/vendedor' })}
                >
                  Cancelar
                </Button>
                <Button 
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-900 hover:bg-teal-950 text-white font-bold"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Enviar para Avaliação"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
