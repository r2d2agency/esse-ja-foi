import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Calendar, 
  ClipboardCheck, 
  Gavel, 
  TrendingUp, 
  Settings, 
  LogOut,
  Search,
  Menu,
  X,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const SidebarItem = ({ to, icon: Icon, label, active }: SidebarItemProps) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-teal-900/10 text-teal-900 font-medium' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </Link>
);

export const BackofficeLayout = ({ children, role }: { children: React.ReactNode, role: 'admin' | 'operacao' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/' });
  };

  const menuItems = [
    { to: `/${role}`, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `/${role}/leads`, icon: Users, label: 'Leads' },
    { to: `/${role}/clientes`, icon: Users, label: 'Clientes' },
    { to: `/${role}/veiculos`, icon: Car, label: 'Veículos' },
    { to: `/${role}/agenda`, icon: Calendar, label: 'Agenda' },
    { to: `/${role}/vistorias`, icon: ClipboardCheck, label: 'Revisão' },
    { to: `/${role}/leiloes`, icon: Gavel, label: 'Leilões' },
    { to: `/${role}/vendas`, icon: TrendingUp, label: 'Vendas' },
  ];

  if (role === 'admin') {
    menuItems.push({ to: '/admin/config', icon: Settings, label: 'Configurações' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xl font-bold text-teal-900 tracking-tight">ESSE JÁ FOI</span>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <SidebarItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Busca global (placa, cliente, lead...)" 
                className="pl-10 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-teal-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{profile?.nome || 'Usuário'}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
            <UserCircle className="h-8 w-8 text-gray-300" />
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
