import { supabase } from '../lib/supabase/client';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  // Monitor de estado de sesión para las redirecciones automáticas
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Ajuste clave: Redirigir directamente a la nueva carpeta del dashboard
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) console.error('Error:', error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // Al cerrar sesión, volvemos a la landing principal
    window.location.href = '/';
  };

  return { loginWithGoogle, logout, user };
};