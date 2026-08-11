import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_vistoria')({
  beforeLoad: async ({ context }: any) => {
    if (context.session?.user?.id) {
        const { data: profile } = await context.supabase
          .from('profiles')
          .select('role')
          .eq('id', context.session.user.id)
          .single();
        
        if (profile?.role !== 'vistoriador') {
          throw redirect({ to: '/' });
        }
    }
  },
  component: () => <Outlet />,
});
