insert into operators (id, name, role) values
  ('operator-001', 'Control Room', 'admin'),
  ('operator-002', 'Backup Desk', 'operator')
on conflict (id) do nothing;

insert into site_config (id, site_name, site_tagline, primary_domain, backup_domain, support_email)
values (
  1,
  'Match Control',
  'Fast match pages, resilient routing, and operator-first controls.',
  'main.example.com',
  'backup.example.com',
  'ops@example.com'
)
on conflict (id) do update set
  site_name = excluded.site_name,
  site_tagline = excluded.site_tagline,
  primary_domain = excluded.primary_domain,
  backup_domain = excluded.backup_domain,
  support_email = excluded.support_email;

insert into announcements (id, title, body, cta_label, cta_href, active) values
(
  'announcement-001',
  'World event rehearsal is live',
  'We are validating live match pages, fallback routing, and audience notifications before the main tournament.',
  'Join notifications',
  '#notify',
  true
)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  active = excluded.active;

insert into matches (
  id, slug, home_team, away_team, competition, start_at, status, language_set,
  seo_title, seo_description, seo_keywords, hero_image, summary, operator_note, featured
) values
(
  'match-001',
  'city-fc-vs-united-sc',
  'City FC',
  'United SC',
  'Global Test Series',
  '2026-04-20T18:00:00.000Z',
  'upcoming',
  array['EN'],
  'City FC vs United SC live watch page',
  'Track match status, active watch options, and fallback sources for City FC vs United SC.',
  array['City FC', 'United SC', 'live match', 'watch page'],
  'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1400&q=80',
  'Operational test match used to validate source rotation, operator workflow, and audience notifications.',
  'Use this match to rehearse pre-live publication and first backup swap.',
  true
),
(
  'match-002',
  'tigers-club-vs-coastal-athletic',
  'Tigers Club',
  'Coastal Athletic',
  'Global Test Series',
  '2026-04-17T20:30:00.000Z',
  'live',
  array['EN', 'ES'],
  'Tigers Club vs Coastal Athletic live coverage',
  'Live status, stream options, and backup links for Tigers Club vs Coastal Athletic.',
  array['Tigers Club', 'Coastal Athletic', 'live coverage'],
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1400&q=80',
  'Live rehearsal fixture with both embedded and redirect sources enabled for failover testing.',
  'Switch primary source if embed stalls for more than 30 seconds.',
  false
),
(
  'match-003',
  'eagles-11-vs-metro-stars',
  'Eagles 11',
  'Metro Stars',
  'Global Test Series',
  '2026-04-12T16:00:00.000Z',
  'ended',
  array['EN'],
  'Eagles 11 vs Metro Stars replay options',
  'Final score status, operator notes, and replay-routing workflow for Eagles 11 vs Metro Stars.',
  array['Eagles 11', 'Metro Stars', 'replay'],
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1400&q=80',
  'Completed test fixture retained for audit, analytics review, and replay page validation.',
  'Archived event. Redirect only.',
  false
)
on conflict (id) do nothing;

insert into sources (
  id, match_id, type, provider_name, url, priority, region_scope, is_active,
  health_status, state, show_embed
) values
(
  'source-001',
  'match-002',
  'embed',
  'Provider Alpha',
  'https://player.vimeo.com/video/76979871',
  1,
  array['global'],
  true,
  'healthy',
  'primary',
  true
),
(
  'source-002',
  'match-002',
  'redirect',
  'Provider Beta',
  'https://example.com/watch/tigers-club-vs-coastal-athletic',
  2,
  array['global'],
  true,
  'healthy',
  'backup',
  false
),
(
  'source-003',
  'match-001',
  'redirect',
  'Partner Landing',
  'https://example.com/watch/city-fc-vs-united-sc',
  1,
  array['global'],
  true,
  'healthy',
  'primary',
  false
),
(
  'source-004',
  'match-003',
  'redirect',
  'Replay Hub',
  'https://example.com/replay/eagles-11-vs-metro-stars',
  1,
  array['global'],
  true,
  'healthy',
  'primary',
  false
)
on conflict (id) do nothing;

insert into mirrors (id, source_id, url, priority, is_active) values
(
  'mirror-001',
  'source-002',
  'https://backup.example.com/watch/tigers-club-vs-coastal-athletic',
  1,
  true
),
(
  'mirror-002',
  'source-003',
  'https://backup.example.com/watch/city-fc-vs-united-sc',
  1,
  true
)
on conflict (id) do nothing;

insert into audit_log (
  id, actor_id, entity_type, entity_id, action, before_value, after_value, created_at
) values
(
  'log-001',
  'operator-001',
  'source',
  'source-001',
  'seeded_primary_embed',
  null,
  '{"showEmbed": true, "state": "primary"}'::jsonb,
  '2026-04-12T10:00:00.000Z'
)
on conflict (id) do nothing;
