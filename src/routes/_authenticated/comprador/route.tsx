import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Gavel, LogOut } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/comprador')({
  component: CompradorDashboard,
});

function CompradorDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-teal-900">
          <Gavel className="h-6 w-6" />
          <span className="font-bold text-xl tracking-tight">ESSE JÁ FOI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium hidden sm:block">Olá, {profile?.nome}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-red-500">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Vitrine de Leilões</h1>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
             <p className="text-gray-400">Vitrine de veículos para compradores em construção.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
