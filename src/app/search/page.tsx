import type { Metadata } from "next";
import { Suspense } from "react";
import { supabasePublic } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchClient } from "@/components/home/SearchClient";
import type { Channel } from "@/types";

export const metadata: Metadata = {
  title: "Search Channels",
  description: "Search live IPTV channels by name, language, country or tag on StreamZ HD.",
  alternates: { canonical: "/search" },
};

// Revalidate search cache periodically
export const revalidate = 60;

export default async function SearchPage() {
  const { data } = await supabasePublic
    .from("channels")
    .select("id, name, slug, logo_url, language, is_featured, is_active, view_count, created_at, category:categories(name,slug), country:countries(name,code)")
    .eq("is_active", true)
    .order("view_count", { ascending: false })
    .limit(2000); // Support search for up to 2000 channels instantly client-side

  const channels = (data as unknown as Channel[]) || [];

  return (
    <>
      <Header />
      <main className="py-10 space-y-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-center text-white">Search Channels</h1>
        <Suspense fallback={<div className="text-center py-20 text-text-dim text-sm">Loading search interface...</div>}>
          <SearchClient initialChannels={channels} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
