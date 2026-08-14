import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Car, ArrowLeft, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { buscarCep } from '@/lib/brasil';
import { cadastrarMeuVeiculoFn } from '@/lib/vendedor.functions';
import { toast } from 'sonner';

export const Route = createFileRoute('/vendedor/cadastrar')({
  component: CadastrarVeiculoVendedor,
});

const OPCIONAIS_LIST = [
  "Ar Condicionado", "Direção Hidráulica", "Vidros Elétricos", "Travas Elétricas",
  "Alarme", "Airbag", "Freios ABS", "Bancos de Couro", "Teto Solar",
  "Central Multimídia", "Sensor de Estacionamento", "Câmera de Ré",
  "Rodas de Liga Leve", "Controle de Estabilidade", "Piloto Automático"
];

function CadastrarVeiculoVendedor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cadastrarVeiculo = useServerFn(cadastrarMeuVeiculoFn);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    anoFabricacao: '',
    anoModelo: '',
    km: 0,
    valorInteresse: 0,
    observacoes: '',
    opcionais: [] as string[],
    aceiteTermos: false,
  });

  const [localizacao, setLocalizacao] = useState({
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    complemento: '',
    cidade: '',
    uf: '',
  });

  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setLocalizacao(prev => ({ ...prev, cep }));
    
    if (cleanCep.length === 8) {
      try {
        const address = await buscarCep(cleanCep);
        if (address) {
          setLocalizacao({
            cep: address.cep,
            endereco: address.logradouro,
            bairro: address.bairro,
            numero: '',
            complemento: '',
            cidade: address.cidade,
            uf: address.uf
          });
          toast.success("Endereço localizado");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  }, []);

  const handleToggleOpcional = (opcional: string) => {
    setForm(prev => ({
      ...prev,
      opcionais: prev.opcionais.includes(opcional)
        ? prev.opcionais.filter(o => o !== opcional)
        : [...prev.opcionais, opcional]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.aceiteTermos) {
      toast.error("Você precisa aceitar os termos para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await cadastrarVeiculo({
        data: {
          ...form,
          ...localizacao,
          endereco: `${localizacao.endereco}, ${localizacao.numero}${localizacao.complemento ? ` - ${localizacao.complemento}` : ""} - ${localizacao.bairro}`,
          perfilId: user.id,
        }
      });

      if (result) {
        toast.success("Veículo enviado para análise com sucesso!");
        navigate({ to: '/vendedor' });
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar veículo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 text-slate-500 hover:text-teal-900" 
          onClick={() => {
            console.log("Returning to dashboard...");
            navigate({ to: '/vendedor' });
          }}

        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>

        <Card className="shadow-lg border-none">
          <CardHeader className="bg-teal-900 text-white rounded-t-xl pb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center">
                <Car className="w-7 h-7 text-teal-900" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Vender meu Veículo</CardTitle>
                <p className="text-teal-100/80 text-sm">Passo {step} de 3: {step === 1 ? 'Dados do Veículo' : step === 2 ? 'Opcionais e Fotos' : 'Preço e Finalização'}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-amber-400' : 'bg-teal-800'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-amber-400' : 'bg-teal-800'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-amber-400' : 'bg-teal-800'}`} />
            </div>
          </CardHeader>
          
          <CardContent className="pt-8 px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Placa *</Label>
                      <Input 
                        required 
                        placeholder="ABC1D23" 
                        className="h-12 border-slate-200"
                        value={form.placa}
                        onChange={e => setForm({...form, placa: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">KM Atual *</Label>
                      <Input 
                        type="number" 
                        required
                        placeholder="0" 
                        className="h-12 border-slate-200"
                        value={form.km}
                        onChange={e => setForm({...form, km: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Marca *</Label>
                      <Input 
                        required 
                        placeholder="Ex: Toyota" 
                        className="h-12 border-slate-200"
                        value={form.marca}
                        onChange={e => setForm({...form, marca: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Modelo *</Label>
                      <Input 
                        required 
                        placeholder="Ex: Corolla" 
                        className="h-12 border-slate-200"
                        value={form.modelo}
                        onChange={e => setForm({...form, modelo: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Ano Fabricação *</Label>
                      <Input 
                        required
                        placeholder="2020" 
                        className="h-12 border-slate-200"
                        value={form.anoFabricacao}
                        onChange={e => setForm({...form, anoFabricacao: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Ano Modelo *</Label>
                      <Input 
                        required
                        placeholder="2021" 
                        className="h-12 border-slate-200"
                        value={form.anoModelo}
                        onChange={e => setForm({...form, anoModelo: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">CEP Onde o Veículo se encontra *</Label>
                      <Input 
                        required 
                        placeholder="00000-000" 
                        className="h-12 border-slate-200"
                        value={localizacao.cep}
                        onChange={e => handleCepChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Logradouro *</Label>
                      <Input 
                        required 
                        placeholder="Rua, Av, etc" 
                        className="h-12 border-slate-200"
                        value={localizacao.endereco}
                        onChange={e => setLocalizacao({...localizacao, endereco: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="space-y-2 col-span-1">
                      <Label className="text-slate-700 font-bold">Número *</Label>
                      <Input 
                        required 
                        placeholder="123" 
                        className="h-12 border-slate-200"
                        value={localizacao.numero}
                        onChange={e => setLocalizacao({...localizacao, numero: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 col-span-3">
                      <Label className="text-slate-700 font-bold">Bairro *</Label>
                      <Input 
                        required 
                        placeholder="Bairro" 
                        className="h-12 border-slate-200"
                        value={localizacao.bairro}
                        onChange={e => setLocalizacao({...localizacao, bairro: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Complemento</Label>
                      <Input 
                        placeholder="Apto, Bloco, etc" 
                        className="h-12 border-slate-200"
                        value={localizacao.complemento}
                        onChange={e => setLocalizacao({...localizacao, complemento: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Cidade *</Label>
                      <Input 
                        required 
                        placeholder="Ex: São Paulo" 
                        className="h-12 border-slate-200"
                        value={localizacao.cidade}
                        onChange={e => setLocalizacao({...localizacao, cidade: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">UF *</Label>
                      <Input 
                        required 
                        maxLength={2}
                        placeholder="SP" 
                        className="h-12 border-slate-200"
                        value={localizacao.uf}
                        onChange={e => setLocalizacao({...localizacao, uf: e.target.value.toUpperCase()})}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button 
                      type="button" 
                      className="bg-teal-900 hover:bg-teal-950 text-white px-8 h-12 font-bold"
                      onClick={() => {
                        if (!localizacao.cep || !localizacao.endereco || !localizacao.cidade || !localizacao.uf) {
                          toast.error("Por favor, informe a localização do veículo.");
                          return;
                        }
                        setStep(2);
                      }}
                    >
                      Próximo Passo
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="space-y-4">
                    <Label className="text-slate-700 font-bold text-lg">Opcionais do Veículo</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {OPCIONAIS_LIST.map((opcional) => (
                        <div key={opcional} className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-teal-200 transition-colors">
                          <Checkbox 
                            id={opcional} 
                            checked={form.opcionais.includes(opcional)}
                            onCheckedChange={() => handleToggleOpcional(opcional)}
                          />
                          <label htmlFor={opcional} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                            {opcional}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-slate-700 font-bold text-lg">Fotos do Veículo</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer text-slate-400 hover:text-teal-700 hover:border-teal-300">
                          <Upload className="w-6 h-6" />
                          <span className="text-[10px] font-bold uppercase">Foto {i}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">Dica: Fotos bem iluminadas e limpas ajudam na aprovação mais rápida.</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1 h-12 font-bold"
                      onClick={() => setStep(1)}
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1 bg-teal-900 hover:bg-teal-950 text-white h-12 font-bold"
                      onClick={() => setStep(3)}
                    >
                      Próximo Passo
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 space-y-4">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Expectativa de Valor
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-amber-800">Quanto você deseja receber pelo veículo? (R$)</Label>
                      <Input 
                        type="number"
                        placeholder="Ex: 85000"
                        className="h-12 border-amber-200 bg-white"
                        value={form.valorInteresse}
                        onChange={e => setForm({...form, valorInteresse: Number(e.target.value)})}
                      />
                    </div>
                    <p className="text-xs text-amber-700/70">Este valor será analisado com base na tabela FIPE e mercado atual.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Observações Adicionais</Label>
                    <Textarea 
                      placeholder="Conte detalhes sobre o estado de conservação, revisões, etc."
                      className="min-h-[120px] border-slate-200"
                      value={form.observacoes}
                      onChange={e => setForm({...form, observacoes: e.target.value})}
                    />
                  </div>

                  <div className="bg-slate-100 p-4 rounded-lg flex items-start gap-3">
                    <Checkbox 
                      id="termos" 
                      className="mt-1"
                      checked={form.aceiteTermos}
                      onCheckedChange={(checked) => setForm({...form, aceiteTermos: checked as boolean})}
                    />
                    <label htmlFor="termos" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                      Declaro que as informações acima são verdadeiras e que estou ciente que o veículo passará por uma análise técnica e vistoria cautelar para ser aceito na plataforma.
                    </label>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1 h-12 font-bold"
                      onClick={() => setStep(2)}
                    >
                      Voltar
                    </Button>
                    <Button 
                      disabled={isSubmitting || !form.aceiteTermos}
                      className="flex-1 bg-teal-900 hover:bg-teal-950 text-white font-bold h-12 shadow-lg shadow-teal-900/20"
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : "Finalizar e Enviar"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm italic">O seu veículo será analisado em até 24h úteis pela nossa equipe de curadoria.</p>
        </div>
      </div>
    </div>
  );
}
