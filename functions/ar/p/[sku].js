const SUPABASE_URL = "https://zjfdedemugnfplrkojax.supabase.co";
const SUPABASE_KEY = "sb_publishable_X6KkTWLjEicaJZlWJkjkdw_Jn8mwdxI";
const SITE_URL = "https://savermarketshop.com";
const PAGE_LANG = "ar";

function clean(value){ return String(value == null ? "" : value).trim(); }
function htmlEscape(value){return clean(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function xmlAttr(value){return htmlEscape(value);}
function clip(value,max=360){const s=clean(value).replace(/\s+/g," ");return s.length>max?`${s.slice(0,max-1).trimEnd()}…`:s;}
function absoluteImage(value){const v=clean(value);if(!v)return "";try{return new URL(v,SITE_URL).href}catch(_){return v}}
function availabilityUrl(value){const a=clean(value).toLowerCase();if(a.includes("out"))return "https://schema.org/OutOfStock";if(a.includes("backorder")||a.includes("back order"))return "https://schema.org/BackOrder";if(a.includes("coming")||a.includes("preorder")||a.includes("pre-order"))return "https://schema.org/PreOrder";return "https://schema.org/InStock";}
function availabilityLabel(value,lang){const a=clean(value).toLowerCase();if(lang==="ar"){if(a.includes("out"))return "غير متوفر";if(a.includes("low"))return "كمية محدودة";if(a.includes("back"))return "طلب مسبق";if(a.includes("coming")||a.includes("pre"))return "قريباً";return "متوفر";}if(a.includes("out"))return "Out of Stock";if(a.includes("low"))return "Low Stock";if(a.includes("back"))return "Backorder";if(a.includes("coming")||a.includes("pre"))return "Preorder";return "In Stock";}
function slugify(value){return clean(value).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/['’]/g,"").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"")||"category";}
const CATEGORY_AR={"Women's Fashion":"أزياء نسائية","Men's Fashion":"أزياء رجالية","Accessories":"إكسسوارات","Beauty":"تجميل","Home":"منتجات منزلية","Home Products":"منتجات منزلية","Kids":"أطفال","Shoes":"أحذية","Bags":"حقائب","Electronics":"إلكترونيات","Luxury Collection":"المجموعة الفاخرة","Jewelry":"مجوهرات","Jewellery":"مجوهرات","Makeup":"مكياج","Toys":"ألعاب","Stationery":"قرطاسية","School Supplies":"مستلزمات مدرسية","Personal Care":"العناية الشخصية","Kitchen":"المطبخ","Beauty Tools":"أدوات تجميل","Jewelry & Accessories":"مجوهرات وإكسسوارات"};
function categoryLabel(v,lang){return lang==="ar"?(CATEGORY_AR[v]||v):v;}

async function fetchProduct(sku){
  const fields=["id","sku","name_en","name_ar","description_en","description_ar","price_syp","availability","stock_qty","category","brand","is_active","product_images(image_url,sort_order)"].join(",");
  async function querySku(value){const endpoint=`${SUPABASE_URL}/rest/v1/products?select=${encodeURIComponent(fields)}&is_active=eq.true&sku=eq.${encodeURIComponent(value)}&limit=1`;const response=await fetch(endpoint,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:"application/json"}});if(!response.ok)throw new Error(`Supabase ${response.status}`);const rows=await response.json();return Array.isArray(rows)?rows[0]:null;}
  return (await querySku(sku))||(await querySku(`#${sku}`));
}
async function fetchApprovedReviews(productId){
  if(!productId)return [];
  try{const endpoint=`${SUPABASE_URL}/rest/v1/product_reviews?product_id=eq.${encodeURIComponent(productId)}&status=eq.approved&select=rating,review_title,review_text,customer_name,created_at&order=created_at.desc&limit=20`;const r=await fetch(endpoint,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:"application/json"}});if(!r.ok)return [];const rows=await r.json();return Array.isArray(rows)?rows.filter(x=>Number(x.rating)>0):[];}catch(_){return []}
}
function dataFor(product,sku,lang){
  const arName=clean(product.name_ar)||clean(product.name_en)||sku,enName=clean(product.name_en)||clean(product.name_ar)||sku;
  const name=lang==="ar"?arName:enName,otherName=lang==="ar"?enName:arName;
  const rawDesc=lang==="ar"?(product.description_ar||product.description_en):(product.description_en||product.description_ar);
  const lead=clip(rawDesc,210);
  const suffix=lang==="ar"?`تسوق أونلاين من Saver Market مع التوصيل داخل سوريا ودمشق. رمز المنتج ${sku}.`:`Shop online from Saver Market with delivery across Syria, including Damascus. SKU ${sku}.`;
  const description=clip([lead,suffix].filter(Boolean).join(" "),360);
  const title=clip(lang==="ar"?`${name} | شراء أونلاين في سوريا | Saver Market`:`${name} | Buy Online in Syria | Saver Market`,110);
  const images=Array.isArray(product.product_images)?product.product_images.slice().sort((a,b)=>Number(a?.sort_order||0)-Number(b?.sort_order||0)).map(x=>absoluteImage(x?.image_url)).filter(Boolean):[];
  const canonical=`${SITE_URL}/${lang}/p/${encodeURIComponent(sku)}`;
  const altLang=lang==="ar"?"en":"ar";
  const alternate=`${SITE_URL}/${altLang}/p/${encodeURIComponent(sku)}`;
  const defaultUrl=`${SITE_URL}/ar/p/${encodeURIComponent(sku)}`;
  return {arName,enName,name,otherName,description,title,images,canonical,alternate,defaultUrl,price:Number(product.price_syp||0),lang,altLang};
}
function removeOldHreflang(html){return html.replace(/\s*<link\s+rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>/gi,"");}
function replaceMeta(html,product,data,sku,reviews){
  const image=data.images[0]||`${SITE_URL}/saver-market-icon-512.png`,titleEsc=htmlEscape(data.title),descEsc=htmlEscape(data.description),canonicalEsc=htmlEscape(data.canonical),imageEsc=htmlEscape(image);
  if(!/<base\s/i.test(html))html=html.replace(/<head(\s[^>]*)?>/i,m=>`${m}\n    <base href="/">`);
  html=html.replace(/<html\s+lang=["'][^"']*["'](?:\s+dir=["'][^"']*["'])?/i,`<html lang="${data.lang}" dir="${data.lang==="ar"?"rtl":"ltr"}"`);
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${titleEsc}</title>`);
  html=html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i,`<meta name="description" content="${descEsc}">`);
  html=html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i,`<link rel="canonical" href="${canonicalEsc}">`);
  html=removeOldHreflang(html);
  const hreflangs=`\n    <link rel="alternate" hreflang="ar" href="${SITE_URL}/ar/p/${encodeURIComponent(sku)}">\n    <link rel="alternate" hreflang="en" href="${SITE_URL}/en/p/${encodeURIComponent(sku)}">\n    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/ar/p/${encodeURIComponent(sku)}">`;
  html=html.replace(/<link\s+rel="canonical"[^>]*>/i,m=>m+hreflangs);
  const replacements=[
    [/meta\s+property="og:type"\s+content="[^"]*"/i,'meta property="og:type" content="product"'],
    [/meta\s+property="og:title"\s+content="[^"]*"/i,`meta property="og:title" content="${titleEsc}"`],
    [/meta\s+property="og:description"\s+content="[^"]*"/i,`meta property="og:description" content="${descEsc}"`],
    [/meta\s+property="og:url"\s+content="[^"]*"/i,`meta property="og:url" content="${canonicalEsc}"`],
    [/meta\s+property="og:image"\s+content="[^"]*"/i,`meta property="og:image" content="${imageEsc}"`],
    [/meta\s+property="og:locale"\s+content="[^"]*"/i,`meta property="og:locale" content="${data.lang==="ar"?"ar_SY":"en_US"}"`],
    [/meta\s+property="og:locale:alternate"\s+content="[^"]*"/i,`meta property="og:locale:alternate" content="${data.lang==="ar"?"en_US":"ar_SY"}"`],
    [/meta\s+name="twitter:card"\s+content="[^"]*"/i,'meta name="twitter:card" content="summary_large_image"'],
    [/meta\s+name="twitter:title"\s+content="[^"]*"/i,`meta name="twitter:title" content="${titleEsc}"`],
    [/meta\s+name="twitter:description"\s+content="[^"]*"/i,`meta name="twitter:description" content="${descEsc}"`],
    [/meta\s+name="twitter:image"\s+content="[^"]*"/i,`meta name="twitter:image" content="${imageEsc}"`]
  ];
  for(const [re,val] of replacements)html=html.replace(re,val);
  const category=clean(product.category),catSlug=slugify(category),catUrl=`${SITE_URL}/${data.lang}/category/${encodeURIComponent(catSlug)}`;
  const productSchema={"@context":"https://schema.org/","@type":"Product","@id":`${data.canonical}#product`,name:data.name,alternateName:[data.arName,data.enName].filter(Boolean),description:data.description,sku,url:data.canonical,mainEntityOfPage:data.canonical,category,image:data.images,offers:{"@type":"Offer",url:data.canonical,priceCurrency:"SYP",price:data.price,availability:availabilityUrl(product.availability),itemCondition:"https://schema.org/NewCondition",seller:{"@type":"Organization",name:"Saver Market",url:`${SITE_URL}/`}}};
  if(clean(product.brand))productSchema.brand={"@type":"Brand",name:clean(product.brand)};if(!productSchema.image.length)delete productSchema.image;
  if(reviews.length){const avg=reviews.reduce((s,r)=>s+Number(r.rating||0),0)/reviews.length;productSchema.aggregateRating={"@type":"AggregateRating",ratingValue:Number(avg.toFixed(2)),reviewCount:reviews.length,bestRating:5,worstRating:1};productSchema.review=reviews.slice(0,5).map(r=>({"@type":"Review",author:{"@type":"Person",name:clean(r.customer_name)||"Saver Market Customer"},datePublished:clean(r.created_at).slice(0,10)||undefined,reviewBody:clean(r.review_text)||undefined,name:clean(r.review_title)||undefined,reviewRating:{"@type":"Rating",ratingValue:Number(r.rating),bestRating:5,worstRating:1}}));}
  const breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:data.lang==="ar"?"الرئيسية":"Home",item:`${SITE_URL}/`},{"@type":"ListItem",position:2,name:categoryLabel(category,data.lang)||category,item:catUrl},{"@type":"ListItem",position:3,name:data.name,item:data.canonical}]};
  const webPage={"@context":"https://schema.org","@type":"WebPage","@id":`${data.canonical}#webpage`,url:data.canonical,name:data.title,description:data.description,inLanguage:data.lang,mainEntity:{"@id":`${data.canonical}#product`}};if(image)webPage.primaryImageOfPage=image;
  const extra=`\n    <meta property="og:image:alt" content="${htmlEscape(data.name)}">\n    <meta name="twitter:image:alt" content="${htmlEscape(data.name)}">\n    <meta property="product:price:amount" content="${htmlEscape(data.price)}">\n    <meta property="product:price:currency" content="SYP">\n    <script id="saver-server-product-schema" type="application/ld+json">${JSON.stringify(productSchema).replace(/</g,"\\u003c")}</script>\n    <script id="saver-product-breadcrumb-schema" type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g,"\\u003c")}</script>\n    <script id="saver-product-webpage-schema" type="application/ld+json">${JSON.stringify(webPage).replace(/</g,"\\u003c")}</script>`;
  return html.replace(/<\/head>/i,`${extra}\n</head>`);
}
function injectServerProduct(html,product,data,sku){
  const image=data.images[0]||`${SITE_URL}/saver-market-icon-512.png`,category=clean(product.category),brand=clean(product.brand),availability=availabilityLabel(product.availability,data.lang),price=Number(data.price||0).toLocaleString(data.lang==="ar"?"ar-SY":"en-US"),catUrl=`/${data.lang}/category/${encodeURIComponent(slugify(category))}`;
  const skuLabel=data.lang==="ar"?"رمز المنتج":"SKU",catTitle=data.lang==="ar"?"الفئة":"Category",delivery=data.lang==="ar"?"تسوق أونلاين من Saver Market مع التوصيل داخل سوريا ودمشق.":"Shop online from Saver Market with delivery across Syria, including Damascus.",homeLabel=data.lang==="ar"?"الرئيسية":"Home";
  const markup=`<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">${htmlEscape(homeLabel)}</a><span>›</span>${category?`<a href="${htmlEscape(catUrl)}">${htmlEscape(categoryLabel(category,data.lang))}</a><span>›</span>`:""}<span>#${htmlEscape(sku)}</span></nav><div class="details-container" data-server-rendered-product="${htmlEscape(sku)}"><div class="details-gallery"><div class="main-img-box"><img src="${htmlEscape(image)}" alt="${htmlEscape(data.name)} - Saver Market Syria" title="${htmlEscape(data.name)}" fetchpriority="high" decoding="async" style="width:100%;height:100%;object-fit:contain;"></div></div><div class="details-info">${brand?`<div class="product-brand">${htmlEscape(brand)}</div>`:""}<h1 class="saver-product-detail-title" lang="${data.lang}">${htmlEscape(data.name)}</h1><div class="details-meta-row"><span><strong>${skuLabel}:</strong> #${htmlEscape(sku)}</span>${category?`<span><strong>${catTitle}:</strong> ${htmlEscape(categoryLabel(category,data.lang))}</span>`:""}<span class="stock-status">${htmlEscape(availability)}</span></div><div class="details-price" style="margin-bottom:16px;">${htmlEscape(price)} ${data.lang==="ar"?"ل.س":"SYP"}</div><p lang="${data.lang}" style="color:#555;margin-bottom:10px;">${htmlEscape(data.description)}</p><p style="font-size:.86rem;color:#666;">${htmlEscape(delivery)}</p></div></div>`;
  html=html.replace('<section id="view-home" class="app-view active">','<section id="view-home" class="app-view">').replace('<section id="view-details" class="app-view">','<section id="view-details" class="app-view active">').replace('<div id="productDetailsContent"></div>',`<div id="productDetailsContent">${markup}</div>`);return html;
}
async function getIndexHtml(context){const u=new URL(context.request.url);u.pathname="/";u.search="";u.hash="";const r=await context.env.ASSETS.fetch(new Request(u.toString(),{method:"GET",headers:{Accept:"text/html"}}));const html=await r.text();if(!html||!/<html[\s>]/i.test(html))throw new Error(`Could not load Saver Market index asset (${r.status})`);const headers=new Headers(r.headers);headers.set("content-type","text/html; charset=UTF-8");return{html,headers};}
export async function onRequestGet(context){const raw=Array.isArray(context.params.sku)?context.params.sku[0]:context.params.sku,sku=clean(decodeURIComponent(raw||"")).replace(/^#/,"");if(!sku)return new Response("Product not found",{status:404});let product;try{product=await fetchProduct(sku)}catch(_){return new Response("Temporary product service error",{status:503,headers:{"Retry-After":"60"}})}if(!product)return new Response('<!doctype html><html><head><meta name="robots" content="noindex"><title>Product not found | Saver Market</title></head><body><h1>Product not found</h1><a href="/">Saver Market</a></body></html>',{status:404,headers:{"content-type":"text/html; charset=UTF-8"}});const reviews=await fetchApprovedReviews(product.id);const data=dataFor(product,sku,PAGE_LANG);const asset=await getIndexHtml(context);let html=replaceMeta(asset.html,product,data,sku,reviews);html=injectServerProduct(html,product,data,sku);asset.headers.set("Cache-Control","public, max-age=300, s-maxage=300, stale-while-revalidate=3600");asset.headers.set("Vary","Accept-Encoding");return new Response(html,{status:200,headers:asset.headers});}
