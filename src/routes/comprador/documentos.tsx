import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Camera, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/comprador/documentos")({
  component: CompradorDocumentosPage,
});

function CompradorDocumentosPage() {
  const [docs, setDocs] = useState<{tipo: string, url: string | null}[]>([
    { tipo: 'CNH/RG', url: null },
    { tipo: 'CRLV', url: null },
    { tipo: 'Selfie c/ Documento', url: null },
  ]);

  const handleUpload = (tipo: string) => {
    toast.info(`Funcionalidade de upload para ${tipo} em desenvolvimento.`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Meus Documentos</h1>
        <p className="text-slate-500 font-medium">Envie os documentos necessários para habilitação comercial.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {docs.map((doc) => (
          <Card key={doc.tipo} className="border-slate-200 shadow-none overflow-hidden">
            <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-6 text-center border-b">
              {doc.url ? (
                <CheckCircle2 className="h-12 w-12 text-teal-600 mb-2" />
              ) : (
                <FileText className="h-12 w-12 mb-2 opacity-20" />
              )}
              <p className="text-sm font-bold text-slate-900 uppercase">{doc.tipo}</p>
            </div>
            <CardContent className="p-4">
              <Button 
                variant={doc.url ? "outline" : "default"} 
                className={!doc.url ? "bg-teal-600 hover:bg-teal-700 w-full font-bold" : "w-full font-bold"}
                onClick={() => handleUpload(doc.tipo)}
              >
                {doc.url ? "Alterar documento" : "Enviar documento"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
