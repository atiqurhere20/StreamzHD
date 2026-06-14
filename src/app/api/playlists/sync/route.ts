import { NextRequest } from "next/server";
import { supabaseAdmin, createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { isValidStreamUrl, jsonError, jsonOk, sanitizeText } from "@/lib/middleware-helpers";
import { parseM3U } from "@/lib/m3u-parser";
import { generateSlug } from "@/lib/slugify";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow up to 5 minutes for full sync

const COUNTRY_METADATA: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  CA: { name: "Canada", flag: "🇨🇦" },
  FR: { name: "France", flag: "🇫🇷" },
  DE: { name: "Germany", flag: "🇩🇪" },
  IT: { name: "Italy", flag: "🇮🇹" },
  ES: { name: "Spain", flag: "🇪🇸" },
  IN: { name: "India", flag: "🇮🇳" },
  BD: { name: "Bangladesh", flag: "🇧🇩" },
  TR: { name: "Turkey", flag: "🇹🇷" },
  AL: { name: "Albania", flag: "🇦🇱" },
  AR: { name: "Argentina", flag: "🇦🇷" },
  BR: { name: "Brazil", flag: "🇧🇷" },
  MX: { name: "Mexico", flag: "🇲🇽" },
  JP: { name: "Japan", flag: "🇯🇵" },
  KR: { name: "South Korea", flag: "🇰🇷" },
  CN: { name: "China", flag: "🇨🇳" },
  RU: { name: "Russia", flag: "🇷🇺" },
  AU: { name: "Australia", flag: "🇦🇺" },
  ZA: { name: "South Africa", flag: "🇿🇦" },
  NL: { name: "Netherlands", flag: "🇳🇱" },
  PT: { name: "Portugal", flag: "🇵🇹" },
  SE: { name: "Sweden", flag: "🇸🇪" },
  NO: { name: "Norway", flag: "🇳🇴" },
  DK: { name: "Denmark", flag: "🇩🇰" },
  FI: { name: "Finland", flag: "🇫🇮" },
  CH: { name: "Switzerland", flag: "🇨🇭" },
  BE: { name: "Belgium", flag: "🇧🇪" },
  AT: { name: "Austria", flag: "🇦🇹" },
  GR: { name: "Greece", flag: "🇬🇷" },
  PL: { name: "Poland", flag: "🇵🇱" },
  UA: { name: "Ukraine", flag: "🇺🇦" },
  RO: { name: "Romania", flag: "🇷🇴" },
  NZ: { name: "New Zealand", flag: "🇳🇿" },
  IE: { name: "Ireland", flag: "🇮🇪" }
};

export async function GET(req: NextRequest) {
  try { await requireAdmin(req); } catch (r) { return r as Response; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const { data, error } = await db
    .from("playlists")
    .select("*")
    .order("type")
    .order("name");

  if (error) return jsonError(error.message, 500);
  return jsonOk({ playlists: data || [] });
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(req); } catch (r) { return r as Response; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useAdmin = serviceKey && serviceKey !== "undefined" && serviceKey !== anonKey;
  const db = useAdmin ? supabaseAdmin : await createSupabaseServerClient();

  const body = await req.json().catch(() => ({}));
  const playlistId = body?.playlist_id; // Option to sync a single playlist

  try {
    // 1. Fetch active playlists
    let query = db.from("playlists").select("*").eq("is_active", true);
    if (playlistId) {
      query = query.eq("id", playlistId);
    }
    const { data: playlists, error: playlistError } = await query;
    if (playlistError) return jsonError(playlistError.message, 500);
    if (!playlists || playlists.length === 0) {
      return jsonOk({ message: "No active playlists found to sync", synced: 0 });
    }

    // Load category and country maps
    const { data: categories } = await db.from("categories").select("id, name, slug");
    const { data: countries } = await db.from("countries").select("id, name, code");

    const catMap = new Map<string, string>(); // slug and lowercase name -> id
    const countryMap = new Map<string, string>(); // code and lowercase name -> id

    categories?.forEach((c) => {
      catMap.set(c.slug, c.id);
      catMap.set(c.name.toLowerCase(), c.id);
    });

    countries?.forEach((c) => {
      const uppercaseCode = c.code.toUpperCase();
      countryMap.set(uppercaseCode, c.id);
      if (uppercaseCode === "GB") countryMap.set("UK", c.id);
      if (uppercaseCode === "UK") countryMap.set("GB", c.id);
      countryMap.set(c.name.toLowerCase(), c.id);
    });

    let totalImported = 0;
    const logs: string[] = [];

    // 2. Process each playlist
    for (const playlist of playlists) {
      logs.push(`Starting sync for playlist: ${playlist.name}`);
      
      let m3uText = "";
      try {
        const res = await fetch(playlist.url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
          logs.push(`Failed to fetch: ${playlist.name} (Status ${res.status})`);
          continue;
        }
        m3uText = await res.text();
      } catch (err) {
        logs.push(`Network error fetching ${playlist.name}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      const parsed = parseM3U(m3uText);
      if (parsed.length === 0) {
        logs.push(`No channels found in playlist: ${playlist.name}`);
        continue;
      }

      // Determine category or country targets for this playlist
      let playlistCategoryId: string | null = null;
      let playlistCountryId: string | null = null;
      if (playlist.type === "category") {
        // Find or create category based on playlist URL name
        const match = playlist.url.match(/\/categories\/([^/]+)\.m3u/i);
        const catSlug = match ? match[1].toLowerCase() : generateSlug(playlist.name) || "uncategorized";
        let catId = catMap.get(catSlug);

        if (!catId) {
          const catName = playlist.name.charAt(0).toUpperCase() + playlist.name.slice(1);
          const { data: newCat, error: catCreateError } = await db
            .from("categories")
            .insert({ name: catName, slug: catSlug, sort_order: 0 })
            .select("id")
            .single();

          if (!catCreateError && newCat) {
            catId = newCat.id;
            catMap.set(catSlug, newCat.id);
            logs.push(`Created category: ${catName}`);
          }
        }
        playlistCategoryId = catId || null;
      } else if (playlist.type === "country") {
        // Find or create country based on playlist URL code
        const match = playlist.url.match(/\/countries\/([^/]+)\.m3u/i);
        const countryCode = (match ? match[1].toLowerCase() : "").toUpperCase();
        
        if (countryCode) {
          let cId = countryMap.get(countryCode);
          if (!cId) {
            const meta = COUNTRY_METADATA[countryCode] || { name: playlist.name, flag: "" };
            const { data: newCountry, error: countryCreateError } = await db
              .from("countries")
              .insert({
                name: meta.name,
                code: countryCode,
                flag_emoji: meta.flag || null,
                sort_order: 0
              })
              .select("id")
              .single();

            if (!countryCreateError && newCountry) {
              cId = newCountry.id;
              countryMap.set(countryCode, newCountry.id);
              logs.push(`Created country: ${meta.name} (${countryCode})`);
            }
          }
          playlistCountryId = cId || null;
        }
      }

      // 1. Resolve missing categories dynamically from group-titles
      const missingCatNames = new Set<string>();
      for (const c of parsed) {
        if (c.group) {
          const groups = c.group.split(";").map(g => g.trim()).filter(Boolean);
          const groupName = groups[0];
          if (groupName) {
            const slug = generateSlug(groupName);
            if (slug && !catMap.has(slug)) {
              missingCatNames.add(groupName);
            }
          }
        }
      }

      if (missingCatNames.size > 0) {
        const newCatsPayload = Array.from(missingCatNames).map((name) => ({
          name,
          slug: generateSlug(name) || `cat-${Math.random().toString(36).slice(2, 8)}`,
          sort_order: 0,
        }));
        const { data: createdCats } = await db
          .from("categories")
          .insert(newCatsPayload)
          .select("id, name, slug");
        if (createdCats) {
          for (const c of createdCats) {
            catMap.set(c.slug, c.id);
            logs.push(`Dynamically created category: ${c.name}`);
          }
        }
      }

      // 2. Resolve missing countries dynamically from tvg-country attributes
      const missingCountryCodes = new Set<string>();
      for (const c of parsed) {
        if (c.country) {
          const code = c.country.trim().toUpperCase();
          if (code && !countryMap.has(code)) {
            missingCountryCodes.add(code);
          }
        }
      }

      if (missingCountryCodes.size > 0) {
        const newCountriesPayload = Array.from(missingCountryCodes).map((code) => {
          const meta = COUNTRY_METADATA[code] || { name: code, flag: "" };
          return {
            name: meta.name,
            code,
            flag_emoji: meta.flag || null,
            sort_order: 0
          };
        });
        const { data: createdCountries } = await db
          .from("countries")
          .insert(newCountriesPayload)
          .select("id, name, code");
        if (createdCountries) {
          for (const c of createdCountries) {
            countryMap.set(c.code.toUpperCase(), c.id);
            logs.push(`Dynamically created country: ${c.name} (${c.code})`);
          }
        }
      }

      // Prepare channels payload
      const seenSlugs = new Set<string>();
      const channelRows = parsed
          .filter((c) => {
            if (!c.name || !c.streamUrl || !isValidStreamUrl(c.streamUrl)) return false;
            const baseSlug = generateSlug(c.name) || `ch-${Math.random().toString(36).slice(2, 8)}`;
            let slug = baseSlug;
            let i = 1;
            while (seenSlugs.has(slug)) {
              slug = `${baseSlug}-${i}`;
              i++;
            }
            seenSlugs.add(slug);
            c.slug = slug;
            return true;
          })
          .map((c) => {
            // Resolve individual channel category/country if not overridden by playlist type
            let finalCategoryId = playlistCategoryId;
            if (!finalCategoryId && c.group) {
              const groups = c.group.split(";").map(g => g.trim()).filter(Boolean);
              const groupName = groups[0] || "";
              finalCategoryId = catMap.get(generateSlug(groupName)) || null;
            }

            let finalCountryId = playlistCountryId;
            if (!finalCountryId && c.country) {
              finalCountryId = countryMap.get(c.country.trim().toUpperCase()) || null;
            }

            return {
              name: sanitizeText(c.name, 200),
              slug: c.slug,
              stream_url: c.streamUrl,
              logo_url: c.logo || null,
              epg_id: c.epgId || null,
              language: c.tvgLanguage || null,
              category_id: finalCategoryId,
              country_id: finalCountryId,
              is_active: true
            };
          });

      // Upsert channels in chunks
      let imported = 0;
      const CHUNK = 100;
      for (let i = 0; i < channelRows.length; i += CHUNK) {
        const chunk = channelRows.slice(i, i + CHUNK);
        
        // 1. Fetch existing channels in this chunk to merge metadata
        const { data: existingChannels } = await db
          .from("channels")
          .select("id, slug, category_id, country_id, logo_url, language, epg_id")
          .in("slug", chunk.map(c => c.slug));

        const existingMap = new Map(existingChannels?.map(e => [e.slug, e]) || []);

        // 2. Merge non-null fields to avoid overwriting existing categorization with nulls
        const mergedChunk = chunk.map(c => {
          const existing = existingMap.get(c.slug);
          if (existing) {
            return {
              ...c,
              category_id: c.category_id || existing.category_id,
              country_id: c.country_id || existing.country_id,
              logo_url: c.logo_url || existing.logo_url,
              language: c.language || existing.language,
              epg_id: c.epg_id || existing.epg_id,
            };
          }
          return c;
        });

        const { data, error: upsertError } = await db
          .from("channels")
          .upsert(mergedChunk, { onConflict: "slug", ignoreDuplicates: false })
          .select("id");

        if (upsertError) {
          logs.push(`Error upserting channels for ${playlist.name}: ${upsertError.message}`);
          break;
        }
        imported += data?.length || 0;
      }

      // Update last_imported_at for the playlist
      await db
        .from("playlists")
        .update({ last_imported_at: new Date().toISOString() })
        .eq("id", playlist.id);

      totalImported += imported;
      logs.push(`Successfully synced ${imported} channels from ${playlist.name}`);
    }

    // Log the sync event
    await db.from("activity_logs").insert({
      action: "playlists.sync",
      detail: `Synced ${totalImported} channels across active playlists.`
    });

    return jsonOk({ message: "Sync completed", total_imported: totalImported, logs });
  } catch (err) {
    console.error("Playlist Sync Error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal Server Error", 500);
  }
}
