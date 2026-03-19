
import { createClient } from "@supabase/supabase-js";

// Em ambientes de navegador com Vite, usamos import.meta.env
// process.env causaria erro de referência (ReferenceError)
// Fix: Use type assertion for import.meta to access environment variables without TS errors
const meta = import.meta as any;

export const supabaseUrl: string = (typeof import.meta !== 'undefined' && meta.env?.VITE_SUPABASE_URL) 
  ? String(meta.env.VITE_SUPABASE_URL)
  : 'https://yfeqddbvvhioyllkcnca.supabase.co';

export const supabaseKey: string = (typeof import.meta !== 'undefined' && meta.env?.VITE_SUPABASE_ANON_KEY) 
  ? String(meta.env.VITE_SUPABASE_ANON_KEY)
  : 'sb_publishable_wXpZdqfj7wBjJSRREWbMFg_tHT2fUBq';

export const supabase = createClient(supabaseUrl, supabaseKey);
