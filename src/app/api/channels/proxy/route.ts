import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  if (!url) {
    return new Response("URL parameter is required", { status: 400 });
  }

  try {
    // Forward the request to the destination streaming URL
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return new Response(`Failed to fetch upstream: ${response.status}`, { status: response.status });
    }

    // Set headers with permissive CORS so browser players can decode the stream chunks
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    
    // Copy content headers from the original response (e.g. content-type, content-length)
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Stream Proxy Error:", err);
    return new Response("Error connecting to stream source", { status: 502 });
  }
}
