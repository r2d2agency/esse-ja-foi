import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDadosParaNovoAnuncio, criarAnuncio } from "@/lib/anuncios.functions";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/anuncios/novo/$id")({
  component: NovoAnuncioPage,
});

function NovoAnuncioPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dados-novo-anuncio", id],
    queryFn: () => getDadosParaNovoAnuncio(id),
  });

  const [step, setStep] = useState(1);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const mutation = useMutation({
    mutationFn: criarAnuncio,
    onSuccess: (res) => {
      toast.success("Anúncio criado com sucesso!");
      navigate({ to: "/admin/anuncios" });
    }
  });

  if (isLoading) return <div className="p-10">Carregando dados...</div>;

  const handlePublicar = () => {
    mutation.mutate({
      veiculo_id: id,
      titulo: titulo || `${data.veiculo.marca} ${data.veiculo.modelo} ${data.veiculo.ano_modelo}`,
      descricao: descricao || "Veículo vistoriado e disponível.",
      localizacao_publica: `${data.veiculo.vendedor_cidade}/${data.veiculo.vendedor_uf}`,
      fotos: data.fotos.map((f: any, i: number) => ({
        foto_url: f.url,
        foto_original_id: f.id,
        eh_capa: i === 0,
        ordem: i
      })),
      status: "PUBLICADO"
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate({ to: "/admin/anuncios" })}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      <h1 className="text-2xl font-bold">Criar Anúncio: {data.veiculo.marca} {data.veiculo.modelo}</h1>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <input className="w-full p-2 border rounded" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do anúncio..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Localização</label>
              <input className="w-full p-2 border rounded" value={`${data.veiculo.vendedor_cidade}/${data.veiculo.vendedor_uf}`} disabled />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea className="w-full p-2 border rounded h-32" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição..." />
          </div>

          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => navigate({ to: "/admin/anuncios" })}>Cancelar</Button>
             <Button onClick={handlePublicar} className="bg-teal-600 hover:bg-teal-700">
               <CheckCircle className="mr-2 h-4 w-4" /> Publicar agora
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
