import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_operacao')({
  beforeLoad: async ({ context }: any) => {
     // Simplified check for now - will be refined with better context injection
    if (context.session?.user?.id) {
        const { data: profile } = await context.supabase
          .from('profiles')
          .select('role')
          .eq('id', context.session.user.id)
          .single();
        
        if (profile?.role !== 'operacao' && profile?.role !== 'admin') {
          throw redirect({ to: '/' });
        }
    }
  },
  component: () => <Outlet />,
});
