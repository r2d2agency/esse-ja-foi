import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { 
  ClipboardCheck, 
  History, 
  User,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export const MobileLayout = ({ children, title, showBack }: { children: React.ReactNode, title: string, showBack?: boolean }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Top Header */}
      <header className="h-16 bg-teal-900 text-white flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="text-white hover:bg-teal-800">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </div>
        <div className="h-8 w-8 rounded-full bg-teal-800 flex items-center justify-center border border-teal-700">
          <User className="h-4 w-4" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-50">
        <Button 
          variant="ghost" 
          className="flex-col gap-1 h-auto py-2 text-teal-900"
          onClick={() => navigate({ to: '/vistoria' })}
        >
          <ClipboardCheck className="h-6 w-6" />
          <span className="text-[10px] font-medium">Vistorias</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="flex-col gap-1 h-auto py-2 text-gray-400"
          onClick={() => navigate({ to: '/vistoria/historico' })}
        >
          <History className="h-6 w-6" />
          <span className="text-[10px] font-medium">Histórico</span>
        </Button>

        <Button 
          variant="ghost" 
          className="flex-col gap-1 h-auto py-2 text-red-500"
          onClick={handleSignOut}
        >
          <LogOut className="h-6 w-6" />
          <span className="text-[10px] font-medium">Sair</span>
        </Button>
      </nav>
    </div>
  );
};
