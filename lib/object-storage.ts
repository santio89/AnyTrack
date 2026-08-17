import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

function requireSupabase() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return supabase;
}

export async function uploadObject(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
) {
  const supabase = requireSupabase();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function downloadObject(objectPath: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(objectPath);

  if (error || !data) {
    throw new Error(error?.message ?? "Object not found");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteObject(objectPath: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([objectPath]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteObjectsByPrefix(prefix: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(prefix, { limit: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  const paths = (data ?? [])
    .filter((entry) => entry.name)
    .map((entry) => `${prefix}/${entry.name}`);

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    throw new Error(removeError.message);
  }
}
