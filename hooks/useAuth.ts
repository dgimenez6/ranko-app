import { supabase } from '../lib/supabase/client';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  // Monitor de estado de sesión para las redirecciones automáticas y persistencia de tokens
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      // Si el usuario acaba de iniciar sesión o se restauró la sesión y hay tokens de Google
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // Extraemos los tokens específicos de Google que nos da Supabase Auth
        const providerToken = (session as any).provider_token; 
        const providerRefreshToken = (session as any).provider_refresh_token;

        // Si tenemos al menos el Access Token, lo guardamos en la tabla de negocios del usuario
        if (providerToken) {
          console.log("Se detectó un token de Google fresco, actualizando la base de datos...");
          
          const updateData: any = {
            google_access_token: providerToken
          };

          // El refresh token solo viene la primera vez que da el consentimiento,
          // lo guardamos únicamente si Google lo envió en esta sesión.
          if (providerRefreshToken) {
            updateData.google_refresh_token = providerRefreshToken;
          }

          const { error } = await supabase
            .from('businesses')
            .update(updateData)
            .eq('user_id', session.user.id); // Sincroniza el token para los negocios de este usuario

          if (error) {
            console.error('Error al guardar el token de Google en businesses:', error.message);
          } else {
            console.log('¡Token de Google guardado con éxito en la base de datos!');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirigir directamente a la carpeta del dashboard
        redirectTo: `${window.location.origin}/dashboard`,
        // SOLUCIÓN AL 403: Pedimos permiso explícito para administrar las fichas de negocio
        scopes: 'https://www.googleapis.com/auth/business.manage',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent', // Forzamos la pantalla de consentimiento para asegurar el refresh_token
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