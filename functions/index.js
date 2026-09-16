const SUPABASE_URL="https://zjfdedemugnfplrkojax.supabase.co";
const SUPABASE_KEY="sb_publishable_X6KkTWLjEicaJZlWJkjkdw_Jn8mwdxI";
const SITE_URL="https://savermarketshop.com";
const PAGE_LANG="ar";
const AR={"Women's Fashion":"أزياء نسائية","Men's Fashion":"أزياء رجالية","Accessories":"إكسسوارات","Beauty":"تجميل","Home":"منتجات منزلية","Home Products":"منتجات منزلية","Kids":"أطفال","Shoes":"أحذية","Bags":"حقائب","Electronics":"إلكترونيات","Luxury Collection":"المجموعة الفاخرة","Jewelry":"مجوهرات","Jewellery":"مجوهرات","Makeup":"مكياج","Toys":"ألعاب","Stationery":"قرطاسية","School Supplies":"مستلزمات مدرسية","Personal Care":"العناية الشخصية","Kitchen":"المطبخ","Beauty Tools":"أدوات تجميل","Jewelry & Accessories":"مجوهرات وإكسسوارات"};
function clean(v){return String(v==null?"":v).trim()}
function esc(v){return clean(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function slugify(value){return clean(value).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/['’]/g,"").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"")||"category"}
function label(c){return PAGE_LANG==="ar"?(AR[c]||c):c}
function meta(){
  if(PAGE_LANG==="en") return {
    title:"Saver Market | Online Shopping in Syria",
    description:"Saver Market is an online shop in Syria for accessories, jewelry, beauty, home products, toys and everyday essentials. Browse prices in SYP and order for delivery across Syria.",
    og:"Shop accessories, jewelry, beauty, home products, toys and everyday essentials online from Saver Market with delivery across Syria.",
    canonical:`${SITE_URL}/en/`
  };
  return {
    title:"Saver Market | تسوق أونلاين في سوريا",
    description:"Saver Market متجر للتسوق أونلاين في سوريا للإكسسوارات والمجوهرات ومنتجات التجميل والمنزل والألعاب والاحتياجات اليومية، مع أسعار بالليرة السورية وطلب وتوصيل داخل سوريا.",
    og:"تسوق الإكسسوارات والمجوهرات ومنتجات التجميل والمنزل والألعاب والاحتياجات اليومية أونلاين من Saver Market مع التوصيل داخل سوريا.",
    canonical:`${SITE_URL}/`
  };
}
async function getIndexHtml(context){
  const u=new URL(context.request.url);u.pathname="/";u.search="";u.hash="";
  const r=await context.env.ASSETS.fetch(new Request(u.toString(),{headers:{Accept:"text/html"}}));
  const html=await r.text();
  if(!html||!/<html[\s>]/i.test(html))throw new Error("Missing index asset");
  const headers=new Headers(r.headers);headers.set("content-type","text/html; charset=UTF-8");
  return {html,headers};
}
async function fetchCategories(){
  try{
    const endpoint=`${SUPABASE_URL}/rest/v1/products?select=category&is_active=eq.true&order=created_at.desc`;
    const r=await fetch(endpoint,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:"application/json"}});
    if(!r.ok)return [];
    const rows=await r.json(),seen=new Set();
    for(const row of Array.isArray(rows)?rows:[]){const c=clean(row?.category);if(c)seen.add(c)}
    return [...seen].sort((a,b)=>a.localeCompare(b));
  }catch(_){return []}
}
function localizeSimpleText(html){
  const attr=PAGE_LANG==="ar"?"data-ar":"data-en";
  const rx=new RegExp(`(<([A-Za-z][\\\\w:-]*)\\\\b[^>]*\\\\b${attr}="([^"]*)"[^>]*>)([^<>]*)(<\\\\/\\\\2>)`,"g");
  for(let i=0;i<3;i++) html=html.replace(rx,(m,open,tag,value,inner,close)=>`${open}${value}${close}`);
  return html;
}
function setMeta(html,categories){
  const m=meta();
  if(!/<base\s/i.test(html)) html=html.replace(/<head(\s[^>]*)?>/i,x=>`${x}\n    <base href="/">`);
  html=html.replace(/<html\s+lang=["'][^"']*["'](?:\s+dir=["'][^"']*["'])?/i,`<html lang="${PAGE_LANG}" dir="${PAGE_LANG==="ar"?"rtl":"ltr"}"`);
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(m.title)}</title>`);
  html=html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i,`<meta name="description" content="${esc(m.description)}">`);
  html=html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i,`<link rel="canonical" href="${esc(m.canonical)}">`);
  html=html.replace(/\s*<link\s+rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>/gi,"");
  const alts=`\n    <link rel="alternate" hreflang="ar" href="${SITE_URL}/">\n    <link rel="alternate" hreflang="en" href="${SITE_URL}/en/">\n    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/">`;
  html=html.replace(/<link\s+rel="canonical"[^>]*>/i,x=>x+alts);
  const replacements=[
    [/meta\s+property="og:title"\s+content="[^"]*"/i,`meta property="og:title" content="${esc(m.title)}"`],
    [/meta\s+property="og:description"\s+content="[^"]*"/i,`meta property="og:description" content="${esc(m.og)}"`],
    [/meta\s+property="og:url"\s+content="[^"]*"/i,`meta property="og:url" content="${esc(m.canonical)}"`],
    [/meta\s+property="og:locale"\s+content="[^"]*"/i,`meta property="og:locale" content="${PAGE_LANG==="en"?"en_US":"ar_SY"}"`],
    [/meta\s+name="twitter:title"\s+content="[^"]*"/i,`meta name="twitter:title" content="${esc(m.title)}"`],
    [/meta\s+name="twitter:description"\s+content="[^"]*"/i,`meta name="twitter:description" content="${esc(m.description)}"`]
  ];
  for(const [rx,val] of replacements) html=html.replace(rx,val);

  html=localizeSimpleText(html);

  const categoryLinks=categories.map(c=>`<a href="/${PAGE_LANG==="en"?"en/":""}category/${encodeURIComponent(slugify(c))}"><i class="fas fa-tag" aria-hidden="true"></i><span>${esc(label(c))}</span></a>`).join("");
  html=html.replace(/<nav id="saverHomeSeoCategoryLinks" class="saver-home-seo-category-links" aria-label="Saver Market categories">[\s\S]*?<\/nav>/i,
    `<nav id="saverHomeSeoCategoryLinks" class="saver-home-seo-category-links" aria-label="Saver Market categories">${categoryLinks}</nav>`);

  const schema={"@context":"https://schema.org","@type":"WebPage","@id":`${m.canonical}#webpage`,url:m.canonical,name:m.title,description:m.description,inLanguage:PAGE_LANG,isPartOf:{"@id":`${SITE_URL}/#website`},about:{"@id":`${SITE_URL}/#organization`}};
  html=html.replace(/<script id="saver-home-webpage-schema"[\s\S]*?<\/script>\s*/i,"");
  html=html.replace(/<\/head>/i,`<script id="saver-home-webpage-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script>\n</head>`);
  return html;
}
export async function onRequestGet(context){
  const asset=await getIndexHtml(context);
  const categories=await fetchCategories();
  const html=setMeta(asset.html,categories);
  asset.headers.set("Cache-Control","public, max-age=300, s-maxage=300, stale-while-revalidate=3600");
  asset.headers.set("Vary","Accept-Encoding");
  return new Response(html,{status:200,headers:asset.headers});
}
