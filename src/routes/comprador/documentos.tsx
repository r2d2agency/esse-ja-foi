import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Camera, ShieldCheck, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enviarDocumentoCompradorFn, getStatusCompradorFn } from "@/lib/comprador.functions";

export const Route = createFileRoute("/comprador/documentos")({
  component: CompradorDocumentosPage,
});

function CompradorDocumentosPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: status, refetch } = useQuery({
    queryKey: ['comprador-status', user?.id],
    queryFn: () => getStatusCompradorFn({ data: user?.id || "" }),
    enabled: !!user?.id
  });

  const mutation = useMutation({
    mutationFn: (vars: { tipo: string, url: string }) => 
      enviarDocumentoCompradorFn({ data: { compradorId: user?.id || "", ...vars } }),
    onSuccess: () => {
      toast.success("Documento enviado com sucesso para análise.");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao enviar documento. Tente novamente.");
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    // Em um cenário real, faríamos upload para S3/Storage aqui
    // Como estamos em um MVP simulado, vamos gerar uma URL fake
    toast.loading("Enviando documento...");
    
    setTimeout(() => {
      mutation.mutate({
        tipo: selectedType,
        url: `https://storage.placeholder.com/docs/${user?.id}/${selectedType}.pdf`
      });
    }, 1500);
  };

  const triggerUpload = (tipo: string) => {
    setSelectedType(tipo);
    fileInputRef.current?.click();
  };

  const docs = [
    { id: 'CNH_RG', label: 'Identidade (RG ou CNH)', icon: FileText, required: true },
    { id: 'COMPROVANTE_ENDERECO', label: 'Comprovante de Residência', icon: FileText, required: true },
    { id: 'SELFIE', label: 'Selfie com Documento', icon: Camera, required: true },
  ];

  if (user?.tipo_pessoa === 'PJ') {
    docs.push({ id: 'CONTRATO_SOCIAL', label: 'Contrato Social / Cartão CNPJ', icon: FileText, required: true });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Compliance e Documentos</h1>
          <p className="text-slate-500 font-medium">Mantenha sua documentação em dia para ter acesso total à plataforma.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            status?.status_compliance === 'APROVADO' ? "bg-teal-100 text-teal-600" :
            status?.status_compliance === 'PENDENCIA' ? "bg-amber-100 text-amber-600" :
            "bg-slate-100 text-slate-400"
          )}>
            {status?.status_compliance === 'APROVADO' ? <ShieldCheck className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Conta</div>
            <div className="text-sm font-bold text-slate-900">{status?.status_compliance || 'PENDENTE'}</div>
          </div>
        </div>
      </div>

      {status?.status_compliance === 'PENDENCIA' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Pendência Identificada</h4>
            <p className="text-amber-700 text-xs mt-1">Nossa equipe identificou problemas em sua documentação. Por favor, reenvie os documentos marcados.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {docs.map((doc) => (
          <Card key={doc.id} className="border-slate-200 shadow-none overflow-hidden group">
            <div className="aspect-[4/3] bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-6 text-center border-b relative">
              <doc.icon className="h-10 w-10 mb-3 opacity-20 group-hover:opacity-40 transition-opacity" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{doc.label}</p>
              {doc.required && <span className="absolute top-3 right-3 text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">OBRIGATÓRIO</span>}
            </div>
            <CardContent className="p-4">
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold text-xs h-10"
                onClick={() => triggerUpload(doc.id)}
                disabled={mutation.isPending}
              >
                {mutation.isPending && selectedType === doc.id ? "Enviando..." : "Enviar agora"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept="image/*,.pdf"
      />

      <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-8">
        <h3 className="text-lg font-black text-slate-950 uppercase mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-600" /> Por que pedimos isso?
        </h3>
        <div className="space-y-4 text-sm text-slate-500 font-medium leading-relaxed">
          <p>
            Para garantir a segurança de todas as transações em nossa plataforma, realizamos uma validação rigorosa de todos os compradores.
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Prevenção de fraudes e lances falsos</li>
            <li>Segurança jurídica para compradores e vendedores</li>
            <li>Conformidade com normas de transação de veículos</li>
          </ul>
          <p className="pt-2 text-xs italic">
            * Seus dados são protegidos e utilizados exclusivamente para fins de compliance na plataforma Esse Já Foi.
          </p>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
