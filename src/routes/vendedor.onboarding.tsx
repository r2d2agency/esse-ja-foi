import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Car, Loader2, ArrowRight, Save, Camera, Check, User, MapPin, FileCheck, Search, AlertTriangle } from 'lucide-react';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { ESTADOS_CIVIS, PROFISSOES, UFS } from '@/lib/constants-veiculos';
import { useState, useEffect, useRef } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { atualizarDocumentosVendedorFn } from '@/lib/vendedor.functions';
import { buscarCep, maskCep, formatCurrency } from '@/lib/brasil';
import { FileUpload } from '@/components/onboarding/FileUpload';
import { EtapaProgresso } from '@/components/onboarding/EtapaProgresso';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/vendedor/onboarding')({
  component: VendedorOnboarding,
});

const ETAPAS_LABELS = ['Dados', 'Endereço', 'Documentos', 'Selfie', 'Revisão'];

function VendedorOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const updateDocs = useServerFn(atualizarDocumentosVendedorFn);

  const [personalData, setPersonalData] = useState({
    nomeCompleto: '',
    cpf: '',
    dataNascimento: '',
    estadoCivil: '',
    profissao: '',
    whatsapp: '',
    email: '',
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

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setPersonalData(prev => ({
        ...prev,
        nomeCompleto: user.nome || '',
        email: user.email || '',
        whatsapp: (user as any).whatsapp || '',
        cpf: (user as any).cpf || '',
      }));
    }
  }, [user]);

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
          cep: addressData.cep,
          endereco: `${addressData.endereco}, ${addressData.numero}${addressData.complemento ? ` - ${addressData.complemento}` : ""} - ${addressData.bairro}`,
          cidade: addressData.cidade,
          uf: addressData.uf,
          cnhUrl: files.cnhFrente || undefined, // Simplified for now
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
    }
  };

  const handleSalvarSair = async () => {
    const ok = await saveProgress(false);
    if (ok) {
      toast.success("Progresso salvo com sucesso!");
      navigate({ to: '/vendedor' });
    }
  };

  const handleFinalizar = async () => {
    if (!agreedTerms || !agreedPrivacy) {
      toast.error("Você precisa aceitar os termos e a política de privacidade.");
      return;
    }
    if (documentosFaltantes.length > 0) {
      toast.error(`Envie todos os documentos para concluir: ${documentosFaltantes.join(", ")}.`);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 md:py-16">
      <div className="w-full max-w-3xl">
        {/* Logo Section */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-12 h-12 bg-teal-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Car className="w-7 h-7 text-amber-400" />
          </div>
          <span className="font-display text-3xl font-black text-teal-900 uppercase tracking-tight">
            ESSE<span className="text-amber-500">JÁ</span>FOI
          </span>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden bg-white rounded-3xl">
          <CardHeader className="bg-teal-900 p-8 md:p-10">
            <EtapaProgresso currentStep={step} totalSteps={5} etapas={ETAPAS_LABELS} />
          </CardHeader>
          
          <CardContent className="p-6 md:p-10 space-y-8">
            {/* STEP 1: DADOS PESSOAIS */}
            {step === 1 && (
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
                    <Label>CPF *</Label>
                    <Input disabled value={personalData.cpf} />
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
            )}

            {/* STEP 2: ENDEREÇO */}
            {step === 2 && (
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
                   <p className="mt-2 text-xs text-slate-400">Você pode continuar sem enviar agora, mas o cadastro só é concluído com todos os documentos.</p>
                </div>
              </div>
            )}

            {/* STEP 3: DOCUMENTOS */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900">Validação de Documento</h3>
                  <p className="text-slate-500 text-sm">Tire fotos nítidas da sua CNH original.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                   <FileUpload 
                     label="CNH — Frente *" 
                     value={files.cnhFrente} 
                     onChange={url => setFiles({...files, cnhFrente: url})} 
                   />
                   <FileUpload 
                     label="CNH — Verso *" 
                     value={files.cnhVerso} 
                     onChange={url => setFiles({...files, cnhVerso: url})} 
                   />
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <FileUpload 
                     label="Documento do Veículo (CRLV-e) *" 
                     description="Obrigatório para concluir o cadastro."
                     value={files.crlv} 
                     onChange={url => setFiles({...files, crlv: url})} 
                   />
                   <p className="mt-2 text-[10px] text-slate-400 uppercase font-bold text-center">Você pode pular agora, mas é exigido na conclusão</p>
                </div>
              </div>
            )}

            {/* STEP 4: SELFIE */}
            {step === 4 && (
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

                <FileUpload 
                  label="Selfie de Validação" 
                  value={files.selfie} 
                  onChange={url => setFiles({...files, selfie: url})} 
                />
              </div>
            )}

            {/* STEP 5: REVISÃO */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-2xl font-black text-slate-900">Confira seus dados</h3>

                <div className="space-y-6">
                  {/* Bloco Dados */}
                  <div className="rounded-2xl border border-slate-100 p-5 space-y-4">
                    <div className="flex justify-between items-center">
                       <h4 className="font-bold text-slate-900 flex items-center gap-2">
                          <User className="w-5 h-5 text-teal-600" /> Dados Pessoais
                       </h4>
                       <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-7 text-teal-700 font-bold">Editar</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div><p className="text-slate-400 text-[10px] uppercase font-bold">Nome</p><p className="font-medium">{personalData.nomeCompleto}</p></div>
                       <div><p className="text-slate-400 text-[10px] uppercase font-bold">CPF</p><p className="font-medium">{personalData.cpf}</p></div>
                       <div><p className="text-slate-400 text-[10px] uppercase font-bold">Nascimento</p><p className="font-medium">{personalData.dataNascimento}</p></div>
                       <div><p className="text-slate-400 text-[10px] uppercase font-bold">WhatsApp</p><p className="font-medium">{personalData.whatsapp}</p></div>
                    </div>
                  </div>

                  {/* Bloco Endereço */}
                  <div className="rounded-2xl border border-slate-100 p-5 space-y-4">
                    <div className="flex justify-between items-center">
                       <h4 className="font-bold text-slate-900 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-teal-600" /> Endereço
                       </h4>
                       <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="h-7 text-teal-700 font-bold">Editar</Button>
                    </div>
                    <div className="text-sm">
                       <p className="text-slate-400 text-[10px] uppercase font-bold">Localização</p>
                       <p className="font-medium">{addressData.endereco}, {addressData.numero}</p>
                       <p className="text-slate-500">{addressData.bairro} — {addressData.cidade}/{addressData.uf}</p>
                       <p className="text-slate-400 mt-1">{addressData.cep}</p>
                    </div>
                  </div>

                  {/* Bloco Documentos */}
                  <div className="rounded-2xl border border-slate-100 p-5 space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-teal-600" /> Documentos Enviados
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       {DOCS_OBRIGATORIOS.map((d) => (
                          <div key={d.label} className={cn("flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl", d.ok ? "text-emerald-600 bg-emerald-50" : "text-amber-700 bg-amber-50")}>
                             {d.ok ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {d.label}
                          </div>
                       ))}
                    </div>
                    {documentosFaltantes.length > 0 && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
                        <p className="font-bold mb-1">Faltam {documentosFaltantes.length} documento(s) para concluir 100% do cadastro.</p>
                        <p>Você pode salvar e voltar depois, mas o envio para análise só é liberado com todos os documentos.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="terms" checked={agreedTerms} onCheckedChange={(v) => setAgreedTerms(!!v)} className="mt-1" />
                    <Label htmlFor="terms" className="text-xs leading-relaxed text-slate-600">
                      Declaro que as informações fornecidas são verdadeiras e que os documentos enviados pertencem a mim.
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox id="privacy" checked={agreedPrivacy} onCheckedChange={(v) => setAgreedPrivacy(!!v)} className="mt-1" />
                    <Label htmlFor="privacy" className="text-xs leading-relaxed text-slate-600">
                      Autorizo o Esse Já Foi a realizar as verificações necessárias para análise cadastral, conforme os <Link to="/ajuda" className="text-teal-700 font-bold underline">Termos de Uso</Link> e <Link to="/ajuda" className="text-teal-700 font-bold underline">Privacidade</Link>.
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Navegação Inferior */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center pt-6 border-t border-slate-100">
               {step < 5 ? (
                  <Button 
                    onClick={handleNext} 
                    className="h-14 w-full md:flex-1 rounded-2xl bg-teal-900 text-white font-black text-lg shadow-xl shadow-teal-900/20 group"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        Continuar <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
               ) : (
                  <Button 
                    onClick={handleFinalizar} 
                    className="h-14 w-full md:flex-1 rounded-2xl bg-teal-600 text-white font-black text-lg shadow-xl shadow-teal-600/20"
                    disabled={isSubmitting || !agreedTerms || !agreedPrivacy}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar para análise"}
                  </Button>
               )}
               
                 <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (step > 1) {
                          setStep(s => s - 1);
                          window.scrollTo(0, 0);
                        }
                      }} 
                      className="h-14 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold flex-1 md:flex-initial"
                      disabled={isSubmitting || step === 1}
                    >
                      Voltar
                    </Button>
                 <Button 
                    variant="ghost" 
                    onClick={handleSalvarSair} 
                    className="h-14 px-6 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 flex-1 md:flex-initial"
                    disabled={isSubmitting}
                 >
                   <Save className="mr-2 w-4 h-4" /> Salvar e sair
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-slate-400 text-[10px] uppercase tracking-widest font-black">
          © 2026 ESSE JÁ FOI — AMBIENTE SEGURO E CRIPTOGRAFADO
        </p>
      </div>
    </div>
  );
}

// Link dummy component if not imported
function Link({ to, children, className }: { to: string, children: React.ReactNode, className?: string }) {
  return <a href={to} className={className}>{children}</a>;
}
