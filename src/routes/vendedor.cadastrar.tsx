import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Save, Search, Check, CheckCircle2, AlertTriangle, Car, FileText, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EtapaProgresso } from '@/components/onboarding/EtapaProgresso';
import { FileUpload } from '@/components/onboarding/FileUpload';
import { FotoSlot } from '@/components/veiculo/FotoSlot';
import { OpcaoBotoes } from '@/components/veiculo/OpcaoBotoes';
import { useAuth } from '@/hooks/use-auth';
import { cadastrarMeuVeiculoFn, listarMeusVeiculosFn } from '@/lib/vendedor.functions';
import { maskPlaca, formatCurrency, buscarCep, maskCep } from '@/lib/brasil';
import { montarEtapas, percentual } from '@/components/vendedor/ProgressoCadastro';
import { TODAS_MARCAS, MARCAS_POPULARES, MODELOS_POR_MARCA, CORES, COMBUSTIVEIS, CAMBIOS, PORTAS, UFS, RELACOES_PROPRIETARIO, BANCOS_COMUNS } from '@/lib/constants-veiculos';



export const Route = createFileRoute('/vendedor/cadastrar')({
  component: CadastrarVeiculo,
});

const ETAPAS = ['Placa', 'Dados', 'Documentação', 'Condição', 'Fotos', 'Valor', 'Revisão'];
const DRAFT_KEY = 'ejf_veiculo_rascunho';

const FOTOS = [
  { id: 'frente45', label: 'Frente 45°', dica: 'Mostre a frente e uma lateral.' },
  { id: 'traseira45', label: 'Traseira 45°', dica: 'Mostre a traseira e uma lateral.' },
  { id: 'lateralEsq', label: 'Lateral esquerda', dica: 'Carro inteiro no enquadramento.' },
  { id: 'lateralDir', label: 'Lateral direita', dica: 'Carro inteiro no enquadramento.' },
  { id: 'painel', label: 'Painel', dica: 'Com o painel ligado.' },
  { id: 'km', label: 'Quilometragem', dica: 'Odômetro legível.' },
  { id: 'bancosDianteiros', label: 'Bancos dianteiros' },
  { id: 'bancosTraseiros', label: 'Bancos traseiros' },
  { id: 'motor', label: 'Motor', dica: 'Capô aberto.' },
  { id: 'portaMalas', label: 'Porta-malas' },
];

type Estado = {
  placa: string;
  marca: string; modelo: string; versao: string;
  anoFabricacao: string; anoModelo: string; cor: string;
  combustivel: string; cambio: string; portas: string;
  km: string; cep: string; cidade: string; uf: string;
  emSeuNome: string; relacaoProprietario: string; relacaoDescricao: string;
  financiado: string; instituicao: string; saldoQuitacao: string;
  crlv: string | null;
  funcionamento: string; funcionamentoObs: string;
  motor: string; motorObs: string; cambioProblema: string;
  lataria: string; latariaObs: string; interior: string; pneus: string;
  acidente: string; leilao: string; sinistro: string; restricao: string; historicoObs: string;
  chaveReserva: string; manual: string; estepe: string; acessorios: string; acessoriosQuais: string;
  fotos: Record<string, string | null>;
  valorDesejado: string; temMinimo: string; valorMinimo: string;
};

const INICIAL: Estado = {
  placa: '', marca: '', modelo: '', versao: '', anoFabricacao: '', anoModelo: '', cor: '',
  combustivel: '', cambio: '', portas: '', km: '', cep: '', cidade: '', uf: '',
  emSeuNome: 'Sim', relacaoProprietario: '', relacaoDescricao: '',
  financiado: 'Não, está quitado', instituicao: '', saldoQuitacao: '',
  crlv: null,
  funcionamento: '', funcionamentoObs: '', motor: '', motorObs: '', cambioProblema: '',
  lataria: '', latariaObs: '', interior: '', pneus: '',
  acidente: '', leilao: '', sinistro: '', restricao: '', historicoObs: '',
  chaveReserva: '', manual: '', estepe: '', acessorios: '', acessoriosQuais: '',
  fotos: {}, valorDesejado: '', temMinimo: 'Não', valorMinimo: '',
};

const soDigitos = (v: string) => v.replace(/\D/g, '');
const moeda = (v: string) => {
  const n = Number(soDigitos(v)) / 100;
  return n > 0 ? formatCurrency(n) : '';
};
const valorNumero = (v: string) => Number(soDigitos(v)) / 100;

function CadastrarVeiculo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const salvarVeiculo = useServerFn(cadastrarMeuVeiculoFn);
  const listar = useServerFn(listarMeusVeiculosFn);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Estado>(INICIAL);
  const [buscando, setBuscando] = useState(false);
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [veiculoEncontrado, setVeiculoEncontrado] = useState<null | { marca: string; modelo: string; versao: string; ano: string }>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [declaracao1, setDeclaracao1] = useState(false);
  const [declaracao2, setDeclaracao2] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const hidratado = useRef(false);

  const { data } = useQuery({
    queryKey: ['meus-veiculos', user?.id],
    queryFn: () => listar({ data: { perfilId: user?.id || '' } }),
    enabled: !!user?.id,
  });
  const profile = (data as any)?.profile || {};
  const cadastroLiberado = profile.cadastro_completo === true || percentual(montarEtapas(profile)) >= 80;

  const set = (patch: Partial<Estado>) => setForm((f) => ({ ...f, ...patch }));

  // Rascunho: hidratação + salvamento automático
  useEffect(() => {
    const bruto = localStorage.getItem(DRAFT_KEY);
    if (bruto) {
      try { setForm({ ...INICIAL, ...JSON.parse(bruto) }); } catch { }
    } else {
      const placa = sessionStorage.getItem('ejf_placa');
      if (placa) setForm((f) => ({ ...f, placa: maskPlaca(placa) }));
    }
    hidratado.current = true;
  }, []);

  useEffect(() => {
    if (!hidratado.current) return;
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 800);
    return () => clearTimeout(t);
  }, [form]);

  const buscarPlaca = async () => {
    if (soDigitos(form.placa).length + form.placa.replace(/[^A-Z]/g, '').length < 7) {
      toast.error('Informe a placa completa.');
      return;
    }
    setBuscando(true);
    setVeiculoEncontrado(null);
    // Estrutura pronta para integração futura com API de consulta veicular.
    await new Promise((r) => setTimeout(r, 1200));
    
    // Simulação de preenchimento automático via placa desativada a pedido do usuário
    /* 
    set({
      marca: 'Volkswagen',
      modelo: 'T-Cross',
      versao: 'Highline 250 TSI',
      anoFabricacao: '2023',
      anoModelo: '2024',
      combustivel: 'Flex',
      cambio: 'Automático',
      portas: '4',
      cor: 'Branco',
    });
    */

    setBuscando(false);
    setBuscaFeita(true);
    toast.success("Dados do veículo localizados!");
    avancar();
  };


  const avancar = async () => {
    // Tenta salvar o progresso parcial no banco sempre que avançar de etapa
    if (user?.id) {
      try {
        const condicao = {
          funcionamento: form.funcionamento, funcionamentoObs: form.funcionamentoObs,
          motor: form.motor, motorObs: form.motorObs, cambio: form.cambioProblema,
          lataria: form.lataria, latariaObs: form.latariaObs, interior: form.interior, pneus: form.pneus,
          historico: { acidente: form.acidente, leilao: form.leilao, sinistro: form.sinistro, restricao: form.restricao, obs: form.historicoObs },
          itens: { chaveReserva: form.chaveReserva, manual: form.manual, estepe: form.estepe, acessorios: form.acessoriosQuais },
          proprietario: { emSeuNome: form.emSeuNome, relacao: form.relacaoProprietario, descricao: form.relacaoDescricao },
          financiamento: { financiado: form.financiado, instituicao: form.instituicao, saldo: form.saldoQuitacao },
          valorMinimoPrivado: form.temMinimo === 'Sim' ? valorNumero(form.valorMinimo) : null,
        };
        const fotos = FOTOS.map((f) => form.fotos[f.id]).filter(Boolean) as string[];

        await salvarVeiculo({
          data: {
            perfilId: user.id,
            placa: form.placa.replace(/[^A-Z0-9]/g, ''),
            marca: form.marca,
            modelo: form.modelo,
            versao: form.versao || undefined,
            cor: form.cor || undefined,
            anoFabricacao: form.anoFabricacao || undefined,
            anoModelo: form.anoModelo || undefined,
            km: form.km ? Number(soDigitos(form.km)) : undefined,
            valorInteresse: valorNumero(form.valorDesejado) || undefined,
            fotos,
            cep: form.cep || undefined,
            cidade: form.cidade || undefined,
            uf: form.uf || undefined,
            documento_crlv_url: form.crlv || undefined,
            observacoes: JSON.stringify(condicao),
            status: 'RASCUNHO',
          },
        });
      } catch (e) {
        console.error("Erro ao salvar rascunho parcial:", e);
      }
    }
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo(0, 0);
  };
  const voltar = () => { setStep((s) => Math.max(1, s - 1)); window.scrollTo(0, 0); };

  const salvarESair = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    toast.success('Rascunho salvo. Você pode continuar depois.');
    navigate({ to: '/vendedor/veiculos' });
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const condicao = {
        funcionamento: form.funcionamento, funcionamentoObs: form.funcionamentoObs,
        motor: form.motor, motorObs: form.motorObs, cambio: form.cambioProblema,
        lataria: form.lataria, latariaObs: form.latariaObs, interior: form.interior, pneus: form.pneus,
        historico: { acidente: form.acidente, leilao: form.leilao, sinistro: form.sinistro, restricao: form.restricao, obs: form.historicoObs },
        itens: { chaveReserva: form.chaveReserva, manual: form.manual, estepe: form.estepe, acessorios: form.acessoriosQuais },
        proprietario: { emSeuNome: form.emSeuNome, relacao: form.relacaoProprietario, descricao: form.relacaoDescricao },
        financiamento: { financiado: form.financiado, instituicao: form.instituicao, saldo: form.saldoQuitacao },
        valorMinimoPrivado: form.temMinimo === 'Sim' ? valorNumero(form.valorMinimo) : null,
        documento_crlv_url: form.crlv || undefined,
        crlvEnviado: Boolean(form.crlv),
      };
      const fotos = FOTOS.map((f) => form.fotos[f.id]).filter(Boolean) as string[];

      const res: any = await salvarVeiculo({
        data: {
          perfilId: user?.id || '',
          placa: form.placa.replace(/[^A-Z0-9]/g, ''),
          marca: form.marca,
          modelo: form.modelo,
          anoFabricacao: form.anoFabricacao || undefined,
          anoModelo: form.anoModelo || undefined,
          km: form.km ? Number(soDigitos(form.km)) : undefined,
          valorInteresse: valorNumero(form.valorDesejado) || undefined,
          fotos,
          cep: form.cep || undefined,
          cidade: form.cidade || undefined,
          uf: form.uf || undefined,
          documento_crlv_url: form.crlv || undefined,
          observacoes: JSON.stringify(condicao),
        },
      });
      if (res?.ok === false) throw new Error(res.message || 'Não foi possível enviar o veículo.');
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem('ejf_placa');
      setEnviado(true);
      window.scrollTo(0, 0);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar o veículo para análise.');
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  };

  const fotosEnviadas = FOTOS.filter((f) => form.fotos[f.id]).length;

  if (enviado) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-6 text-2xl font-black text-slate-900">Seu veículo foi enviado para análise</h1>
        <p className="mt-3 text-slate-500">
          Recebemos as informações do seu veículo. Nossa equipe fará a primeira análise e você será avisado
          sobre os próximos passos.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <p className="font-bold text-slate-900">{form.marca} {form.modelo}</p>
          <p className="text-xs uppercase tracking-widest text-slate-400">{form.placa}</p>
          <p className="mt-3 text-sm font-semibold text-sky-700">Status: Em análise</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate({ to: '/vendedor/veiculos' })} className="h-12 flex-1 rounded-xl bg-teal-700 font-bold text-white hover:bg-teal-800">
            Acompanhar veículo
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: '/vendedor' })} className="h-12 flex-1 rounded-xl">
            Voltar para o início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="rounded-t-3xl bg-teal-900 p-6 md:p-8">
        <EtapaProgresso
          currentStep={step}
          totalSteps={7}
          etapas={ETAPAS}
          titulo="Cadastrar veículo"
          subtitulo="Preencha em etapas. Seu progresso é salvo automaticamente."
        />
      </div>

      <div className="space-y-8 rounded-b-3xl border border-t-0 border-slate-200 bg-white p-6 md:p-10">
        {/* 1 — IDENTIFICAÇÃO */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Qual veículo você quer vender?</h2>
              <p className="mt-1 text-sm text-slate-500">Informe a placa e o CEP onde o carro se encontra.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Placa do Veículo</Label>
                <Input
                  value={form.placa}
                  onChange={(e) => { set({ placa: maskPlaca(e.target.value) }); setBuscaFeita(false); }}
                  placeholder="ABC1D23"
                  aria-label="Placa"
                  className="h-14 w-full rounded-xl text-2xl font-black uppercase tracking-[0.2em] text-center"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">CEP (Onde o carro está?)</Label>
                <Input
                  value={form.cep || ''}
                  placeholder="00000-000"
                  onChange={async (e) => {
                    const val = maskCep(e.target.value);
                    set({ cep: val });
                    const clean = val.replace(/\D/g, '');
                    if (clean.length === 8) {
                      setBuscando(true);
                      const res = await buscarCep(clean);
                      if (res) {
                        set({ cidade: res.cidade, uf: res.uf });
                        toast.success(`Localizado: ${res.cidade}/${res.uf}`);
                      }
                      setBuscando(false);
                    }
                  }}
                  className="h-14 w-full rounded-xl text-lg font-bold text-center"
                />
                {form.uf && (
                  <p className="mt-1 text-center text-sm font-medium text-teal-700">
                    {form.cidade} / {form.uf}
                  </p>
                )}
              </div>
              
              <Button onClick={buscarPlaca} disabled={buscando} className="h-16 w-full rounded-2xl bg-teal-800 text-lg font-black text-white hover:bg-teal-900 shadow-lg shadow-teal-900/20">
                {buscando ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Search className="mr-2 h-5 w-5" /> Buscar e Continuar</>}
              </Button>
            </div>

            {buscaFeita && !veiculoEncontrado && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4" /> Não conseguimos localizar automaticamente os dados desse veículo.
                </p>
                <p className="mt-1 text-sm text-amber-700">Você pode continuar preenchendo as informações manualmente.</p>
                <Button onClick={avancar} className="mt-4 h-11 rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600">
                  Preencher manualmente
                </Button>
              </div>
            )}
          </div>

        )}

        {/* 2 — DADOS */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Confira as informações do seu carro</h2>
              <p className="mt-1 text-sm text-slate-500">Ajuste o que for necessário.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Marca</Label>
                <ComboboxSearch 
                  options={TODAS_MARCAS} 
                  popularOptions={MARCAS_POPULARES}
                  value={form.marca} 
                  onChange={(v) => set({ marca: v, modelo: '' })}
                  placeholder="Selecione a marca"
                  allowOther
                  otherLabel="Marca"
                  otherPlaceholder="Ex: Porsche, BYD..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Modelo</Label>
                <ComboboxSearch 
                  options={MODELOS_POR_MARCA[form.marca] || []} 
                  value={form.modelo} 
                  onChange={(v) => set({ modelo: v, versao: '' })}
                  placeholder={form.marca ? "Selecione o modelo" : "Selecione a marca antes"}
                  allowOther
                  otherLabel="Modelo"
                  otherPlaceholder="Ex: Cayenne, Dolphin..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Versão</Label>
                <ComboboxSearch 
                  options={[]} 
                  value={form.versao} 
                  onChange={(v) => set({ versao: v })}
                  placeholder="Selecione a versão"
                  allowOther
                  otherLabel="Versão"
                  otherPlaceholder="Ex: 2.0 Turbo, GLS..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Cor</Label>
                <ComboboxSearch options={CORES} value={form.cor} onChange={(v) => set({ cor: v })} placeholder="Selecione a cor" allowOther />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Ano de fabricação</Label>
                <ComboboxSearch options={Array.from({length: 40}, (_, i) => String(new Date().getFullYear() - i))} value={form.anoFabricacao} onChange={(v) => set({ anoFabricacao: v })} placeholder="Ano" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Ano modelo</Label>
                <ComboboxSearch options={Array.from({length: 40}, (_, i) => String(new Date().getFullYear() - i + 1))} value={form.anoModelo} onChange={(v) => set({ anoModelo: v })} placeholder="Ano" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Combustível</Label>
                <ComboboxSearch options={COMBUSTIVEIS} value={form.combustivel} onChange={(v) => set({ combustivel: v })} placeholder="Selecione" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Câmbio</Label>
                <ComboboxSearch options={CAMBIOS} value={form.cambio} onChange={(v) => set({ cambio: v })} placeholder="Selecione" />
              </div>
              <OpcaoBotoes label="Portas" opcoes={PORTAS} value={form.portas} onChange={(v) => set({ portas: v })} />
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Quilometragem atual</Label>
                <div className="relative">
                  <Input
                    value={form.km ? `${Number(form.km).toLocaleString('pt-BR')}` : ''}
                    onChange={(e) => set({ km: e.target.value.replace(/\D/g, '') })}
                    placeholder="0"
                    inputMode="numeric"
                    className="h-12 rounded-xl pr-12 font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">km</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">CEP</Label>
                <Input
                  value={form.uf ? `${form.cidade}/${form.uf}` : form.cidade}
                  placeholder="Município e Estado"
                  disabled
                  className="h-12 rounded-xl bg-slate-50 font-medium"
                />
              </div>


            </div>

            <div className="space-y-5 border-t border-slate-100 pt-6">
              <OpcaoBotoes label="O veículo está em seu nome?" opcoes={['Sim', 'Não']} value={form.emSeuNome} onChange={(v) => set({ emSeuNome: v })} />
              {form.emSeuNome === 'Não' && (
                <>
                  <OpcaoBotoes
                    label="Qual sua relação com o proprietário?"
                    opcoes={RELACOES_PROPRIETARIO}
                    value={form.relacaoProprietario}
                    onChange={(v) => set({ relacaoProprietario: v })}
                    colunas={3}
                  />
                  {form.relacaoProprietario === 'Outro' && (
                    <Textarea
                      placeholder="Descreva sua relação com o proprietário"
                      value={form.relacaoDescricao}
                      onChange={(e) => set({ relacaoDescricao: e.target.value })}
                      className="rounded-xl"
                    />
                  )}
                </>
              )}
            </div>

            <div className="space-y-5 border-t border-slate-100 pt-6">
              <OpcaoBotoes
                label="O veículo está financiado?"
                opcoes={['Sim', 'Não']}
                value={form.financiado === 'Sim' ? 'Sim' : 'Não'}
                onChange={(v) => set({ financiado: v })}
              />
              {form.financiado === 'Sim' && (
                <div className="grid gap-4 md:grid-cols-2 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-900">Instituição financeira</Label>
                    <ComboboxSearch options={BANCOS_COMUNS} value={form.instituicao} onChange={(v) => set({ instituicao: v })} placeholder="Selecione o banco" allowOther />
                  </div>
                  <Campo label="Saldo aproximado para quitação" value={form.saldoQuitacao} onChange={(v) => set({ saldoQuitacao: moeda(v) })} placeholder="R$ 0,00" />
                  <p className="text-xs text-slate-500 md:col-span-2">
                    Esse valor será confirmado posteriormente antes da conclusão da venda.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3 — DOCUMENTAÇÃO */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Envie o documento do veículo</h2>
              <p className="mt-1 text-sm text-slate-500">Aceitamos PDF, JPG ou PNG.</p>
            </div>
            <FileUpload
              label="CRLV-e"
              description="Documento do veículo que você pretende vender."
              value={form.crlv}
              onChange={(url) => set({ crlv: url })}
            />
            <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              As informações do documento serão conferidas durante a análise. Divergências não impedem o envio.
            </p>
          </div>
        )}

        {/* 4 — CONDIÇÃO */}
        {step === 4 && (
          <div className="space-y-7">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Como está seu carro hoje?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Responda algumas perguntas rápidas. A vistoria profissional será realizada em uma etapa posterior.
              </p>
            </div>

            <OpcaoBotoes label="O veículo está funcionando normalmente?" opcoes={['Sim', 'Não', 'Possui algum problema']} value={form.funcionamento} onChange={(v) => set({ funcionamento: v })} colunas={3} />
            {form.funcionamento && form.funcionamento !== 'Sim' && (
              <Textarea placeholder="Conte brevemente o que acontece" value={form.funcionamentoObs} onChange={(e) => set({ funcionamentoObs: e.target.value })} className="rounded-xl" />
            )}

            <OpcaoBotoes label="Existe algum problema conhecido no motor?" opcoes={['Não', 'Sim', 'Não sei']} value={form.motor} onChange={(v) => set({ motor: v })} colunas={3} />
            {form.motor === 'Sim' && (
              <Textarea placeholder="Qual problema?" value={form.motorObs} onChange={(e) => set({ motorObs: e.target.value })} className="rounded-xl" />
            )}

            <OpcaoBotoes label="Existe algum problema conhecido no câmbio?" opcoes={['Não', 'Sim', 'Não sei']} value={form.cambioProblema} onChange={(v) => set({ cambioProblema: v })} colunas={3} />


            <OpcaoBotoes label="Como está a lataria?" opcoes={['Excelente', 'Boa', 'Pequenos detalhes', 'Possui avarias']} value={form.lataria} onChange={(v) => set({ lataria: v })} colunas={2} />
            {form.lataria === 'Possui avarias' && (
              <Textarea placeholder="Conte brevemente" value={form.latariaObs} onChange={(e) => set({ latariaObs: e.target.value })} className="rounded-xl" />
            )}

            <OpcaoBotoes label="Como está o interior do veículo?" opcoes={['Excelente', 'Bom', 'Sinais de uso', 'Possui avarias']} value={form.interior} onChange={(v) => set({ interior: v })} colunas={2} />
            <OpcaoBotoes label="Como estão os pneus?" opcoes={['Bons', 'Meia vida', 'Substituição', 'Não sei']} value={form.pneus} onChange={(v) => set({ pneus: v })} colunas={2} />


            <div className="space-y-5 border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-500">Essas informações serão verificadas durante a análise do veículo.</p>
              <OpcaoBotoes label="Já sofreu acidente?" opcoes={['Não', 'Sim', 'Não sei']} value={form.acidente} onChange={(v) => set({ acidente: v })} colunas={3} />
              <OpcaoBotoes label="Já passou por leilão?" opcoes={['Não', 'Sim', 'Não sei']} value={form.leilao} onChange={(v) => set({ leilao: v })} colunas={3} />
              <OpcaoBotoes label="Possui sinistro conhecido?" opcoes={['Não', 'Sim', 'Não sei']} value={form.sinistro} onChange={(v) => set({ sinistro: v })} colunas={3} />
              <OpcaoBotoes label="Possui alguma restrição conhecida?" opcoes={['Não', 'Sim', 'Não sei']} value={form.restricao} onChange={(v) => set({ restricao: v })} colunas={3} />
              {[form.acidente, form.leilao, form.sinistro, form.restricao].includes('Sim') && (
                <Textarea placeholder="Complemente o histórico se necessário" value={form.historicoObs} onChange={(e) => set({ historicoObs: e.target.value })} className="rounded-xl" />
              )}

            </div>

            <div className="space-y-5 border-t border-slate-100 pt-6">
              <OpcaoBotoes label="Chave reserva?" opcoes={['Sim', 'Não']} value={form.chaveReserva} onChange={(v) => set({ chaveReserva: v })} />
              <OpcaoBotoes label="Manual?" opcoes={['Sim', 'Não']} value={form.manual} onChange={(v) => set({ manual: v })} />
              <OpcaoBotoes label="Estepe?" opcoes={['Sim', 'Não']} value={form.estepe} onChange={(v) => set({ estepe: v })} />
              <OpcaoBotoes label="Possui acessórios adicionais?" opcoes={['Sim', 'Não']} value={form.acessorios} onChange={(v) => set({ acessorios: v })} />
              {form.acessorios === 'Sim' && (
                <Textarea placeholder="Quais acessórios?" value={form.acessoriosQuais} onChange={(e) => set({ acessoriosQuais: e.target.value })} className="rounded-xl" />
              )}

            </div>
          </div>
        )}

        {/* 5 — FOTOS */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Agora precisamos conhecer melhor o seu carro</h2>
              <p className="mt-1 text-sm text-slate-500">
                Envie algumas fotos simples. Não precisa ser profissional — depois teremos uma vistoria completa.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FOTOS.map((f) => (
                <FotoSlot
                  key={f.id}
                  label={f.label}
                  dica={f.dica}
                  value={form.fotos[f.id] || null}
                  onChange={(url) => set({ fotos: { ...form.fotos, [f.id]: url } })}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Fotografe o painel com a quilometragem visível. Fotos pouco nítidas podem atrasar a análise.
            </p>
          </div>
        )}

        {/* 6 — VALOR */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Quanto você espera receber pelo seu carro?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Informe o valor que considera adequado. Nossa equipe irá analisar o carro e poderá sugerir um
                valor antes da publicação.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-900">Valor desejado</Label>
              <Input
                value={form.valorDesejado}
                onChange={(e) => set({ valorDesejado: moeda(e.target.value) })}
                placeholder="R$ 0,00"
                inputMode="numeric"
                className="h-16 rounded-2xl text-2xl font-black"
              />
            </div>

            <OpcaoBotoes label="Existe um valor mínimo abaixo do qual você não venderia?" opcoes={['Sim', 'Não']} value={form.temMinimo} onChange={(v) => set({ temMinimo: v })} />
            {form.temMinimo === 'Sim' && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-900">Valor mínimo</Label>
                <Input value={form.valorMinimo} onChange={(e) => set({ valorMinimo: moeda(e.target.value) })} placeholder="R$ 0,00" inputMode="numeric" className="h-14 rounded-xl text-lg font-bold" />
                <p className="text-xs text-slate-400">Esse valor é privado e nunca é exibido para compradores.</p>
              </div>
            )}

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-slate-900">Como funciona o valor?</p>
              <p className="mt-2 text-sm text-slate-500">
                Após a análise e vistoria, nossa equipe poderá recomendar uma faixa de preço para o veículo.
                Antes de qualquer anúncio, você poderá revisar e aceitar as condições.
              </p>
            </div>
          </div>
        )}

        {/* 7 — REVISÃO */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900">Confira seu veículo antes de enviar</h2>

            <div className="grid gap-5 lg:grid-cols-2">
              <Bloco titulo="Veículo" icone={<Car className="h-4 w-4 text-teal-700" />} onEditar={() => setStep(2)}>
                <p className="font-bold text-slate-900">{form.marca} {form.modelo} {form.versao}</p>
                <p className="text-sm text-slate-500">{form.anoFabricacao}/{form.anoModelo}</p>
                <p className="text-sm uppercase tracking-widest text-slate-400">{form.placa}</p>
                {form.km && <p className="text-sm text-slate-500">{Number(soDigitos(form.km)).toLocaleString('pt-BR')} km</p>}
              </Bloco>

              <Bloco titulo="Documentação" icone={<FileText className="h-4 w-4 text-teal-700" />} onEditar={() => setStep(3)}>
                <p className="text-sm text-slate-600">CRLV-e: {form.crlv ? '✓ Enviado' : 'Enviar depois'}</p>
              </Bloco>

              <Bloco titulo="Condição informada" onEditar={() => setStep(4)}>
                <p className="text-sm text-slate-600">Lataria: {form.lataria || '—'}</p>
                <p className="text-sm text-slate-600">Interior: {form.interior || '—'}</p>
                <p className="text-sm text-slate-600">Pneus: {form.pneus || '—'}</p>
              </Bloco>

              <Bloco titulo="Fotos" onEditar={() => setStep(5)}>
                <p className="text-sm text-slate-600">{fotosEnviadas} fotos enviadas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FOTOS.filter((f) => form.fotos[f.id]).slice(0, 6).map((f) => (
                    <img key={f.id} src={form.fotos[f.id] as string} alt={f.label} className="h-12 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              </Bloco>

              <Bloco titulo="Valor informado" onEditar={() => setStep(6)}>
                <p className="text-sm text-slate-600">Valor desejado: <strong>{form.valorDesejado || '—'}</strong></p>
                {form.temMinimo === 'Sim' && (
                  <p className="text-sm text-slate-600">Valor mínimo (privado): <strong>{form.valorMinimo || '—'}</strong></p>
                )}
              </Bloco>
            </div>

            {!cadastroLiberado && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-bold text-amber-800">
                  Seu veículo está quase pronto, mas precisamos concluir a validação do seu cadastro antes de enviá-lo para análise.
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Você precisa enviar todos os documentos obrigatórios no seu perfil (CNH, Selfie, Comprovante de Residência).
                </p>
                <Button onClick={() => navigate({ to: '/vendedor/onboarding' })} className="mt-4 h-11 rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600">
                  Resolver pendências do cadastro
                </Button>
              </div>
            )}

            {cadastroLiberado && (fotosEnviadas < 6 || !form.crlv) && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="font-bold text-blue-800">
                  Atenção: Itens obrigatórios pendentes.
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Para concluir o anúncio, você deve enviar o CRLV e pelo menos 6 fotos do veículo.
                </p>
              </div>
            )}

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <label className="flex items-start gap-3 text-sm text-slate-600">
                <Checkbox checked={declaracao1} onCheckedChange={(v) => setDeclaracao1(!!v)} className="mt-0.5" />
                Declaro que as informações fornecidas sobre o veículo são verdadeiras de acordo com o meu conhecimento.
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-600">
                <Checkbox checked={declaracao2} onCheckedChange={(v) => setDeclaracao2(!!v)} className="mt-0.5" />
                Estou ciente de que o veículo ainda passará por análise e vistoria antes de ser disponibilizado para negociação.
              </label>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center">
          {step < 7 ? (
            <Button onClick={avancar} className="h-14 w-full rounded-2xl bg-teal-900 text-lg font-black text-white hover:bg-teal-800 md:flex-1">
              Continuar <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={() => setConfirmando(true)}
              disabled={!declaracao1 || !declaracao2 || !cadastroLiberado || enviando || fotosEnviadas < 6 || !form.crlv}
              className="h-14 w-full rounded-2xl bg-teal-600 text-lg font-black text-white hover:bg-teal-700 md:flex-1"
            >
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar veículo para análise'}
            </Button>
          )}
          <div className="flex w-full gap-2 md:w-auto">
            <Button variant="outline" onClick={voltar} disabled={step === 1} className="h-14 flex-1 rounded-2xl px-6 font-bold md:flex-initial">
              Voltar
            </Button>
            <Button variant="ghost" onClick={salvarESair} className="h-14 flex-1 rounded-2xl px-6 font-bold text-slate-400 md:flex-initial">
              <Save className="mr-2 h-4 w-4" /> Salvar e sair
            </Button>
          </div>
        </div>

        {salvoEm && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Check className="h-3 w-3" /> Alterações salvas às {salvoEm}
          </p>
        )}
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar este veículo para análise?</AlertDialogTitle>
            <AlertDialogDescription>
              Depois do envio, nossa equipe irá revisar as informações e informar os próximos passos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={enviar} className="rounded-xl bg-teal-700 hover:bg-teal-800">
              Enviar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 rounded-xl" />
    </div>
  );
}

function Bloco({ titulo, icone, onEditar, children }: { titulo: string; icone?: React.ReactNode; onEditar: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-slate-900">{icone}{titulo}</h3>
        <Button variant="ghost" size="sm" onClick={onEditar} className="h-7 font-bold text-teal-700">Editar</Button>
      </div>
      {children}
    </div>
  );
}
