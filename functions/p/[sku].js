const SUPABASE_URL = "https://zjfdedemugnfplrkojax.supabase.co";
const SUPABASE_KEY = "sb_publishable_X6KkTWLjEicaJZlWJkjkdw_Jn8mwdxI";
const SITE_URL = "https://savermarketshop.com";

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function htmlEscape(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clip(value, max = 420) {
  const s = clean(value).replace(/\s+/g, " ");
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function absoluteImage(value) {
  const v = clean(value);
  if (!v) return "";
  try { return new URL(v, SITE_URL).href; } catch (_) { return v; }
}

function availabilityUrl(value) {
  const a = clean(value).toLowerCase();
  if (a.includes("out")) return "https://schema.org/OutOfStock";
  if (a.includes("backorder") || a.includes("back order")) return "https://schema.org/BackOrder";
  if (a.includes("coming") || a.includes("preorder") || a.includes("pre-order")) return "https://schema.org/PreOrder";
  return "https://schema.org/InStock";
}

function availabilityLabel(value) {
  const a = clean(value).toLowerCase();
  if (a.includes("out")) return "غير متوفر | Out of Stock";
  if (a.includes("low")) return "كمية محدودة | Low Stock";
  if (a.includes("back")) return "طلب مسبق | Backorder";
  return "متوفر | In Stock";
}

async function fetchProduct(sku) {
  const fields = [
    "sku","name_en","name_ar","description_en","description_ar","price_syp",
    "availability","stock_qty","category","brand","is_active","product_images(image_url,sort_order)"
  ].join(",");

  async function querySku(value) {
    const endpoint = `${SUPABASE_URL}/rest/v1/products?select=${encodeURIComponent(fields)}&is_active=eq.true&sku=eq.${encodeURIComponent(value)}&limit=1`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const rows = await response.json();
    return Array.isArray(rows) ? rows[0] : null;
  }

  return (await querySku(sku)) || (await querySku(`#${sku}`));
}

function makeProductData(product, sku) {
  const arName = clean(product.name_ar) || clean(product.name_en) || sku;
  const enName = clean(product.name_en) || clean(product.name_ar) || sku;
  const bilingualName = arName.toLowerCase() === enName.toLowerCase() ? arName : `${arName} | ${enName}`;
  const arDesc = clip(product.description_ar || product.description_en, 180);
  const enDesc = clip(product.description_en || product.description_ar, 180);
  const description = clip([
    arDesc,
    enDesc && enDesc.toLowerCase() !== arDesc.toLowerCase() ? enDesc : "",
    "شراء أونلاين من Saver Market مع التوصيل داخل سوريا. Buy online from Saver Market with delivery across Syria."
  ].filter(Boolean).join(" | "), 420);

  const images = Array.isArray(product.product_images)
    ? product.product_images
        .slice()
        .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
        .map(item => absoluteImage(item?.image_url))
        .filter(Boolean)
    : [];

  const canonical = `${SITE_URL}/p/${encodeURIComponent(sku)}`;
  const price = Number(product.price_syp || 0);
  const title = clip(`${bilingualName} | Saver Market Syria`, 110);

  return { arName, enName, bilingualName, arDesc, enDesc, description, images, canonical, price, title };
}

function replaceMeta(html, product, data, sku) {
  const image = data.images[0] || `${SITE_URL}/saver-market-icon-512.png`;
  const titleEsc = htmlEscape(data.title);
  const descEsc = htmlEscape(data.description);
  const canonicalEsc = htmlEscape(data.canonical);
  const imageEsc = htmlEscape(image);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${titleEsc}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${descEsc}">`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${canonicalEsc}">`);
  html = html.replace(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:type" content="product">`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${titleEsc}">`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${descEsc}">`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${canonicalEsc}">`);
  html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:image" content="${imageEsc}">`);
  html = html.replace(/<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:card" content="summary_large_image">`);
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:title" content="${titleEsc}">`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:description" content="${descEsc}">`);
  html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:image" content="${imageEsc}">`);

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": `${data.canonical}#product`,
    name: data.bilingualName,
    alternateName: [data.arName, data.enName].filter(Boolean),
    description: data.description,
    sku,
    url: data.canonical,
    category: clean(product.category),
    image: data.images,
    offers: {
      "@type": "Offer",
      url: data.canonical,
      priceCurrency: "SYP",
      price: data.price,
      availability: availabilityUrl(product.availability),
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Saver Market",
        url: `${SITE_URL}/`
      }
    }
  };
  if (clean(product.brand)) schema.brand = { "@type": "Brand", name: clean(product.brand) };
  if (!schema.image.length) delete schema.image;

  const extraHead = `
    <meta property="product:price:amount" content="${htmlEscape(data.price)}">
    <meta property="product:price:currency" content="SYP">
    <script id="saver-server-product-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;
  html = html.replace(/<\/head>/i, `${extraHead}\n</head>`);
  return html;
}

function injectServerProduct(html, product, data, sku) {
  const image = data.images[0] || `${SITE_URL}/saver-market-icon-512.png`;
  const category = clean(product.category);
  const brand = clean(product.brand);
  const availability = availabilityLabel(product.availability);
  const price = Number(data.price || 0).toLocaleString("en-US");

  const serverMarkup = `
    <div class="details-container" data-server-rendered-product="${htmlEscape(sku)}">
      <div class="details-gallery">
        <div class="main-img-box">
          <img src="${htmlEscape(image)}" alt="${htmlEscape(data.bilingualName)}" style="width:100%;height:100%;object-fit:contain;">
        </div>
      </div>
      <div class="details-info">
        ${brand ? `<div class="product-brand">${htmlEscape(brand)}</div>` : ""}
        <h1 class="saver-product-detail-title" lang="ar">${htmlEscape(data.arName)}</h1>
        ${data.enName && data.enName !== data.arName ? `<div class="saver-product-alt-name" lang="en">${htmlEscape(data.enName)}</div>` : ""}
        <div class="details-meta-row">
          <span><strong>رمز المنتج | SKU:</strong> #${htmlEscape(sku)}</span>
          ${category ? `<span><strong>الفئة | Category:</strong> ${htmlEscape(category)}</span>` : ""}
          <span class="stock-status">${htmlEscape(availability)}</span>
        </div>
        <div class="details-price" style="margin-bottom:16px;">${htmlEscape(price)} SYP</div>
        ${data.arDesc ? `<p lang="ar" style="color:#555;margin-bottom:10px;">${htmlEscape(data.arDesc)}</p>` : ""}
        ${data.enDesc && data.enDesc !== data.arDesc ? `<p lang="en" class="saver-product-alt-description">${htmlEscape(data.enDesc)}</p>` : ""}
        <p style="font-size:.86rem;color:#666;">تسوق أونلاين من Saver Market مع التوصيل داخل سوريا. Buy online from Saver Market with delivery across Syria.</p>
      </div>
    </div>`;

  html = html.replace('<section id="view-home" class="app-view active">', '<section id="view-home" class="app-view">');
  html = html.replace('<section id="view-details" class="app-view">', '<section id="view-details" class="app-view active">');
  html = html.replace('<div id="productDetailsContent"></div>', `<div id="productDetailsContent">${serverMarkup}</div>`);
  return html;
}

async function getIndexHtml(context, status = 200) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/index.html";
  assetUrl.search = "";
  assetUrl.hash = "";
  const assetResponse = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
  const html = await assetResponse.text();
  const headers = new Headers(assetResponse.headers);
  headers.set("content-type", "text/html; charset=UTF-8");
  return { html, headers, status };
}

export async function onRequestGet(context) {
  const rawSku = Array.isArray(context.params.sku) ? context.params.sku[0] : context.params.sku;
  const sku = clean(decodeURIComponent(rawSku || "")).replace(/^#/, "");
  if (!sku) return new Response("Product not found", { status: 404 });

  let product;
  try {
    product = await fetchProduct(sku);
  } catch (error) {
    const fallback = await getIndexHtml(context, 503);
    fallback.headers.set("Retry-After", "60");
    fallback.headers.set("Cache-Control", "no-store");
    return new Response(fallback.html, { status: 503, headers: fallback.headers });
  }

  if (!product) {
    const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Product not found | Saver Market</title></head><body><main><h1>Product not found</h1><p>This Saver Market product is not currently available.</p><p><a href="/">Return to Saver Market</a></p></main></body></html>`;
    return new Response(body, { status: 404, headers: { "content-type": "text/html; charset=UTF-8" } });
  }

  const data = makeProductData(product, sku);
  const asset = await getIndexHtml(context, 200);
  let html = replaceMeta(asset.html, product, data, sku);
  html = injectServerProduct(html, product, data, sku);

  asset.headers.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=3600");
  asset.headers.set("Vary", "Accept-Encoding");
  return new Response(html, { status: 200, headers: asset.headers });
}
