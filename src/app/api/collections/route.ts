import { NextRequest } from "next/server";
import { supabaseAdmin, createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, sanitizeText } from "@/lib/middleware-helpers";
import { uniqueSlug } from "@/lib/slugify";

export const runtime = "nodejs";

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const { data, error } = await db
    .from("collections")
    .select("*, channels:collection_channels(count)")
    .order("sort_order");

  if (error) return jsonError(error.message, 500);

  const out = (data || []).map((c: any) => ({
    ...c,
    channel_count: c.channels?.[0]?.count ?? 0,
  }));

  return jsonOk({ collections: out });
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(req); } catch (r) { return r as Response; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const body = await req.json().catch(() => null);
  if (!body?.name) return jsonError("name required");

  const name = sanitizeText(body.name, 100);
  const slug = body.slug ? sanitizeText(body.slug, 100) : await uniqueSlug(name, db, "collections");

  const { data, error } = await db.from("collections").insert({
    name,
    slug,
    sort_order: parseInt(body.sort_order) || 0,
    is_active: body.is_active !== false,
  }).select().single();

  if (error) return jsonError(error.message, 500);
  return jsonOk({ collection: data }, 201);
}
