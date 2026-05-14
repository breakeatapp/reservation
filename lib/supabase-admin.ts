import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase ADMIN — utilise la clé service_role
 * ⚠️ Bypasse toutes les politiques RLS
 * ✅ À utiliser UNIQUEMENT dans les API routes (server-side)
 * ❌ Ne jamais importer dans un composant client ('use client')
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
