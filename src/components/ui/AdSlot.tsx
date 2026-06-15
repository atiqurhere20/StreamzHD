import { supabasePublic } from "@/lib/supabase/server";
import { AdRenderer } from "./AdRenderer";

interface Props {
  position: string;
}

export async function AdSlot({ position }: Props) {
  const { data } = await supabasePublic
    .from("advertisements")
    .select("script_html, is_active")
    .eq("position", position)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data?.script_html) {
    if (position.startsWith("global_")) return null;
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="border border-primary/30 bg-primary/5 rounded-xl px-5 py-3 text-center text-sm text-primary">
          📢 SPECIAL DEMO ADVERTISEMENT: StreamZ HD is fully compatible with Adsterra, PropellerAds, Monetag, or any custom responsive scripts! Add yours in the Admin Dashboard panel.
        </div>
      </div>
    );
  }

  if (position.startsWith("global_")) {
    return <AdRenderer html={data.script_html} isGlobal={true} position={position} />;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <AdRenderer html={data.script_html} position={position} />
      </div>
    </div>
  );
}
