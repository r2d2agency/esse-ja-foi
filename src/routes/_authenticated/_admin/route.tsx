import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_admin')({
  beforeLoad: async ({ context }: any) => {
    const { data: profile } = await context.queryClient.ensureQueryData({
      queryKey: ['profile', context.session.user.id],
      queryFn: async () => {
        const { data } = await context.supabase
          .from('profiles')
          .select('*')
          .eq('id', context.session.user.id)
          .single();
        return data;
      },
    });

    if (profile?.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});
