import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) throw new Error('Cloudflare authentication unavailable');
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/kinglive-football-api`;
const headers = { Authorization: `Bearer ${token}` };
const [deploymentsResponse, contentResponse] = await Promise.all([
  fetch(`${base}/deployments`, { headers }),
  fetch(`${base}/content/v2`, { headers }),
]);
if (!deploymentsResponse.ok || !contentResponse.ok) {
  throw new Error(`Read failed: deployments ${deploymentsResponse.status}, content ${contentResponse.status}`);
}
const deployments = await deploymentsResponse.json();
const deployed = await contentResponse.text();
const source = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const section = (value) => value.match(/async function fetchNewsFeed\(newsLang\)[\s\S]*?(?=async function fetchArabicFootballFallbackFeed)/)?.[0] || '';
const deployedSection = section(deployed);
const sourceSection = section(source);
const newest = deployments.result?.[0];
process.stdout.write(JSON.stringify({
  deploymentId: newest?.id || null,
  deploymentDate: newest?.created_on || null,
  deployedBytes: deployed.length,
  deployedSha256: digest(deployed),
  sourceBytes: source.length,
  sourceSha256: digest(source),
  deployedNewsSectionFound: Boolean(deployedSection),
  deployedNewsSectionSha256: deployedSection ? digest(deployedSection) : null,
  sourceNewsSectionSha256: sourceSection ? digest(sourceSection) : null,
  deployedNewsProxyFirst: deployedSection.indexOf('fetchFeedUrl(NEWS_FEED_PROXY_URL)') < deployedSection.indexOf('fetchFeedUrl(NEWS_FEED_URL)'),
}, null, 2) + '\n');
