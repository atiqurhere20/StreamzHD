"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Radio } from "lucide-react";
import type { Channel } from "@/types";

export function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link
        href={`/watch/${channel.slug}`}
        className="group block bg-card hover:bg-card-hover border border-border hover:border-primary/40 rounded-xl overflow-hidden transition-all"
      >
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {channel.logo_url ? (
            <Image
              src={channel.logo_url}
              alt={channel.name}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Radio className="h-10 w-10 text-text-dim" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <span className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50">
              <Play className="h-6 w-6 fill-white text-white ml-0.5" />
            </span>
          </div>
          {channel.is_featured && (
            <span className="absolute top-2 right-2 bg-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Live
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate">{channel.name}</h3>
          <p className="text-xs text-text-dim truncate mt-0.5">
            {channel.language || channel.category?.name || "Live"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
