import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  ShieldCheck, 
  FileText, 
  Camera, 
  Megaphone, 
  Gavel, 
  ShoppingBag, 
  DollarSign, 
  Truck, 
  MessageSquare, 
  BarChart3, 
  UserCog, 
  Settings,
  Search,
  Bell,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const MENU_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
  { label: "Vendedores", icon: Users, to: "/admin/vendedores" },
  { label: "Veículos", icon: Car, to: "/operacao/veiculos" },
  { label: "Compliance", icon: ShieldCheck, to: "/admin/vendedores" },
  { label: "Contratos", icon: FileText, to: "/admin/contratos" },
  { label: "Configurações", icon: Settings, to: "/admin/configuracoes" },
];

interface AdminLayoutProps {
  children?: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {

  const { user, isAuthenticated, initialized, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate({ to: "/login", replace: true });
  }, [initialized, isAuthenticated, navigate]);

  if (!initialized) return null;

  const isActive = (to: string) => pathname === to;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-950 text-white transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/admin" className="flex items-center gap-2 overflow-hidden">
            <div className="min-w-8 h-8 rounded bg-teal-500 flex items-center justify-center font-black text-slate-950">EJ</div>
            {sidebarOpen && <span className="font-bold tracking-tight text-lg whitespace-nowrap">ESSE JÁ FOI</span>}
          </Link>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                  isActive(item.to) 
                    ? "bg-teal-500 text-slate-950 font-bold" 
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive(item.to) ? "text-slate-950" : "group-hover:text-teal-400")} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-900 text-slate-400"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar vendedor, CPF, placa ou veículo" 
              className="pl-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-teal-500 h-10"
            />
          </div>

          <div className="flex items-center gap-4 ml-4">
            <Button variant="ghost" size="icon" className="relative text-slate-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full border-2 border-white"></span>
            </Button>

            <div className="h-8 w-px bg-slate-200"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold leading-none">{user?.nome?.split(' ')[0]}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Operações</p>
                  </div>
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-teal-50 text-teal-700 font-bold">{user?.nome?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin/usuarios" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/configuracoes" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" /> Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
