create table if not exists operators (
  id text primary key,
  name text not null,
  role text not null check (role in ('admin', 'operator'))
);

create table if not exists matches (
  id text primary key,
  slug text not null unique,
  home_team text not null,
  away_team text not null,
  competition text not null,
  start_at timestamptz not null,
  status text not null check (status in ('test match', 'upcoming', 'live', 'ended')),
  language_set text[] not null default array['EN']::text[],
  seo_title text not null,
  seo_description text not null,
  seo_keywords text[] not null default '{}'::text[],
  hero_image text not null,
  summary text not null,
  operator_note text,
  featured boolean not null default false
);

create table if not exists sources (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  type text not null check (type in ('embed', 'redirect')),
  provider_name text not null,
  url text not null,
  priority integer not null,
  region_scope text[] not null default array['global']::text[],
  is_active boolean not null default true,
  health_status text not null check (health_status in ('healthy', 'degraded', 'down')),
  state text not null check (state in ('primary', 'backup', 'disabled')),
  show_embed boolean not null default false
);

create table if not exists mirrors (
  id text primary key,
  source_id text not null references sources(id) on delete cascade,
  url text not null,
  priority integer not null,
  is_active boolean not null default true
);

create table if not exists audit_log (
  id text primary key,
  actor_id text not null,
  entity_type text not null check (entity_type in ('match', 'source', 'mirror', 'config')),
  entity_id text not null,
  action text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id text primary key,
  title text not null,
  body text not null,
  cta_label text not null,
  cta_href text not null,
  active boolean not null default false
);

create table if not exists subscriptions (
  id text primary key,
  channel text not null check (channel in ('email', 'telegram', 'whatsapp', 'push')),
  value text not null,
  match_id text references matches(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id text primary key,
  name text not null check (name in ('match_view', 'source_click', 'embed_attempt', 'backup_switch', 'notify_opt_in')),
  match_id text references matches(id) on delete set null,
  source_id text references sources(id) on delete set null,
  locale text,
  device text,
  country text,
  created_at timestamptz not null default now()
);

create table if not exists site_config (
  id integer primary key default 1,
  site_name text not null,
  site_tagline text not null,
  primary_domain text not null,
  backup_domain text not null,
  support_email text not null,
  constraint site_config_single_row check (id = 1)
);
