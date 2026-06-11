const RSS_FEEDS: { url: string; source: string }[] = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://www.skysports.com/rss/12040', source: 'Sky Sports' },
];

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  publishedAt: string;
  image: string;
  source: string;
}

export interface FullNewsItem extends NewsItem {
  paragraphs: string[];
}

function extractCdata(xml: string, tag: string): string {
  const cdataRe = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>', 'i');
  const plainRe = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  return (xml.match(cdataRe)?.[1] ?? xml.match(plainRe)?.[1] ?? '').trim();
}

function cleanNewsText(text: string): string {
  return text
    .replace(/\b(?:senior|chief|lead)?\s*(?:football|sports?|issues?)\s+correspondent(?:published|updated)[\s\S]*$/gi, ' ')
    .replace(/\b(?:football|sports?|issues?)\s+correspondent(?:published|updated)[\s\S]*$/gi, ' ')
    .replace(/\bpublished\d+\s*(?:minutes?|hours?|days?)\s+ago\b/gi, ' ')
    .replace(/\bupdated\d+\s*(?:minutes?|hours?|days?)\s+ago\b/gi, ' ')
    .replace(/\bpublished[\s\S]*?\d+\s*comments?\b/gi, ' ')
    .replace(/\b\d+\s+comments?\b/gi, ' ')
    .replace(/\b\d+\s*comments?\b/gi, ' ')
    .replace(/\bcomments?\b/gi, ' ')
    .replace(/\b(?:published|updated)\b[\s\S]*?(?=(?:[A-Z][a-z]|$))/g, ' ')
    .replace(/\b(?:senior|chief|lead)?\s*(?:football|sports?|issues?)\s+correspondent\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html: string): string {
  return cleanNewsText(
    html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
  );
}

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = stripHtml(extractCdata(block, 'title'));
    const description = stripHtml(extractCdata(block, 'description'));
    const link =
      (block.match(/<link>(.*?)<\/link>/) ?? block.match(/<link[^>]+href="([^"]+)"/))?.[1]?.trim() ?? '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const image =
      block.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] ??
      block.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ??
      '';

    if (!title || !link) continue;

    const id = Buffer.from(link).toString('base64url').replace(/=/g, '');
    items.push({ id, title, description, link, publishedAt: pubDate, image, source });
  }

  return items;
}

export async function fetchNewsList(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(({ url, source }) =>
      fetch(url, {
        next: { revalidate: 600 },
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      })
        .then((r) => r.text())
        .then((xml) => parseRSS(xml, source))
    )
  );

  const items = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  const seen = new Set<string>();
  const unique = items.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });

  unique.sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return db - da;
  });

  return unique.slice(0, 20);
}

export async function fetchFullArticle(slug: string): Promise<FullNewsItem | null> {
  const items = await fetchNewsList();
  const item = items.find((it) => it.id === slug);
  if (!item) return null;

  try {
    const res = await fetch(item.link, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const html = await res.text();
    const paragraphs = extractArticleParagraphs(html);
    const heroImage = extractOgImage(html) || item.image;

    return { ...item, image: heroImage, paragraphs };
  } catch {
    return { ...item, paragraphs: item.description ? [item.description] : [] };
  }
}

function extractArticleParagraphs(html: string): string[] {
  const articleMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    html.match(/<div[^>]+(?:class|id)="[^"]*(?:article-body|story-body|article__body|sdc-article-body|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ??
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

  const scope = articleMatch ? articleMatch[1] : html;
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = pRe.exec(scope)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z#0-9]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleaned = cleanNewsText(text);

    if (cleaned.length > 40 && !isBoilerplate(cleaned)) paragraphs.push(cleaned);
  }

  return paragraphs;
}

const BOILERPLATE_PATTERNS = [
  /^image\s*(source|caption)[,:\s]/i,
  /^getty\s*images?/i,
  /^pa\s*media/i,
  /^reuters/i,
  /^afp\s*via\s*getty/i,
  /^source[,:\s]/i,
  /^caption[,:\s]/i,
  /^photo[,:\s]/i,
  /^picture[,:\s]/i,
  /^bbc\s*(sport|news)\s*(footer|copyright)/i,
  /^(senior|chief|lead)?\s*football\s+correspondent\b/i,
  /^(football|sports?|issues?)\s+correspondent\b/i,
  /^(sports?|football)\s+correspondent\b/i,
  /^published\b.*\b(?:bst|gmt|utc)\b/i,
  /^published\b.*\bago\b/i,
  /^updated\b.*\b(?:minutes?|hours?|days?)\s+ago\b/i,
  /^updated\b.*\b(?:bst|gmt|utc)\b/i,
  /^\d+\s+comments?\b/i,
  /\bcomments?\b$/i,
  /published.*updated.*(?:ago|bst|gmt|utc)/i,
  /\bpublished\b.*\bupdated\b/i,
  /\bcorrespondentpublished\b/i,
  /\bpublished.*\bcomments?\b/i,
];

function isBoilerplate(text: string): boolean {
  return BOILERPLATE_PATTERNS.some((re) => re.test(text));
}

function extractOgImage(html: string): string {
  return (
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1] ??
    ''
  );
}
