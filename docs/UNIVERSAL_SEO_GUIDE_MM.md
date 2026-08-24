# Website တိုင်းအတွက် အသုံးချနိုင်သော SEO လက်စွဲ

**ရေးသားသူ — Manus AI**  
**ရည်ရွယ်ချက် —** Company website, e-commerce store, blog, portfolio, SaaS product, school portal, marketplace နှင့် local business website များအားလုံးတွင် search engine မှ အလွယ်တကူနားလည်နိုင်ပြီး အသုံးပြုသူအတွက် အကျိုးရှိသော SEO system တစ်ခုတည်ဆောက်ရန်ဖြစ်သည်။ Teza Tech Lab ကို အောက်ပါနေရာများတွင် လက်တွေ့ဥပမာအဖြစ်သာ အသုံးပြုထားသည်။

> **အဓိကစည်းမျဉ်း** — SEO သည် “Google ကိုလှည့်စားရန်နည်း” မဟုတ်ပါ။ အသုံးပြုသူမေးခွန်းကို အမှန်တကယ်ကူညီဖြေရှင်းသော၊ မြန်ဆန်ပြီး ရှင်းလင်းသော website ကို search engine က crawl, index နှင့် understand လုပ်နိုင်အောင် တည်ဆောက်ခြင်းဖြစ်သည်။ Search ranking ကို အာမခံနိုင်သော secret မရှိပါ။ [1]

## 1. SEO ကို မှန်ကန်စွာနားလည်ခြင်း

SEO ကို အောက်ပါ pipeline လေးခုအဖြစ်စဉ်းစားလျှင် ပိုမိုလွယ်ကူသည်။

| အဆင့် | မေးရမည့်မေးခွန်း | အောင်မြင်ရန်လိုအပ်ချက် |
|---|---|---|
| Discover | Search engine က URL ကိုတွေ့နိုင်သလား | Internal links, sitemap, public access |
| Crawl | Page resources ကိုဖတ်နိုင်သလား | HTTPS, stable server response, robots policy |
| Index | Page ကို index ထဲသို့ထည့်သင့်သလား | Unique, useful, canonical public content |
| Rank & Click | User query အတွက် ဒီ page ကိုရွေးမလား | Helpful content, relevant title, strong UX, trust |

Google crawler များက public web ကို အလိုအလျောက်ရှာဖွေပြီး index တည်ဆောက်သည်။ Sitemap သည် index ရမည်ဟုအာမခံခြင်းမဟုတ်သော်လည်း website ကြီး၊ အသစ်၊ link နည်းသော website များတွင် အရေးကြီးသော URL များကို တွေ့ရှိရာတွင်ကူညီနိုင်သည်။ [1] [3]

### SEO ၏ စီးပွားရေးရလဒ်

SEO target ကို “keyword rank” တစ်ခုတည်းအဖြစ် မထားသင့်ပါ။ Business target နှင့်ချိတ်ပါ။

| Website အမျိုးအစား | Primary outcome | Supporting metric |
|---|---|---|
| Local business | Call, map direction, booking | Branded search, local landing-page clicks |
| E-commerce | Qualified product traffic, purchase | Product impressions, cart conversion |
| SaaS | Demo request, trial signup | Solution-page organic sessions |
| Blog / media | Qualified readership | Returning user, newsletter signup |
| School / course site | Course inquiry, enrollment | Course-page clicks, application completion |
| Portfolio | Contact request | Case-study visits, inquiry conversion |

## 2. SEO မလုပ်မီ Foundation Checklist

SEO optimization မစမီ အောက်ပါ foundation များကို အရင်စစ်ပါ။

| စစ်ဆေးရမည့်အရာ | လုပ်ရမည့်အလုပ် | မလုပ်လျှင်ဖြစ်နိုင်သောပြဿနာ |
|---|---|---|
| One canonical domain | `https://www.example.com` သို့မဟုတ် `https://example.com` တစ်ခုကို primary ရွေးပါ | Duplicate URL signals |
| HTTPS | HTTP ကို HTTPS သို့ permanent redirect လုပ်ပါ | Security/trust နှင့် duplicate pages |
| Crawl policy | Public pages ကို crawl ခွင့်ပြု၊ private pages ကို block/noindex လုပ်ပါ | Admin/login/student data မတော်တဆ index ဖြစ်နိုင် |
| Stable URLs | Human-readable, durable slugs သုံးပါ | URL ပြောင်းတိုင်း search equity ပျောက်နိုင် |
| Internal navigation | Important page တိုင်းကို menu/link တစ်ခုခုမှ ရောက်နိုင်စေပါ | Crawler နှင့် user နှစ်ဦးလုံးရှာမတွေ့နိုင် |
| XML sitemap | Public canonical URLs များသာ ထည့်ပါ | Large/new site URL discovery အားနည်းနိုင် |
| Search Console | Domain/property verify လုပ်ပါ | Indexing issue မမြင်နိုင် |

### Public နှင့် private page ခွဲခြားရေး

**SEO အတွက် public marketing/content pages ကို optimize လုပ်ပါ။** Admin dashboard, login, account, checkout, student grades, attendance, private profile, internal search result များကို index မလုပ်သင့်ပါ။

```txt
# robots.txt ဥပမာ
User-agent: *
Disallow: /admin/
Disallow: /dashboard/
Disallow: /account/
Disallow: /login/
Disallow: /register/
Sitemap: https://example.com/sitemap.xml
```

`robots.txt` သည် crawl control အတွက်ဖြစ်ပြီး sensitive data protection အတွက် မလုံလောက်ပါ။ Sensitive data ကို authentication, authorization, server-side rules ဖြင့်အမှန်တကယ်ကာကွယ်ရမည်။ Search result မှ ဖယ်လိုသော public URL တစ်ခုအတွက် `noindex` သို့မဟုတ် removal workflow လိုနိုင်သည်။ [1]

## 3. Keyword Research — လူရှာသောအရာကို နားလည်ခြင်း

Keyword research ၏ရည်ရွယ်ချက်သည် keyword များကို page ထဲအတင်းထည့်ရန်မဟုတ်ပါ။ **User intent** ကို သိရန်ဖြစ်သည်။

| Intent | User ရှာနိုင်သည့်ပုံစံ | သင့် page အမျိုးအစား |
|---|---|---|
| Informational | “how to learn React”, “SEO ဆိုတာဘာလဲ” | Guide, blog, tutorial |
| Commercial research | “best school management system”, “online course platform comparison” | Comparison, solution page |
| Transactional | “buy coding course”, “book web design service” | Product/service/checkout page |
| Navigational | “Teza Tech Lab login” | Brand, login, help page |
| Local | “English school near me”, “Yangon web agency” | Location landing page, Google Business Profile |

### Keyword research workflow

1. Customer, student, client သို့မဟုတ် sales team ကို မေးပါ။ သူတို့သုံးသော စကားလုံးများက tool ထက်တန်ဖိုးရှိတတ်သည်။
2. Product/service တစ်ခုစီအတွက် seed topic စာရင်းရေးပါ။ ဥပမာ `web development course`, `coding class Myanmar`, `school management system`။
3. Search suggestions, Search Console query report, competitor page headings, customer support questions မှ phrase များစုပါ။
4. Query တစ်ခုစီကို intent အလိုက်အုပ်စုခွဲပါ။ Intent မတူသော keyword များကို page တစ်ခုတည်းတွင်မရောပါနှင့်။
5. Topic cluster တစ်ခုစီအတွက် **one primary page** ရွေးပြီး support article များမှ internal link ပေးပါ။

### Keyword map template

| URL | Primary intent | Primary topic | Supporting questions | CTA |
|---|---|---|---|---|
| `/courses/web-development` | Commercial | Web development course | duration, fee, curriculum, prerequisite | Apply now |
| `/guides/learn-javascript` | Informational | Learn JavaScript | beginner roadmap, projects, resources | View course |
| `/contact` | Transactional | Contact Teza Tech Lab | address, phone, response time | Send inquiry |

**မလုပ်သင့်သောအရာများ** — keyword stuffing, city name အများကြီးကပ်ခြင်း, competitor brand များကို မသက်ဆိုင်ဘဲထည့်ခြင်း, AI-generated thin pages အများကြီးထုတ်ခြင်း။ Google ၏လမ်းညွှန်အရ content သည် natural, useful, unique, updated နှင့် people-first ဖြစ်ရမည်။ Meta keywords tag ကို Google Search က ranking signal အဖြစ်မသုံးပါ။ [1]

## 4. On-page SEO — Page တစ်ခုချင်းစီကိုကောင်းအောင်လုပ်ခြင်း

### 4.1 Title, meta description, headings

| Element | ရည်ရွယ်ချက် | လက်တွေ့စည်းမျဉ်း |
|---|---|---|
| `<title>` | Browser tab နှင့် search title link အတွက်အရေးကြီးသော signal | Page တစ်ခုစီ unique, clear, accurate ဖြစ်ပါစေ |
| Meta description | Snippet candidate, click decision အတွက်အထောက်အကူ | Page-specific summary, benefit နှင့် context ထည့်ပါ |
| H1 | Main page topic | Page တစ်ခုတွင် user-visible clear H1 တစ်ခုထားပါ |
| H2/H3 | Content scanability | Question/topic အလိုက် meaningful section ခွဲပါ |
| URL slug | User နှင့် crawler context | Lowercase, stable, meaningful words သုံးပါ |

Search engine သည် title text, heading နှင့် page content ကိုပေါင်းစပ်၍ search title link ကို ဖန်တီးနိုင်သည်။ ထို့ကြောင့် title သည် vague မဖြစ်ဘဲ page content ကိုအမှန်တကယ်ဖော်ပြရမည်။ [1]

```html
<!-- Good product/service page metadata example -->
<title>Web Development Course in Yangon | Teza Tech Lab</title>
<meta name="description"
  content="Learn practical web development with projects, instructor feedback, and flexible schedules at Teza Tech Lab." />
<link rel="canonical" href="https://example.com/courses/web-development" />

<h1>Web Development Course</h1>
<h2>What you will learn</h2>
<h2>Course schedule and fees</h2>
<h2>Who this course is for</h2>
```

### 4.2 Title template library

| Page type | Template |
|---|---|
| Homepage | `{Brand} | {Primary value proposition}` |
| Service | `{Service} in {Location} | {Brand}` |
| Product | `{Product name} – {Key benefit} | {Brand}` |
| Course | `{Course name} | {Duration/Outcome} | {Brand}` |
| Blog | `{Question or promise}: {Specific answer}` |
| Comparison | `{Option A} vs {Option B}: {Decision criterion}` |
| Location page | `{Service} in {City} | {Brand}` |

Title ကို clickbait အဖြစ်မရေးပါနှင့်။ Page content မပေးနိုင်သော “#1”, “best”, “guaranteed” စသည့် claim များကို evidence မရှိဘဲမထည့်ပါနှင့်။

### 4.3 Images, video, and accessibility

Image တွင် relevant, concise `alt` text ထည့်ပါ။ Decorative image အတွက် empty alt (`alt=""`) သုံးနိုင်သော်လည်း information-carrying image အတွက် file name မဟုတ်ဘဲ အဓိပ္ပာယ်ဖော်ပြသောစာရေးပါ။ Relevant text အနီးတွင် clear image ထားခြင်းနှင့် descriptive alt text တို့သည် user နှင့် search engine နှစ်ခုလုံးကို context ပေးနိုင်သည်။ [1]

```html
<!-- မကောင်း -->
<img src="course1.jpg" alt="image123" />

<!-- ကောင်း -->
<img src="web-development-class.jpg"
     alt="Students building a responsive website during a Teza Tech Lab web development class" />
```

## 5. Technical SEO

### 5.1 Crawlability, indexability, canonicalization

| ပြဿနာ | လက္ခဏာ | ဖြေရှင်းနည်း |
|---|---|---|
| URL မတွေ့ | Search Console မှ discovered/crawled နည်း | Internal link, sitemap, external promotion စစ်ပါ |
| `noindex` မှားထည့် | Page search ထဲမလာ | Meta robots/header စစ်ပါ |
| Duplicate URL | `?utm=`, trailing slash, http/www version မျိုးစုံ | Canonical URL, redirect policy သတ်မှတ်ပါ |
| Soft 404 | Empty page ကို 200 return | Real content ပြန်ပေး သို့မဟုတ် 404/410 return |
| Broken link | 404 internal link | Link audit နှင့် redirect/update လုပ်ပါ |

Sitemap သည် page discovery ကိုကူညီနိုင်သော်လည်း index guarantee မဟုတ်ပါ။ Proper internal linking သည် URL discovery အတွက် အခြေခံဖြစ်သည်။ [3]

### 5.2 Sitemap example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-08-24</lastmod>
  </url>
  <url>
    <loc>https://example.com/courses/web-development</loc>
    <lastmod>2026-08-20</lastmod>
  </url>
</urlset>
```

Sitemap တွင် only canonical, indexable, public URLs များသာထည့်ပါ။ Login, checkout, filter combinations, preview, private dashboard, duplicate variants မထည့်ပါနှင့်။

### 5.3 JavaScript, Next.js နှင့် SPA SEO

JavaScript website များသည် SEO မလုပ်နိုင်ဟုမဆိုလိုပါ။ သို့သော် important public content ကို crawler နှင့် user တို့ကြည့်လျှင်တူညီစွာ render ဖြစ်ရမည်။ CSS/JavaScript resources ကို block လုပ်ထားလျှင် crawler က page ကိုနားလည်ရန်ခက်နိုင်သည်။ [1]

| Architecture | Public SEO အတွက် အကြံပြုချက် |
|---|---|
| Static HTML | Metadata, sitemap, canonical ကို build time တွင်ထုတ်ပါ |
| Next.js App Router | Public page များကို SSG/SSR, `metadata` API, dynamic sitemap သုံးပါ |
| React SPA | Route-level title/description ကို runtime တွင်ပြောင်းနိုင်သော်လည်း public marketing pages အတွက် pre-render/SSR ကိုဦးစားပေးပါ |
| E-commerce | Product pages server-render/ISR, unique product metadata, canonical, availability data ထည့်ပါ |
| Authenticated portal | Login ပြီးမှသာမြင်ရသော data ကို `noindex`; public marketing pages သီးသန့်တည်ဆောက်ပါ |

Teza Tech Lab အတွက် Student နှင့် Admin portals သည် private authenticated applications ဖြစ်သောကြောင့် course/grade/attendance/student profile များကို index မလုပ်သင့်ပါ။ Public SEO အတွက် future marketing site, public course catalog, guide/article pages ကို သီးသန့် optimize လုပ်ခြင်းက ပိုကောင်းသည်။

## 6. Structured Data (Schema / JSON-LD)

Structured data သည် page အဓိပ္ပာယ်ကို explicit clue ပေးသော standardized markup ဖြစ်သည်။ Valid markup သည် rich result ကို guarantee မပေးသော်လည်း eligible result appearance အတွက်အခြေခံဖြစ်နိုင်သည်။ JSON-LD သည် maintain လွယ်သော recommended format ဖြစ်သည်။ [2]

> Structured data တွင် page ပေါ်တွင် user မြင်နိုင်သော အမှန်တကယ် information ကိုသာရေးပါ။ Empty page တစ်ခုဖန်တီးခြင်း၊ မမြင်ရသောအချက်အလက်၊ မမှန်သော rating/review/event data မထည့်ပါနှင့်။ [2]

### အခြေအနေလိုက် schema selection

| Website/page | စဉ်းစားနိုင်သော schema |
|---|---|
| Company homepage | `Organization`, `WebSite` |
| Local business | `LocalBusiness`, `PostalAddress`, `OpeningHoursSpecification` |
| Product page | `Product`, `Offer` (real price/availability only) |
| Article/blog | `Article` / `BlogPosting` |
| FAQ page | Supported FAQ policy ကိုစစ်ပြီး genuine FAQ only |
| Event page | `Event` (actual public event only) |
| Course page | `Course` information (supported properties/policy စစ်ပါ) |
| Breadcrumb path | `BreadcrumbList` |

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Example Company",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://www.facebook.com/example",
    "https://www.linkedin.com/company/example"
  ]
}
</script>
```

Deployment မတင်မီ [Rich Results Test](https://search.google.com/test/rich-results) ဖြင့်စစ်ပြီး deployment ပြီးလျှင် Search Console rich-result status report တွင် monitor လုပ်ပါ။ [2]

## 7. Content SEO နှင့် Topic Authority

Content calendar ကို `blog 20 ပုဒ်ရေးမယ်` ဟုမသတ်မှတ်ပါနှင့်။ Customer journey နှင့် topic cluster ဖြင့်သတ်မှတ်ပါ။

| Funnel | User need | Content အမျိုးအစား | CTA |
|---|---|---|---|
| Awareness | Problem ကိုနားလည်လို | How-to, glossary, beginner guide | Read related guide |
| Consideration | Option များနှိုင်းယှဉ်လို | Comparison, checklist, use case | View solution/course |
| Decision | ယုံကြည်မှုလို | Pricing, syllabus, demo, case study, FAQ | Book call / enroll |
| Retention | အကောင်းဆုံးအသုံးချလို | Tutorial, release note, help center | Upgrade / refer |

### High-quality content brief

Article/page တစ်ခုမရေးမီ brief ထဲတွင် အောက်ပါအချက်များထည့်ပါ။

1. Primary user နှင့် သူ၏ intent ။
2. Page က ဖြေရှင်းပေးမည့် exact question ။
3. First-hand evidence, expert experience, screenshots, examples, original data လိုအပ်ချက်။
4. Related internal pages သို့ link များ။
5. Next action/CTA ။
6. Update owner နှင့် review date ။

Google လမ်းညွှန်သည် easy-to-read, well-organized, unique, up-to-date နှင့် helpful/reliable people-first content ကိုအလေးထားသည်။ [1]

## 8. Performance, Mobile UX နှင့် Core Web Vitals

Core Web Vitals သည် loading performance, interactivity နှင့် visual stability အတွက် real-world user experience metrics အစုဖြစ်သည်။ Search Console တွင် mobile နှင့် desktop report ဖြင့်စစ်နိုင်သည်။ [4] [5]

| Metric | ရည်ရွယ်ချက် | အများဆုံးဖြစ်တတ်သောပြဿနာ | ကောင်းအောင်လုပ်နည်း |
|---|---|---|---|
| LCP | Main content မြင်ရသည့်အချိန် | Large hero image, render-blocking CSS/JS | Image optimization, preload critical asset, SSR/SSG |
| INP | Interaction response | Heavy JS, long tasks | Code split, reduce client JS, defer non-critical work |
| CLS | Layout မလှုပ်ရမ်းမှု | Image/video size မသတ်မှတ်, late banner/font | Width/height/aspect ratio, reserve space, font strategy |

### Performance checklist

- Mobile viewport, readable font size, tap target, contrast စစ်ပါ။
- Hero image ကို modern format, correct dimensions, lazy-load below-the-fold image ဖြင့် optimize လုပ်ပါ။
- Large JavaScript bundle ကို route/component splitting လုပ်ပါ။
- Third-party script များကို audit လုပ်ပါ။ Analytics/chat/widget တစ်ခုစီ၏ cost ကိုစစ်ပါ။
- Fonts ကို preconnect/preload နှင့် fallback strategy ဖြင့် load လုပ်ပါ။
- PageSpeed Insights/Lighthouse ကို lab test အဖြစ်၊ Search Console Core Web Vitals ကို field-data view အဖြစ် တွဲသုံးပါ။

## 9. International SEO နှင့် Burmese Content

Website တစ်ခုတွင် Burmese နှင့် English content ရှိလျှင် translation ကို UI toggle တစ်ခုတည်းအဖြစ်မထားဘဲ search-friendly URL strategy ရှိသင့်သည်။

| Scenario | အကြံပြု URL strategy |
|---|---|
| Same business, two languages | `/en/courses/web-development`, `/my/courses/web-development` |
| Country-specific offer | `example.com/mm/`, `example.com/sg/` သို့မဟုတ် country domain policy |
| One language only | Clear human-readable language, no artificial translation |

```html
<link rel="alternate" hreflang="en" href="https://example.com/en/courses/web-development" />
<link rel="alternate" hreflang="my" href="https://example.com/my/courses/web-development" />
<link rel="alternate" hreflang="x-default" href="https://example.com/courses/web-development" />
```

Translation သည် literal word-for-word မဖြစ်သင့်ပါ။ Country, currency, schedule, terminology, support information တို့ကို local audience အတွက်မှန်ကန်အောင်ပြောင်းပါ။ Burmese search query များတွင် Myanmar Unicode spelling variation များကို research လုပ်ပြီး natural copy ထဲတွင်သင့်တော်သလိုအသုံးပြုပါ။

## 10. Off-page SEO နှင့် Digital Trust

Quality backlinks ဆိုသည်မှာ link အရေအတွက်မဟုတ်ပါ။ Relevant audience ရှိပြီး trustworthy website တစ်ခုက သင့် useful content ကို natural reference ပေးခြင်းဖြစ်သည်။

| လုပ်သင့်သည် | မလုပ်သင့်သည် |
|---|---|
| Original guide, research, tool, case study ထုတ်ပါ | Paid low-quality link packages ဝယ်ပါ |
| Partners, communities, clients နှင့် real collaboration လုပ်ပါ | Private blog network / spam directory များသုံးပါ |
| Local business listing ကို accurate ထားပါ | Fake reviews/rating ဖန်တီးပါ |
| Expert author bio, source, contact information ထားပါ | Thin AI content ကို mass publish လုပ်ပါ |

Brand trust အတွက် About, Contact, privacy policy, terms, refund/return policy (လိုအပ်လျှင်), author/company credentials, customer support path များကိုရှင်းလင်းစွာထည့်ပါ။

## 11. Measurement System — “Ranking” ကိုသာမကြည့်ပါနှင့်

Search Console သည် search traffic, performance, queries, impressions, clicks, index coverage နှင့် URL inspection များကိုစစ်နိုင်စေသည်။ [5]

### Weekly dashboard

| Metric | ဘာကိုသိရမလဲ | Action |
|---|---|---|
| Impressions | Search visibility တိုး/လျော့ | Topic/page opportunity ရှာပါ |
| Clicks | Organic traffic | Title/snippet/intent match စစ်ပါ |
| CTR | Result ကိုလူရွေးသလား | Title/description ကို user benefit မျက်နှာမူအောင်ပြင်ပါ |
| Average position | Query/page competitiveness | Content quality, internal link, intent fit စစ်ပါ |
| Indexed pages | Important public URLs index ဖြစ်သလား | Sitemap, canonical, noindex, crawl issue စစ်ပါ |
| CWV status | Real-user speed/UX | LCP/INP/CLS root cause ကိုဖြေရှင်းပါ |

### Monthly review questions

1. ဘယ် page များ impressions များပြီး CTR နည်းသလဲ။
2. ဘယ် query များ position 5–20 အတွင်းရှိပြီး content update ဖြင့်တိုးနိုင်သလဲ။
3. ဘယ် pages တွင် conversion ကောင်းသလဲ။ ထို pattern ကိုဘယ် page များတွင်ပြန်သုံးနိုင်သလဲ။
4. ဘယ် pages outdated, duplicate, thin, cannibalized ဖြစ်သလဲ။
5. Site migration, deployment, redirect, CMS change နောက်တွင် indexing/CWV ပြဿနာရှိသလား။

## 12. Website Type အလိုက် Quick Playbook

| Website type | Highest-priority SEO work |
|---|---|
| Local business | Google Business Profile, location pages, NAP consistency, real reviews, service-area content |
| E-commerce | Unique product descriptions, category pages, Product schema, out-of-stock policy, faceted navigation control |
| SaaS | Use-case/solution pages, integration pages, comparison content, documentation, case studies |
| Blog/media | Topic clusters, author credibility, updates, internal linking, image/video optimization |
| Portfolio | Case studies, service pages, clear location/industry signals, contact CTA |
| Education/course | Course catalog, syllabus, instructor credibility, outcomes, FAQ, public learning resources |
| Marketplace | Canonical/filter strategy, programmatic pages with genuine unique value, structured data accuracy |

## 13. Teza Tech Lab အတွက် လက်တွေ့အသုံးချမှု

Teza Tech Lab ၏ private Student/Admin applications သည် SEO acquisition page မဟုတ်ပါ။ Login, grades, attendance, notifications, student records တို့ကို index မလုပ်ဘဲ Firebase authorization နှင့် Firestore rules ဖြင့် private ထားရမည်။ SEO ကို public-facing marketing layer တွင် focus လုပ်ရန် အကြံပြုသည်။

### Recommended public page map

| URL | ရည်ရွယ်ချက် | SEO focus |
|---|---|---|
| `/` | Brand/value proposition | Clear title, H1/H2, organization schema |
| `/courses` | Course catalog | Individual course internal links |
| `/courses/{slug}` | Course decision page | Syllabus, instructor, outcome, FAQ, CTA |
| `/about` | Trust | Team, mission, contact, location |
| `/guides/{slug}` | Informational acquisition | Topic clusters, internal links |
| `/contact` | Conversion | Accurate contact, map/location if applicable |
| `/student`, `/admin` | Private product entry | `noindex`, auth security, no private content exposure |

Root page အတွက် လတ်တလော develop branch ပြင်ဆင်ချက်သည် keyword meta tag 5 ခု၊ visible descriptive H2 နှင့် runtime document title ကို strict character limits အတွင်းထည့်သွင်းထားသည်။ သို့သော် universal SEO strategy တွင် meta keywords ကို ranking shortcut မဟုတ်ဘဲ page hygiene item အဖြစ်သာသတ်မှတ်ရမည်။ Google Search က meta keywords tag ကိုမသုံးပါ။ [1]

## 14. Launch / Release Checklist

### Content and metadata

- [ ] Page တစ်ခုစီ၏ title, H1, primary intent တစ်ခုတည်းကိုက်ညီသည်။
- [ ] Meta description သည် unique, honest, page-specific ဖြစ်သည်။
- [ ] Heading များက section များကို scan လွယ်စေသည်။
- [ ] Image alt text သည် meaningful ဖြစ်သည်။
- [ ] Duplicate/thin page များကို merge, redirect, noindex, သို့မဟုတ် improve လုပ်ပြီးဖြစ်သည်။

### Technical and crawl

- [ ] HTTPS, canonical domain, redirects မှန်ကန်သည်။
- [ ] Important public URL များကို internal links မှရောက်နိုင်သည်။
- [ ] Sitemap တွင် canonical public URL များသာပါသည်။
- [ ] `robots.txt`, `noindex`, canonical tags မမှားပါ။
- [ ] Login/admin/account/private data ကို index မလုပ်နိုင်ပါ။
- [ ] 404 page နှင့် old URL redirect map ရှိသည်။

### Performance and accessibility

- [ ] Mobile on real device ဖြင့် navigation, form, tap target စစ်ပြီးဖြစ်သည်။
- [ ] LCP image size/reservation, font loading, layout shift စစ်ပြီးဖြစ်သည်။
- [ ] Keyboard navigation, focus state, contrast, labels, alt text စစ်ပြီးဖြစ်သည်။
- [ ] Third-party scripts အနည်းဆုံးထားပြီးဖြစ်သည်။

### Measurement

- [ ] Search Console property verify လုပ်ပြီးဖြစ်သည်။
- [ ] Sitemap submit လုပ်ပြီးဖြစ်သည်။
- [ ] Important URL များကို URL Inspection ဖြင့်စစ်ပြီးဖြစ်သည်။
- [ ] Analytics conversion events (lead, signup, purchase, enrollment) သတ်မှတ်ပြီးဖြစ်သည်။
- [ ] Monthly SEO owner နှင့် review cadence သတ်မှတ်ပြီးဖြစ်သည်။

## 15. 90-Day SEO Plan

| အချိန် | အဓိကအလုပ် | Expected output |
|---|---|---|
| Day 1–14 | Technical audit, Search Console, sitemap, public/private split | Baseline dashboard, issue list |
| Day 15–30 | Keyword map, page metadata, internal links, top landing pages | High-intent page improvements |
| Day 31–60 | Topic clusters, helpful guides, schema, image optimization | New useful content and rich-result readiness |
| Day 61–90 | CTR testing, refresh underperformers, CWV fixes, outreach | Measurable iteration cycle |

SEO ကို one-time task မဟုတ်ဘဲ product/content operations အဖြစ်သဘောထားပါ။ Search result အပြောင်းအလဲများသည် နာရီအနည်းငယ်မှ လအနည်းငယ်အထိကြာနိုင်သောကြောင့် change တစ်ခုပြီးတိုင်း data ရရန်အချိန်ပေးပြီး baseline နှင့်နှိုင်းယှဉ်ပါ။ [1]

## References

[1]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide "Google Search Central — SEO Starter Guide"  
[2]: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data "Google Search Central — Introduction to Structured Data"  
[3]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview "Google Search Central — Learn About Sitemaps"  
[4]: https://developers.google.com/search/docs/appearance/core-web-vitals "Google Search Central — Understanding Core Web Vitals"  
[5]: https://search.google.com/search-console/about "Google Search Console — About"
