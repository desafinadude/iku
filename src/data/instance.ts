import { createBackend } from './backend'

/** The one storage backend for the app (Supabase when configured, else this browser). */
export const backend = createBackend()
