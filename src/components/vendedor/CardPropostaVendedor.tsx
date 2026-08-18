import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarMeusVeiculosFn } from "@/lib/vendedor.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowRight, Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { formatCurrency } from "@/lib/utils";

export function CardPropostaVendedor({ vendedorId }: { vendedorId: string }) {
  const navigate = useNavigate();
  const listar = useServerFn(listarMeusVeiculosFn);

  const { data: res } = useQuery({
    queryKey: ['meus-veiculos-propostas', vendedorId],
    queryFn: () => listar({ data: { perfilId: vendedorId } }),
    enabled: !!vendedorId,
  });

  const veiculosComProposta = (res?.data || []).filter(
    (v: any) => v.status === 'AGUARDANDO_APROVACAO_VENDEDOR'
  );

  if (veiculosComProposta.length === 0) return null;

  return (
    <div className="space-y-4">
      {veiculosComProposta.map((v: any) => (
        <Card key={v.id} className="border-teal-200 bg-teal-50/30 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-teal-600 tracking-widest flex items-center gap-2">
              <Bell className="h-3 w-3 animate-bounce" /> Proposta Recebida
            </CardTitle>
            <Badge className="bg-teal-600 text-[10px] uppercase font-bold">{v.placa}</Badge>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{v.marca} {v.modelo}</p>
                <p className="text-xs text-slate-500 mt-0.5">Identificamos o melhor valor para seu veículo.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Oferta EJF</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(Number(v.valor_oferta_essejafoi || 0))}</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate({ to: `/vendedor/veiculo/${v.id}/proposta` } as any)}
              className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 rounded-xl"
            >
              Ver Detalhes e Decidir <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
