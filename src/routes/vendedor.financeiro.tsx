import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Outlet } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { salvarDadosBancariosFn } from '@/lib/financeiro.functions';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/vendedor/financeiro')({
  component: FinanceiroVendedorPage,
});

function FinanceiroVendedorPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dadosBancarios } = useQuery({
    queryKey: ['vendedor-dados-bancarios', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendedor_dados_bancarios' as any)
        .select('*')
        .eq('vendedor_id', user?.id)
        .single();
      return data as any;
    },
    enabled: !!user?.id
  });

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      tipo_chave: 'CPF',
      chave_pix: '',
      titular_nome: user?.nome || '',
      titular_documento: ''
    }
  });

  useEffect(() => {
    if (dadosBancarios) {
      setValue('tipo_chave', dadosBancarios.tipo_chave);
      setValue('chave_pix', dadosBancarios.chave_pix);
      setValue('titular_nome', dadosBancarios.titular_nome);
      setValue('titular_documento', dadosBancarios.titular_documento);
    }
  }, [dadosBancarios, setValue]);

  const mutation = useMutation({
    mutationFn: (data: any) => salvarDadosBancariosFn({ data: { ...data, vendedorId: user?.id || '' } }),
    onSuccess: () => {
      toast.success("Dados bancários salvos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['vendedor-dados-bancarios'] });
    }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados para Recebimento (Pix)</CardTitle>
          <p className="text-sm text-muted-foreground">Informe a chave Pix onde deseja receber os valores de suas vendas.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Chave</Label>
              <Select 
                value={watch('tipo_chave')} 
                onValueChange={(v) => setValue('tipo_chave', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="TELEFONE">Telefone</SelectItem>
                  <SelectItem value="ALEATORIA">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chave Pix</Label>
              <Input {...register('chave_pix')} placeholder="Digite sua chave pix" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Titular</Label>
                <Input {...register('titular_nome')} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ do Titular</Label>
                <Input {...register('titular_documento')} placeholder="000.000.000-00" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar Dados Bancários"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
