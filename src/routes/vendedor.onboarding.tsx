import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { obterMeuPerfilFn, atualizarPerfilVendedorFn } from "@/lib/vendedor.functions";
import { obterDetalheVendedorFn } from "@/lib/vendedores-compliance.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  User, 
  MapPin, 
  FileText, 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Car,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/onboarding/FileUpload";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { maskCep, maskCpf } from "@/utils/masks";
import { buscarCep } from "@/lib/viacep";

const ETAPAS_LABELS = ["Dados Pessoais", "Endereço", "Documentos", "Validação", "Concluído"];
const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"];
const PROFISSOES = ["Empresário", "Autônomo", "CLT", "Funcionario Público", "Aposentado"];
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const Route = createFileRoute("/vendedor/onboarding")({
  component: VendedorOnboardingPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["meu-perfil"],
      queryFn: () => {
        // We don't have user.id here easily, but the server function will fail if not authenticated
        // This is a loader, it should ideally use context to get the session/user
        return obterMeuPerfilFn({ data: { perfilId: "" } });
      }
    });
  }
});

function VendedorOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateDocs = useServerFn(atualizarPerfilVendedorFn);
  const getProfile = useServerFn(obterMeuPerfilFn);
  const getDetalhe = useServerFn(obterDetalheVendedorFn);
  
  const { data: perfilRes, refetch } = useSuspenseQuery({
    queryKey: ["meu-perfil"],
    queryFn: () => getProfile({ data: { perfilId: user?.id || "" } })
  });
  
  const [perfil, setPerfil] = useState<any>(perfilRes.ok ? perfilRes.perfil : {});
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [progressoInfo, setProgressoInfo] = useState<any>(null);
  
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  const [personalData, setPersonalData] = useState({
    nomeCompleto: '',
    email: '',
    whatsapp: '',
    cpf: '',
    dataNascimento: '',
    estadoCivil: '',
    profissao: '',
    nomeMae: '',
  });

  const [addressData, setAddressData] = useState({
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  const [files, setFiles] = useState({
    cnhFrente: null as string | null,
    cnhVerso: null as string | null,
    crlv: null as string | null,
    selfie: null as string | null,
    comprovanteEndereco: null as string | null,
  });

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const res = await getProfile({ data: { perfilId: user.id } });
        if (res.ok && res.perfil) {
          const p = res.perfil;
          setPerfil(p);
          setPersonalData({
            nomeCompleto: p.nome || '',
            email: p.email || '',
            whatsapp: p.whatsapp || '',
            cpf: p.cpf || '',
            dataNascimento: p.data_nascimento || '',
            estadoCivil: p.estado_civil || '',
            profissao: p.profissao || '',
            nomeMae: p.nome_mae || '',
          });
          setAddressData({
            cep: p.cep || '',
            endereco: p.endereco || '',
            numero: p.numero || '',
            complemento: p.complemento || '',
            bairro: p.bairro || '',
            cidade: p.cidade || '',
            uf: p.uf || '',
          });
          setFiles({
            cnhFrente: p.documento_cnh_url || null,
            cnhVerso: p.documento_cnh_verso_url || null,
            crlv: p.documento_crlv_url || null,
            selfie: p.documento_selfie_url || null,
            comprovanteEndereco: p.documento_comprovante_endereco_url || null,
          });

          const det = await getDetalhe({ data: { id: user.id } });
          if (det.ok) {
            setProgressoInfo(det.data.progresso);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [user, getProfile, getDetalhe]);

  useEffect(() => {
    if (progressoInfo) {
      if (perfil.cadastro_completo) {
        setStep(5);
      } else if (progressoInfo.etapas.validacao === "CONCLUIDO") setStep(5);
      else if (progressoInfo.etapas.documentos === "CONCLUIDO") setStep(4);
      else if (progressoInfo.etapas.endereco === "CONCLUIDO") setStep(3);
      else if (progressoInfo.etapas.dados_pessoais === "CONCLUIDO") setStep(2);
      else setStep(1);
    }
  }, [progressoInfo, perfil.cadastro_completo]);

  const DOCS_OBRIGATORIOS: { label: string; ok: boolean }[] = [
    { label: "CNH (frente)", ok: !!files.cnhFrente },
    { label: "CNH (verso)", ok: !!files.cnhVerso },
    { label: "CRLV-e", ok: !!files.crlv },
    { label: "Comprovante de residência", ok: !!files.comprovanteEndereco },
    { label: "Selfie de validação", ok: !!files.selfie },
  ];
  const documentosFaltantes = DOCS_OBRIGATORIOS.filter((d) => !d.ok).map((d) => d.label);

  const saveProgress = async (finalizar = false) => {
    setIsSubmitting(true);
    try {
      await updateDocs({
        data: {
          perfilId: user?.id || "",
          cpf: personalData.cpf,
          dataNascimento: personalData.dataNascimento,
          estadoCivil: personalData.estadoCivil,
          profissao: personalData.profissao,
          nomeMae: personalData.nomeMae,
          cep: addressData.cep,
          endereco: addressData.endereco,
          numero: addressData.numero,
          bairro: addressData.bairro,
          complemento: addressData.complemento,
          cidade: addressData.cidade,
          uf: addressData.uf,
          cnhUrl: files.cnhFrente || undefined,
          cnhVersoUrl: files.cnhVerso || undefined,
          crlvUrl: files.crlv || undefined,
          selfieUrl: files.selfie || undefined,
          comprovanteEnderecoUrl: files.comprovanteEndereco || undefined,
          finalizar
        }
      });
      return true;
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar progresso.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    const ok = await saveProgress(false);
    if (ok) {
       setStep(s => s + 1);
       window.scrollTo(0, 0);
       // Refresh progress info
       if (user) {
         const det = await getDetalhe({ data: { id: user.id } });
         if (det.ok) setProgressoInfo(det.data.progresso);
       }
    }
  };

  const handleFinalizar = async () => {
    if (!agreedTerms || !agreedPrivacy) {
      toast.error("Você precisa aceitar os termos e a política de privacidade.");
      return;
    }
    const ok = await saveProgress(true);
    if (ok) {
      toast.success("Cadastro enviado para análise!");
      navigate({ to: '/vendedor' });
    }
  };

  const handleCepChange = async (cep: string) => {
    const masked = maskCep(cep);
    setAddressData(prev => ({ ...prev, cep: masked }));
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      const address = await buscarCep(cleanCep);
      if (address) {
        setAddressData(prev => ({ 
          ...prev, 
          endereco: address.logradouro, 
          bairro: address.bairro, 
          cidade: address.cidade, 
          uf: address.uf 
        }));
        toast.success("Endereço localizado!");
      }
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h3 className="text-2xl font-black text-slate-900">Conte um pouco mais sobre você</h3>
        <p className="text-slate-500 text-sm">Dados marcados com * são obrigatórios.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input disabled value={personalData.nomeCompleto} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input 
            id="cpf"
            name="cpf"
            value={personalData.cpf || ''} 
            onChange={e => setPersonalData(p => ({ ...p, cpf: maskCpf(e.target.value) }))}
            placeholder="000.000.000-00"
          />
        </div>
        <div className="space-y-2">
          <Label>Data de nascimento *</Label>
          <Input type="date" value={personalData.dataNascimento} onChange={e => setPersonalData({...personalData, dataNascimento: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Estado civil</Label>
          <ComboboxSearch options={ESTADOS_CIVIS} value={personalData.estadoCivil} onChange={v => setPersonalData({...personalData, estadoCivil: v})} placeholder="Selecione" allowOther />
        </div>
        <div className="space-y-2">
          <Label>Profissão</Label>
          <ComboboxSearch options={PROFISSOES} value={personalData.profissao} onChange={v => setPersonalData({...personalData, profissao: v})} placeholder="Selecione" allowOther />
        </div>
        <div className="space-y-2">
          <Label>Nome da mãe</Label>
          <Input value={personalData.nomeMae} onChange={e => setPersonalData({...personalData, nomeMae: e.target.value})} />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h3 className="text-2xl font-black text-slate-900">Onde você mora?</h3>
        <p className="text-slate-500 text-sm">Informe seu endereço residencial atual.</p>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2 col-span-1">
            <Label>CEP *</Label>
            <Input placeholder="00000-000" value={addressData.cep} onChange={e => handleCepChange(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Rua / Avenida *</Label>
            <Input value={addressData.endereco} onChange={e => setAddressData({...addressData, endereco: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Número *</Label>
            <Input value={addressData.numero} onChange={e => setAddressData({...addressData, numero: e.target.value})} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Complemento</Label>
            <Input value={addressData.complemento} onChange={e => setAddressData({...addressData, complemento: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bairro *</Label>
            <Input value={addressData.bairro} onChange={e => setAddressData({...addressData, bairro: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2 col-span-2">
               <Label>Cidade *</Label>
               <Input value={addressData.cidade} onChange={e => setAddressData({...addressData, cidade: e.target.value})} />
            </div>
            <div className="space-y-2">
               <Label>UF *</Label>
               <ComboboxSearch options={UFS} value={addressData.uf} onChange={v => setAddressData({...addressData, uf: v})} placeholder="UF" />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100">
         <FileUpload 
           label="Comprovante de residência *" 
           description="Obrigatório. Conta de luz, água ou telefone de até 3 meses."
           value={files.comprovanteEndereco} 
           onChange={url => setFiles({...files, comprovanteEndereco: url})} 
         />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h3 className="text-2xl font-black text-slate-900">Validação de Documento</h3>
        <p className="text-slate-500 text-sm">Tire fotos nítidas da sua CNH original.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
         <FileUpload label="CNH — Frente *" value={files.cnhFrente} onChange={url => setFiles({...files, cnhFrente: url})} />
         <FileUpload label="CNH — Verso *" value={files.cnhVerso} onChange={url => setFiles({...files, cnhVerso: url})} />
      </div>
      <div className="pt-4 border-t border-slate-100">
         <FileUpload 
           label="Documento do Veículo (CRLV-e) *" 
           description="Obrigatório para concluir o cadastro."
           value={files.crlv} 
           onChange={url => setFiles({...files, crlv: url})} 
         />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1 text-center">
        <h3 className="text-2xl font-black text-slate-900">Precisamos confirmar que é você</h3>
        <p className="text-slate-500 text-sm">Tire uma selfie segurando sua CNH ao lado do rosto.</p>
      </div>
      <div className="flex justify-center py-4">
        <div className="w-48 h-48 rounded-full border-4 border-teal-50 bg-slate-100 flex items-center justify-center overflow-hidden">
          {files.selfie ? (
            <img src={files.selfie} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-16 h-16 text-slate-300" />
          )}
        </div>
      </div>
      <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
         <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-600" /> Dicas para uma boa foto:
         </h4>
         <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
            <li>• Rosto e CNH visíveis</li>
            <li>• Boa iluminação</li>
            <li>• Sem óculos escuros</li>
            <li>• Sem filtros</li>
         </ul>
      </div>
      <FileUpload label="Selfie de Validação *" value={files.selfie} onChange={url => setFiles({...files, selfie: url})} />
    </div>
  );

  const renderStep5 = () => {
    const isPendente = progressoInfo?.progresso < 100;
    
    return (
      <div className="space-y-6 text-center py-8">
        {isPendente ? (
          <>
            <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cadastro quase pronto!</h2>
            <p className="text-slate-600">Você ainda possui etapas pendentes no seu cadastro pessoal.</p>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-left max-w-sm mx-auto">
              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" /> Itens pendentes:
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {progressoInfo?.etapas.dados_pessoais === "PENDENTE" && <li>• Dados Pessoais</li>}
                {progressoInfo?.etapas.endereco === "PENDENTE" && <li>• Endereço</li>}
                {progressoInfo?.etapas.documentos === "PENDENTE" && <li>• Documentos (CNH/CRLV)</li>}
                {progressoInfo?.etapas.validacao === "PENDENTE" && <li>• Selfie de validação</li>}
              </ul>
            </div>
            
            <div className="space-y-4 pt-6 text-left max-w-sm mx-auto">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="terms" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4" />
                <Label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer">Li e aceito os Termos de Uso.</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="privacy" checked={agreedPrivacy} onChange={e => setAgreedPrivacy(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4" />
                <Label htmlFor="privacy" className="text-xs text-slate-600 cursor-pointer">Aceito a Política de Privacidade.</Label>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <Button onClick={handleFinalizar} disabled={isSubmitting || !agreedTerms || !agreedPrivacy} className="bg-teal-600 hover:bg-teal-700">
                {isSubmitting ? "Finalizando..." : "Finalizar Cadastro"}
              </Button>
              <Button onClick={() => setStep(1)} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Voltar e completar
              </Button>
            </div>
          </>
        ) : perfil.status_compliance === 'APROVADO' ? (
          <>
            <div className="h-20 w-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-10 w-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cadastro Aprovado!</h2>
            <p className="text-slate-600">Parabéns! Seu cadastro foi aprovado. Agora você já pode cadastrar veículos.</p>
            <Button onClick={() => navigate({ to: "/vendedor" })} className="mt-6 w-full max-w-xs bg-teal-600 hover:bg-teal-700">
              Ir para o Dashboard
            </Button>
          </>
        ) : (
          <>
            <div className="h-20 w-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cadastro Enviado!</h2>
            <p className="text-slate-600">Seus dados estão em análise pela nossa equipe.</p>
            <Button onClick={() => navigate({ to: "/vendedor" })} variant="outline" className="mt-6 w-full max-w-xs">
              Ir para o Dashboard
            </Button>
          </>
        )}
      </div>
    );
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-700 animate-spin" />
        <p className="mt-4 text-slate-500">Carregando seus dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 md:py-16">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-12 h-12 bg-teal-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Car className="w-7 h-7 text-amber-400" />
          </div>
          <span className="font-display text-3xl font-black text-teal-900 uppercase tracking-tight">
            ESSE<span className="text-amber-500">JÁ</span>FOI
          </span>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden bg-white rounded-3xl">
          <CardHeader className="bg-teal-900 p-8 md:p-10 text-white">
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium opacity-80">
                <span>Passo {step} de 5</span>
                <span>{progressoInfo?.progresso || 0}% concluído</span>
              </div>
              <Progress value={progressoInfo?.progresso || 0} className="h-2 bg-white/20" />
              <div className="flex justify-between pt-2">
                {ETAPAS_LABELS.map((label, i) => (
                  <div key={i} className={`text-[10px] uppercase font-bold text-center w-12 ${step === i + 1 ? 'text-amber-400' : 'text-white/40'}`}>
                    {label.split(' ')[0]}
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 md:p-10">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            {step < 5 && (
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                <Button variant="ghost" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1 || isSubmitting}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <div className="flex gap-2">
                   <Button variant="outline" onClick={() => navigate({ to: '/vendedor' })} disabled={isSubmitting}>Sair</Button>
                   <Button onClick={handleNext} disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 min-w-[120px]">
                     {isSubmitting ? "Salvando..." : step === 4 ? "Revisar" : "Continuar"}
                     {!isSubmitting && step < 4 && <ChevronRight className="ml-2 h-4 w-4" />}
                   </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}