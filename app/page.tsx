import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { formatMatchLabel, formatStatus, groupMatches } from "@/lib/format";
import { getDb, listMatches } from "@/lib/store";

export const revalidate = 60;

export default async function HomePage() {
  const db = await getDb();
  const matches = await listMatches();
  const grouped = groupMatches(matches);
  const featured = matches.find((match) => match.featured) ?? matches[0];

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">60-day delivery MVP</span>
          <h1>Operator-first live match pages with instant source fallback.</h1>
          <p>
            Publish test fixtures now, switch embeds and backup routes in
            seconds, and keep a hot backup domain ready for event traffic.
          </p>
          <div className="cta-row">
            <Link className="button button-primary" href="/admin">
              Open control room
            </Link>
            {featured ? (
              <Link
                className="button"
                href={`/matches/${featured.slug}`}
              >
                View featured match
              </Link>
            ) : null}
          </div>
        </div>
        <div className="hero-card">
          <p>Protected delivery layer</p>
          <ul className="plain-list">
            <li>Cloudflare-ready edge and dual-domain setup</li>
            <li>Embed or redirect mode per match</li>
            <li>Audit log for every operator change</li>
            <li>Audience capture for email, Telegram, WhatsApp, push</li>
          </ul>
          <div className="stats-grid">
            <div>
              <strong>{matches.length}</strong>
              <span>match pages</span>
            </div>
            <div>
              <strong>{db.sources.filter((item) => item.isActive).length}</strong>
              <span>active sources</span>
            </div>
            <div>
              <strong>{db.mirrors.filter((item) => item.isActive).length}</strong>
              <span>mirrors</span>
            </div>
          </div>
        </div>
      </section>

      <MatchSection
        title="Live now"
        subtitle="Highest priority pages for the operator desk."
        matches={grouped.live}
      />
      <MatchSection
        title="Upcoming and test fixtures"
        subtitle="Run rehearsals before the tournament and preload routing."
        matches={grouped.upcoming}
      />
      <MatchSection
        title="Completed fixtures"
        subtitle="Keep the replay and audit trail available for review."
        matches={grouped.ended}
      />
    </div>
  );
}

function MatchSection({
  title,
  subtitle,
  matches
}: {
  title: string;
  subtitle: string;
  matches: Awaited<ReturnType<typeof listMatches>>;
}) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <span className="eyebrow">{title}</span>
          <h2>{subtitle}</h2>
        </div>
      </div>
      <div className="match-grid">
        {matches.length === 0 ? (
          <div className="panel empty-state">
            <strong>No matches in this group yet.</strong>
            <span>Create one from the admin control room.</span>
          </div>
        ) : null}
        {matches.map((match) => (
          <Link className="match-card" href={`/matches/${match.slug}`} key={match.id}>
            <div className="card-top">
              <span className={`status status-${match.status.replace(" ", "-")}`}>
                {formatStatus(match.status)}
              </span>
              <span>{match.competition}</span>
            </div>
            <h3>{formatMatchLabel(match)}</h3>
            <p>{match.summary}</p>
            <div className="card-meta">
              <LocalTime iso={match.startAt} />
              <span>{match.languageSet.join(" / ")}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
