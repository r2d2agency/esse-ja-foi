import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { solicitarResetSenha } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/esqueci-minha-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar acesso — ESSE JÁ FOI" },
      {
        name: "description",
        content: "Recupere o acesso à sua conta ESSE JÁ FOI por WhatsApp ou e-mail.",
      },
      { property: "og:title", content: "Recuperar acesso — ESSE JÁ FOI" },
      { property: "og:description", content: "Informe seu CPF ou e-mail para receber as instruções." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecuperarAcesso,
});

function mascararEmail(email: string) {
  const [nome, dominio] = email.split("@");
  if (!dominio || !nome) return "a*****@email.com";
  return `${nome.slice(0, 1)}*****@${dominio}`;
}

function RecuperarAcesso() {
  const [etapa, setEtapa] = useState<"identificar" | "canal" | "enviado">("identificar");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const solicitar = useServerFn(solicitarResetSenha);

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    if (valor.trim().length < 5) {
      setErro("Informe um CPF ou e-mail válido.");
      return;
    }
    setErro("");
    setEtapa("canal");
  };

  const enviarPorEmail = async () => {
    setLoading(true);
    try {
      if (valor.includes("@")) await solicitar({ data: { email: valor } });
      setEtapa("enviado");
    } catch {
      toast.error("Não foi possível enviar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white px-6 py-10">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Voltar para o login
      </Link>

      <div className="mx-auto mt-16 w-full max-w-md">
        {etapa === "identificar" && (
          <>
            <h1 className="text-3xl font-black leading-tight tracking-tight">Recuperar acesso</h1>
            <p className="mt-3 text-slate-500">
              Informe seu CPF ou e-mail para receber as instruções de recuperação.
            </p>
            <form onSubmit={continuar} className="mt-8 space-y-4">
              <Input
                placeholder="CPF ou e-mail"
                aria-label="CPF ou e-mail"
                className="h-14 rounded-xl text-base"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              {erro && <p className="text-sm text-rose-600">{erro}</p>}
              <Button className="h-14 w-full rounded-xl bg-teal-700 text-base font-bold text-white hover:bg-teal-800">
                Continuar
              </Button>
            </form>
          </>
        )}

        {etapa === "canal" && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl font-black leading-tight tracking-tight">Como deseja receber?</h1>
            <p className="mt-3 text-slate-500">Escolha por onde enviamos as instruções de recuperação.</p>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => {
                  toast.success("Instruções enviadas pelo WhatsApp.");
                  setEtapa("enviado");
                }}
                className="w-full rounded-2xl border border-slate-200 p-5 text-left transition-colors hover:border-teal-600"
              >
                <p className="font-semibold text-slate-900">WhatsApp</p>
                <p className="mt-1 text-sm text-slate-500">(**) *****-4832</p>
              </button>
              <button
                onClick={enviarPorEmail}
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 p-5 text-left transition-colors hover:border-teal-600"
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  E-mail {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {valor.includes("@") ? mascararEmail(valor) : "a*****@gmail.com"}
                </p>
              </button>
            </div>
          </div>
        )}

        {etapa === "enviado" && (
          <div className="animate-in fade-in py-16 text-center duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-3xl text-teal-700">
              ✓
            </div>
            <h1 className="mt-6 text-2xl font-bold">Instruções enviadas</h1>
            <p className="mt-2 text-slate-500">Confira sua caixa de entrada ou seu WhatsApp para continuar.</p>
            <Button asChild className="mt-8 h-14 w-full rounded-xl bg-teal-700 text-white hover:bg-teal-800">
              <Link to="/login">Voltar para o login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
