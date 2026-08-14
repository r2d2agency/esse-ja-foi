import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterDetalheCompradorFn, aprovarCompradorFn } from "@/lib/admin-compradores.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Building2, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/comprador/$id")({
  component: DetalheCompradorPage,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["admin-comprador", params.id],
      queryFn: () => obterDetalheCompradorFn({ data: { id: params.id } })
    });
  }
});

function DetalheCompradorPage() {
  const { id } = Route.useParams();
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; tipo: string } | null>(null);

  const loadComprador = useServerFn(obterDetalheCompradorFn);
  const aprovar = useServerFn(aprovarCompradorFn);

  const { data: res, refetch } = useSuspenseQuery({
    queryKey: ["admin-comprador", id],
    queryFn: () => loadComprador({ data: { id } })
  });

  if (!res.ok) return <div className="p-8 text-red-500">Erro: {res.message}</div>;
  const comprador = res.data;

  const handleAprovar = async () => {
    const loading = toast.loading("Aprovando...");
    try {
      await aprovar({ data: { id } });
      toast.success("Comprador aprovado com sucesso.");
      refetch();
    } catch (e) {
      toast.error("Erro ao aprovar.");
    } finally {
      toast.dismiss(loading);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => history.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        <h1 className="text-2xl font-black uppercase text-slate-950 tracking-tight">Detalhes do Comprador</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {comprador.tipo_pessoa === 'PJ' ? <Building2 /> : <User />} {comprador.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-400">E-mail</p><p className="font-bold">{comprador.email}</p></div>
            <div><p className="text-slate-400">WhatsApp</p><p className="font-bold">{comprador.whatsapp}</p></div>
            <div><p className="text-slate-400">Documento</p><p className="font-bold">{comprador.tipo_pessoa === 'PJ' ? comprador.cnpj : comprador.cpf}</p></div>
            <div><p className="text-slate-400">Status</p><Badge>{comprador.status_compliance}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleAprovar} disabled={comprador.status_compliance === 'APROVADO'}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar Cadastro
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comprador.documentos.map((doc: any) => (
            <div key={doc.id} className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center relative group border">
              <img src={doc.url} alt={doc.tipo} className="w-full h-full object-cover rounded-lg" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                <Button size="sm" onClick={() => setSelectedDoc({ url: doc.url, tipo: doc.tipo })}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
          <img src={selectedDoc.url} className="max-h-[90vh] rounded shadow-2xl" />
        </div>
      )}
    </div>
  );
}
