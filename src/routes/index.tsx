import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gavel, ShieldCheck, FileSearch, Timer, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAuctions } from "@/db/queries.functions";
import heroImg from "@/assets/hero-auction.jpg";
import lote1 from "@/assets/lote-1.jpg";
import lote2 from "@/assets/lote-2.jpg";
import lote3 from "@/assets/lote-3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ESSE JÁ FOI — Plataforma de Leilão de Veículos" },
      {
        name: "description",
        content:
          "Plataforma de gestão de veículos, vistorias e leilões de veículos usados.",
      },
      { property: "og:title", content: "ESSE JÁ FOI — Plataforma de Leilão de Veículos" },
      {
        property: "og:description",
        content: "Plataforma de gestão de veículos, vistorias e leilões de veículos usados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const lotes = [
  {
    img: lote1,
    nome: "Picape Cabine Dupla 4x4",
    ano: "2021 · 48.320 km",
    lance: "R$ 96.500",
    lances: 27,
    tag: "Encerrando hoje",
  },
  {
    img: lote2,
    nome: "Hatch Compacto 1.0",
    ano: "2019 · 71.900 km",
    lance: "R$ 38.200",
    lances: 14,
    tag: "Sem reserva",
  },
  {
    img: lote3,
    nome: "Motocicleta Esportiva 650",
    ano: "2022 · 12.150 km",
    lance: "R$ 27.900",
    lances: 9,
    tag: "Novo lote",
  },
];

function Countdown() {
  const [t, setT] = useState({ h: 4, m: 12, s: 58 });
  useEffect(() => {
    const id = setInterval(() => {
      setT((p) => {
        let { h, m, s } = p;
        s -= 1;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) return { h: 0, m: 0, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-3">
      {[
        ["HORAS", pad(t.h)],
        ["MIN", pad(t.m)],
        ["SEG", pad(t.s)],
      ].map(([label, val]) => (
        <div key={label} className="rounded-md border border-border bg-surface px-4 py-2 text-center">
          <div className="font-display text-3xl leading-none text-ember tabular-nums">{val}</div>
          <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function Index() {
  const [dbLotes, setDbLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a decoupled frontend, we should fetch from the external API
    // For now, we'll use the static 'lotes' defined above or fetch if VITE_API_URL is set
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      setLoading(true);
      fetch(`${apiUrl}/auctions/active`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setDbLotes(data);
        })
        .catch(err => {
          console.error("Erro ao buscar leilões da API:", err);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-ember" />
            <span className="font-display text-2xl tracking-wide">ESSE JÁ FOI</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#lotes" className="transition-colors hover:text-foreground">Lotes</a>
            <a href="#como" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#garantias" className="transition-colors hover:text-foreground">Garantias</a>
          </nav>
          <div className="flex items-center gap-4">
             <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Entrar
            </Link>
            <a href="#cadastro" className="btn-ember rounded-md px-5 py-2 text-sm font-semibold">
              Cadastrar
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Veículos em destaque no pátio de leilão sob holofotes"
          width={1600}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-background/50" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
          <span className="inline-flex items-center gap-2 rounded-full border border-ember/40 px-3 py-1 text-xs tracking-widest text-ember">
            <Timer className="h-3.5 w-3.5" /> PREGÃO AO VIVO Nº 428
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
            O MARTELO BATE. <span className="text-ember">O CARRO É SEU.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Leilões de carros, motos e utilitários com lances em tempo real, laudo cautelar
            e documentação verificada em cada lote.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <a href="#lotes" className="btn-ember inline-flex items-center gap-2 rounded-md px-7 py-3.5 font-semibold">
              Ver lotes abertos <ArrowRight className="h-4 w-4" />
            </a>
            <Countdown />
          </div>
          <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-8 border-t border-border pt-8">
            {[
              ["12.400+", "Veículos vendidos"],
              ["98%", "Laudos aprovados"],
              ["37%", "Abaixo da FIPE"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-4xl text-foreground">{v}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="lotes" className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <h2 className="text-4xl font-bold md:text-5xl uppercase tracking-tighter">LOTES EM DISPUTA</h2>
          <span className="text-sm text-muted-foreground">Atualizado agora</span>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {lotes.map((l) => (
            <article key={l.nome} className="card-lot overflow-hidden rounded-lg">
              <div className="relative">
                <img
                  src={l.img}
                  alt={l.nome}
                  loading="lazy"
                  width={900}
                  height={700}
                  className="h-52 w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-sm bg-ember px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ember-foreground">
                  {l.tag}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-2xl">{l.nome}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{l.ano}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Lance atual</p>
                    <p className="font-display text-3xl font-bold text-ember">{l.lance}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{l.lances} lances</p>
                </div>
                <button className="btn-ember mt-5 w-full rounded-md py-2.5 text-sm font-semibold">
                  Dar lance
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="como" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-4xl font-bold md:text-5xl uppercase tracking-tighter">COMO FUNCIONA</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["01", "Cadastre-se e habilite", "Envie seus documentos e receba a habilitação para dar lances em minutos."],
              ["02", "Analise o lote", "Fotos em alta, laudo cautelar, histórico de sinistro e situação documental."],
              ["03", "Dê o lance e arremate", "Disputa ao vivo com incremento automático. Pagamento e retirada guiados."],
            ].map(([n, t, d]) => (
              <li key={n}>
                <span className="font-bold text-5xl text-ember/40">{n}</span>
                <h3 className="mt-3 text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="garantias" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [ShieldCheck, "Leiloeiro oficial", "Pregões conduzidos por leiloeiro público matriculado na Junta Comercial."],
            [FileSearch, "Laudo cautelar", "Vistoria estrutural e checagem de chassi disponíveis antes do lance."],
            [Gavel, "Sem taxa surpresa", "Comissão e custos exibidos no lote, calculados antes de você dar o lance."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Gavel;
            return (
              <div key={t as string} className="rounded-lg border border-border p-6">
                <I className="h-6 w-6 text-ember" />
                <h3 className="mt-4 text-2xl">{t as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="cadastro" className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-bold md:text-6xl uppercase tracking-tighter">PRÓXIMO PREGÃO EM BREVE</h2>
          <p className="mt-4 text-muted-foreground">
            Cadastre-se para receber os lotes antes da abertura e habilitar seus lances.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="seu@email.com.br"
              className="flex-1 rounded-md border border-input bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ember"
            />
            <button type="submit" className="btn-ember rounded-md px-6 py-3 text-sm font-semibold">
              Quero participar
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span className="font-display text-xl tracking-wide text-foreground">ESSE JÁ FOI</span>
          <span>© 2026 ESSE JÁ FOI · Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
