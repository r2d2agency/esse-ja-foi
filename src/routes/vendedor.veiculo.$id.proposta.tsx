import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDetalheAnaliseVistoriaFn, responderPropostaVendedorFn } from "@/lib/analise-pos-vistoria.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, ArrowLeft, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/vendedor/veiculo/$id/proposta")({
  component: PropostaVendedorPage,
});

function PropostaVendedorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getDetalhe = useServerFn(getDetalheAnaliseVistoriaFn);
  const responder = useServerFn(responderPropostaVendedorFn);
  
  const [agreed, setAgreed] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ["vendedor-proposta", id],
    queryFn: () => getDetalhe({ data: { veiculoId: id } })
  });

  if (isLoading) return <div className="p-8">Carregando proposta...</div>;
  const data = res?.data;
  const veiculo = data?.veiculo;
  const proposta = data?.propostas?.[0]; // Pega a última proposta

  if (!proposta || proposta.status !== 'AGUARDANDO_ACEITE') {
    return (
      <div className="p-8 text-center">
        <p>Não há proposta pendente para este veículo.</p>
        <Button asChild className="mt-4">
          <Link to="/vendedor/veiculo/$id" params={{ id }}>Voltar</Link>
        </Button>
      </div>
    );
  }

  const handleAceite = async (aceite: boolean) => {
    if (aceite && !agreed) {
      toast.error("Você precisa estar de acordo com as condições.");
      return;
    }

    const tId = toast.loading(aceite ? "Aceitando proposta..." : "Recusando proposta...");
    try {
      const resResp = await responder({ data: { veiculo_id: id, proposta_id: proposta.id, aceite } });
      if (resResp.ok) {
        toast.success(aceite ? "Proposta aceita!" : "Proposta recusada.", { id: tId });
        navigate({ to: "/vendedor/veiculo/$id", params: { id } });
      } else {
        toast.error((resResp as any).message || "Erro", { id: tId });
      }
    } catch (err) {
      toast.error("Erro técnico.", { id: tId });
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
       <Link to="/vendedor/veiculo/$id" params={{ id }} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-slate-900">Seu veículo está pronto para a próxima etapa</h1>
        <p className="text-sm text-slate-500">{veiculo?.marca} {veiculo?.modelo} ({veiculo?.placa})</p>
      </div>

      <Card className="border-teal-100 bg-teal-50/30 overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Valor mínimo para venda</p>
            <p className="text-4xl font-black text-slate-900 text-center">R$ {Number(proposta.valor_minimo_acordado).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-teal-100 py-6">
            <div className="text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comissão</p>
               <p className="text-lg font-bold text-slate-700">R$ {Number(proposta.comissao_valor).toLocaleString()}</p>
            </div>
            <div className="text-center border-l border-teal-100">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-teal-600">Líquido estimado</p>
               <p className="text-lg font-bold text-teal-600">R$ {Number(proposta.valor_liquido_vendedor).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-900">O que acontece agora?</h3>
             <p className="text-xs text-slate-600 leading-relaxed">
               Ao aceitar, seu veículo poderá ser preparado para publicação e receber ofertas de compradores verificados. 
               Você não precisa aceitar uma oferta abaixo das condições acordadas.
             </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} />
          <label htmlFor="terms" className="text-xs font-medium text-slate-600">
            Li e estou de acordo com as condições apresentadas.
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => handleAceite(true)} className="h-14 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-2xl">
             Aceitar e liberar meu veículo
          </Button>
          <Button onClick={() => handleAceite(false)} variant="ghost" className="text-slate-400 hover:text-red-600 font-bold">
             Não concordo com o valor
          </Button>
        </div>
      </div>
    </div>
  );
}
