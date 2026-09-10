const SUPABASE_URL = "https://zjfdedemugnfplrkojax.supabase.co";
const SUPABASE_KEY = "sb_publishable_X6KkTWLjEicaJZlWJkjkdw_Jn8mwdxI";
const SITE_URL = "https://savermarketshop.com";

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function onRequestGet() {
  const endpoint = `${SUPABASE_URL}/rest/v1/products?select=sku,availability&is_active=eq.true&order=created_at.desc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return new Response("Product sitemap temporarily unavailable", {
      status: 503,
      headers: { "content-type": "text/plain; charset=UTF-8", "Retry-After": "60" }
    });
  }

  const rows = await response.json();
  const seen = new Set();
  const urls = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const sku = String(row?.sku || "").replace(/^#/, "").trim();
    if (!sku || seen.has(sku.toUpperCase())) continue;
    seen.add(sku.toUpperCase());
    urls.push(`${SITE_URL}/p/${encodeURIComponent(sku)}`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
