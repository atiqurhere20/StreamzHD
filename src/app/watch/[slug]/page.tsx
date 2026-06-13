import { notFound } from "next/navigation";
import Image from "next/image";
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

  const { data: related } = await supabasePublic
    .from("channels")
    .select("*, category:categories(name,slug), country:countries(name,code)")
    .eq("is_active", true)
    .eq("category_id", channel.category_id)
    .neq("id", channel.id)
    .limit(12);

  const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/watch/${channel.slug}`;

  return (
    <>
      <Header />
      <ViewIncrement slug={channel.slug} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="sticky top-[72px] z-30 bg-bg pb-2 shadow-md shadow-bg/50">
          <ClientVideoPlayer channelSlug={channel.slug} channelName={channel.name} logoUrl={channel.logo_url} />
        </div>

        <div className="grid md:grid-cols-[1fr,300px] gap-8">
          <div>
            <div className="flex items-start gap-4">
              {channel.logo_url && (
                <div className="relative h-16 w-16 bg-black rounded-lg flex-shrink-0 overflow-hidden border border-border">
                  <Image src={channel.logo_url} alt={channel.name} fill className="object-contain p-2" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-bold">{channel.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                  {channel.category && <Link href={`/category/${channel.category.slug}`} className="bg-card border border-border px-2 py-1 rounded hover:border-primary">{channel.category.name}</Link>}
                  {channel.country && <Link href={`/country/${channel.country.code}`} className="bg-card border border-border px-2 py-1 rounded hover:border-primary">{channel.country.name}</Link>}
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
        <ChannelGrid title="Related channels" channels={(related as Channel[]) || []} />
      </main>
      <Footer />
    </>
  );
}
