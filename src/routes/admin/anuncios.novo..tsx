import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDadosParaNovoAnuncio, criarAnuncio } from "@/lib/anuncios.functions";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/anuncios/novo/")({
  component: NovoAnuncioPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: (search['id'] as string) || "",
    };
  },
});

function NovoAnuncioPage() {
  const search = Route.useSearch();
  const id = search['id'];
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dados-novo-anuncio", id],
    queryFn: () => getDadosParaNovoAnuncio({ data: id }),
    enabled: !!id,
  });

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const mutation = useMutation({
    mutationFn: criarAnuncio,
    onSuccess: () => {
      toast.success("Anúncio criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["anuncios-admin"] });
      navigate({ to: "/admin/anuncios" });
    }
  });

  if (!id) return <div className="p-10 text-center">ID do veículo não fornecido.</div>;
  if (isLoading) return <div className="p-10 text-center">Carregando dados...</div>;
  if (!data || !data.veiculo) return <div className="p-10 text-center">Veículo não encontrado.</div>;

  const handlePublicar = () => {
    mutation.mutate({
      data: {
        veiculo_id: id,
        titulo: titulo || `${data.veiculo.marca} ${data.veiculo.modelo} ${data.veiculo.ano_modelo}`,
        descricao: descricao || "Veículo vistoriado e disponível.",
        localizacao_publica: `${data.veiculo.vendedor_cidade}/${data.veiculo.vendedor_uf}`,
        fotos: data.fotos.map((f: any, i: number) => ({
          foto_url: f.foto_url,
          foto_original_id: f.id,
          eh_capa: i === 0,
          ordem: i
        })),
        status: "PUBLICADO"
      }
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate({ to: "/admin/anuncios" })}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>
      <h1 className="text-2xl font-bold uppercase tracking-tight">Criar Anúncio: {data.veiculo.marca} {data.veiculo.modelo}</h1>
      
      <Card className="rounded-3xl shadow-sm border-slate-200">
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Título do Anúncio</label>
              <input 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                placeholder={`${data.veiculo.marca} ${data.veiculo.modelo} ${data.veiculo.ano_modelo}`} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Localização (Pública)</label>
              <input 
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" 
                value={`${data.veiculo.vendedor_cidade}/${data.veiculo.vendedor_uf}`} 
                disabled 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Descrição do Anúncio</label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl h-40 focus:ring-2 focus:ring-teal-500 outline-none" 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              placeholder="Descreva os destaques do veículo para o comprador..." 
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
             <Button variant="outline" className="rounded-xl px-6" onClick={() => navigate({ to: "/admin/anuncios" })}>
               Cancelar
             </Button>
             <Button 
               onClick={handlePublicar} 
               disabled={mutation.isPending}
               className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-8"
             >
               {mutation.isPending ? "Publicando..." : (
                 <><CheckCircle className="mr-2 h-4 w-4" /> Publicar agora</>
               )}
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
