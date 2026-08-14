import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { formatCPF, formatPhone } from "@/lib/utils";
import heroCar from "@/assets/hero-car.jpg";

export const Route = createFileRoute("/comprador/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta de comprador — ESSE JÁ FOI" },
      {
        name: "description",
        content: "Cadastre-se para comprar veículos premium com laudo de vistoria garantido.",
      },
    ],
  }),
  component: CadastroComprador,
});

function CadastroComprador() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: "PF" as "PF" | "PJ",
    nome: "",
    email: "",
    password: "",
    confirm: "",
    whatsapp: "",
    cpf: "",
    cnpj: "",
  });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { cadastrarCompradorFn } = await import("@/lib/comprador.functions");
      const result = await cadastrarCompradorFn({ data: form });

      if (!result.ok) {
        toast.error(result.message || "Erro ao criar conta.");
        return;
      }

      login({
        user: { id: result.user.id, nome: result.user.nome, email: result.user.email, role: result.user.role },
        accessToken: result.accessToken,
        refreshToken: result.accessToken,
      });

      toast.success("Conta criada com sucesso!");
      navigate({ to: "/comprador" });
    } catch (err) {
      toast.error("Erro técnico ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1fr_0.9fr]">
      <div className="flex flex-col px-6 py-10 lg:px-16 lg:py-14">
        <Link to="/" className="text-center text-sm font-black uppercase tracking-[0.18em] text-slate-900 lg:text-left">
          Esse<span className="text-teal-700">JáFoi</span>
        </Link>

        <div className="mx-auto mt-10 w-full max-w-md lg:mt-16">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900">
            Encontre seu próximo veículo
          </h1>
          <p className="mt-3 text-slate-500">
            Cadastre-se para acessar valores exclusivos e propostas comerciais.
          </p>

          <div className="flex gap-2 mt-8">
            <Button 
              variant={form.tipo === 'PF' ? 'default' : 'outline'}
              className={cn("flex-1 font-bold", form.tipo === 'PF' && "bg-teal-600")}
              onClick={() => setForm({...form, tipo: 'PF'})}
            >
              Pessoa Física
            </Button>
            <Button 
              variant={form.tipo === 'PJ' ? 'default' : 'outline'}
              className={cn("flex-1 font-bold", form.tipo === 'PJ' && "bg-teal-600")}
              onClick={() => setForm({...form, tipo: 'PJ'})}
            >
              Empresa (PJ)
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input 
              required 
              placeholder={form.tipo === 'PF' ? "Nome completo" : "Razão Social"} 
              className="h-14 rounded-xl"
              value={form.nome}
              onChange={e => setForm({...form, nome: e.target.value})}
            />
            {form.tipo === 'PF' ? (
              <Input 
                required 
                placeholder="CPF" 
                className="h-14 rounded-xl"
                value={form.cpf}
                onChange={e => setForm({...form, cpf: formatCPF(e.target.value)})}
              />
            ) : (
              <Input 
                required 
                placeholder="CNPJ" 
                className="h-14 rounded-xl"
                value={form.cnpj}
                onChange={e => setForm({...form, cnpj: e.target.value})}
              />
            )}
            <Input 
              required 
              type="email" 
              placeholder="E-mail" 
              className="h-14 rounded-xl"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
            <Input 
              required 
              placeholder="WhatsApp" 
              className="h-14 rounded-xl"
              value={form.whatsapp}
              onChange={e => setForm({...form, whatsapp: formatPhone(e.target.value)})}
            />
            <Input 
              required 
              type="password" 
              placeholder="Senha" 
              className="h-14 rounded-xl"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
            <Input 
              required 
              type="password" 
              placeholder="Confirmar senha" 
              className="h-14 rounded-xl"
              value={form.confirm}
              onChange={e => setForm({...form, confirm: e.target.value})}
            />

            <Button
              disabled={loading}
              className="h-14 w-full rounded-xl bg-teal-700 text-base font-bold text-white transition-colors hover:bg-teal-800"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta de comprador
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já possui cadastro?{" "}
            <Link to="/login" className="font-semibold text-teal-700 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img src={heroCar} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/45" />
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
