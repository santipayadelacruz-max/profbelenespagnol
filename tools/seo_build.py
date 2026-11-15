#!/usr/bin/env python3
"""
Générateur SEO de profbelenespagnol.fr

Pour chaque page déclarée dans seo/pages.json, il écrit entre les balises
<!-- SEO:START --> et <!-- SEO:END --> du <head> :
  title, meta description, robots, canonical, hreflang, Open Graph, Twitter Card,
  et un graphe JSON-LD complet (WebSite, Organization, Person, WebPage, BreadcrumbList,
  Course + Offers, FAQPage, VideoObject, ImageObject, BlogPosting, Event, Service…).
Il régénère aussi sitemap.xml (avec images, vidéos et hreflang) et llms.txt.

Utilisation :  python tools/seo_build.py
Types de page : home, service, article, about, contact, faq, collection, event
"""
import json, re, html, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / "seo/site.json").read_text(encoding="utf-8"))
PAGES = json.loads((ROOT / "seo/pages.json").read_text(encoding="utf-8"))
BASE = SITE["url"].rstrip("/")
ID = lambda frag: f"{BASE}/#{frag}"
absu = lambda u: u if (u or "").startswith("http") else BASE + (u if u.startswith("/") else "/" + u)
esc = lambda t: html.escape(t or "", quote=True)

WEBPAGE_TYPES = {"home": "WebPage", "service": "WebPage", "article": "WebPage", "about": "AboutPage",
                 "contact": "ContactPage", "faq": "FAQPage", "collection": "CollectionPage", "event": "WebPage"}


def faqs_from_html(page_html, selector_hint):
    """Lit les <details><summary>Q</summary><p>R</p></details> de la page pour le FAQPage."""
    out = []
    for q, a in re.findall(r"<details>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>\s*</details>", page_html, re.S):
        clean = lambda t: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t))).strip()
        out.append((clean(q), clean(a)))
    return out


def entity_nodes():
    p, s = SITE["person"], SITE
    person = {
        "@type": "Person", "@id": ID("belen"), "name": p["name"], "alternateName": p["alternateNames"],
        "jobTitle": p["jobTitle"], "description": p["description"], "image": absu(p["image"]), "url": BASE + "/",
        "nationality": {"@type": "Country", "name": p["nationality"]},
        "affiliation": [{"@type": "CollegeOrUniversity", "name": a} for a in p["affiliation"]],
        "knowsLanguage": [{"@type": "Language", "name": n, "alternateName": c} for n, c in p["languages"]],
        "knowsAbout": p["knowsAbout"], "worksFor": {"@id": ID("organisation")}, "sameAs": s["sameAs"],
    }
    org = {
        "@type": ["EducationalOrganization", "ProfessionalService"], "@id": ID("organisation"),
        "name": s["name"], "alternateName": s["alternateNames"], "url": BASE + "/",
        "logo": {"@type": "ImageObject", "@id": ID("logo"), "url": absu(s["logo"]["url"]),
                 "width": s["logo"]["width"], "height": s["logo"]["height"], "caption": s["name"]},
        "image": absu(s["defaultImage"]["url"]), "description": s["description"], "slogan": s["slogan"],
        "founder": {"@id": ID("belen")}, "employee": {"@id": ID("belen")},
        "areaServed": [{"@type": "Country", "name": c} for c in s["areaServed"]],
        "availableLanguage": ["fr", "es"], "knowsLanguage": ["fr", "es"], "priceRange": "€€",
        "contactPoint": {"@type": "ContactPoint", "contactType": "customer support", "url": absu(s["contactUrl"]),
                         "availableLanguage": ["French", "Spanish"], "areaServed": ["FR", "BE", "CH", "LU", "CA"]},
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Cours d'espagnol en ligne", "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": o["name"], "description": o["description"],
                                                "provider": {"@id": ID("organisation")}},
             **({"price": o["price"], "priceCurrency": "EUR"} if "price" in o else {})} for o in s["offers"]]},
        "sameAs": s["sameAs"],
    }
    website = {"@type": "WebSite", "@id": ID("website"), "url": BASE + "/", "name": s["name"],
               "alternateName": s["alternateNames"], "inLanguage": s["language"], "publisher": {"@id": ID("organisation")}}
    return [website, org, person]


def page_nodes(pg, page_html):
    url = BASE + pg["path"]
    img = pg.get("image") or SITE["defaultImage"]
    img = img if isinstance(img, dict) else {"url": img, "width": 1200, "height": 630}
    nodes, wp_id = [], url + "#webpage"
    wp = {"@type": WEBPAGE_TYPES.get(pg["type"], "WebPage"), "@id": wp_id, "url": url, "name": pg["title"],
          "description": pg["description"], "inLanguage": SITE["language"], "isPartOf": {"@id": ID("website")},
          "about": {"@id": ID("organisation")}, "author": {"@id": ID("belen")}, "publisher": {"@id": ID("organisation")},
          "primaryImageOfPage": {"@type": "ImageObject", "url": absu(img["url"]), "width": img.get("width"), "height": img.get("height")},
          "datePublished": pg["published"], "dateModified": pg["modified"],
          "keywords": ", ".join(pg.get("keywords", []))}
    if pg.get("speakable"):
        wp["speakable"] = {"@type": "SpeakableSpecification", "cssSelector": pg["speakable"]}
    if pg["type"] == "home":
        wp["mainEntity"] = {"@id": ID("belen")}
    crumbs = [{"name": "Accueil", "path": "/"}] + pg.get("breadcrumbs", [])
    if len(crumbs) > 1:
        bc_id = url + "#breadcrumb"
        nodes.append({"@type": "BreadcrumbList", "@id": bc_id, "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": c["name"], "item": BASE + c["path"]} for i, c in enumerate(crumbs)]})
        wp["breadcrumb"] = {"@id": bc_id}
    nodes.insert(0, wp)

    if pg.get("course") or pg["type"] == "service":
        course = {"@type": "Course", "@id": url + "#cours", "name": pg.get("courseName", "Cours d'espagnol en ligne pour adultes francophones"),
                  "description": pg.get("courseDescription", "Accompagnement personnalisé en visio pour parler espagnol avec confiance : conversation guidée, correction en direct, vocabulaire de la vie réelle, audios et devoirs entre les séances."),
                  "inLanguage": "es", "availableLanguage": ["fr", "es"], "educationalLevel": "Débutant à avancé (A1 à C1)",
                  "teaches": ["Expression orale en espagnol", "Compréhension orale", "Vocabulaire du quotidien", "Espagnol pour voyager", "Espagnol en famille"],
                  "audience": {"@type": "EducationalAudience", "audienceType": "Adultes francophones"},
                  "provider": {"@id": ID("organisation")}, "image": absu(img["url"]),
                  "offers": [{"@type": "Offer", "category": "Paid", "availability": "https://schema.org/InStock", "url": absu(SITE["contactUrl"])}],
                  "hasCourseInstance": [{"@type": "CourseInstance", "name": f'{o["name"]} ({o["level"]})', "courseMode": "Online",
                                         "courseWorkload": "PT1H", "inLanguage": "es", "instructor": {"@id": ID("belen")},
                                         "location": {"@type": "VirtualLocation", "url": absu(SITE["contactUrl"])}}
                                        for o in SITE["offers"] if "level" in o]}
        nodes.append(course)

    faqs = faqs_from_html(page_html, pg.get("faqSelector")) if pg.get("faqSelector") or pg["type"] == "faq" else []
    if faqs:
        nodes.append({"@type": "FAQPage", "@id": url + "#faq", "isPartOf": {"@id": wp_id},
                      "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]})

    for v in pg.get("videos", []):
        nodes.append({"@type": "VideoObject", "name": v["name"], "description": v["description"], "thumbnailUrl": absu(v["thumbnail"]),
                      "contentUrl": absu(v["content"]), "uploadDate": v["uploadDate"], "duration": v.get("duration"),
                      "inLanguage": "fr", "publisher": {"@id": ID("organisation")}, "isPartOf": {"@id": wp_id}})
    for im in pg.get("images", []):
        nodes.append({"@type": "ImageObject", "contentUrl": absu(im["url"]), "caption": im["caption"],
                      "creditText": SITE["name"], "creator": {"@id": ID("belen")},
                      "copyrightNotice": f"© {datetime.date.today().year} {SITE['name']}", "license": BASE + "/",
                      "acquireLicensePage": absu(SITE["contactUrl"])})
    if pg["type"] == "article":
        nodes.append({"@type": "BlogPosting", "@id": url + "#article", "headline": pg["title"][:110], "description": pg["description"],
                      "image": [absu(img["url"])], "datePublished": pg["published"], "dateModified": pg["modified"],
                      "author": {"@id": ID("belen")}, "publisher": {"@id": ID("organisation")}, "mainEntityOfPage": {"@id": wp_id},
                      "inLanguage": SITE["language"], "keywords": pg.get("keywords", [])})
    if pg["type"] == "event" and pg.get("event"):
        e = pg["event"]
        nodes.append({"@type": "Event", "name": e["name"], "description": e["description"], "startDate": e["start"], "endDate": e.get("end", e["start"]),
                      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode", "eventStatus": "https://schema.org/EventScheduled",
                      "location": {"@type": "VirtualLocation", "url": url}, "image": [absu(img["url"])],
                      "organizer": {"@id": ID("organisation")}, "performer": {"@id": ID("belen")},
                      "offers": {"@type": "Offer", "price": e.get("price", "0"), "priceCurrency": "EUR", "availability": "https://schema.org/InStock", "url": url}})
    return nodes


def head_block(pg, page_html):
    url = BASE + pg["path"]
    img = pg.get("image") or SITE["defaultImage"]
    img = img if isinstance(img, dict) else {"url": img, "width": 1200, "height": 630, "alt": pg["title"]}
    og_type = "article" if pg["type"] == "article" else "website"
    L = [f'<title>{esc(pg["title"])}</title>',
         f'<meta name="description" content="{esc(pg["description"])}">',
         '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
         f'<meta name="author" content="{esc(SITE["person"]["name"])}">',
         '<meta name="geo.region" content="FR">',
         f'<link rel="canonical" href="{url}">']
    L += [f'<link rel="alternate" hreflang="{h}" href="{url}">' for h in SITE["hreflang"]]
    L += [f'<link rel="alternate" hreflang="x-default" href="{url}">',
          '<link rel="alternate" type="text/plain" title="Résumé pour les IA (llms.txt)" href="/llms.txt">',
          '<link rel="sitemap" type="application/xml" href="/sitemap.xml">',
          f'<meta property="og:type" content="{og_type}">',
          f'<meta property="og:locale" content="{SITE["locale"]}">',
          '<meta property="og:locale:alternate" content="fr_BE">', '<meta property="og:locale:alternate" content="fr_CH">', '<meta property="og:locale:alternate" content="fr_CA">',
          f'<meta property="og:site_name" content="{esc(SITE["name"])} · Belén Payá">',
          f'<meta property="og:url" content="{url}">',
          f'<meta property="og:title" content="{esc(pg.get("ogTitle", pg["title"]))}">',
          f'<meta property="og:description" content="{esc(pg.get("ogDescription", pg["description"]))}">',
          f'<meta property="og:image" content="{absu(img["url"])}">',
          f'<meta property="og:image:secure_url" content="{absu(img["url"])}">',
          f'<meta property="og:image:type" content="image/{"jpeg" if img["url"].endswith(".jpg") else img["url"].rsplit(".",1)[-1]}">',
          f'<meta property="og:image:width" content="{img.get("width", 1200)}">',
          f'<meta property="og:image:height" content="{img.get("height", 630)}">',
          f'<meta property="og:image:alt" content="{esc(img.get("alt", pg["title"]))}">',
          f'<meta property="og:see_also" content="{SITE["instagram"]}">']
    for v in pg.get("videos", [])[:1]:
        L += [f'<meta property="og:video" content="{absu(v["content"])}">', '<meta property="og:video:type" content="video/mp4">']
    if og_type == "article":
        L += [f'<meta property="article:published_time" content="{pg["published"]}">', f'<meta property="article:modified_time" content="{pg["modified"]}">',
              f'<meta property="article:author" content="{SITE["instagram"]}">', '<meta property="article:section" content="Apprendre l\'espagnol">']
        L += [f'<meta property="article:tag" content="{esc(k)}">' for k in pg.get("keywords", [])]
    L += ['<meta name="twitter:card" content="summary_large_image">',
          f'<meta name="twitter:title" content="{esc(pg.get("ogTitle", pg["title"]))}">',
          f'<meta name="twitter:description" content="{esc(pg.get("ogDescription", pg["description"]))}">',
          f'<meta name="twitter:image" content="{absu(img["url"])}">',
          f'<meta name="twitter:image:alt" content="{esc(img.get("alt", pg["title"]))}">',
          '<link rel="icon" href="/favicon.ico" sizes="any">',
          '<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">',
          '<link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16.png">',
          '<link rel="icon" type="image/png" sizes="96x96" href="/img/favicon-96.png">',
          '<link rel="apple-touch-icon" sizes="180x180" href="/img/icon-180.png">',
          '<link rel="manifest" href="/site.webmanifest">',
          f'<meta name="theme-color" content="{SITE["themeColor"]}">']
    if pg.get("preloadImage"):
        L.append(f'<link rel="preload" as="image" href="{pg["preloadImage"]}" fetchpriority="high">')
    graph = {"@context": "https://schema.org", "@graph": entity_nodes() + page_nodes(pg, page_html)}
    strip = lambda o: {k: strip(v) for k, v in o.items() if v not in (None, "", [])} if isinstance(o, dict) else [strip(x) for x in o] if isinstance(o, list) else o
    L.append('<script type="application/ld+json">\n' + json.dumps(strip(graph), ensure_ascii=False, indent=1) + '\n</script>')
    return "\n".join(L)


def build():
    for pg in PAGES:
        f = ROOT / pg["file"]
        page = f.read_text(encoding="utf-8")
        block = head_block(pg, page)
        new, n = re.subn(r"<!-- SEO:START -->.*?<!-- SEO:END -->", f"<!-- SEO:START -->\n{block}\n<!-- SEO:END -->", page, flags=re.S)
        if not n:
            raise SystemExit(f"{pg['file']} : balises <!-- SEO:START --> / <!-- SEO:END --> manquantes")
        f.write_text(new, encoding="utf-8")
        print("✓", pg["file"])
    # sitemap.xml
    urls = []
    for pg in PAGES:
        url = BASE + pg["path"]
        alts = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{url}"/>' for h in SITE["hreflang"] + ["x-default"])
        imgs = "".join(f'\n    <image:image><image:loc>{absu(i["url"])}</image:loc></image:image>' for i in pg.get("images", []))
        vids = "".join(f'\n    <video:video><video:thumbnail_loc>{absu(v["thumbnail"])}</video:thumbnail_loc><video:title>{esc(v["name"])}</video:title><video:description>{esc(v["description"])}</video:description><video:content_loc>{absu(v["content"])}</video:content_loc></video:video>' for v in pg.get("videos", []))
        urls.append(f'  <url>\n    <loc>{url}</loc>\n    <lastmod>{pg["modified"]}</lastmod>{alts}{imgs}{vids}\n  </url>')
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n' + "\n".join(urls) + "\n</urlset>\n", encoding="utf-8")
    print("✓ sitemap.xml")
    # llms.txt : section des pages
    llms = ROOT / "llms.txt"
    txt = llms.read_text(encoding="utf-8")
    pages_md = "## Pages\n" + "\n".join(f'- [{p["title"]}]({BASE + p["path"]}): {p.get("llms", p["description"])}' for p in PAGES) + "\n"
    txt = re.sub(r"## Pages\n.*?(?=\n## |\Z)", pages_md, txt, flags=re.S)
    llms.write_text(txt.replace("https://www.profbelenespagnol.com", BASE), encoding="utf-8")
    print("✓ llms.txt")


if __name__ == "__main__":
    build()
