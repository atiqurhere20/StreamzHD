import Link from "next/link";
import type { Country } from "@/types";

export function CountrySection({ countries }: { countries: Country[] }) {
  if (!countries.length) return null;
  return (
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6">
      <h2 className="text-2xl sm:text-3xl font-display font-bold mb-5">Browse by Country</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {countries.map((c) => (
          <Link key={c.id} href={`/country/${c.code}`}
            className="bg-card hover:bg-card-hover border border-border hover:border-primary/40 rounded-xl p-4 text-center transition group min-w-0 flex flex-col justify-between items-center"
          >
            <div className="text-2xl mb-1">{flagEmoji(c.code)}</div>
            <div className="font-medium text-sm group-hover:text-primary transition truncate w-full" title={c.name}>
              {c.name}
            </div>
            <div className="text-[11px] text-text-dim mt-0.5 truncate w-full">{c.channel_count ?? 0}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const cps = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...cps);
}
