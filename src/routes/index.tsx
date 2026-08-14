import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroCar from "@/assets/hero-car.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ESSE JÁ FOI — Venda seu carro para uma rede de compradores" },
      {
        name: "description",
        content:
          "Cadastre seu veículo, passe pela avaliação e receba ofertas de compradores verificados. Cadastro inicial rápido e sem compromisso.",
      },
      { property: "og:title", content: "ESSE JÁ FOI — Venda seu carro para uma rede de compradores" },
      {
        property: "og:description",
        content: "Você cadastra seu carro. Nós encontramos quem está disposto a pagar por ele.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingVendedor,
});

const ETAPAS = [
  { n: "01", t: "Cadastre seu carro", d: "Informe os principais dados do veículo." },
  { n: "02", t: "Faça a vistoria", d: "Após a análise, agendamos uma vistoria em uma unidade autorizada." },
  { n: "03", t: "Receba ofertas", d: "Seu veículo é apresentado para compradores cadastrados e verificados." },
  { n: "04", t: "Venda com segurança", d: "A melhor oferta vence e acompanhamos a negociação até a conclusão." },
];

const SEGURANCA = [
  "Identidade verificada",
  "Documentação analisada",
  "Vistoria do veículo",
  "Compradores cadastrados",
  "Acompanhamento da negociação",
];

function LandingVendedor() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [placaHero, setPlacaHero] = useState("");
  const [placaFinal, setPlacaFinal] = useState("");

  const irParaCadastro = (placa?: string) => {
    const valor = (placa ?? "").trim().toUpperCase();
    if (typeof window !== "undefined") {
      if (valor) sessionStorage.setItem("ejf_placa", valor);
      else sessionStorage.removeItem("ejf_placa");
    }
    navigate({ to: "/cadastro" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-12">
          <Link to="/" className="text-lg font-black uppercase tracking-[0.18em] text-slate-900">
            Esse<span className="text-teal-700">JáFoi</span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#como-funciona" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
              Como funciona
            </a>
            <Link to="/vender" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
              Quero vender
            </Link>
            <Link to="/login" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
              Entrar
            </Link>
            <Button onClick={() => irParaCadastro(placaHero)} className="h-11 rounded-full bg-slate-900 px-6 text-white hover:bg-teal-800">
              Vender meu carro
            </Button>
          </nav>

          <button
            aria-label="Abrir menu"
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-6 py-6 md:hidden">
            <div className="flex flex-col gap-5">
              <a href="#como-funciona" onClick={() => setMenuOpen(false)} className="text-base text-slate-600">
                Como funciona
              </a>
              <Link to="/comprador" className="text-base text-slate-600">Quero comprar</Link>
              <Link to="/login" className="text-base text-slate-600">Entrar</Link>
              <Button onClick={() => irParaCadastro(placaHero)} className="h-12 rounded-full bg-slate-900 text-white hover:bg-teal-800">
                Vender meu carro
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-6 pb-16 pt-12 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div>
            <h1 className="text-[2.5rem] font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-[4rem]">
              Seu carro pode valer mais quando mais compradores{" "}
              <span className="text-teal-700">disputam por ele.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-500">
              Cadastre seu veículo, passe pela avaliação e receba ofertas de compradores interessados.
            </p>

            <div className="mt-10 max-w-md rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Comece pelo seu veículo
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={placaHero}
                  onChange={(e) => setPlacaHero(e.target.value.toUpperCase())}
                  placeholder="Digite a placa"
                  aria-label="Digite a placa"
                  className="h-14 flex-1 rounded-xl border-slate-200 bg-white text-base font-semibold tracking-[0.15em] uppercase placeholder:tracking-normal placeholder:font-normal"
                />
                <Button
                  onClick={() => irParaCadastro(placaHero)}
                  className="h-14 rounded-xl bg-teal-800 px-7 text-base font-bold text-white hover:bg-teal-900"
                >
                  Avaliar meu carro
                </Button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Button
                onClick={() => irParaCadastro(placaHero)}
                className="h-14 rounded-full bg-slate-900 px-8 text-base font-bold text-white hover:bg-slate-800"
              >
                Quero vender meu carro <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link to="/login" className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline">
                Já tenho cadastro
              </Link>
            </div>
          </div>

          <div className="relative">
            <img
              src={heroCar}
              alt="Carro premium em estúdio pronto para avaliação"
              width={1600}
              height={1104}
              className="w-full rounded-[2rem] object-cover"
            />
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-slate-100 py-20 lg:py-28">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Você vende. A gente cuida do caminho até o comprador.
          </h2>

          <div className="mt-14 grid gap-10 lg:grid-cols-4 lg:gap-8">
            {ETAPAS.map((e) => (
              <div key={e.n} className="border-t-2 border-slate-900 pt-6">
                <span className="text-sm font-black tracking-widest text-teal-700">{e.n}</span>
                <h3 className="mt-3 text-xl font-bold">{e.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFÍCIO PRINCIPAL */}
      <section className="bg-slate-900 py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-14 px-6 lg:grid-cols-2 lg:items-center lg:px-12">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Mais compradores olhando para o seu carro. Mais chances de uma boa oferta.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Em vez de negociar com apenas uma pessoa, seu veículo pode ser apresentado para uma rede de compradores
              interessados.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-3">
            {["Mais alcance", "Mais ofertas", "Mais segurança"].map((b) => (
              <div key={b} className="bg-slate-900 px-6 py-10 text-center">
                <span className="text-lg font-bold text-amber-400">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEGURANÇA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-12">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Do cadastro ao pagamento, tudo acompanhado.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
              O veículo passa por análise, validação documental e vistoria antes de ser disponibilizado para negociação.
            </p>
          </div>
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {SEGURANCA.map((s) => (
              <li key={s} className="flex items-center justify-between py-5">
                <span className="text-lg font-medium text-slate-700">{s}</span>
                <span className="h-2 w-2 rounded-full bg-teal-700" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-teal-900 py-24 text-white lg:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-[2.75rem]">
            Seu próximo comprador pode já estar procurando um carro como o seu.
          </h2>
          <p className="mt-5 text-lg text-teal-100/80">Cadastre seu veículo e comece o processo de venda.</p>

          <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
            <Input
              value={placaFinal}
              onChange={(e) => setPlacaFinal(e.target.value.toUpperCase())}
              placeholder="Placa do veículo"
              aria-label="Placa do veículo"
              className="h-16 flex-1 rounded-xl border-white/20 bg-white/10 text-base font-semibold uppercase tracking-[0.15em] text-white placeholder:font-normal placeholder:tracking-normal placeholder:text-teal-100/60"
            />
            <Button
              onClick={() => irParaCadastro(placaFinal)}
              className="h-16 rounded-xl bg-amber-400 px-8 text-base font-black text-teal-950 hover:bg-amber-300"
            >
              Quero vender meu carro
            </Button>
          </div>
          <p className="mt-4 text-sm text-teal-100/60">Cadastro inicial rápido e sem compromisso.</p>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 sm:flex-row lg:px-12">
          <span className="text-sm font-black uppercase tracking-[0.18em]">Esse Já Foi</span>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900">Termos de Uso</a>
            <a href="#" className="hover:text-slate-900">Política de Privacidade</a>
            <a href="#" className="hover:text-slate-900">Ajuda</a>
          </div>
          <p className="text-sm text-slate-400">© Esse Já Foi. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
