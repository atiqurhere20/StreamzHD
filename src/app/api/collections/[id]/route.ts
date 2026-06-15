import { NextRequest } from "next/server";
import { supabaseAdmin, createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, sanitizeText } from "@/lib/middleware-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const [collection, mappings] = await Promise.all([
    db.from("collections").select("*").eq("id", id).maybeSingle(),
    db.from("collection_channels").select("channel_id").eq("collection_id", id),
  ]);

  if (collection.error) return jsonError(collection.error.message, 500);
  if (!collection.data) return jsonError("Collection not found", 404);

  return jsonOk({
    collection: collection.data,
    channel_ids: (mappings.data || []).map((m: any) => m.channel_id),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(req); } catch (r) { return r as Response; }
  const { id } = await params;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid body");

  const patch: Record<string, any> = {};
  if ("name" in body) patch.name = sanitizeText(body.name, 100);
  if ("slug" in body) patch.slug = sanitizeText(body.slug, 100);
  if ("sort_order" in body) patch.sort_order = parseInt(body.sort_order) || 0;
  if ("is_active" in body) patch.is_active = !!body.is_active;

  const { data: collection, error } = await db
    .from("collections")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  // Update channel mappings if provided
  if (Array.isArray(body.channel_ids)) {
    const { error: deleteError } = await db
      .from("collection_channels")
      .delete()
      .eq("collection_id", id);

    if (deleteError) return jsonError(deleteError.message, 500);

    if (body.channel_ids.length > 0) {
      const newMappings = body.channel_ids.map((cid: string) => ({
        collection_id: id,
        channel_id: cid,
      }));
      const { error: insertError } = await db
        .from("collection_channels")
        .insert(newMappings);

      if (insertError) return jsonError(insertError.message, 500);
    }
  }

  return jsonOk({ collection });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(req); } catch (r) { return r as Response; }
  const { id } = await params;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const { error } = await db.from("collections").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  return jsonOk({ success: true });
}
