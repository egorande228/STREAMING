import { formatIsoForInput, formatMatchLabel } from "@/lib/format";
import { getDb, listMatches } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = await getDb();
  const matches = await listMatches();

  return (
    <div className="page-shell admin-shell">
      <section className="section">
        <div className="section-header">
          <div>
            <span className="eyebrow">Control room</span>
            <h1>Operator dashboard</h1>
          </div>
          <p className="section-copy">
            This MVP uses a local file-backed store. Replace this layer with
            Postgres and real auth before production.
          </p>
        </div>
        <div className="admin-grid">
          <div className="panel">
            <h3>Create match</h3>
            <form action="/admin/matches" className="admin-form" method="post">
              <label>
                Home team
                <input name="homeTeam" required />
              </label>
              <label>
                Away team
                <input name="awayTeam" required />
              </label>
              <label>
                Competition
                <input name="competition" required />
              </label>
              <label>
                Kickoff
                <input name="startAt" type="datetime-local" required />
              </label>
              <label>
                Status
                <select name="status" defaultValue="test match">
                  <option value="test match">Test match</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </select>
              </label>
              <label>
                Summary
                <textarea name="summary" rows={4} required />
              </label>
              <label>
                Hero image
                <input
                  name="heroImage"
                  defaultValue="https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1400&q=80"
                  required
                />
              </label>
              <button className="button button-primary" type="submit">
                Create match
              </button>
            </form>
          </div>

          <div className="panel">
            <h3>Add source</h3>
            <form action="/admin/sources" className="admin-form" method="post">
              <label>
                Match
                <select name="matchId" defaultValue={matches[0]?.id}>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {formatMatchLabel(match)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Provider
                <input name="providerName" required />
              </label>
              <label>
                URL
                <input name="url" type="url" required />
              </label>
              <label>
                Type
                <select name="type" defaultValue="redirect">
                  <option value="redirect">Redirect</option>
                  <option value="embed">Embed</option>
                </select>
              </label>
              <label>
                State
                <select name="state" defaultValue="backup">
                  <option value="primary">Primary</option>
                  <option value="backup">Backup</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label>
                Priority
                <input defaultValue="2" min="1" name="priority" type="number" />
              </label>
              <label className="checkbox">
                <input name="showEmbed" type="checkbox" value="true" />
                Show embedded player
              </label>
              <button className="button button-primary" type="submit">
                Add source
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="section split-layout">
        <div className="panel">
          <div className="panel-header">
            <h3>Matches</h3>
            <span className="badge subtle">{matches.length}</span>
          </div>
          <div className="admin-list">
            {matches.map((match) => {
              const sources = db.sources.filter((source) => source.matchId === match.id);
              return (
                <div className="admin-item" key={match.id}>
                  <div>
                    <strong>{formatMatchLabel(match)}</strong>
                    <span>
                      {match.competition} · {formatIsoForInput(match.startAt)} ·{" "}
                      {match.status}
                    </span>
                  </div>
                  <div className="admin-item-side">
                    <span>{sources.length} sources</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Toggle source state</h3>
            <span className="badge subtle">primary / backup / disabled</span>
          </div>
          <div className="admin-list">
            {db.sources.map((source) => (
              <form
                action={`/admin/sources/${source.id}/toggle`}
                className="toggle-row"
                key={source.id}
                method="post"
              >
                <div>
                  <strong>{source.providerName}</strong>
                  <span>
                    {source.type} · {source.state} · p{source.priority}
                  </span>
                </div>
                <input name="state" type="hidden" value={nextState(source.state)} />
                <button className="button" type="submit">
                  Switch to {nextState(source.state)}
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section className="section split-layout">
        <div className="panel">
          <div className="panel-header">
            <h3>Audit log</h3>
            <span className="badge subtle">{db.auditLog.length}</span>
          </div>
          <div className="audit-list">
            {db.auditLog.slice(0, 12).map((log) => (
              <div className="audit-item" key={log.id}>
                <strong>{log.action}</strong>
                <span>
                  {log.entityType} · {log.entityId}
                </span>
                <time dateTime={log.createdAt}>{log.createdAt}</time>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Analytics summary</h3>
            <span className="badge subtle">{db.analyticsEvents.length}</span>
          </div>
          <div className="stats-grid">
            <div>
              <strong>
                {
                  db.analyticsEvents.filter((event) => event.name === "match_view")
                    .length
                }
              </strong>
              <span>match views</span>
            </div>
            <div>
              <strong>
                {
                  db.analyticsEvents.filter((event) => event.name === "source_click")
                    .length
                }
              </strong>
              <span>source clicks</span>
            </div>
            <div>
              <strong>{db.subscriptions.length}</strong>
              <span>subscriptions</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function nextState(state: "primary" | "backup" | "disabled") {
  if (state === "primary") {
    return "backup";
  }
  if (state === "backup") {
    return "disabled";
  }
  return "primary";
}
