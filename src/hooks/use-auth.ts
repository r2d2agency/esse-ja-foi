import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from './use-auth-store';

export const useAuth = () => {
  const { user, profile, loading, setUser, setProfile, signOut, refreshProfile } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profile);
      }
      useAuthStore.setState({ loading: false });
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profile);
      } else {
        setProfile(null);
      }
      useAuthStore.setState({ loading: false });
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile]);

  return { user, profile, loading, signOut, refreshProfile };
};
