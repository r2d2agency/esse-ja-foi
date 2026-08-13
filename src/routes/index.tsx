import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { buscarCep } from "@/lib/brasil";
import { loginWithPassword } from "@/lib/auth.functions";
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
import { useAuth } from "@/hooks/use-auth";

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
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    whatsapp: "",
    email: "",
    password: "",
    cep: "",
    endereco: "",
    cidade: "",
    uf: "",
  });
  const [vitrine] = useState([
    { id: '1', marca: 'Toyota', modelo: 'Corolla Altis', ano: '2022', km: '35.000', cor: 'Branco', combustivel: 'Flex', imagem: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=800' },
    { id: '2', marca: 'Honda', modelo: 'Civic Touring', ano: '2021', km: '42.000', cor: 'Cinza', combustivel: 'Gasolina', imagem: 'https://images.unsplash.com/photo-1599912027806-cfec9f5944b6?q=80&w=800' },
    { id: '3', marca: 'Volkswagen', modelo: 'Nivus Highline', ano: '2023', km: '12.000', cor: 'Azul', combustivel: 'Flex', imagem: 'https://images.unsplash.com/photo-1632243193041-563a017a5509?q=80&w=800' },
    { id: '4', marca: 'Jeep', modelo: 'Compass Longitude', ano: '2022', km: '28.000', cor: 'Preto', combustivel: 'Diesel', imagem: 'https://images.unsplash.com/photo-1606148334078-2c4f1c9f4d71?q=80&w=800' },
  ]);

  const loginFn = useServerFn(loginWithPassword);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await loginFn({ 
        data: { 
          email: formData.email, 
          password: formData.password 
        } 
      });
      
      if (result.ok) {
        toast.success("Login realizado com sucesso!");
        const { user, accessToken } = result;
        login({ 
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role as any
          }, 
          accessToken, 
          refreshToken: "" 
        });

        if (user.role === 'vendedor') {
          navigate({ to: '/vendedor' });
          return;
        }

        if (user.role === 'admin' || user.role === 'operacao') {
          navigate({ to: "/operacao/veiculos" });
        } else if (user.role === 'vistoriador') {
          navigate({ to: "/vistoria" });
        } else {
          navigate({ to: "/comprador" });
        }
      } else {
        toast.error(result.message || "Erro ao realizar login");
      }
    } catch (error) {
      toast.error("Erro na conexão com o servidor");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, cep }));
    
    if (cleanCep.length === 8) {
      try {
        const address = await buscarCep(cleanCep);
        if (address) {
          setFormData(prev => ({
            ...prev,
            endereco: address.logradouro + (address.bairro ? `, ${address.bairro}` : ""),
            cidade: address.cidade,
            uf: address.uf
          }));
          toast.success("Endereço preenchido automaticamente");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  }, []);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep === 1) {
      setWizardStep(2);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { cadastrarVendedorFn } = await import("@/lib/vendedor.functions");
      const result = await cadastrarVendedorFn({
        data: {
          nome: formData.nome,
          email: formData.email,
          password: formData.password || "123456",
          whatsapp: formData.whatsapp,
          cpf: formData.cpf,
          cep: formData.cep,
          endereco: formData.endereco,
          cidade: formData.cidade,
          uf: formData.uf
        }
      });

      if (!result.ok) {
        toast.error(result.message || "Erro ao realizar cadastro.");
        return;
      }

      toast.success("Cadastro realizado com sucesso!");
      setWizardStep(3);
    } catch (error) {
      toast.error("Erro técnico ao processar cadastro.");
    } finally {
      setIsSubmitting(false);
    }
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
          <nav className="hidden md:flex items-center gap-8 mr-8">
             <Link to="/vender" className="text-sm font-medium text-slate-500 hover:text-teal-900 transition-colors">Vender</Link>
             <Link to="/" className="text-sm font-medium text-teal-900">Comprar</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-teal-900 transition-colors">
              Entrar
            </Link>
            <Button onClick={() => document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' })} className="bg-teal-900 text-white hover:bg-teal-950">
              Vender meu carro
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
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso do Vendedor</h2>
                  <p className="text-sm text-slate-500 mb-8">
                    Cadastre-se para anunciar seus veículos e receber propostas reais.
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
                      Cadastro Vendedor
                    </button>
                  </div>

                  {showLogin ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">E-mail</label>
                        <Input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="seu@email.com" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Senha</label>
                        <Input 
                          type="password" 
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder="••••••••" 
                        />
                      </div>
                      <Button 
                        disabled={isSubmitting}
                        className="w-full bg-teal-900 hover:bg-teal-950 text-white font-bold h-12"
                      >
                        {isSubmitting ? "Autenticando..." : "Entrar no Painel"}
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
                            Próximo Passo
                          </Button>
                        </form>
                      )}

                      {wizardStep === 2 && (
                        <form onSubmit={handleCadastro} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
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
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                              <label className="text-sm font-medium">CEP</label>
                              <Input 
                                required
                                value={formData.cep}
                                onChange={(e) => handleCepChange(e.target.value)}
                                placeholder="00000-000" 
                              />
                            </div>
                            <div className="space-y-2 col-span-2">
                              <label className="text-sm font-medium">Endereço</label>
                              <Input 
                                required
                                value={formData.endereco}
                                onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                                placeholder="Rua, Número, Bairro" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2">
                              <label className="text-sm font-medium">Cidade</label>
                              <Input 
                                required
                                value={formData.cidade}
                                onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                                placeholder="Ex: São Paulo" 
                              />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-sm font-medium">UF</label>
                              <Input 
                                required
                                maxLength={2}
                                value={formData.uf}
                                onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                                placeholder="SP" 
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4">
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
            <h2 className="text-3xl font-bold text-center mb-12">Dúvidas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border border-slate-200 p-6">
              <AccordionItem value="participar">
                <AccordionTrigger>Como faço para vender meu carro?</AccordionTrigger>
                <AccordionContent>
                  Para vender, você deve realizar seu cadastro de vendedor fornecendo seus dados e endereço. Após logar, você terá acesso ao painel onde poderá cadastrar seus veículos com fotos, opcionais e valor desejado. O veículo passará por uma análise técnica antes de ser aprovado.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="seguranca">
                <AccordionTrigger>O cadastro é gratuito?</AccordionTrigger>
                <AccordionContent>
                  Sim, o cadastro de vendedores e veículos é totalmente gratuito. Cobramos apenas uma taxa de serviço administrativa em caso de venda concretizada através da plataforma.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pagamento">
                <AccordionTrigger>Quais documentos são necessários?</AccordionTrigger>
                <AccordionContent>
                  Para o cadastro inicial, solicitamos CPF, comprovante de endereço e dados de contato. Para o veículo, será necessário informar a placa e dados do documento (CRV/CRLV) durante a etapa de vistoria.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-teal-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Quer vender seu carro?</h2>
              <p className="text-teal-100 text-lg mb-8 max-w-md">
                Vendemos seu veículo de forma rápida, segura e pelo melhor preço de mercado através do nosso sistema de leilão.
              </p>
              <Button asChild className="bg-amber-400 text-teal-950 hover:bg-amber-500 font-bold h-12 px-8">
                <Link to="/vender">Conhecer processo de venda</Link>
              </Button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-teal-950 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Pagamento Garantido</h4>
                  <p className="text-sm text-teal-100/70">Receba o valor à vista após a finalização da venda e transferência.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-teal-950 shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Venda sem Burocracia</h4>
                  <p className="text-sm text-teal-100/70">Nós cuidamos de toda a documentação e vistoria cautelar para você.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-amber-400" />
              <span className="font-bold tracking-tight">ESSE JÁ FOI</span>
            </div>
            <p className="text-sm text-teal-100/50">© 2026 ESSE JÁ FOI - Gestão de Veículos e Leilões.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
