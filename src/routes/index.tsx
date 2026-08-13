import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Gavel, 
  ShieldCheck, 
  FileSearch, 
  ArrowRight, 
  MessageCircle, 
  Zap, 
  Lock, 
  UserCheck, 
  CheckCircle2,
  Phone,
  HelpCircle
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { criarLeadPublicoFn } from "@/lib/leads.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ESSE JÁ FOI — Venda seu carro com agilidade e segurança" },
      {
        name: "description",
        content:
          "A plataforma que organiza toda a venda do seu carro. Vistoria no local, laudo completo e propostas reais de compradores verificados.",
      },
      { property: "og:title", content: "ESSE JÁ FOI — Venda seu carro com agilidade e segurança" },
      { property: "og:description", content: "Vistoria no local, laudo completo e propostas reais para o seu carro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    cidade: "",
    marca: "",
    modelo: "",
    ano: "",
    mensagem: "",
  });
  const [loading, setLoading] = useState(false);
  const enviarLead = useServerFn(criarLeadPublicoFn);
  
  // Showcase vehicles (simulated or from DB if available)
  const [vitrine, setVitrine] = useState([
    { id: '1', marca: 'Toyota', modelo: 'Corolla Altis', ano: '2022', km: '35.000', cor: 'Branco', combustivel: 'Flex', imagem: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=800' },
    { id: '2', marca: 'Honda', modelo: 'Civic Touring', ano: '2021', km: '42.000', cor: 'Cinza', combustivel: 'Gasolina', imagem: 'https://images.unsplash.com/photo-1599912027806-cfec9f5944b6?q=80&w=800' },
    { id: '3', marca: 'Volkswagen', modelo: 'Nivus Highline', ano: '2023', km: '12.000', cor: 'Azul', combustivel: 'Flex', imagem: 'https://images.unsplash.com/photo-1632243193041-563a017a5509?q=80&w=800' },
    { id: '4', marca: 'Jeep', modelo: 'Compass Longitude', ano: '2022', km: '28.000', cor: 'Preto', combustivel: 'Diesel', imagem: 'https://images.unsplash.com/photo-1606148334078-2c4f1c9f4d71?q=80&w=800' },
  ]);

  // Capturar UTMs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utms = {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
    };
    // Armazenar para envio posterior
    localStorage.setItem("utm_data", JSON.stringify(utms));
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, whatsapp: formatPhone(e.target.value) });
  };

  const handleSubmit = async (e: React.FormEvent, origin = "LANDING") => {
    if (e) e.preventDefault();
    
    if (!formData.nome || !formData.whatsapp || !formData.cidade) {
      toast.error("Por favor, preencha os campos obrigatórios (Nome, WhatsApp e Cidade)");
      return;
    }

    setLoading(true);
    try {
      const utmData = JSON.parse(localStorage.getItem("utm_data") || "{}") as Record<string, string>;
      const res = await enviarLead({
        data: {
          ...formData,
          origem: origin,
          utmSource: utmData['utm_source'] || null,
          utmMedium: utmData['utm_medium'] || null,
          utmCampaign: utmData['utm_campaign'] || null,
        },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      toast.success("Recebemos seu contato! Em breve falaremos com você.");
      setFormData({
        nome: "",
        whatsapp: "",
        cidade: "",
        marca: "",
        modelo: "",
        ano: "",
        mensagem: "",
      });
    } catch (error) {
      console.error("Erro ao enviar lead:", error);
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    handleSubmit(null as any, "WHATSAPP");
    const message = encodeURIComponent(`Olá, gostaria de vender meu carro. Meu nome é ${formData.nome || 'interessado'}.`);
    window.open(`https://wa.me/5511999999999?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-teal-800" />
            <span className="font-display text-2xl font-bold tracking-tight text-teal-900">ESSE JÁ FOI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-teal-900 transition-colors">
              Área Restrita
            </Link>
            <Button onClick={() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' })} className="bg-teal-900 text-white hover:bg-teal-950">
              Vender meu carro
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              A plataforma que organiza toda a <span className="text-teal-800">venda do seu carro.</span>
            </h1>
            <p className="mt-8 text-xl text-slate-600 max-w-xl">
              Esqueça os classificados tradicionais. Nós cuidamos da vistoria, documentação e encontramos propostas reais para você.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button 
                onClick={handleWhatsAppClick}
                className="bg-green-600 hover:bg-green-700 text-white h-14 px-8 text-lg gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Falar no WhatsApp
              </Button>
            </div>
            <div className="mt-12 flex items-center gap-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-200" />
                ))}
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">+500 veículos</span> vendidos este mês
              </p>
            </div>
          </div>

          <div id="formulario" className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 lg:p-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Comece agora mesmo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo *</label>
                  <Input 
                    placeholder="Seu nome" 
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp *</label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={formData.whatsapp}
                    onChange={handlePhoneChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade *</label>
                <Input 
                  placeholder="Ex: São Paulo - SP" 
                  value={formData.cidade}
                  onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marca</label>
                  <Input 
                    placeholder="Ex: Toyota" 
                    value={formData.marca}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modelo</label>
                  <Input 
                    placeholder="Ex: Corolla" 
                    value={formData.modelo}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano</label>
                  <Input 
                    placeholder="Ex: 2022" 
                    value={formData.ano}
                    onChange={(e) => setFormData({...formData, ano: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem (opcional)</label>
                <Textarea 
                  placeholder="Conte um pouco sobre o estado do veículo..."
                  value={formData.mensagem}
                  onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-teal-900 hover:bg-teal-950 text-white font-bold">
                {loading ? "Enviando..." : "Receber Proposta"}
              </Button>
              <p className="text-[10px] text-center text-slate-400 mt-4">
                Ao enviar, você concorda com nossos termos de privacidade.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Vitrine de Veículos */}
      <section className="py-24 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Vitrine de Oportunidades</h2>
              <p className="mt-4 text-slate-500 max-w-2xl">
                Confira alguns dos veículos disponíveis em nossa plataforma. 
                Documentação e procedência garantidas por nossa vistoria técnica.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-teal-800 text-teal-800 hover:bg-teal-50"
              onClick={() => document.getElementById('compradores-faq')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Como comprar
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {vitrine.map((v) => (
              <div key={v.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                  <img 
                    src={v.imagem} 
                    alt={v.modelo} 
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
                      Vistoria Aprovada
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">{v.marca}</p>
                      <h3 className="text-xl font-bold text-slate-900">{v.modelo}</h3>
                    </div>
                    <span className="text-sm font-medium text-slate-500">{v.ano}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 mt-4 pb-4 border-b border-slate-100 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-slate-400" />
                      {v.km} km
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-slate-400" />
                      {v.combustivel}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Lance Inicial</span>
                      <div className="flex items-center gap-1 text-slate-400 blur-[3px] select-none">
                        <span className="text-sm">R$</span>
                        <span className="text-lg font-bold">88.888</span>
                      </div>
                    </div>
                    <Button size="sm" className="bg-slate-900 hover:bg-teal-900 text-white text-xs h-8" onClick={() => document.getElementById('compradores-faq')?.scrollIntoView({ behavior: 'smooth' })}>
                      Ver Preço
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 bg-teal-50 rounded-2xl p-8 border border-teal-100 text-center">
            <h4 className="text-xl font-bold text-teal-900">Quer ter acesso aos preços e dar lances?</h4>
            <p className="mt-2 text-teal-800/70">
              Por segurança, os valores são visíveis apenas para compradores cadastrados e verificados.
            </p>
            <Button 
              className="mt-6 bg-teal-900 text-white hover:bg-teal-950 px-8"
              onClick={() => document.getElementById('compradores-faq')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Fazer meu pré-cadastro agora
            </Button>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tight">Como funciona</h2>
            <p className="mt-4 text-slate-500">Processo simples, transparente e 100% assistido.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { 
                step: "01", 
                title: "Cadastro rápido", 
                desc: "Informe os dados básicos do seu veículo pelo formulário ou WhatsApp em menos de 1 minuto." 
              },
              { 
                step: "02", 
                title: "Vistoria no local", 
                desc: "Nossos especialistas vão até você para realizar a vistoria técnica e cautelar completa." 
              },
              { 
                step: "03", 
                title: "Propostas reais", 
                desc: "Seu carro é apresentado para nossa rede de compradores e você recebe a melhor oferta." 
              },
            ].map((item) => (
              <div key={item.step} className="relative p-8 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-6xl font-black text-teal-900/10 absolute top-4 right-8">{item.step}</span>
                <h3 className="text-2xl font-bold mt-4">{item.title}</h3>
                <p className="mt-4 text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por que vender conosco */}
      <section className="py-24 bg-teal-950 text-white overflow-hidden relative">
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                Por que vender com a ESSE JÁ FOI?
              </h2>
              <div className="mt-12 space-y-8">
                {[
                  { icon: Zap, title: "Agilidade", desc: "Venda seu carro em poucos dias, sem perder tempo com curiosos." },
                  { icon: ShieldCheck, title: "Segurança total", desc: "Transação garantida e documentação cuidada por especialistas." },
                  { icon: UserCheck, title: "Processo assistido", desc: "Um consultor dedicado acompanha você do início ao fim." },
                  { icon: Lock, title: "Privacidade", desc: "Seu telefone não é exposto. Nós filtramos todos os contatos." },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="h-12 w-12 rounded-xl bg-teal-900/50 flex items-center justify-center shrink-0">
                      <feature.icon className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{feature.title}</h4>
                      <p className="mt-1 text-teal-100/70">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6">O que você precisa informar?</h3>
              <ul className="space-y-4">
                {[
                  "Placa e Renavam para consulta de débitos",
                  "Histórico de revisões e manutenção",
                  "Estado geral de pneus e funilaria",
                  "Quitação ou saldo devedor de financiamento",
                  "Localização para agendamento da vistoria"
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-400" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-16">
            <HelpCircle className="h-10 w-10 text-teal-800 mx-auto mb-4" />
            <h2 className="text-4xl font-bold tracking-tight">Dúvidas Frequentes</h2>
          </div>
          <Accordion type="single" collapsible className="w-full" id="compradores-faq">
            <AccordionItem value="custos">
              <AccordionTrigger>Quais são os custos para vender meu carro?</AccordionTrigger>
              <AccordionContent>
                Nossa plataforma cobra uma taxa fixa de serviço apenas no momento da venda concluída. A vistoria técnica inicial tem um custo reduzido que é reembolsado caso você aceite a proposta.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="vistoria">
              <AccordionTrigger>Como é realizada a vistoria?</AccordionTrigger>
              <AccordionContent>
                Um vistoriador credenciado vai até sua residência ou trabalho. Ele avalia mais de 150 itens, incluindo estrutura, mecânica e procedência, gerando um laudo técnico completo.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="prazo">
              <AccordionTrigger>Qual o prazo médio de venda?</AccordionTrigger>
              <AccordionContent>
                Após a realização da vistoria e publicação no sistema, a maioria dos veículos recebe propostas firmes em até 48 horas úteis.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="documentos">
              <AccordionTrigger>Quais documentos são necessários?</AccordionTrigger>
              <AccordionContent>
                Você precisará do CRLV-e (documento do carro), RG/CNH do proprietário e comprovante de residência. Nós cuidamos de toda a parte burocrática de transferência.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="compradores">
              <AccordionTrigger>Como funciona para quem quer comprar? Onde faço meu pré-cadastro?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p>
                    Para participar dos leilões e dar lances, os compradores precisam passar por um processo de verificação rigoroso. 
                    Exigimos um cadastro pré-aprovado para garantir a segurança e seriedade de todas as ofertas.
                  </p>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                    <p className="font-semibold text-teal-900">Documentação necessária para o pré-cadastro:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" /> RG / CNH (Frente e Verso)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" /> Comprovante de Residência
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" /> Foto (Selfie) com documento
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" /> Contrato de adesão assinado
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-teal-900 text-white hover:bg-teal-950"
                      onClick={() => window.open(`https://wa.me/5511999999999?text=${encodeURIComponent('Olá! Gostaria de fazer meu pré-cadastro para comprar veículos.')}`, '_blank')}
                    >
                      Quero me cadastrar para comprar
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight max-w-4xl mx-auto">
            Não perca tempo com quem só quer olhar. <span className="text-teal-400">Venda para quem quer comprar.</span>
          </h2>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              onClick={() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-teal-700 hover:bg-teal-800 text-white h-16 px-10 text-xl font-bold rounded-full"
            >
              Vender meu carro agora
            </Button>
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="h-5 w-5" />
              <span>Suporte 24h via WhatsApp</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-teal-800" />
            <span className="font-display text-xl font-bold tracking-tight text-teal-900">ESSE JÁ FOI</span>
          </div>
          <p>© 2026 ESSE JÁ FOI · Inteligência em Venda de Veículos. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-teal-900">Termos</a>
            <a href="#" className="hover:text-teal-900">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
