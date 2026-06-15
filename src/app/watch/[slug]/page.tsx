import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabasePublic } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChannelGrid } from "@/components/home/ChannelGrid";
import { AdSlot } from "@/components/ui/AdSlot";
import { QRShare } from "@/components/ui/QRShare";
import { ViewIncrement } from "./view-increment";
import { ClientVideoPlayer } from "@/components/player/ClientVideoPlayer";
import type { Channel } from "@/types";

export const revalidate = 30;

async function fetchChannel(slug: string) {
  const { data } = await supabasePublic
    .from("channels")
    .select("id, name, slug, logo_url, category_id, country_id, language, description, tags, is_featured, is_active, view_count, sort_order, epg_id, created_at, updated_at, category:categories(*), country:countries(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data as Channel | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const channel = await fetchChannel(slug);
  if (!channel) return { title: "Channel not found" };
  const title = `Watch ${channel.name} — Live HD Stream`;
  const description = channel.description || `Watch ${channel.name} live online in HD. Free streaming on StreamZ HD.`;
  return {
    title, description,
    alternates: { canonical: `/watch/${channel.slug}` },
    openGraph: { title, description, images: channel.logo_url ? [channel.logo_url] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = await fetchChannel(slug);
  if (!channel) notFound();

  // Fetch related channels: Prioritize channels in the same custom collections first, then same category, then popular channels.
  let relatedChannels: Channel[] = [];
  const existingIds = new Set<string>([channel.id]);

  // 1. Fetch collection peers
  const { data: colMappings } = await supabasePublic
    .from("collection_channels")
    .select("collection_id")
    .eq("channel_id", channel.id);
  
  const colIds = (colMappings || []).map((m: any) => m.collection_id);
  if (colIds.length > 0) {
    const { data: peerMappings } = await supabasePublic
      .from("collection_channels")
      .select("channel_id")
      .in("collection_id", colIds)
      .neq("channel_id", channel.id)
      .limit(24);
    
    const peerChannelIds = Array.from(new Set((peerMappings || []).map((m: any) => m.channel_id)));
    if (peerChannelIds.length > 0) {
      const { data: collectionPeers } = await supabasePublic
        .from("channels")
        .select("id, name, slug, logo_url, category_id, country_id, language, is_featured, is_active, view_count, category:categories(name,slug), country:countries(name,code)")
        .in("id", peerChannelIds)
        .eq("is_active", true)
        .limit(12);
        
      if (collectionPeers) {
        for (const item of collectionPeers) {
          relatedChannels.push(item as unknown as Channel);
          existingIds.add(item.id);
        }
      }
    }
  }

  // 2. Fetch category peers
  if (relatedChannels.length < 12 && channel.category_id) {
    const { data: catPeers } = await supabasePublic
      .from("channels")
      .select("id, name, slug, logo_url, category_id, country_id, language, is_featured, is_active, view_count, category:categories(name,slug), country:countries(name,code)")
      .eq("is_active", true)
      .eq("category_id", channel.category_id)
      .neq("id", channel.id)
      .limit(12 - relatedChannels.length);
      
    if (catPeers) {
      for (const item of catPeers) {
        if (!existingIds.has(item.id)) {
          relatedChannels.push(item as unknown as Channel);
          existingIds.add(item.id);
        }
      }
    }
  }

  // 3. Fallback to popular channels
  if (relatedChannels.length < 12) {
    const { data: fallback } = await supabasePublic
      .from("channels")
      .select("id, name, slug, logo_url, category_id, country_id, language, is_featured, is_active, view_count, category:categories(name,slug), country:countries(name,code)")
      .eq("is_active", true)
      .neq("id", channel.id)
      .order("view_count", { ascending: false })
      .limit(12 - relatedChannels.length);
      
    if (fallback) {
      for (const item of fallback) {
        if (!existingIds.has(item.id)) {
          relatedChannels.push(item as unknown as Channel);
          existingIds.add(item.id);
        }
      }
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const url = `${baseUrl}/watch/${channel.slug}`;

  return (
    <>
      <Header />
      <ViewIncrement slug={channel.slug} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="sticky md:relative top-[64px] md:top-auto z-30 md:z-0 bg-bg pb-2 md:pb-0 shadow-md md:shadow-none shadow-bg/50 -mx-4 sm:mx-0">
          <ClientVideoPlayer channelSlug={channel.slug} channelName={channel.name} logoUrl={channel.logo_url} />
        </div>

        <div className="grid md:grid-cols-[1fr,300px] gap-8">
          <div>
            <div className="flex items-start gap-4">
              {channel.logo_url && (
                <div className="relative h-16 w-16 bg-black rounded-lg flex-shrink-0 overflow-hidden border border-border">
                  <img src={channel.logo_url} alt={channel.name} className="absolute inset-0 w-full h-full object-contain p-2" loading="lazy" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-bold">{channel.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                  {channel.category && <Link href={`/category/${channel.category.slug}`} className="bg-card border border-border px-2 py-1 rounded hover:border-primary">{channel.category.name}</Link>}
                  {channel.country && (
                    <Link href={`/country/${channel.country.code}`} className="bg-card border border-border px-2 py-1 rounded hover:border-primary flex items-center gap-1.5">
                      <span>{channel.country.flag_emoji || flagEmoji(channel.country.code)}</span>
                      <span>{channel.country.name}</span>
                    </Link>
                  )}
                  {channel.language && <span className="bg-card border border-border px-2 py-1 rounded">{channel.language}</span>}
                  <span className="bg-card border border-border px-2 py-1 rounded">{channel.view_count.toLocaleString()} views</span>
                </div>
              </div>
            </div>
            {channel.description && (
              <p className="text-text-muted mt-5 leading-relaxed">{channel.description}</p>
            )}
            {channel.tags && channel.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {channel.tags.map((t) => (
                  <span key={t} className="text-xs bg-card border border-border px-2 py-1 rounded text-text-muted">#{t}</span>
                ))}
              </div>
            )}
          </div>
          <aside>
            <QRShare url={url} />
          </aside>
        </div>

        <AdSlot position="below_player" />
        <ChannelGrid title="Related channels" channels={relatedChannels} />
      </main>
      <Footer />
    </>
  );
}

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const cps = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...cps);
}
