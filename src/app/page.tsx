import { supabasePublic } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BreakingNewsTicker } from "@/components/layout/BreakingNewsTicker";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ChannelGrid } from "@/components/home/ChannelGrid";
import { CategorySection } from "@/components/home/CategorySection";
import { CountrySection } from "@/components/home/CountrySection";
import { AdSlot } from "@/components/ui/AdSlot";
import type { Category, Channel, Country, SliderImage } from "@/types";

export const revalidate = 60;

async function fetchHomeData() {
  const [slides, featured, recent, popular, trending, cats, countries] = await Promise.all([
    supabasePublic.from("slider_images").select("*").eq("is_active", true).order("sort_order"),
    supabasePublic.from("channels").select("*, category:categories(name,slug), country:countries(name,code)").eq("is_active", true).eq("is_featured", true).order("sort_order").limit(12),
    supabasePublic.from("channels").select("*, category:categories(name,slug), country:countries(name,code)").eq("is_active", true).order("created_at", { ascending: false }).limit(12),
    supabasePublic.from("channels").select("*, category:categories(name,slug), country:countries(name,code)").eq("is_active", true).order("view_count", { ascending: false }).limit(12),
    supabasePublic.from("channels").select("id,name,slug,language,is_featured,is_active").eq("is_active", true).order("view_count", { ascending: false }).limit(6),
    supabasePublic.from("categories").select("*, channels:channels(count)").order("sort_order"),
    supabasePublic.from("countries").select("*, channels:channels(count)").order("sort_order"),
  ]);
  return {
    slides: (slides.data || []) as SliderImage[],
    featured: (featured.data || []) as Channel[],
    recent: (recent.data || []) as Channel[],
    popular: (popular.data || []) as Channel[],
    trending: (trending.data || []) as Channel[],
    categories: ((cats.data || []) as any[]).map(c => ({
      ...c,
      channel_count: c.channels?.[0]?.count ?? 0
    })) as Category[],
    countries: ((countries.data || []) as any[]).map(c => ({
      ...c,
      channel_count: c.channels?.[0]?.count ?? 0
    })) as Country[],
  };
}

export default async function HomePage() {
  const d = await fetchHomeData().catch(() => ({
    slides: [], featured: [], recent: [], popular: [], trending: [], categories: [], countries: [],
  }));

  return (
    <>
      <Header />
      <BreakingNewsTicker channels={d.trending} />
      <main className="space-y-12 py-6 pb-12">
        <div className="px-4 sm:px-6">
          <HeroSlider slides={d.slides.length ? d.slides : [{
            id: "demo", title: "High Definition Live News Broadcasts",
            description: "Stay ahead of the curve with real-time news sources broadcasting global issues directly from Germany, Paris, and Washington.",
            image_url: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1600&q=80",
            button_text: "Watch Live Now", button_link: "/category/news",
            is_active: true, sort_order: 0, created_at: "",
          } as SliderImage]} />
        </div>
        <AdSlot position="homepage_top" />
        <ChannelGrid title="Featured Channels" channels={d.featured} viewAllHref="/search?filter=featured" />
        <ChannelGrid title="Recently Added" channels={d.recent} viewAllHref="/search?sort=new" />
        <ChannelGrid title="Most Popular" channels={d.popular} viewAllHref="/search?sort=popular" />
        <AdSlot position="homepage_middle" />
        <CategorySection categories={d.categories} />
        <CountrySection countries={d.countries} />
        <AdSlot position="homepage_footer" />
      </main>
      <Footer />
    </>
  );
}
