import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BASE_URL = "https://atmos.tur.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── static routes ── */
const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] =
  [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/roteiros", priority: "0.9", changefreq: "monthly" },
    { path: "/cachoeiras", priority: "0.9", changefreq: "monthly" },
    { path: "/experiencias", priority: "0.9", changefreq: "monthly" },
    { path: "/hospedagens", priority: "0.8", changefreq: "monthly" },
    { path: "/servicos", priority: "0.8", changefreq: "monthly" },
    { path: "/imersoes", priority: "0.7", changefreq: "monthly" },
    { path: "/monte-seu-roteiro", priority: "0.7", changefreq: "monthly" },
    { path: "/duvidas", priority: "0.6", changefreq: "monthly" },
  ];

/* ── hard-coded itinerary slugs (data lives in frontend) ── */
const ITINERARY_SLUGS = [
  "2d-classico",
  "2d-jurassico",
  "3d-classico",
  "3d-jurassico",
  "4d-classico",
  "4d-jurassico",
  "5d-classico",
  "5d-jurassico",
];

/* ── helpers ── */
function toW3CDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function buildXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/* ── dynamic sources (add more functions here to expand) ── */

async function fetchActiveProducts(
  supabase: ReturnType<typeof createClient>
): Promise<SitemapEntry[]> {
  const { data, error } = await supabase
    .from("products")
    .select("source_id, updated_at, is_active")
    .eq("is_active", true)
    .not("source_id", "is", null);

  if (error || !data) return [];

  return (data as any[])
    .filter((p) => p.source_id)
    .map((p) => ({
      loc: `${BASE_URL}/produtos/${p.source_id}`,
      lastmod: toW3CDate(new Date(p.updated_at)),
      changefreq: "monthly",
      priority: "0.7",
    }));
}

/* ── handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const today = toW3CDate(new Date());

  // Static pages
  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((r) => ({
    loc: `${BASE_URL}${r.path}`,
    lastmod: today,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  // Itinerary detail pages (slugs)
  const itineraryEntries: SitemapEntry[] = ITINERARY_SLUGS.map((slug) => ({
    loc: `${BASE_URL}/roteiros/${slug}`,
    lastmod: today,
    changefreq: "monthly",
    priority: "0.8",
  }));

  // Dynamic DB sources
  let productEntries: SitemapEntry[] = [];
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    productEntries = await fetchActiveProducts(supabase);
  } catch {
    // silently skip if DB is unreachable
  }

  const allEntries = [
    ...staticEntries,
    ...itineraryEntries,
    ...productEntries,
  ];

  const xml = buildXml(allEntries);

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
