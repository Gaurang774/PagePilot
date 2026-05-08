import type { PageData, PageLink, PageHeading } from "../types";

function extractPageData(): PageData {
  const url = window.location.href;
  const title = document.title || "";

  // Meta tags
  const getMeta = (name: string) =>
    document.querySelector<HTMLMetaElement>(
      `meta[name="${name}"], meta[property="${name}"]`
    )?.content || undefined;

  const meta = {
    description: getMeta("description") || getMeta("og:description"),
    keywords: getMeta("keywords"),
    ogTitle: getMeta("og:title"),
    ogDescription: getMeta("og:description"),
    author: getMeta("author"),
    publishDate:
      getMeta("article:published_time") ||
      getMeta("date") ||
      document.querySelector<HTMLTimeElement>("time[datetime]")?.dateTime,
  };

  // Headings H1–H6
  const headings: PageHeading[] = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6")
  )
    .slice(0, 60)
    .map((el) => ({
      level: parseInt(el.tagName[1]),
      text: (el.textContent || "").trim(),
    }))
    .filter((h) => h.text.length > 0);

  // Body text — strip scripts and styles
  const cloned = document.body.cloneNode(true) as HTMLElement;
  cloned
    .querySelectorAll("script, style, noscript, svg, canvas")
    .forEach((el) => el.remove());
  const bodyText = (cloned.innerText || cloned.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25000); // cap at 25k chars to avoid oversized API payloads

  // Word count and reading time (avg 200 wpm)
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  // Links
  const hostname = window.location.hostname;
  const links: PageLink[] = Array.from(document.querySelectorAll("a[href]"))
    .slice(0, 200)
    .map((el) => {
      const a = el as HTMLAnchorElement;
      const href = a.href;
      const text = (a.textContent || "").trim().slice(0, 120);
      const isExternal = !href.includes(hostname) && href.startsWith("http");
      return { href, text, isExternal };
    })
    .filter((l) => l.href && l.href !== "#");

  const internalLinkCount = links.filter((l) => !l.isExternal).length;
  const externalLinkCount = links.filter((l) => l.isExternal).length;

  // Image alt texts
  const imageAlts = Array.from(document.querySelectorAll("img[alt]"))
    .slice(0, 50)
    .map((img) => (img as HTMLImageElement).alt)
    .filter(Boolean);

  // JSON-LD structured data
  const structuredData: unknown[] = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      structuredData.push(JSON.parse(el.textContent || ""));
    } catch {
      // skip malformed JSON-LD
    }
  });

  // Favicon
  const faviconEl = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"]'
  );
  const favicon = faviconEl?.href || `${window.location.origin}/favicon.ico`;

  return {
    url,
    title,
    meta,
    headings,
    bodyText,
    links: links.slice(0, 100),
    imageAlts,
    structuredData,
    wordCount,
    readingTime,
    internalLinkCount,
    externalLinkCount,
    scannedAt: new Date().toISOString(),
    favicon,
  };
}

// Listen for messages from the popup / background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "SCAN_PAGE") {
    try {
      const pageData = extractPageData();
      sendResponse({ success: true, pageData });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return false;
  }
});
