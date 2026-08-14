import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarCompradoresFn } from "@/lib/admin-compradores.functions";
import { useState } from "react";
import { 
  Search, 
  ChevronRight, 
  ShoppingBag,
  Building2,
  User as UserIcon,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn, formatDate, formatCPF } from "@/lib/utils";

export const Route = createFileRoute("/admin/compradores")({
  component: CompradoresPage,
});

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, icon: any }> = {
  'PENDENTE': { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-500', icon: Clock },
  'EM_ANALISE': { label: 'Em Análise', color: 'text-blue-600', bg: 'bg-blue-500', icon: Search },
  'PENDENCIA': { label: 'Pendência', color: 'text-red-600', bg: 'bg-red-500', icon: AlertTriangle },
  'APROVADO': { label: 'Aprovado', color: 'text-teal-600', bg: 'bg-teal-500', icon: CheckCircle2 },
  'BLOQUEADO': { label: 'Bloqueado', color: 'text-slate-600', bg: 'bg-slate-500', icon: AlertTriangle },
};

function CompradoresPage() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>(undefined);
  
  const loadCompradores = useServerFn(listarCompradoresFn);
  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-compradores", busca, filtroStatus],
    queryFn: () => loadCompradores({ data: { busca, status: filtroStatus } })
  });

  const compradores = res?.data || [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Compradores</h1>
          <p className="text-slate-500 font-medium">Gestão de interessados, investidores e lojistas.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome, CPF, CNPJ ou e-mail" 
              className="pl-10 h-11 bg-white border-slate-200"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { label: 'Todos', value: undefined },
              { label: 'Pendentes', value: 'PENDENTE' },
              { label: 'Aprovados', value: 'APROVADO' },
              { label: 'Pendência', value: 'PENDENCIA' },
            ].map((f) => (
              <Button
                key={f.label}
                variant={filtroStatus === f.value ? "default" : "outline"}
                size="sm"
                className={cn(
                  "whitespace-nowrap font-bold text-xs",
                  filtroStatus === f.value ? "bg-teal-500 hover:bg-teal-600 text-slate-950 border-teal-500" : "text-slate-500 border-slate-200"
                )}
                onClick={() => setFiltroStatus(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent border-slate-200">
              <TableHead className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-4">Comprador</TableHead>
              <TableHead className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-4">Documento</TableHead>
              <TableHead className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-4">Localização</TableHead>
              <TableHead className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-4">Compliance</TableHead>
              <TableHead className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-4">Atualização</TableHead>
              <TableHead className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={6} className="h-16 bg-slate-50/50" />
                </TableRow>
              ))
            ) : compradores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                  Nenhum comprador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              compradores.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                        {c.tipo_pessoa === 'PJ' ? <Building2 className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{c.nome}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {c.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} • {c.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-500">
                      {c.tipo_pessoa === 'PJ' ? c.cnpj : c.cpf}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">{c.cidade || '-'}/{c.uf || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        c.status_compliance ? STATUS_CONFIG[c.status_compliance]?.bg : 'bg-amber-500'
                      )} />
                      <span className={cn(
                        "text-xs font-bold",
                        c.status_compliance ? STATUS_CONFIG[c.status_compliance]?.color : 'text-amber-600'
                      )}>
                        {c.status_compliance ? STATUS_CONFIG[c.status_compliance]?.label : 'Pendente'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700">{formatDate(c.atualizado_em)}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.responsavel || 'Sistema'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/admin/comprador/$id" params={{ id: c.id }}>
                      <Button variant="ghost" size="sm" className="text-teal-600 font-bold text-xs group">
                        Ver detalhes <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
