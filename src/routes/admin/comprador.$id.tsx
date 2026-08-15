import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterDetalheCompradorFn, aprovarCompradorFn } from "@/lib/admin-compradores.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Building2, CheckCircle2, AlertTriangle, Eye, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

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
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-slate-400">Ações de Compliance</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700 text-slate-950 font-bold" 
              onClick={handleAprovar} 
              disabled={comprador.status_compliance === 'APROVADO'}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar Comprador
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-red-200 text-red-600 hover:bg-red-50 font-bold"
              onClick={() => toast.error("Funcionalidade de pendência em desenvolvimento.")}
            >
              <AlertTriangle className="mr-2 h-4 w-4" /> Solicitar Correção
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-black uppercase text-slate-950 tracking-wider">Documentação Enviada</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!comprador.documentos || comprador.documentos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium italic">
              Nenhum documento enviado até o momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comprador.documentos.map((doc: any) => (
                <div key={doc.id} className="flex flex-col gap-3">
                  <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center relative group border border-slate-200 overflow-hidden shadow-sm">
                    {doc.url.endsWith('.pdf') ? (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText className="h-10 w-10" />
                        <span className="text-[10px] font-bold uppercase">Documento PDF</span>
                      </div>
                    ) : (
                      <img src={doc.url} alt={doc.tipo} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <Button 
                        size="sm" 
                        className="bg-white text-slate-950 hover:bg-slate-100 font-bold"
                        onClick={() => setSelectedDoc({ url: doc.url, tipo: doc.tipo })}
                      >
                        <Eye className="h-4 w-4 mr-2" /> Ampliar
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.tipo}</span>
                    <Badge variant="outline" className="text-[9px] font-black border-slate-200">{formatDate(doc.criado_em)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
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
