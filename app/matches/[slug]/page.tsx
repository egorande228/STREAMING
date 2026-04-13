import { notFound } from "next/navigation";
import { LocalTime } from "@/components/local-time";
import { SourcePanel } from "@/components/source-panel";
import { formatMatchLabel, formatStatus } from "@/lib/format";
import {
  addSubscription,
  getLiveConfig,
  getMatchBySlug,
  listSourcesForMatch
} from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function MatchPage({ params }: Props) {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);
  if (!match) {
    notFound();
  }

  const liveConfig = await getLiveConfig(match.id);
  const sources = await listSourcesForMatch(match.id);

  return (
    <div className="page-shell">
      <section className="detail-hero">
        <div className="detail-copy">
          <span className={`status status-${match.status.replace(" ", "-")}`}>
            {formatStatus(match.status)}
          </span>
          <h1>{formatMatchLabel(match)}</h1>
          <p>{match.summary}</p>
          <div className="detail-meta">
            <div>
              <span className="meta-label">Kickoff</span>
              <LocalTime iso={match.startAt} />
            </div>
            <div>
              <span className="meta-label">Competition</span>
              <strong>{match.competition}</strong>
            </div>
            <div>
              <span className="meta-label">Languages</span>
              <strong>{match.languageSet.join(", ")}</strong>
            </div>
          </div>
        </div>
        <div className="detail-ops-card">
          <h3>Operator note</h3>
          <p>{match.operatorNote ?? "No operator note for this page yet."}</p>
          <ul className="plain-list compact">
            <li>Primary source can be replaced without deploy</li>
            <li>Backup links stay visible under the main player</li>
            <li>Waiting-state UI covers missing source scenarios</li>
          </ul>
        </div>
      </section>

      {liveConfig ? <SourcePanel config={liveConfig} /> : null}

      <section className="section split-layout">
        <div className="panel">
          <div className="panel-header">
            <h3>Source status board</h3>
            <span className="badge subtle">{sources.length} configured</span>
          </div>
          <div className="source-table">
            {sources.map((source) => (
              <div className="source-row" key={source.id}>
                <div>
                  <strong>{source.providerName}</strong>
                  <span>{source.type}</span>
                </div>
                <div>
                  <strong>{source.state}</strong>
                  <span>{source.healthStatus}</span>
                </div>
                <div>
                  <strong>Priority {source.priority}</strong>
                  <span>{source.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" id="notify">
          <div className="panel-header">
            <h3>Capture the audience</h3>
            <span className="badge">First-party</span>
          </div>
          <p>
            Use a minimal notification form now. Swap it for email, web push,
            Telegram bot, or WhatsApp automation later.
          </p>
          <form action={subscribeAction} className="notify-form">
            <input type="hidden" name="matchId" value={match.id} />
            <label>
              Channel
              <select name="channel" defaultValue="email">
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="push">Web push</option>
              </select>
            </label>
            <label>
              Contact
              <input
                name="value"
                placeholder="email@example.com or @username"
                required
              />
            </label>
            <button className="button button-primary" type="submit">
              Notify me before the match
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

async function subscribeAction(formData: FormData) {
  "use server";

  const channel = String(formData.get("channel")) as
    | "email"
    | "telegram"
    | "whatsapp"
    | "push";
  const value = String(formData.get("value") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  if (!value) {
    return;
  }

  await addSubscription(channel, value, matchId || undefined);
}
