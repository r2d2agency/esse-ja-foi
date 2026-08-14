import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
const BackofficeLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Settings, BrainCircuit, Mail } from "lucide-react";
import { listarConfiguracoesFn, salvarConfiguracaoFn } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfiguracoesAdminPage,
});

function ConfiguracoesAdminPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      console.log("[admin/configuracoes] Carregando configurações...");
      const res = await listarConfiguracoesFn();
      console.log("[admin/configuracoes] Resposta:", res);
      if (res.ok) {
        setConfigs(res.data);
      } else {
        toast.error(res.message || "Erro ao carregar configurações.");
      }
    } catch (err) {
      console.error("[admin/configuracoes] Erro:", err);
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async (chave: string, valor: string) => {
    const res = await salvarConfiguracaoFn({ data: { chave, valor } });
    if (res.ok) {
      toast.success(`Configuração ${chave} salva.`);
    } else {
      toast.error(`Erro ao salvar ${chave}.`);
    }
  };

  const getConfig = (chave: string) => configs.find(c => c.chave === chave)?.valor ?? "";
  
  const setConfig = (chave: string, valor: string) => {
    setConfigs(prev => prev.map(c => c.chave === chave ? { ...c, valor } : c));
  };

  if (loading) return <BackofficeLayout><div className="p-8">Carregando...</div></BackofficeLayout>;

  return (
    <BackofficeLayout>
      <div className="max-w-4xl space-y-8 mb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-teal-900" />
            Configurações do Sistema
          </h1>
          <p className="text-sm text-slate-500">Ajuste os parâmetros globais da plataforma.</p>
        </div>

        <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Mail className="h-5 w-5 text-teal-700" />
            Servidor de E-mail (SMTP)
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Host SMTP</Label>
              <Input 
                value={getConfig("smtp_host")} 
                onChange={(e) => setConfig("smtp_host", e.target.value)}
                placeholder="smtp.exemplo.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Input 
                value={getConfig("smtp_port")} 
                onChange={(e) => setConfig("smtp_port", e.target.value)}
                placeholder="587" 
              />
            </div>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input 
                value={getConfig("smtp_user")} 
                onChange={(e) => setConfig("smtp_user", e.target.value)}
                placeholder="usuario@exemplo.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input 
                type="password"
                value={getConfig("smtp_pass")} 
                onChange={(e) => setConfig("smtp_pass", e.target.value)}
                placeholder="******" 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="bg-teal-900" onClick={() => {
              void salvar("smtp_host", getConfig("smtp_host"));
              void salvar("smtp_port", getConfig("smtp_port"));
              void salvar("smtp_user", getConfig("smtp_user"));
              void salvar("smtp_pass", getConfig("smtp_pass"));
            }}>
              <Save className="mr-2 h-4 w-4" /> Salvar SMTP
            </Button>
          </div>
        </section>

        <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BrainCircuit className="h-5 w-5 text-amber-600" />
            Inteligência Artificial (OpenAI)
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Chave de API OpenAI</Label>
              <Input 
                type="password"
                value={getConfig("openai_api_key")} 
                onChange={(e) => setConfig("openai_api_key", e.target.value)}
                placeholder="sk-..." 
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input 
                value={getConfig("openai_model")} 
                onChange={(e) => setConfig("openai_model", e.target.value)}
                placeholder="gpt-4o" 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="bg-teal-900" onClick={() => {
              void salvar("openai_api_key", getConfig("openai_api_key"));
              void salvar("openai_model", getConfig("openai_model"));
            }}>
              <Save className="mr-2 h-4 w-4" /> Salvar Configurações IA
            </Button>
          </div>
        </section>
      </div>
    </BackofficeLayout>
  );
}
