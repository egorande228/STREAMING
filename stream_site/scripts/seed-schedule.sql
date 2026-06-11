-- FIFA World Cup 2026 - Full Match Schedule (104 matches)
-- Groups A-L, 4 teams each, 6 matches per group = 72 group matches
-- Knockout: R32(16) + R16(8) + QF(4) + SF(2) + 3rd(1) + Final(1) = 32 matches

-- ── GROUP A: USA, Canada, Uruguay, Slovenia ─────────────────────────────────
-- Group stage: June 11-13 kickoff times vary by city
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='USA'), (SELECT id FROM teams WHERE code='CAN'),
   (SELECT id FROM groups WHERE name='A'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-06-11 22:00:00+00'),
  ((SELECT id FROM teams WHERE code='URU'), (SELECT id FROM teams WHERE code='SVN'),
   (SELECT id FROM groups WHERE name='A'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-12 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='USA'), (SELECT id FROM teams WHERE code='URU'),
   (SELECT id FROM groups WHERE name='A'), 'group', 'AT&T Stadium', 'Arlington', '2026-06-17 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='CAN'), (SELECT id FROM teams WHERE code='SVN'),
   (SELECT id FROM groups WHERE name='A'), 'group', 'BMO Field', 'Toronto', '2026-06-17 22:00:00+00'),
  ((SELECT id FROM teams WHERE code='USA'), (SELECT id FROM teams WHERE code='SVN'),
   (SELECT id FROM groups WHERE name='A'), 'group', 'Levi''s Stadium', 'Santa Clara', '2026-06-22 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='CAN'), (SELECT id FROM teams WHERE code='URU'),
   (SELECT id FROM groups WHERE name='A'), 'group', 'BC Place', 'Vancouver', '2026-06-22 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP B: Mexico, Brazil, Nigeria, Wales ──────────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='MEX'), (SELECT id FROM teams WHERE code='BRA'),
   (SELECT id FROM groups WHERE name='B'), 'group', 'Estadio Azteca', 'Mexico City', '2026-06-12 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='NGA'), (SELECT id FROM teams WHERE code='WAL'),
   (SELECT id FROM groups WHERE name='B'), 'group', 'Arrowhead Stadium', 'Kansas City', '2026-06-13 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='MEX'), (SELECT id FROM teams WHERE code='NGA'),
   (SELECT id FROM groups WHERE name='B'), 'group', 'Estadio AKRON', 'Guadalajara', '2026-06-18 00:00:00+00'),
  ((SELECT id FROM teams WHERE code='BRA'), (SELECT id FROM teams WHERE code='WAL'),
   (SELECT id FROM groups WHERE name='B'), 'group', 'Rose Bowl', 'Pasadena', '2026-06-18 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='MEX'), (SELECT id FROM teams WHERE code='WAL'),
   (SELECT id FROM groups WHERE name='B'), 'group', 'Estadio BBVA', 'Monterrey', '2026-06-23 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='BRA'), (SELECT id FROM teams WHERE code='NGA'),
   (SELECT id FROM groups WHERE name='B'), 'group', 'Allegiant Stadium', 'Las Vegas', '2026-06-23 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP C: Argentina, France, Ghana, Ukraine ───────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='ARG'), (SELECT id FROM teams WHERE code='FRA'),
   (SELECT id FROM groups WHERE name='C'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-13 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='GHA'), (SELECT id FROM teams WHERE code='UKR'),
   (SELECT id FROM groups WHERE name='C'), 'group', 'Lincoln Financial Field', 'Philadelphia', '2026-06-14 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='ARG'), (SELECT id FROM teams WHERE code='GHA'),
   (SELECT id FROM groups WHERE name='C'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-06-19 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='FRA'), (SELECT id FROM teams WHERE code='UKR'),
   (SELECT id FROM groups WHERE name='C'), 'group', 'State Farm Stadium', 'Glendale', '2026-06-19 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='ARG'), (SELECT id FROM teams WHERE code='UKR'),
   (SELECT id FROM groups WHERE name='C'), 'group', 'Gillette Stadium', 'Foxborough', '2026-06-24 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='FRA'), (SELECT id FROM teams WHERE code='GHA'),
   (SELECT id FROM groups WHERE name='C'), 'group', 'AT&T Stadium', 'Arlington', '2026-06-24 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP D: England, Spain, Ivory Coast, Turkey ─────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='ENG'), (SELECT id FROM teams WHERE code='ESP'),
   (SELECT id FROM groups WHERE name='D'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-14 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='CIV'), (SELECT id FROM teams WHERE code='TUR'),
   (SELECT id FROM groups WHERE name='D'), 'group', 'Rose Bowl', 'Pasadena', '2026-06-15 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='ENG'), (SELECT id FROM teams WHERE code='CIV'),
   (SELECT id FROM groups WHERE name='D'), 'group', 'Allegiant Stadium', 'Las Vegas', '2026-06-20 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='ESP'), (SELECT id FROM teams WHERE code='TUR'),
   (SELECT id FROM groups WHERE name='D'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-06-20 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='ENG'), (SELECT id FROM teams WHERE code='TUR'),
   (SELECT id FROM groups WHERE name='D'), 'group', 'BC Place', 'Vancouver', '2026-06-25 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='ESP'), (SELECT id FROM teams WHERE code='CIV'),
   (SELECT id FROM groups WHERE name='D'), 'group', 'BMO Field', 'Toronto', '2026-06-25 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP E: Germany, Portugal, Cameroon, Slovakia ───────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='GER'), (SELECT id FROM teams WHERE code='POR'),
   (SELECT id FROM groups WHERE name='E'), 'group', 'Arrowhead Stadium', 'Kansas City', '2026-06-15 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='CMR'), (SELECT id FROM teams WHERE code='SVK'),
   (SELECT id FROM groups WHERE name='E'), 'group', 'Levi''s Stadium', 'Santa Clara', '2026-06-16 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='GER'), (SELECT id FROM teams WHERE code='CMR'),
   (SELECT id FROM groups WHERE name='E'), 'group', 'Lincoln Financial Field', 'Philadelphia', '2026-06-21 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='POR'), (SELECT id FROM teams WHERE code='SVK'),
   (SELECT id FROM groups WHERE name='E'), 'group', 'Estadio Azteca', 'Mexico City', '2026-06-21 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='GER'), (SELECT id FROM teams WHERE code='SVK'),
   (SELECT id FROM groups WHERE name='E'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-26 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='POR'), (SELECT id FROM teams WHERE code='CMR'),
   (SELECT id FROM groups WHERE name='E'), 'group', 'State Farm Stadium', 'Glendale', '2026-06-26 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP F: Netherlands, Italy, Algeria, Poland ─────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='NED'), (SELECT id FROM teams WHERE code='ITA'),
   (SELECT id FROM groups WHERE name='F'), 'group', 'AT&T Stadium', 'Arlington', '2026-06-16 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='ALG'), (SELECT id FROM teams WHERE code='POL'),
   (SELECT id FROM groups WHERE name='F'), 'group', 'Allegiant Stadium', 'Las Vegas', '2026-06-17 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='NED'), (SELECT id FROM teams WHERE code='ALG'),
   (SELECT id FROM groups WHERE name='F'), 'group', 'Rose Bowl', 'Pasadena', '2026-06-22 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='ITA'), (SELECT id FROM teams WHERE code='POL'),
   (SELECT id FROM groups WHERE name='F'), 'group', 'Arrowhead Stadium', 'Kansas City', '2026-06-22 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='NED'), (SELECT id FROM teams WHERE code='POL'),
   (SELECT id FROM groups WHERE name='F'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-06-27 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='ITA'), (SELECT id FROM teams WHERE code='ALG'),
   (SELECT id FROM groups WHERE name='F'), 'group', 'Levi''s Stadium', 'Santa Clara', '2026-06-27 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP G: Belgium, Croatia, Egypt, Serbia ─────────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='BEL'), (SELECT id FROM teams WHERE code='CRO'),
   (SELECT id FROM groups WHERE name='G'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-18 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='EGY'), (SELECT id FROM teams WHERE code='SRB'),
   (SELECT id FROM groups WHERE name='G'), 'group', 'Gillette Stadium', 'Foxborough', '2026-06-18 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='BEL'), (SELECT id FROM teams WHERE code='EGY'),
   (SELECT id FROM groups WHERE name='G'), 'group', 'AT&T Stadium', 'Arlington', '2026-06-23 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='CRO'), (SELECT id FROM teams WHERE code='SRB'),
   (SELECT id FROM groups WHERE name='G'), 'group', 'Lincoln Financial Field', 'Philadelphia', '2026-06-23 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='BEL'), (SELECT id FROM teams WHERE code='SRB'),
   (SELECT id FROM groups WHERE name='G'), 'group', 'Estadio AKRON', 'Guadalajara', '2026-06-28 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='CRO'), (SELECT id FROM teams WHERE code='EGY'),
   (SELECT id FROM groups WHERE name='G'), 'group', 'Estadio BBVA', 'Monterrey', '2026-06-28 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP H: Senegal, Morocco, Tunisia, Costa Rica ───────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='SEN'), (SELECT id FROM teams WHERE code='MAR'),
   (SELECT id FROM groups WHERE name='H'), 'group', 'Arrowhead Stadium', 'Kansas City', '2026-06-19 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='TUN'), (SELECT id FROM teams WHERE code='CRC'),
   (SELECT id FROM groups WHERE name='H'), 'group', 'BC Place', 'Vancouver', '2026-06-19 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='SEN'), (SELECT id FROM teams WHERE code='TUN'),
   (SELECT id FROM groups WHERE name='H'), 'group', 'Rose Bowl', 'Pasadena', '2026-06-24 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='MAR'), (SELECT id FROM teams WHERE code='CRC'),
   (SELECT id FROM groups WHERE name='H'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-06-24 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='SEN'), (SELECT id FROM teams WHERE code='CRC'),
   (SELECT id FROM groups WHERE name='H'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-29 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='MAR'), (SELECT id FROM teams WHERE code='TUN'),
   (SELECT id FROM groups WHERE name='H'), 'group', 'AT&T Stadium', 'Arlington', '2026-06-29 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP I: Japan, South Korea, Iran, Peru ──────────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='JPN'), (SELECT id FROM teams WHERE code='KOR'),
   (SELECT id FROM groups WHERE name='I'), 'group', 'Allegiant Stadium', 'Las Vegas', '2026-06-20 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='IRN'), (SELECT id FROM teams WHERE code='PER'),
   (SELECT id FROM groups WHERE name='I'), 'group', 'Levi''s Stadium', 'Santa Clara', '2026-06-20 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='JPN'), (SELECT id FROM teams WHERE code='IRN'),
   (SELECT id FROM groups WHERE name='I'), 'group', 'Gillette Stadium', 'Foxborough', '2026-06-25 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='KOR'), (SELECT id FROM teams WHERE code='PER'),
   (SELECT id FROM groups WHERE name='I'), 'group', 'BMO Field', 'Toronto', '2026-06-25 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='JPN'), (SELECT id FROM teams WHERE code='PER'),
   (SELECT id FROM groups WHERE name='I'), 'group', 'Estadio Azteca', 'Mexico City', '2026-06-30 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='KOR'), (SELECT id FROM teams WHERE code='IRN'),
   (SELECT id FROM groups WHERE name='I'), 'group', 'Arrowhead Stadium', 'Kansas City', '2026-06-30 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP J: Australia, Denmark, Saudi Arabia, Chile ─────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='AUS'), (SELECT id FROM teams WHERE code='DEN'),
   (SELECT id FROM groups WHERE name='J'), 'group', 'State Farm Stadium', 'Glendale', '2026-06-21 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='KSA'), (SELECT id FROM teams WHERE code='CHL'),
   (SELECT id FROM groups WHERE name='J'), 'group', 'Lincoln Financial Field', 'Philadelphia', '2026-06-21 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='AUS'), (SELECT id FROM teams WHERE code='KSA'),
   (SELECT id FROM groups WHERE name='J'), 'group', 'Rose Bowl', 'Pasadena', '2026-06-26 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='DEN'), (SELECT id FROM teams WHERE code='CHL'),
   (SELECT id FROM groups WHERE name='J'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-06-26 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='AUS'), (SELECT id FROM teams WHERE code='CHL'),
   (SELECT id FROM groups WHERE name='J'), 'group', 'BC Place', 'Vancouver', '2026-07-01 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='DEN'), (SELECT id FROM teams WHERE code='KSA'),
   (SELECT id FROM groups WHERE name='J'), 'group', 'Estadio AKRON', 'Guadalajara', '2026-07-01 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP K: Switzerland, Austria, Qatar, Scotland ───────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='SWI'), (SELECT id FROM teams WHERE code='AUT'),
   (SELECT id FROM groups WHERE name='K'), 'group', 'MetLife Stadium', 'East Rutherford', '2026-06-22 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='QAT'), (SELECT id FROM teams WHERE code='SCO'),
   (SELECT id FROM groups WHERE name='K'), 'group', 'AT&T Stadium', 'Arlington', '2026-06-22 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='SWI'), (SELECT id FROM teams WHERE code='QAT'),
   (SELECT id FROM groups WHERE name='K'), 'group', 'Allegiant Stadium', 'Las Vegas', '2026-06-27 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='AUT'), (SELECT id FROM teams WHERE code='SCO'),
   (SELECT id FROM groups WHERE name='K'), 'group', 'Levi''s Stadium', 'Santa Clara', '2026-06-27 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='SWI'), (SELECT id FROM teams WHERE code='SCO'),
   (SELECT id FROM groups WHERE name='K'), 'group', 'Arrowhead Stadium', 'Kansas City', '2026-07-02 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='AUT'), (SELECT id FROM teams WHERE code='QAT'),
   (SELECT id FROM groups WHERE name='K'), 'group', 'Gillette Stadium', 'Foxborough', '2026-07-02 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── GROUP L: Colombia, Ecuador, Greece, Venezuela ────────────────────────────
INSERT INTO matches (home_team_id, away_team_id, group_id, stage, venue, city, scheduled_at) VALUES
  ((SELECT id FROM teams WHERE code='COL'), (SELECT id FROM teams WHERE code='ECU'),
   (SELECT id FROM groups WHERE name='L'), 'group', 'BMO Field', 'Toronto', '2026-06-23 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='GRE'), (SELECT id FROM teams WHERE code='VEN'),
   (SELECT id FROM groups WHERE name='L'), 'group', 'State Farm Stadium', 'Glendale', '2026-06-23 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='COL'), (SELECT id FROM teams WHERE code='GRE'),
   (SELECT id FROM groups WHERE name='L'), 'group', 'BC Place', 'Vancouver', '2026-06-28 01:00:00+00'),
  ((SELECT id FROM teams WHERE code='ECU'), (SELECT id FROM teams WHERE code='VEN'),
   (SELECT id FROM groups WHERE name='L'), 'group', 'Lincoln Financial Field', 'Philadelphia', '2026-06-28 23:00:00+00'),
  ((SELECT id FROM teams WHERE code='COL'), (SELECT id FROM teams WHERE code='VEN'),
   (SELECT id FROM groups WHERE name='L'), 'group', 'Rose Bowl', 'Pasadena', '2026-07-03 02:00:00+00'),
  ((SELECT id FROM teams WHERE code='ECU'), (SELECT id FROM teams WHERE code='GRE'),
   (SELECT id FROM groups WHERE name='L'), 'group', 'SoFi Stadium', 'Los Angeles', '2026-07-03 02:00:00+00')
ON CONFLICT DO NOTHING;

-- ── ROUND OF 32 (16 matches, July 5-8) — TBD teams ──────────────────────────
INSERT INTO matches (stage, venue, city, scheduled_at) VALUES
  ('round_of_32', 'MetLife Stadium',        'East Rutherford', '2026-07-05 18:00:00+00'),
  ('round_of_32', 'SoFi Stadium',           'Los Angeles',     '2026-07-05 22:00:00+00'),
  ('round_of_32', 'AT&T Stadium',           'Arlington',       '2026-07-06 02:00:00+00'),
  ('round_of_32', 'Rose Bowl',              'Pasadena',        '2026-07-06 18:00:00+00'),
  ('round_of_32', 'Allegiant Stadium',      'Las Vegas',       '2026-07-06 22:00:00+00'),
  ('round_of_32', 'Levi''s Stadium',        'Santa Clara',     '2026-07-07 02:00:00+00'),
  ('round_of_32', 'Arrowhead Stadium',      'Kansas City',     '2026-07-07 18:00:00+00'),
  ('round_of_32', 'Gillette Stadium',       'Foxborough',      '2026-07-07 22:00:00+00'),
  ('round_of_32', 'Lincoln Financial Field','Philadelphia',    '2026-07-08 02:00:00+00'),
  ('round_of_32', 'State Farm Stadium',     'Glendale',        '2026-07-08 18:00:00+00'),
  ('round_of_32', 'BC Place',              'Vancouver',       '2026-07-08 22:00:00+00'),
  ('round_of_32', 'BMO Field',             'Toronto',         '2026-07-09 02:00:00+00'),
  ('round_of_32', 'Estadio Azteca',        'Mexico City',     '2026-07-09 18:00:00+00'),
  ('round_of_32', 'Estadio AKRON',         'Guadalajara',     '2026-07-09 22:00:00+00'),
  ('round_of_32', 'Estadio BBVA',          'Monterrey',       '2026-07-10 02:00:00+00'),
  ('round_of_32', 'MetLife Stadium',        'East Rutherford', '2026-07-10 22:00:00+00')
ON CONFLICT DO NOTHING;

-- ── ROUND OF 16 (8 matches, July 11-14) — TBD teams ─────────────────────────
INSERT INTO matches (stage, venue, city, scheduled_at) VALUES
  ('round_of_16', 'MetLife Stadium',   'East Rutherford', '2026-07-11 18:00:00+00'),
  ('round_of_16', 'SoFi Stadium',      'Los Angeles',     '2026-07-11 22:00:00+00'),
  ('round_of_16', 'AT&T Stadium',      'Arlington',       '2026-07-12 02:00:00+00'),
  ('round_of_16', 'Rose Bowl',         'Pasadena',        '2026-07-12 22:00:00+00'),
  ('round_of_16', 'Allegiant Stadium', 'Las Vegas',       '2026-07-13 02:00:00+00'),
  ('round_of_16', 'Arrowhead Stadium', 'Kansas City',     '2026-07-13 22:00:00+00'),
  ('round_of_16', 'Levi''s Stadium',   'Santa Clara',     '2026-07-14 02:00:00+00'),
  ('round_of_16', 'MetLife Stadium',   'East Rutherford', '2026-07-14 22:00:00+00')
ON CONFLICT DO NOTHING;

-- ── QUARTER-FINALS (4 matches, July 16-17) — TBD teams ──────────────────────
INSERT INTO matches (stage, venue, city, scheduled_at) VALUES
  ('quarter', 'MetLife Stadium', 'East Rutherford', '2026-07-16 18:00:00+00'),
  ('quarter', 'SoFi Stadium',    'Los Angeles',     '2026-07-16 22:00:00+00'),
  ('quarter', 'AT&T Stadium',    'Arlington',       '2026-07-17 18:00:00+00'),
  ('quarter', 'Rose Bowl',       'Pasadena',        '2026-07-17 22:00:00+00')
ON CONFLICT DO NOTHING;

-- ── SEMI-FINALS (2 matches, July 20-21) — TBD teams ─────────────────────────
INSERT INTO matches (stage, venue, city, scheduled_at) VALUES
  ('semi', 'MetLife Stadium', 'East Rutherford', '2026-07-20 22:00:00+00'),
  ('semi', 'SoFi Stadium',    'Los Angeles',     '2026-07-21 22:00:00+00')
ON CONFLICT DO NOTHING;

-- ── THIRD PLACE (1 match, July 25) ──────────────────────────────────────────
INSERT INTO matches (stage, venue, city, scheduled_at) VALUES
  ('third_place', 'AT&T Stadium', 'Arlington', '2026-07-25 22:00:00+00')
ON CONFLICT DO NOTHING;

-- ── FINAL (1 match, July 26) ─────────────────────────────────────────────────
INSERT INTO matches (stage, venue, city, scheduled_at) VALUES
  ('final', 'MetLife Stadium', 'East Rutherford', '2026-07-26 22:00:00+00')
ON CONFLICT DO NOTHING;
