/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_CALLMEBOT_PHONE: string
  readonly VITE_CALLMEBOT_APIKEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
