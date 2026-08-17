import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "anytrack";

let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

export function isSupabaseStorageConfigured() {
  return Boolean(
    getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function getSupabaseAdmin() {
  if (!isSupabaseStorageConfigured()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(
      getSupabaseUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return adminClient;
}
