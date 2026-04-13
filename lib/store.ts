import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedDb } from "@/lib/seed";
import { query, withTransaction } from "@/lib/postgres";
import type {
  AdminActionLog,
  AnalyticsEvent,
  AppDb,
  LiveConfig,
  Match,
  Mirror,
  SiteConfig,
  Source,
  SourceState
} from "@/lib/types";

const DB_FILE =
  process.env.DATA_FILE ?? path.join("/tmp", "sport-live-stream-db.json");

const STORE_MODE = process.env.STORE_MODE ?? "demo";

function isPostgresMode() {
  return STORE_MODE === "postgres";
}

async function ensureDb(): Promise<AppDb> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as AppDb;
  } catch {
    await mkdir(path.dirname(DB_FILE), { recursive: true });
    await writeFile(DB_FILE, JSON.stringify(seedDb, null, 2), "utf8");
    return structuredClone(seedDb);
  }
}

async function saveDb(db: AppDb): Promise<void> {
  await mkdir(path.dirname(DB_FILE), { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapMatch(row: {
  id: string;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startAt: string | Date;
  status: Match["status"];
  languageSet: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  heroImage: string;
  summary: string;
  operatorNote: string | null;
  featured: boolean;
}): Match {
  return {
    id: row.id,
    slug: row.slug,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    competition: row.competition,
    startAt: new Date(row.startAt).toISOString(),
    status: row.status,
    languageSet: row.languageSet ?? ["EN"],
    seoFields: {
      title: row.seoTitle,
      description: row.seoDescription,
      keywords: row.seoKeywords ?? []
    },
    heroImage: row.heroImage,
    summary: row.summary,
    operatorNote: row.operatorNote ?? undefined,
    featured: row.featured
  };
}

function mapSource(row: {
  id: string;
  matchId: string;
  type: Source["type"];
  providerName: string;
  url: string;
  priority: number;
  regionScope: string[];
  isActive: boolean;
  healthStatus: Source["healthStatus"];
  state: Source["state"];
  showEmbed: boolean;
}): Source {
  return {
    id: row.id,
    matchId: row.matchId,
    type: row.type,
    providerName: row.providerName,
    url: row.url,
    priority: row.priority,
    regionScope: row.regionScope ?? ["global"],
    isActive: row.isActive,
    healthStatus: row.healthStatus,
    state: row.state,
    showEmbed: row.showEmbed
  };
}

function mapMirror(row: {
  id: string;
  sourceId: string;
  url: string;
  priority: number;
  isActive: boolean;
}): Mirror {
  return {
    id: row.id,
    sourceId: row.sourceId,
    url: row.url,
    priority: row.priority,
    isActive: row.isActive
  };
}

function mapAuditLog(row: {
  id: string;
  actorId: string;
  entityType: AdminActionLog["entityType"];
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string | Date;
}): AdminActionLog {
  return {
    id: row.id,
    actorId: row.actorId,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    before: row.before ? JSON.stringify(row.before) : null,
    after: row.after ? JSON.stringify(row.after) : null,
    createdAt: new Date(row.createdAt).toISOString()
  };
}

function mapSiteConfig(row: {
  siteName: string;
  siteTagline: string;
  primaryDomain: string;
  backupDomain: string;
  supportEmail: string;
}): SiteConfig {
  return {
    siteName: row.siteName,
    siteTagline: row.siteTagline,
    primaryDomain: row.primaryDomain,
    backupDomain: row.backupDomain,
    supportEmail: row.supportEmail
  };
}

export async function getDb(): Promise<AppDb> {
  if (!isPostgresMode()) {
    return ensureDb();
  }

  const [
    matchesResult,
    sourcesResult,
    mirrorsResult,
    operatorsResult,
    auditLogResult,
    announcementsResult,
    subscriptionsResult,
    analyticsResult,
    siteConfigResult
  ] = await Promise.all([
    query<{
      id: string;
      slug: string;
      homeTeam: string;
      awayTeam: string;
      competition: string;
      startAt: string;
      status: Match["status"];
      languageSet: string[];
      seoTitle: string;
      seoDescription: string;
      seoKeywords: string[];
      heroImage: string;
      summary: string;
      operatorNote: string | null;
      featured: boolean;
    }>(`select
        id,
        slug,
        home_team as "homeTeam",
        away_team as "awayTeam",
        competition,
        start_at as "startAt",
        status,
        language_set as "languageSet",
        seo_title as "seoTitle",
        seo_description as "seoDescription",
        seo_keywords as "seoKeywords",
        hero_image as "heroImage",
        summary,
        operator_note as "operatorNote",
        featured
      from matches
      order by start_at asc`),
    query<{
      id: string;
      matchId: string;
      type: Source["type"];
      providerName: string;
      url: string;
      priority: number;
      regionScope: string[];
      isActive: boolean;
      healthStatus: Source["healthStatus"];
      state: Source["state"];
      showEmbed: boolean;
    }>(`select
        id,
        match_id as "matchId",
        type,
        provider_name as "providerName",
        url,
        priority,
        region_scope as "regionScope",
        is_active as "isActive",
        health_status as "healthStatus",
        state,
        show_embed as "showEmbed"
      from sources
      order by priority asc`),
    query<{
      id: string;
      sourceId: string;
      url: string;
      priority: number;
      isActive: boolean;
    }>(`select
        id,
        source_id as "sourceId",
        url,
        priority,
        is_active as "isActive"
      from mirrors
      order by priority asc`),
    query<{ id: string; name: string; role: "admin" | "operator" }>(
      "select id, name, role from operators order by name asc"
    ),
    query<{
      id: string;
      actorId: string;
      entityType: AdminActionLog["entityType"];
      entityId: string;
      action: string;
      before: unknown;
      after: unknown;
      createdAt: string;
    }>(`select
        id,
        actor_id as "actorId",
        entity_type as "entityType",
        entity_id as "entityId",
        action,
        before_value as "before",
        after_value as "after",
        created_at as "createdAt"
      from audit_log
      order by created_at desc`),
    query(
      `select
        id,
        title,
        body,
        cta_label as "ctaLabel",
        cta_href as "ctaHref",
        active
      from announcements
      order by active desc, title asc`
    ),
    query(
      `select
        id,
        channel,
        value,
        match_id as "matchId",
        created_at as "createdAt"
      from subscriptions
      order by created_at desc`
    ),
    query<AnalyticsEvent>(
      `select
        id,
        name,
        match_id as "matchId",
        source_id as "sourceId",
        locale,
        device,
        country,
        created_at as "createdAt"
      from analytics_events
      order by created_at desc`
    ),
    query<{
      siteName: string;
      siteTagline: string;
      primaryDomain: string;
      backupDomain: string;
      supportEmail: string;
    }>(`select
        site_name as "siteName",
        site_tagline as "siteTagline",
        primary_domain as "primaryDomain",
        backup_domain as "backupDomain",
        support_email as "supportEmail"
      from site_config
      where id = 1`)
  ]);

  return {
    matches: matchesResult.rows.map(mapMatch),
    sources: sourcesResult.rows.map(mapSource),
    mirrors: mirrorsResult.rows.map(mapMirror),
    operators: operatorsResult.rows,
    auditLog: auditLogResult.rows.map(mapAuditLog),
    announcements: announcementsResult.rows,
    subscriptions: subscriptionsResult.rows,
    analyticsEvents: analyticsResult.rows,
    siteConfig: siteConfigResult.rows[0]
      ? mapSiteConfig(siteConfigResult.rows[0])
      : structuredClone(seedDb.siteConfig)
  };
}

export async function listMatches(): Promise<Match[]> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    return db.matches.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  const result = await query<{
    id: string;
    slug: string;
    homeTeam: string;
    awayTeam: string;
    competition: string;
    startAt: string;
    status: Match["status"];
    languageSet: string[];
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    heroImage: string;
    summary: string;
    operatorNote: string | null;
    featured: boolean;
  }>(`select
      id,
      slug,
      home_team as "homeTeam",
      away_team as "awayTeam",
      competition,
      start_at as "startAt",
      status,
      language_set as "languageSet",
      seo_title as "seoTitle",
      seo_description as "seoDescription",
      seo_keywords as "seoKeywords",
      hero_image as "heroImage",
      summary,
      operator_note as "operatorNote",
      featured
    from matches
    order by start_at asc`);
  return result.rows.map(mapMatch);
}

export async function getMatchBySlug(slug: string): Promise<Match | undefined> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    return db.matches.find((match) => match.slug === slug);
  }

  const result = await query<{
    id: string;
    slug: string;
    homeTeam: string;
    awayTeam: string;
    competition: string;
    startAt: string;
    status: Match["status"];
    languageSet: string[];
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    heroImage: string;
    summary: string;
    operatorNote: string | null;
    featured: boolean;
  }>(
    `select
      id,
      slug,
      home_team as "homeTeam",
      away_team as "awayTeam",
      competition,
      start_at as "startAt",
      status,
      language_set as "languageSet",
      seo_title as "seoTitle",
      seo_description as "seoDescription",
      seo_keywords as "seoKeywords",
      hero_image as "heroImage",
      summary,
      operator_note as "operatorNote",
      featured
    from matches
    where slug = $1
    limit 1`,
    [slug]
  );
  return result.rows[0] ? mapMatch(result.rows[0]) : undefined;
}

export async function getMatchById(id: string): Promise<Match | undefined> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    return db.matches.find((match) => match.id === id);
  }

  const result = await query<{
    id: string;
    slug: string;
    homeTeam: string;
    awayTeam: string;
    competition: string;
    startAt: string;
    status: Match["status"];
    languageSet: string[];
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    heroImage: string;
    summary: string;
    operatorNote: string | null;
    featured: boolean;
  }>(
    `select
      id,
      slug,
      home_team as "homeTeam",
      away_team as "awayTeam",
      competition,
      start_at as "startAt",
      status,
      language_set as "languageSet",
      seo_title as "seoTitle",
      seo_description as "seoDescription",
      seo_keywords as "seoKeywords",
      hero_image as "heroImage",
      summary,
      operator_note as "operatorNote",
      featured
    from matches
    where id = $1
    limit 1`,
    [id]
  );
  return result.rows[0] ? mapMatch(result.rows[0]) : undefined;
}

export async function listSourcesForMatch(matchId: string): Promise<Source[]> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    return db.sources
      .filter((source) => source.matchId === matchId)
      .sort((a, b) => a.priority - b.priority);
  }

  const result = await query<{
    id: string;
    matchId: string;
    type: Source["type"];
    providerName: string;
    url: string;
    priority: number;
    regionScope: string[];
    isActive: boolean;
    healthStatus: Source["healthStatus"];
    state: Source["state"];
    showEmbed: boolean;
  }>(
    `select
      id,
      match_id as "matchId",
      type,
      provider_name as "providerName",
      url,
      priority,
      region_scope as "regionScope",
      is_active as "isActive",
      health_status as "healthStatus",
      state,
      show_embed as "showEmbed"
    from sources
    where match_id = $1
    order by priority asc`,
    [matchId]
  );
  return result.rows.map(mapSource);
}

export async function listMirrorsForSource(sourceId: string): Promise<Mirror[]> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    return db.mirrors
      .filter((mirror) => mirror.sourceId === sourceId && mirror.isActive)
      .sort((a, b) => a.priority - b.priority);
  }

  const result = await query<{
    id: string;
    sourceId: string;
    url: string;
    priority: number;
    isActive: boolean;
  }>(
    `select
      id,
      source_id as "sourceId",
      url,
      priority,
      is_active as "isActive"
    from mirrors
    where source_id = $1 and is_active = true
    order by priority asc`,
    [sourceId]
  );
  return result.rows.map(mapMirror);
}

export async function getLiveConfig(matchId: string): Promise<LiveConfig | null> {
  const match = await getMatchById(matchId);
  if (!match) {
    return null;
  }

  const activeSources = (await listSourcesForMatch(matchId)).filter(
    (source) => source.isActive
  );
  const primarySource = activeSources[0] ?? null;
  const backupSources = activeSources.slice(1);
  const mirrors = (
    await Promise.all(activeSources.map((source) => listMirrorsForSource(source.id)))
  ).flat();
  const canEmbed = Boolean(
    primarySource &&
      primarySource.type === "embed" &&
      primarySource.showEmbed &&
      primarySource.healthStatus !== "down"
  );

  return {
    matchId,
    matchSlug: match.slug,
    canEmbed,
    primarySource,
    backupSources,
    mirrors,
    fallbackMode: canEmbed
      ? "embed"
      : primarySource
        ? "redirect"
        : "waiting"
  };
}

export async function createMatch(
  payload: Pick<
    Match,
    | "homeTeam"
    | "awayTeam"
    | "competition"
    | "startAt"
    | "status"
    | "summary"
    | "heroImage"
  >
): Promise<Match> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    const id = newId("match");
    const slug = `${payload.homeTeam}-${payload.awayTeam}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const match: Match = {
      id,
      slug,
      homeTeam: payload.homeTeam,
      awayTeam: payload.awayTeam,
      competition: payload.competition,
      startAt: payload.startAt,
      status: payload.status,
      languageSet: ["EN"],
      summary: payload.summary,
      heroImage: payload.heroImage,
      seoFields: {
        title: `${payload.homeTeam} vs ${payload.awayTeam} live watch page`,
        description: payload.summary,
        keywords: [payload.homeTeam, payload.awayTeam, payload.competition]
      }
    };
    db.matches.push(match);
    db.auditLog.unshift(buildAuditLog("match", id, "create_match", null, match));
    await saveDb(db);
    return match;
  }

  const id = newId("match");
  const slug = `${payload.homeTeam}-${payload.awayTeam}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const match: Match = {
    id,
    slug,
    homeTeam: payload.homeTeam,
    awayTeam: payload.awayTeam,
    competition: payload.competition,
    startAt: payload.startAt,
    status: payload.status,
    languageSet: ["EN"],
    summary: payload.summary,
    heroImage: payload.heroImage,
    seoFields: {
      title: `${payload.homeTeam} vs ${payload.awayTeam} live watch page`,
      description: payload.summary,
      keywords: [payload.homeTeam, payload.awayTeam, payload.competition]
    }
  };

  await withTransaction(async (client) => {
    await client.query(
      `insert into matches (
        id, slug, home_team, away_team, competition, start_at, status,
        language_set, seo_title, seo_description, seo_keywords, hero_image, summary
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        match.id,
        match.slug,
        match.homeTeam,
        match.awayTeam,
        match.competition,
        match.startAt,
        match.status,
        match.languageSet,
        match.seoFields.title,
        match.seoFields.description,
        match.seoFields.keywords,
        match.heroImage,
        match.summary
      ]
    );
    const auditLog = buildAuditLog("match", id, "create_match", null, match);
    await client.query(
      `insert into audit_log (
        id, actor_id, entity_type, entity_id, action, before_value, after_value, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        auditLog.id,
        auditLog.actorId,
        auditLog.entityType,
        auditLog.entityId,
        auditLog.action,
        auditLog.before,
        auditLog.after,
        auditLog.createdAt
      ]
    );
  });

  return match;
}

export async function createSource(
  payload: Pick<
    Source,
    | "matchId"
    | "type"
    | "providerName"
    | "url"
    | "priority"
    | "state"
    | "showEmbed"
  >
): Promise<Source> {
  const source: Source = {
    id: newId("source"),
    matchId: payload.matchId,
    type: payload.type,
    providerName: payload.providerName,
    url: payload.url,
    priority: payload.priority,
    regionScope: ["global"],
    isActive: payload.state !== "disabled",
    healthStatus: "healthy",
    state: payload.state,
    showEmbed: payload.showEmbed
  };

  if (!isPostgresMode()) {
    const db = await ensureDb();
    db.sources.push(source);
    db.auditLog.unshift(
      buildAuditLog("source", source.id, "create_source", null, source)
    );
    await saveDb(db);
    return source;
  }

  await withTransaction(async (client) => {
    await client.query(
      `insert into sources (
        id, match_id, type, provider_name, url, priority, region_scope, is_active,
        health_status, state, show_embed
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        source.id,
        source.matchId,
        source.type,
        source.providerName,
        source.url,
        source.priority,
        source.regionScope,
        source.isActive,
        source.healthStatus,
        source.state,
        source.showEmbed
      ]
    );
    const auditLog = buildAuditLog("source", source.id, "create_source", null, source);
    await client.query(
      `insert into audit_log (
        id, actor_id, entity_type, entity_id, action, before_value, after_value, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        auditLog.id,
        auditLog.actorId,
        auditLog.entityType,
        auditLog.entityId,
        auditLog.action,
        auditLog.before,
        auditLog.after,
        auditLog.createdAt
      ]
    );
  });

  return source;
}

export async function toggleSourceState(
  sourceId: string,
  nextState: SourceState
): Promise<Source | null> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    const source = db.sources.find((item) => item.id === sourceId);
    if (!source) {
      return null;
    }

    const before = structuredClone(source);
    source.state = nextState;
    source.isActive = nextState !== "disabled";
    source.showEmbed = source.type === "embed" && nextState === "primary";
    db.auditLog.unshift(
      buildAuditLog("source", source.id, "toggle_source_state", before, source)
    );
    await saveDb(db);
    return source;
  }

  return withTransaction(async (client) => {
    const currentResult = await client.query<{
      id: string;
      matchId: string;
      type: Source["type"];
      providerName: string;
      url: string;
      priority: number;
      regionScope: string[];
      isActive: boolean;
      healthStatus: Source["healthStatus"];
      state: Source["state"];
      showEmbed: boolean;
    }>(
      `select
        id,
        match_id as "matchId",
        type,
        provider_name as "providerName",
        url,
        priority,
        region_scope as "regionScope",
        is_active as "isActive",
        health_status as "healthStatus",
        state,
        show_embed as "showEmbed"
      from sources
      where id = $1
      limit 1`,
      [sourceId]
    );

    const current = currentResult.rows[0];
    if (!current) {
      return null;
    }

    const source = mapSource(current);
    const before = structuredClone(source);
    source.state = nextState;
    source.isActive = nextState !== "disabled";
    source.showEmbed = source.type === "embed" && nextState === "primary";

    await client.query(
      `update sources
      set state = $2, is_active = $3, show_embed = $4
      where id = $1`,
      [sourceId, source.state, source.isActive, source.showEmbed]
    );

    const auditLog = buildAuditLog(
      "source",
      source.id,
      "toggle_source_state",
      before,
      source
    );
    await client.query(
      `insert into audit_log (
        id, actor_id, entity_type, entity_id, action, before_value, after_value, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        auditLog.id,
        auditLog.actorId,
        auditLog.entityType,
        auditLog.entityId,
        auditLog.action,
        auditLog.before,
        auditLog.after,
        auditLog.createdAt
      ]
    );

    return source;
  });
}

export async function recordAnalytics(
  event: Omit<AnalyticsEvent, "id" | "createdAt">
): Promise<AnalyticsEvent> {
  const saved: AnalyticsEvent = {
    ...event,
    id: newId("analytics"),
    createdAt: new Date().toISOString()
  };

  if (!isPostgresMode()) {
    const db = await ensureDb();
    db.analyticsEvents.unshift(saved);
    await saveDb(db);
    return saved;
  }

  await query(
    `insert into analytics_events (
      id, name, match_id, source_id, locale, device, country, created_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      saved.id,
      saved.name,
      saved.matchId ?? null,
      saved.sourceId ?? null,
      saved.locale ?? null,
      saved.device ?? null,
      saved.country ?? null,
      saved.createdAt
    ]
  );
  return saved;
}

export async function addSubscription(
  channel: "email" | "telegram" | "whatsapp" | "push",
  value: string,
  matchId?: string
): Promise<void> {
  if (!isPostgresMode()) {
    const db = await ensureDb();
    db.subscriptions.unshift({
      id: newId("sub"),
      channel,
      value,
      matchId,
      createdAt: new Date().toISOString()
    });
    db.auditLog.unshift(
      buildAuditLog(
        "config",
        matchId ?? "global-notify",
        "create_subscription",
        null,
        { channel, value, matchId }
      )
    );
    await saveDb(db);
    return;
  }

  const subscriptionId = newId("sub");
  const createdAt = new Date().toISOString();
  const auditLog = buildAuditLog(
    "config",
    matchId ?? "global-notify",
    "create_subscription",
    null,
    { channel, value, matchId }
  );

  await withTransaction(async (client) => {
    await client.query(
      `insert into subscriptions (id, channel, value, match_id, created_at)
      values ($1,$2,$3,$4,$5)`,
      [subscriptionId, channel, value, matchId ?? null, createdAt]
    );
    await client.query(
      `insert into audit_log (
        id, actor_id, entity_type, entity_id, action, before_value, after_value, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        auditLog.id,
        auditLog.actorId,
        auditLog.entityType,
        auditLog.entityId,
        auditLog.action,
        auditLog.before,
        auditLog.after,
        auditLog.createdAt
      ]
    );
  });
}

function buildAuditLog(
  entityType: AdminActionLog["entityType"],
  entityId: string,
  action: string,
  before: unknown,
  after: unknown
): AdminActionLog {
  return {
    id: newId("log"),
    actorId: "operator-001",
    entityType,
    entityId,
    action,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    createdAt: new Date().toISOString()
  };
}
