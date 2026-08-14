import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Car, Camera, CheckCircle2, FileText, User, ArrowRight, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { atualizarDocumentosVendedorFn } from '@/lib/vendedor.functions';
import { buscarCep } from '@/lib/brasil';

export const Route = createFileRoute('/vendedor/onboarding')({
  component: VendedorOnboarding,
});

function VendedorOnboarding() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateDocs = useServerFn(atualizarDocumentosVendedorFn);

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Carregando...</div>;
  }

  if (!user || user.role !== 'vendedor') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <p className="mb-4 text-slate-600">Acesso restrito. Faça login para continuar.</p>
        <Button onClick={() => navigate({ to: '/' })}>Ir para Home</Button>
      </div>
    );
  }

  const [personalData, setPersonalData] = useState({
    cpf: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    complemento: '',
    cidade: '',
    uf: '',
  });

  const [files, setFiles] = useState({
    cnh: null as string | null,
    crlv: null as string | null,
    selfie: null as string | null,
  });

  const handlePersonalDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateDocs({
        data: {
          perfilId: user?.id || "",
          ...personalData,
          endereco: `${personalData.endereco}, ${personalData.numero}${personalData.complemento ? ` - ${personalData.complemento}` : ""} - ${personalData.bairro}`,
        }
      });
      toast.success("Dados pessoais salvos com sucesso!");
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar dados pessoais.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (type: 'cnh' | 'crlv' | 'selfie') => {
    toast.info(`Selecionando arquivo para ${type.toUpperCase()}...`);
    setTimeout(() => {
      setFiles(prev => ({ ...prev, [type]: 'https://placehold.co/400x300?text=Documento+' + type.toUpperCase() }));
      toast.success(`${type.toUpperCase()} anexado.`);
    }, 1000);
  };

  const finalizeOnboarding = async () => {
    setIsSubmitting(true);
    try {
      console.log("[Onboarding] Finalizando para perfil:", user?.id);
      const res = await updateDocs({
        data: {
          perfilId: user?.id || "",
          cnhUrl: files.cnh || undefined,
          crlvUrl: files.crlv || undefined,
          selfieUrl: files.selfie || undefined,
          finalizar: true
        }
      });
      
      if (res.ok) {
        toast.success("Onboarding finalizado com sucesso!");
        navigate({ to: '/vendedor' });
      } else {
        toast.error("Não foi possível finalizar o cadastro.");
      }

    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setPersonalData(prev => ({ ...prev, cep }));
    
    if (cleanCep.length === 8) {
      try {
        const address = await buscarCep(cleanCep);
        if (address) {
          setPersonalData(prev => ({
            ...prev,
            endereco: address.logradouro,
            bairro: address.bairro,
            cidade: address.cidade,
            uf: address.uf
          }));
          toast.success("Endereço preenchido");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-teal-900 rounded-xl flex items-center justify-center">
            <Car className="w-6 h-6 text-amber-400" />
          </div>
          <span className="font-display text-2xl font-bold text-teal-900 uppercase">ESSE JÁ FOI</span>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden">
          <CardHeader className="bg-teal-900 text-white p-6">
            <div className="flex justify-between items-center mb-4">
              <CardTitle className="text-xl font-bold">Quase lá!</CardTitle>
              <span className="bg-amber-400 text-teal-900 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Falta 1 Passo</span>
            </div>
            <p className="text-teal-100/80 text-sm">Precisamos validar sua identidade e a do veículo para liberar seus anúncios.</p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {step === 1 ? (
              <form onSubmit={handlePersonalDataSubmit} className="space-y-4 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input 
                    required 
                    placeholder="000.000.000-00" 
                    value={personalData.cpf}
                    onChange={e => setPersonalData({...personalData, cpf: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label>CEP *</Label>
                    <Input 
                      required 
                      placeholder="00000-000" 
                      value={personalData.cep}
                      onChange={e => handleCepChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Logradouro *</Label>
                    <Input 
                      required 
                      placeholder="Rua, Av, etc" 
                      value={personalData.endereco}
                      onChange={e => setPersonalData({...personalData, endereco: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número *</Label>
                    <Input 
                      required 
                      placeholder="123" 
                      value={personalData.numero}
                      onChange={e => setPersonalData({...personalData, numero: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro *</Label>
                    <Input 
                      required 
                      placeholder="Bairro" 
                      value={personalData.bairro}
                      onChange={e => setPersonalData({...personalData, bairro: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade *</Label>
                    <Input 
                      required 
                      placeholder="Cidade" 
                      value={personalData.cidade}
                      onChange={e => setPersonalData({...personalData, cidade: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UF *</Label>
                    <Input 
                      required 
                      maxLength={2}
                      placeholder="UF" 
                      value={personalData.uf}
                      onChange={e => setPersonalData({...personalData, uf: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <Button 
                  disabled={isSubmitting}
                  className="w-full bg-teal-900 hover:bg-teal-950 text-white h-12 font-bold mt-4"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Salvar e Continuar"}
                </Button>
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="space-y-4">
                  <div 
                    onClick={() => handleFileUpload('cnh')}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${files.cnh ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200 hover:border-teal-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${files.cnh ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                      {files.cnh ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">Habilitação (CNH)</h4>
                      <p className="text-xs text-slate-500">Opcional agora</p>
                    </div>
                    {!files.cnh && <Upload className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div 
                    onClick={() => handleFileUpload('crlv')}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${files.crlv ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200 hover:border-teal-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${files.crlv ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                      {files.crlv ? <CheckCircle2 className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">Documento (CRLV)</h4>
                      <p className="text-xs text-slate-500">Opcional agora</p>
                    </div>
                    {!files.crlv && <Upload className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div 
                    onClick={() => handleFileUpload('selfie')}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${files.selfie ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200 hover:border-teal-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${files.selfie ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                      {files.selfie ? <CheckCircle2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">Selfie com Documento</h4>
                      <p className="text-xs text-slate-500">Opcional agora</p>
                    </div>
                    {!files.selfie && <Upload className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl flex gap-3 text-amber-800 border border-amber-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Você pode pular o envio de fotos agora e completar depois no seu perfil, mas isso é necessário para ativar suas vendas.
                  </p>
                </div>

                <Button 
                  disabled={isSubmitting}
                  onClick={finalizeOnboarding}
                  className="w-full bg-teal-900 hover:bg-teal-950 text-white h-14 font-bold text-lg shadow-lg group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...
                    </>
                  ) : (
                    <>
                      Concluir Cadastro <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="mt-8 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
          © 2026 ESSE JÁ FOI — Plataforma Segura
        </p>
      </div>
    </div>
  );
}
