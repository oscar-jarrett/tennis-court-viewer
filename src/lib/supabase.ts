import { createClient } from '@supabase/supabase-js';

// Pull from the environment keys Vite exposes during local dev or GitHub builds
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);