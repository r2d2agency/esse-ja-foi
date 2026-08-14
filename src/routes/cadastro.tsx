import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta de vendedor — ESSE JÁ FOI" },
      {
        name: "description",
        content: "Crie sua conta em menos de um minuto e comece o cadastro do seu veículo na plataforma ESSE JÁ FOI.",
      },
      { property: "og:title", content: "Criar conta de vendedor — ESSE JÁ FOI" },
      { property: "og:description", content: "Cadastro inicial rápido e sem compromisso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CadastroVendedor,
});

function CadastroVendedor() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", password: "", confirm: "" });

  useEffect(() => {
    const saved = sessionStorage.getItem("ejf_placa");
    if (saved) setPlaca(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { cadastrarVendedorFn } = await import("@/lib/vendedor.functions");
      const result = await cadastrarVendedorFn({
        data: {
          nome: form.nome,
          email: form.email,
          password: form.password,
          whatsapp: form.whatsapp || null,
          cpf: null,
          cep: null,
          endereco: "",
          cidade: "",
          uf: "",
        },
      });

      if (!result.ok) {
        toast.error(result.message || "Erro ao realizar cadastro.");
        return;
      }

      const { user, accessToken } = result;
      login({
        user: { id: user.id, nome: user.nome, email: user.email, role: user.role as any },
        accessToken,
        refreshToken: "",
      });
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/vendedor/onboarding" });
    } catch (err: any) {
      toast.error(err?.message || "Erro técnico ao processar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-sm font-black uppercase tracking-[0.18em]">
          Esse<span className="text-teal-700">JáFoi</span>
        </Link>

        <h1 className="mt-10 text-3xl font-black leading-tight tracking-tight">Crie sua conta de vendedor</h1>
        <p className="mt-3 text-slate-500">Leva menos de um minuto. Você completa os dados depois.</p>

        {placa && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            Placa informada: <span className="font-bold uppercase tracking-[0.15em]">{placa}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            required
            placeholder="Nome completo"
            className="h-14 rounded-xl"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            required
            type="email"
            placeholder="E-mail"
            className="h-14 rounded-xl"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            required
            placeholder="WhatsApp"
            className="h-14 rounded-xl"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
          <Input
            required
            type="password"
            placeholder="Criar senha"
            className="h-14 rounded-xl"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Input
            required
            type="password"
            placeholder="Confirmar senha"
            className="h-14 rounded-xl"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
          <Button
            disabled={loading}
            className="h-14 w-full rounded-xl bg-slate-900 text-base font-bold text-white hover:bg-teal-800"
          >
            {loading ? "Criando conta..." : "Criar conta e continuar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem cadastro?{" "}
          <Link to="/login" className="font-medium text-teal-800 underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
