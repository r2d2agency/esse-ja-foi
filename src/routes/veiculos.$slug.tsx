import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAnuncioPublico } from "@/lib/vitrine.functions";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, Fuel, Settings2, Info, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/veiculos/$slug")({
  component: DetalheVeiculoPublico,
});

function DetalheVeiculoPublico() {
  const { slug } = Route.useParams();
  const { data: anuncio, isLoading } = useQuery({
    queryKey: ["anuncio-publico", slug],
    queryFn: () => getAnuncioPublico({ data: slug }),
  });

  const [activePhoto, setActivePhoto] = useState(0);

  if (isLoading) return <div className="p-10 text-center">Carregando veículo...</div>;
  if (!anuncio) return <div className="p-10 text-center">Veículo não encontrado.</div>;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* HEADER SIMPLES */}
      <header className="border-b border-slate-100 py-4 px-6 sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/veiculos" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para vitrine
          </Link>
          <div className="text-xl font-black tracking-tight text-slate-950 uppercase">
            Esse<span className="text-teal-600">JáFoi</span>
          </div>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12">
          
          {/* LADO ESQUERDO: GALERIA E INFO */}
          <div className="space-y-8">
            {/* GALERIA */}
            <div className="space-y-4">
              <div className="aspect-video bg-slate-100 rounded-3xl overflow-hidden relative">
                {anuncio.fotos?.length > 0 ? (
                  <img 
                    src={anuncio.fotos[activePhoto].foto_url} 
                    className="w-full h-full object-cover" 
                    alt={anuncio.titulo}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">Sem fotos</div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="bg-teal-600 text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <ShieldCheck className="h-4 w-4" /> VEÍCULO VISTORIADO
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {anuncio.fotos?.map((f: any, i: number) => (
                  <button 
                    key={f.id} 
                    onClick={() => setActivePhoto(i)}
                    className={`w-24 h-18 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activePhoto === i ? 'border-teal-500 ring-2 ring-teal-50' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={f.foto_url} className="w-full h-full object-cover" alt={`Miniatura ${i}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* SOBRE O VEICULO */}
            <div className="bg-slate-50 rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Sobre o Veículo</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ano</div>
                  <div className="font-bold">{anuncio.ano_fabricacao}/{anuncio.ano_modelo}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">KM</div>
                  <div className="font-bold">{anuncio.km} km</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Combustível</div>
                  <div className="font-bold flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5 text-slate-400" /> {anuncio.combustivel}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Câmbio</div>
                  <div className="font-bold flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5 text-slate-400" /> {anuncio.cambio}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Localização</div>
                  <div className="font-bold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {anuncio.localizacao_publica}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Código</div>
                  <div className="font-bold text-slate-500">{anuncio.codigo_publico}</div>
                </div>
              </div>
            </div>

            {/* VISTORIA */}
            <div className="border border-slate-200 rounded-3xl p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Veículo Vistoriado</h2>
                  <p className="text-sm text-slate-500">Avaliação física realizada por peritos credenciados.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" /> Quilometragem conferida
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" /> Estrutura analisada
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" /> Documentação validada
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" /> Funcionamento mecânico testado
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: COMERCIAL */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-slate-950 text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
              <div className="mb-8">
                <div className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-2">Oportunidade</div>
                <h1 className="text-3xl font-black leading-tight uppercase">{anuncio.marca} {anuncio.modelo}</h1>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">{anuncio.descricao}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
                    <Lock className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-1">Valores Restritos</h3>
                <p className="text-sm text-slate-400 mb-6">Acesse sua conta para visualizar as condições e participar desta oferta.</p>
                
                <Link to="/login">
                  <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl mb-3">
                    Entrar para participar
                  </Button>
                </Link>
                <div className="text-xs text-slate-500">
                  Ainda não possui cadastro? <Link to="/vender" className="text-teal-400 hover:underline">Criar conta</Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A Esse Já Foi garante a veracidade das informações da vistoria, mas recomenda a leitura atenta do laudo completo após a habilitação da sua conta.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

