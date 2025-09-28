import { createClient } from '@supabase/supabase-js'

// Cast import.meta to any so TS never balks during CI
const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  const msg = 'Missing Supabase env. Check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  console.error(msg, { urlPresent: !!url, anonPresent: !!anon })
  throw new Error(msg)
}

export const supa = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
