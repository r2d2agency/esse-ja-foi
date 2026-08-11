import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Gavel, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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

const forgotSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export const Route = createFileRoute("/esqueci-minha-senha")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const navigate = useNavigate();

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotFormValues) {
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", values);
      setIsSent(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error) {
      // Mock success for development
      setIsSent(true);
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recuperar Senha</h1>
          <p className="text-sm text-slate-500 text-center">
            {isSent 
              ? "Instruções enviadas para o seu e-mail." 
              : "Informe seu e-mail para receber as instruções de recuperação."}
          </p>
        </div>

        {!isSent ? (
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
              <Button 
                type="submit" 
                className="w-full bg-teal-900 hover:bg-teal-950 text-white" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar instruções
              </Button>
            </form>
          </Form>
        ) : (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate({ to: "/login" })}
          >
            Voltar para o Login
          </Button>
        )}
        
        <div className="text-center">
          <a 
            href="/login" 
            className="inline-flex items-center text-sm text-teal-700 hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </a>
        </div>
      </div>
    </div>
  );
}
