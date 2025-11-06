
import { createClient } from '@supabase/supabase-js';

// Obtén las variables de entorno de Supabase.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Valida que las variables de entorno existan.
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and/or Service Role Key are not defined in .env.local');
}

// Crea y exporta el cliente de Supabase para usarlo en el LADO DEL SERVIDOR.
// Utilizamos la clave 'service_role' que tiene permisos para saltarse las políticas de RLS.
// Esto es seguro porque este código SÓLO se ejecutará en el servidor y nunca en el navegador.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // Desactiva el almacenamiento automático de la sesión en el cliente,
    // ya que estamos gestionando la autenticación con Firebase.
    autoRefreshToken: false,
    persistSession: false,
  },
});

