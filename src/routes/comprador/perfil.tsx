import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Smartphone, MapPin } from "lucide-react";

export const Route = createFileRoute("/comprador/perfil")({
  component: CompradorPerfilPage,
});

function CompradorPerfilPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Meu Perfil</h1>
        <p className="text-slate-500 font-medium">Gerencie seus dados pessoais e de acesso.</p>
      </div>

      <div className="max-w-2xl">
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase text-slate-400">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase text-slate-500">Nome completo</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-900">
                  <User className="h-4 w-4 text-slate-400" /> {user?.nome}
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase text-slate-500">E-mail</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-900">
                  <Mail className="h-4 w-4 text-slate-400" /> {user?.email}
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase text-slate-500">WhatsApp</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-900">
                  <Smartphone className="h-4 w-4 text-slate-400" /> {user?.whatsapp || 'Não informado'}
                </div>
              </div>
            </div>

            <Button className="bg-slate-950 hover:bg-slate-900 font-bold w-full">
              Salvar alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
