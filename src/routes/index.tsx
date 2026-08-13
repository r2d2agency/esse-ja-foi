import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Gavel, 
  ShieldCheck, 
  Zap, 
  UserCheck, 
  CheckCircle2,
  Lock,
  ArrowRight,
  MessageCircle,
  FileSearch,
  LogIn
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ESSE JÁ FOI — Vitrine de Oportunidades" },
      {
        name: "description",
        content: "Encontre os melhores veículos com procedência garantida. Acesse nossa vitrine exclusiva para compradores cadastrados.",
      },
      { property: "og:title", content: "ESSE JÁ FOI — Vitrine de Oportunidades" },
      { property: "og:description", content: "Veículos com vistoria técnica aprovada e propostas reais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompradorIndex,
});

function CompradorIndex() {
  const [showLogin, setShowLogin] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    whatsapp: "",
    email: "",
  });
  const [vitrine] = useState([
    { id: '1', marca: 'Toyota', modelo: 'Corolla Altis', ano: '2022', km: '35.000', cor: 'Branco', combustivel: 'Flex', imagem: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=800' },
    { id: '2', marca: 'Honda', modelo: 'Civic Touring', ano: '2021', km: '42.000', cor: 'Cinza', combustivel: 'Gasolina', imagem: 'https://images.unsplash.com/photo-1599912027806-cfec9f5944b6?q=80&w=800' },
    { id: '3', marca: 'Volkswagen', modelo: 'Nivus Highline', ano: '2023', km: '12.000', cor: 'Azul', combustivel: 'Flex', imagem: 'https://images.unsplash.com/photo-1632243193041-563a017a5509?q=80&w=800' },
    { id: '4', marca: 'Jeep', modelo: 'Compass Longitude', ano: '2022', km: '28.000', cor: 'Preto', combustivel: 'Diesel', imagem: 'https://images.unsplash.com/photo-1606148334078-2c4f1c9f4d71?q=80&w=800' },
  ]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Funcionalidade de login será implementada em breve.");
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep < 2) {
      setWizardStep(wizardStep + 1);
      return;
    }
    
    setIsSubmitting(true);
    // Simulação de envio para a API
    setTimeout(() => {
      setIsSubmitting(false);
      setWizardStep(3);
      toast.success("Pré-cadastro enviado com sucesso!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-teal-800" />
            <span className="font-display text-2xl font-bold tracking-tight text-teal-900">ESSE JÁ FOI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-teal-900 transition-colors">
              Entrar
            </Link>
            <Button onClick={() => document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' })} className="bg-teal-900 text-white hover:bg-teal-950">
              Cadastrar para comprar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Vitrine */}
        <section className="py-12 lg:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-3 gap-12 items-start">
              <div className="lg:col-span-2">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                  Vitrine de <span className="text-teal-800">Oportunidades</span>
                </h1>
                <p className="text-lg text-slate-600 mb-12 max-w-2xl">
                  Acesse veículos selecionados com laudo técnico cautelar aprovado. 
                  Preços e lances exclusivos para compradores verificados.
                </p>

                <div className="grid sm:grid-cols-2 gap-6">
                  {vitrine.map((v) => (
                    <div key={v.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
                      <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                        <img 
                          src={v.imagem} 
                          alt={v.modelo} 
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-teal-800 border border-teal-100">
                            Vistoria OK
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-slate-900">{v.marca} {v.modelo}</h3>
                          <span className="text-xs font-medium text-slate-500">{v.ano}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500 mb-4">
                          <span>{v.km} km</span>
                          <span>{v.combustivel}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-slate-300 blur-[2px] select-none">
                            <span className="text-xs">R$</span>
                            <span className="font-bold">88.888</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-teal-800 text-xs h-7 hover:bg-teal-50"
                            onClick={() => document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' })}
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Login/Cadastro */}
              <div id="cadastro" className="sticky top-24">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso do Comprador</h2>
                  <p className="text-sm text-slate-500 mb-8">
                    Faça login ou inicie seu pré-cadastro para ver preços e dar lances.
                  </p>

                  <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
                    <button 
                      onClick={() => { setShowLogin(true); setWizardStep(1); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${showLogin ? 'bg-white shadow text-teal-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => setShowLogin(false)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!showLogin ? 'bg-white shadow text-teal-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Pré-cadastro
                    </button>
                  </div>

                  {showLogin ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">E-mail</label>
                        <Input type="email" placeholder="seu@email.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Senha</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <Button className="w-full bg-teal-900 hover:bg-teal-950 text-white font-bold h-12">
                        Entrar no Painel
                      </Button>
                      <button type="button" className="w-full text-xs text-slate-400 hover:text-teal-800 transition-colors">
                        Esqueceu sua senha?
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      {wizardStep === 1 && (
                        <form onSubmit={handleCadastro} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nome Completo</label>
                            <Input 
                              required
                              value={formData.nome}
                              onChange={(e) => setFormData({...formData, nome: e.target.value})}
                              placeholder="Seu nome" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">WhatsApp</label>
                            <Input 
                              required
                              value={formData.whatsapp}
                              onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                              placeholder="(00) 00000-0000" 
                            />
                          </div>
                          <Button className="w-full bg-teal-900 hover:bg-teal-950 text-white font-bold h-12">
                            Continuar Cadastro
                          </Button>
                        </form>
                      )}

                      {wizardStep === 2 && (
                        <form onSubmit={handleCadastro} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">CPF</label>
                            <Input 
                              required
                              value={formData.cpf}
                              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                              placeholder="000.000.000-00" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">E-mail</label>
                            <Input 
                              required
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              placeholder="seu@email.com" 
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={() => setWizardStep(1)}
                              className="w-1/3 h-12"
                            >
                              Voltar
                            </Button>
                            <Button 
                              disabled={isSubmitting}
                              className="flex-1 bg-teal-900 hover:bg-teal-950 text-white font-bold h-12"
                            >
                              {isSubmitting ? "Enviando..." : "Finalizar Cadastro"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {wizardStep === 3 && (
                        <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                          <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 border-2 border-amber-200">
                            <Zap className="h-8 w-8 text-amber-600 animate-pulse" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">Cadastro em Análise</h3>
                          <p className="text-sm text-slate-500 mb-6 px-4">
                            Recebemos seus dados! Agora nossa equipe irá validar as informações e documentos. 
                            Você receberá um e-mail em até 24h úteis.
                          </p>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setWizardStep(1);
                              setShowLogin(true);
                            }}
                            className="w-full"
                          >
                            Voltar para o Início
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Compradores */}
        <section className="py-24 bg-slate-50">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Dúvidas Frequentes do Comprador</h2>
            <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border border-slate-200 p-6">
              <AccordionItem value="participar">
                <AccordionTrigger>Como faço para participar?</AccordionTrigger>
                <AccordionContent>
                  Para participar, você deve realizar o cadastro online preenchendo o formulário de pré-cadastro. Após o envio, nossa equipe analisará seus dados e, se aprovado, você receberá acesso total à plataforma para ver preços e dar lances.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="seguranca">
                <AccordionTrigger>É seguro comprar na plataforma?</AccordionTrigger>
                <AccordionContent>
                  Sim. Todos os veículos passam por uma vistoria técnica cautelar rigorosa e os compradores são verificados manualmente para garantir a seriedade de todas as negociações.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pagamento">
                <AccordionTrigger>Como funciona o pagamento?</AccordionTrigger>
                <AccordionContent>
                  O pagamento é realizado diretamente ao vendedor ou via plataforma, dependendo da modalidade da venda. Nossa equipe auxilia em todo o processo de documentação.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      {/* Footer / CTA Vender */}
      <footer className="bg-slate-900 text-white pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-6 text-center lg:text-left">
          <div className="bg-teal-900/30 border border-teal-800/50 rounded-3xl p-8 lg:p-12 mb-16 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold mb-4 text-white">Quer vender seu carro?</h2>
              <p className="text-teal-100/70">
                Nós cuidamos de tudo: vistoria, laudo técnico e conectamos você a compradores reais em tempo recorde.
              </p>
            </div>
            <Link 
              to="/vender" 
              className="bg-white text-teal-900 hover:bg-teal-50 h-14 px-10 flex items-center justify-center rounded-full font-bold text-lg transition-all group"
            >
              Ver como funciona a venda
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-slate-400 border-t border-slate-800 pt-8">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-teal-500" />
              <span className="font-display text-xl font-bold tracking-tight text-white">ESSE JÁ FOI</span>
            </div>
            <p>© 2026 ESSE JÁ FOI · Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <Link to="/vender" className="hover:text-white transition-colors">Página do Vendedor</Link>
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
