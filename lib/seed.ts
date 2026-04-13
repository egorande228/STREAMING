import type { AppDb } from "@/lib/types";

export const seedDb: AppDb = {
  matches: [
    {
      id: "match-001",
      slug: "city-fc-vs-united-sc",
      homeTeam: "City FC",
      awayTeam: "United SC",
      competition: "Global Test Series",
      startAt: "2026-04-20T18:00:00.000Z",
      status: "upcoming",
      languageSet: ["EN"],
      seoFields: {
        title: "City FC vs United SC live watch page",
        description:
          "Track match status, active watch options, and fallback sources for City FC vs United SC.",
        keywords: ["City FC", "United SC", "live match", "watch page"]
      },
      heroImage:
        "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1400&q=80",
      summary:
        "Operational test match used to validate source rotation, operator workflow, and audience notifications.",
      operatorNote: "Use this match to rehearse pre-live publication and first backup swap.",
      featured: true
    },
    {
      id: "match-002",
      slug: "tigers-club-vs-coastal-athletic",
      homeTeam: "Tigers Club",
      awayTeam: "Coastal Athletic",
      competition: "Global Test Series",
      startAt: "2026-04-17T20:30:00.000Z",
      status: "live",
      languageSet: ["EN", "ES"],
      seoFields: {
        title: "Tigers Club vs Coastal Athletic live coverage",
        description:
          "Live status, stream options, and backup links for Tigers Club vs Coastal Athletic.",
        keywords: ["Tigers Club", "Coastal Athletic", "live coverage"]
      },
      heroImage:
        "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1400&q=80",
      summary:
        "Live rehearsal fixture with both embedded and redirect sources enabled for failover testing.",
      operatorNote: "Switch primary source if embed stalls for more than 30 seconds."
    },
    {
      id: "match-003",
      slug: "eagles-11-vs-metro-stars",
      homeTeam: "Eagles 11",
      awayTeam: "Metro Stars",
      competition: "Global Test Series",
      startAt: "2026-04-12T16:00:00.000Z",
      status: "ended",
      languageSet: ["EN"],
      seoFields: {
        title: "Eagles 11 vs Metro Stars replay options",
        description:
          "Final score status, operator notes, and replay-routing workflow for Eagles 11 vs Metro Stars.",
        keywords: ["Eagles 11", "Metro Stars", "replay"]
      },
      heroImage:
        "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1400&q=80",
      summary:
        "Completed test fixture retained for audit, analytics review, and replay page validation.",
      operatorNote: "Archived event. Redirect only."
    }
  ],
  sources: [
    {
      id: "source-001",
      matchId: "match-002",
      type: "embed",
      providerName: "Provider Alpha",
      url: "https://player.vimeo.com/video/76979871",
      priority: 1,
      regionScope: ["global"],
      isActive: true,
      healthStatus: "healthy",
      state: "primary",
      showEmbed: true
    },
    {
      id: "source-002",
      matchId: "match-002",
      type: "redirect",
      providerName: "Provider Beta",
      url: "https://example.com/watch/tigers-club-vs-coastal-athletic",
      priority: 2,
      regionScope: ["global"],
      isActive: true,
      healthStatus: "healthy",
      state: "backup",
      showEmbed: false
    },
    {
      id: "source-003",
      matchId: "match-001",
      type: "redirect",
      providerName: "Partner Landing",
      url: "https://example.com/watch/city-fc-vs-united-sc",
      priority: 1,
      regionScope: ["global"],
      isActive: true,
      healthStatus: "healthy",
      state: "primary",
      showEmbed: false
    },
    {
      id: "source-004",
      matchId: "match-003",
      type: "redirect",
      providerName: "Replay Hub",
      url: "https://example.com/replay/eagles-11-vs-metro-stars",
      priority: 1,
      regionScope: ["global"],
      isActive: true,
      healthStatus: "healthy",
      state: "primary",
      showEmbed: false
    }
  ],
  mirrors: [
    {
      id: "mirror-001",
      sourceId: "source-002",
      url: "https://backup.example.com/watch/tigers-club-vs-coastal-athletic",
      priority: 1,
      isActive: true
    },
    {
      id: "mirror-002",
      sourceId: "source-003",
      url: "https://backup.example.com/watch/city-fc-vs-united-sc",
      priority: 1,
      isActive: true
    }
  ],
  operators: [
    {
      id: "operator-001",
      name: "Control Room",
      role: "admin"
    },
    {
      id: "operator-002",
      name: "Backup Desk",
      role: "operator"
    }
  ],
  auditLog: [
    {
      id: "log-001",
      actorId: "operator-001",
      entityType: "source",
      entityId: "source-001",
      action: "seeded_primary_embed",
      before: null,
      after: JSON.stringify({ showEmbed: true, state: "primary" }),
      createdAt: "2026-04-12T10:00:00.000Z"
    }
  ],
  announcements: [
    {
      id: "announcement-001",
      title: "World event rehearsal is live",
      body: "We are validating live match pages, fallback routing, and audience notifications before the main tournament.",
      ctaLabel: "Join notifications",
      ctaHref: "#notify",
      active: true
    }
  ],
  subscriptions: [],
  analyticsEvents: [],
  siteConfig: {
    siteName: "Match Control",
    siteTagline: "Fast match pages, resilient routing, and operator-first controls.",
    primaryDomain: "main.example.com",
    backupDomain: "backup.example.com",
    supportEmail: "ops@example.com"
  }
};
