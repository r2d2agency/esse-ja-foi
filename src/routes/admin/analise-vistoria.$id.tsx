import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDetalheAnaliseVistoriaFn } from "@/lib/analise-pos-vistoria.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/analise-vistoria/")({
  component: DetalheAnaliseVistoriaPage,
});

function DetalheAnaliseVistoriaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getDetalhe = useServerFn(getDetalheAnaliseVistoriaFn);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-analise-vistoria", id],
    queryFn: () => getDetalhe({ data: { veiculoId: id } })
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (!res?.ok || !res.data) return <div className="p-8">Erro: {res?.message || "Veículo não encontrado"}</div>;

  const { veiculo, vistoria } = res.data;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin/vistorias" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-black uppercase text-slate-950">{veiculo.marca} {veiculo.modelo}</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <p>Analise detalhada para o veículo {veiculo.placa}.</p>
          {vistoria && <p>Vistoria realizada em: {vistoria.data_vistoria}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
