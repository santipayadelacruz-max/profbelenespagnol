# SEO de profbelenespagnol.fr

Tout le SEO (title, description, Open Graph, Twitter, canonical, hreflang, schema.org, sitemap, llms.txt) est généré par `tools/seo_build.py` à partir de deux fichiers :

- `seo/site.json` : l'identité (Belén, la marque, Instagram, les offres). Il est commun à toutes les pages.
- `seo/pages.json` : une entrée par page.

## Ajouter une page

1. Créer le fichier HTML (ex. `espagnol-pour-voyager/index.html`) avec dans le `<head>` :
   `<!-- SEO:START -->` puis `<!-- SEO:END -->`
2. Ajouter son entrée dans `seo/pages.json` :

```json
{
  "file": "espagnol-pour-voyager/index.html",
  "path": "/espagnol-pour-voyager/",
  "type": "service",
  "title": "Apprendre l'espagnol pour voyager",
  "description": "…155 caractères maximum…",
  "keywords": ["apprendre l'espagnol pour voyager", "espagnol de voyage"],
  "published": "2026-11-20",
  "modified": "2026-11-20",
  "image": {"url": "/img/og-espagnol-voyage.jpg", "width": 1200, "height": 630, "alt": "…"},
  "breadcrumbs": [{"name": "Espagnol pour voyager", "path": "/espagnol-pour-voyager/"}],
  "faqSelector": "#faq details",
  "llms": "Une phrase qui résume la page pour les IA."
}
```

3. Lancer : `python tools/seo_build.py`

## Types de page et schémas générés

| type | Schémas |
|---|---|
| home | WebPage, Course, FAQPage, VideoObject, ImageObject |
| service | WebPage, BreadcrumbList, Course + Offers |
| article | WebPage, BreadcrumbList, BlogPosting (+ balises article:* Open Graph) |
| about | AboutPage, BreadcrumbList |
| contact | ContactPage, BreadcrumbList |
| faq | FAQPage (questions lues dans les `<details>` de la page) |
| event | Event en ligne (ajouter un bloc `"event": {name, description, start, end, price}`) |

WebSite, Organization (logo, offres, contact) et Person (Belén) sont ajoutés sur chaque page.
