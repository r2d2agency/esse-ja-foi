import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Gavel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth";
import { loginWithPassword } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const result = await loginWithPassword({ data: values });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const { user, accessToken } = result;
      login({ user, accessToken, refreshToken: accessToken });
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", accessToken);

      toast.success(`Bem-vindo, ${user.name}!`);
      
      // Redirect based on role
      switch (user.role) {
        case "admin":
          navigate({ to: "/admin" });
          break;
        case "operacao":
          navigate({ to: "/operacao" });
          break;
        case "vistoriador":
          navigate({ to: "/vistoria" });
          break;
        case "comprador":
          navigate({ to: "/comprador" });
          break;
        default:
          navigate({ to: "/" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-900">
            <Gavel className="h-6 w-6 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ESSE JÁ FOI</h1>
          <p className="text-sm text-slate-500 text-center">
            Entre na sua conta para gerenciar leilões e vistorias
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Senha</FormLabel>
                    <a href="/esqueci-minha-senha" className="text-xs text-teal-700 hover:underline">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-teal-900 hover:bg-teal-950 text-white" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
