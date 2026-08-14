import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  Search, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comprador/")({
  component: CompradorDashboard,
});

function CompradorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Olá, {user?.nome?.split(' ')[0]}</h1>
        <p className="text-slate-500 font-medium">Bem-vindo ao seu portal de comprador no Esse Já Foi.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-slate-200 shadow-none overflow-hidden">
          <CardHeader className="bg-slate-950 text-white">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-teal-400" /> Comece por aqui
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-black text-slate-950 uppercase">Explore a vitrine</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Centenas de veículos vistoriados com laudo completo aguardando sua proposta.
                </p>
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 font-bold mt-4"
                  onClick={() => navigate({ to: '/veiculos' })}
                >
                  <Search className="mr-2 h-4 w-4" /> Ver veículos agora
                </Button>
              </div>
              <div className="w-full md:w-48 aspect-square bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                <TrendingUp className="h-12 w-12 text-slate-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-slate-400">Seu Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Status</span>
              <Badge className="bg-amber-500">PENDENTE</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                <div className="w-4 h-4 rounded-full border border-slate-200 flex items-center justify-center">1</div>
                Documentos enviados
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 opacity-50">
                <div className="w-4 h-4 rounded-full border border-slate-200 flex items-center justify-center">2</div>
                Análise em curso
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 opacity-50">
                <div className="w-4 h-4 rounded-full border border-slate-200 flex items-center justify-center">3</div>
                Habilitado para lances
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-teal-200 text-teal-700 hover:bg-teal-50 font-bold text-xs"
              onClick={() => navigate({ to: '/comprador/documentos' })}
            >
              Completar cadastro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
