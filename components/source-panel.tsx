"use client";

import { useEffect } from "react";
import type { LiveConfig } from "@/lib/types";

type Props = {
  config: LiveConfig;
};

async function track(name: string, payload: Record<string, string | undefined>) {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        ...payload,
        locale: navigator.language,
        device: /Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop"
      })
    });
  } catch {
    // Ignore analytics failures in MVP mode.
  }
}

export function SourcePanel({ config }: Props) {
  const primary = config.primarySource;

  useEffect(() => {
    void track("match_view", { matchId: config.matchId });
  }, [config.matchId]);

  if (!primary) {
    return (
      <div className="panel">
        <h3>No active source yet</h3>
        <p>
          The operator team has not published a live route for this match. Join
          notifications below and we will push the page as soon as it is ready.
        </p>
      </div>
    );
  }

  if (config.canEmbed && primary.type === "embed") {
    return (
      <div className="stack">
        <div className="panel">
          <div className="panel-header">
            <h3>Primary player</h3>
            <span className="badge success">{primary.providerName}</span>
          </div>
          <div className="embed-shell">
            <iframe
              src={primary.url}
              title={`${config.matchSlug} embedded player`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() =>
                void track("embed_attempt", {
                  matchId: config.matchId,
                  sourceId: primary.id
                })
              }
            />
          </div>
          <p className="muted">
            If the player fails, use one of the fallback routes below.
          </p>
        </div>

        <FallbackLinks config={config} />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <h3>Primary route</h3>
          <span className="badge">{primary.providerName}</span>
        </div>
        <p>
          Embedded playback is disabled right now. Use the controlled redirect
          route for the current active source.
        </p>
        <a
          className="button button-primary"
          href={primary.url}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            void track("source_click", {
              matchId: config.matchId,
              sourceId: primary.id
            })
          }
        >
          Open current source
        </a>
      </div>
      <FallbackLinks config={config} />
    </div>
  );
}

function FallbackLinks({ config }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Fallback routes</h3>
        <span className="badge subtle">
          {config.backupSources.length + config.mirrors.length} available
        </span>
      </div>
      <div className="fallback-grid">
        {config.backupSources.map((source) => (
          <a
            className="fallback-card"
            href={source.url}
            key={source.id}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              void track("backup_switch", {
                matchId: config.matchId,
                sourceId: source.id
              })
            }
          >
            <strong>{source.providerName}</strong>
            <span>
              {source.type === "embed" ? "Embedded backup" : "Redirect backup"}
            </span>
          </a>
        ))}
        {config.mirrors.map((mirror) => (
          <a
            className="fallback-card"
            href={mirror.url}
            key={mirror.id}
            target="_blank"
            rel="noreferrer"
          >
            <strong>Mirror {mirror.priority}</strong>
            <span>{mirror.url}</span>
          </a>
        ))}
        {config.backupSources.length === 0 && config.mirrors.length === 0 ? (
          <div className="fallback-card empty">
            <strong>No backups configured</strong>
            <span>Add at least one backup source or mirror in admin.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
