import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabasePublic } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CollectionBrowser } from "@/components/home/CollectionBrowser";
import type { Channel } from "@/types";

export const revalidate = 10; // short cache so custom collections update quickly

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let title = "Collection";
  if (slug === "featured") title = "Featured Channels";
  else if (slug === "popular" || slug === "most-popular") title = "Most Popular Channels";
  else if (slug === "recent" || slug === "recently-added") title = "Recently Added Channels";
  else {
    const { data } = await supabasePublic.from("collections").select("name").eq("slug", slug).maybeSingle();
    if (data) title = `${data.name} Collection`;
  }
  return {
    title: `${title} — Live HD Streaming`,
    description: `Watch the best ${title} live in HD on StreamZ HD.`,
    alternates: { canonical: `/collection/${slug}` }
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let channels: Channel[] = [];
  let collectionName = "";
  
  if (slug === "featured") {
    collectionName = "Featured Channels";
    const { data } = await supabasePublic
      .from("channels")
      .select("*, category:categories(name,slug), country:countries(name,code)")
      .eq("is_active", true)
      .eq("is_featured", true);
    channels = (data as unknown as Channel[]) || [];
  } else if (slug === "popular" || slug === "most-popular") {
    collectionName = "Most Popular";
    const { data } = await supabasePublic
      .from("channels")
      .select("*, category:categories(name,slug), country:countries(name,code)")
      .eq("is_active", true)
      .order("view_count", { ascending: false });
    channels = (data as unknown as Channel[]) || [];
  } else if (slug === "recent" || slug === "recently-added") {
    collectionName = "Recently Added";
    const { data } = await supabasePublic
      .from("channels")
      .select("*, category:categories(name,slug), country:countries(name,code)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    channels = (data as unknown as Channel[]) || [];
  } else {
    // Custom admin-created collection
    const { data: col } = await supabasePublic
      .from("collections")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
      
    if (!col) notFound();
    collectionName = col.name;
    
    const { data: mappings } = await supabasePublic
      .from("collection_channels")
      .select("channel_id")
      .eq("collection_id", col.id);
      
    const channelIds = (mappings || []).map((m: any) => m.channel_id);
    if (channelIds.length > 0) {
      const { data } = await supabasePublic
        .from("channels")
        .select("*, category:categories(name,slug), country:countries(name,code)")
        .in("id", channelIds)
        .eq("is_active", true);
      channels = (data as unknown as Channel[]) || [];
    }
  }

  return (
    <>
      <Header />
      <main className="py-10">
        <CollectionBrowser initialChannels={channels} collectionName={collectionName} />
      </main>
      <Footer />
    </>
  );
}
