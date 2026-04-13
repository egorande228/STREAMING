export type MatchStatus = "test match" | "upcoming" | "live" | "ended";
export type SourceType = "embed" | "redirect";
export type SourceHealth = "healthy" | "degraded" | "down";
export type SourceState = "primary" | "backup" | "disabled";

export type SeoFields = {
  title: string;
  description: string;
  keywords: string[];
};

export type Match = {
  id: string;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startAt: string;
  status: MatchStatus;
  languageSet: string[];
  seoFields: SeoFields;
  heroImage: string;
  summary: string;
  operatorNote?: string;
  featured?: boolean;
};

export type Mirror = {
  id: string;
  sourceId: string;
  url: string;
  priority: number;
  isActive: boolean;
};

export type Source = {
  id: string;
  matchId: string;
  type: SourceType;
  providerName: string;
  url: string;
  priority: number;
  regionScope: string[];
  isActive: boolean;
  healthStatus: SourceHealth;
  state: SourceState;
  showEmbed: boolean;
};

export type Operator = {
  id: string;
  name: string;
  role: "admin" | "operator";
};

export type AdminActionLog = {
  id: string;
  actorId: string;
  entityType: "match" | "source" | "mirror" | "config";
  entityId: string;
  action: string;
  before: string | null;
  after: string | null;
  createdAt: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
};

export type Subscription = {
  id: string;
  channel: "email" | "telegram" | "whatsapp" | "push";
  value: string;
  matchId?: string;
  createdAt: string;
};

export type AnalyticsEvent = {
  id: string;
  name:
    | "match_view"
    | "source_click"
    | "embed_attempt"
    | "backup_switch"
    | "notify_opt_in";
  matchId?: string;
  sourceId?: string;
  locale?: string;
  device?: string;
  country?: string;
  createdAt: string;
};

export type SiteConfig = {
  siteName: string;
  siteTagline: string;
  primaryDomain: string;
  backupDomain: string;
  supportEmail: string;
};

export type LiveConfig = {
  matchId: string;
  matchSlug: string;
  canEmbed: boolean;
  primarySource: Source | null;
  backupSources: Source[];
  mirrors: Mirror[];
  fallbackMode: "embed" | "redirect" | "waiting";
};

export type AppDb = {
  matches: Match[];
  sources: Source[];
  mirrors: Mirror[];
  operators: Operator[];
  auditLog: AdminActionLog[];
  announcements: Announcement[];
  subscriptions: Subscription[];
  analyticsEvents: AnalyticsEvent[];
  siteConfig: SiteConfig;
};
