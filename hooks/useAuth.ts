import { supabase } from '../lib/supabase/client';

export const useAuth = () => {
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) console.error('Error:', error.message);
  };

  return { loginWithGoogle };
};