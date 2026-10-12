import { useEffect } from 'react';
import { siteUrl } from '../utils/format';

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function Seo({
  title,
  description,
  path = '/',
  noIndex = false,
  jsonLd,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  jsonLd?: unknown | unknown[];
}) {
  const fullTitle = title.includes('Northline') ? title : `${title} · Northline`;
  const url = `${siteUrl}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Northline');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    const existing = document.getElementById('structured-data');
    existing?.remove();
    if (blocks.length > 0) {
      const script = document.createElement('script');
      script.id = 'structured-data';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(blocks.length === 1 ? blocks[0] : blocks);
      document.head.appendChild(script);
    }
  }, [fullTitle, description, url, noIndex, JSON.stringify(blocks)]);

  return null;
}
