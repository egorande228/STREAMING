-- FIFA World Cup 2026 - 48 Teams, 12 Groups (A-L, 4 teams per group)
-- Host nations: USA (Group A), Canada (Group A), Mexico (Group B)

INSERT INTO groups (name) VALUES
  ('A'),('B'),('C'),('D'),('E'),('F'),
  ('G'),('H'),('I'),('J'),('K'),('L')
ON CONFLICT DO NOTHING;

-- Group A (USA/Canada host group)
INSERT INTO teams (code, name_en, name_ru, flag_url, group_id) VALUES
  ('USA', 'United States', 'США', '🇺🇸', (SELECT id FROM groups WHERE name='A')),
  ('CAN', 'Canada', 'Канада', '🇨🇦', (SELECT id FROM groups WHERE name='A')),
  ('MEX', 'Mexico', 'Мексика', '🇲🇽', (SELECT id FROM groups WHERE name='B')),
  ('URU', 'Uruguay', 'Уругвай', '🇺🇾', (SELECT id FROM groups WHERE name='A')),
  ('PAN', 'Panama', 'Панама', '🇵🇦', (SELECT id FROM groups WHERE name='B'))
ON CONFLICT DO NOTHING;

-- Top footballing nations (distributed across groups B-L)
INSERT INTO teams (code, name_en, name_ru, flag_url, group_id) VALUES
  ('BRA', 'Brazil', 'Бразилия', '🇧🇷', (SELECT id FROM groups WHERE name='B')),
  ('ARG', 'Argentina', 'Аргентина', '🇦🇷', (SELECT id FROM groups WHERE name='C')),
  ('FRA', 'France', 'Франция', '🇫🇷', (SELECT id FROM groups WHERE name='C')),
  ('ENG', 'England', 'Англия', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', (SELECT id FROM groups WHERE name='D')),
  ('ESP', 'Spain', 'Испания', '🇪🇸', (SELECT id FROM groups WHERE name='D')),
  ('GER', 'Germany', 'Германия', '🇩🇪', (SELECT id FROM groups WHERE name='E')),
  ('POR', 'Portugal', 'Португалия', '🇵🇹', (SELECT id FROM groups WHERE name='E')),
  ('NED', 'Netherlands', 'Нидерланды', '🇳🇱', (SELECT id FROM groups WHERE name='F')),
  ('ITA', 'Italy', 'Италия', '🇮🇹', (SELECT id FROM groups WHERE name='F')),
  ('BEL', 'Belgium', 'Бельгия', '🇧🇪', (SELECT id FROM groups WHERE name='G')),
  ('CRO', 'Croatia', 'Хорватия', '🇭🇷', (SELECT id FROM groups WHERE name='G')),
  ('SEN', 'Senegal', 'Сенегал', '🇸🇳', (SELECT id FROM groups WHERE name='H')),
  ('MAR', 'Morocco', 'Марокко', '🇲🇦', (SELECT id FROM groups WHERE name='H')),
  ('JPN', 'Japan', 'Япония', '🇯🇵', (SELECT id FROM groups WHERE name='I')),
  ('KOR', 'South Korea', 'Южная Корея', '🇰🇷', (SELECT id FROM groups WHERE name='I')),
  ('AUS', 'Australia', 'Австралия', '🇦🇺', (SELECT id FROM groups WHERE name='J')),
  ('DEN', 'Denmark', 'Дания', '🇩🇰', (SELECT id FROM groups WHERE name='J')),
  ('SWI', 'Switzerland', 'Швейцария', '🇨🇭', (SELECT id FROM groups WHERE name='K')),
  ('AUT', 'Austria', 'Австрия', '🇦🇹', (SELECT id FROM groups WHERE name='K')),
  ('COL', 'Colombia', 'Колумбия', '🇨🇴', (SELECT id FROM groups WHERE name='L')),
  ('ECU', 'Ecuador', 'Эквадор', '🇪🇨', (SELECT id FROM groups WHERE name='L')),
  ('NGA', 'Nigeria', 'Нигерия', '🇳🇬', (SELECT id FROM groups WHERE name='B')),
  ('GHA', 'Ghana', 'Гана', '🇬🇭', (SELECT id FROM groups WHERE name='C')),
  ('CIV', 'Ivory Coast', 'Кот-д''Ивуар', '🇨🇮', (SELECT id FROM groups WHERE name='D')),
  ('CMR', 'Cameroon', 'Камерун', '🇨🇲', (SELECT id FROM groups WHERE name='E')),
  ('ALG', 'Algeria', 'Алжир', '🇩🇿', (SELECT id FROM groups WHERE name='F')),
  ('EGY', 'Egypt', 'Египет', '🇪🇬', (SELECT id FROM groups WHERE name='G')),
  ('TUN', 'Tunisia', 'Тунис', '🇹🇳', (SELECT id FROM groups WHERE name='H')),
  ('IRN', 'Iran', 'Иран', '🇮🇷', (SELECT id FROM groups WHERE name='I')),
  ('KSA', 'Saudi Arabia', 'Саудовская Аравия', '🇸🇦', (SELECT id FROM groups WHERE name='J')),
  ('QAT', 'Qatar', 'Катар', '🇶🇦', (SELECT id FROM groups WHERE name='K')),
  ('SRB', 'Serbia', 'Сербия', '🇷🇸', (SELECT id FROM groups WHERE name='G')),
  ('POL', 'Poland', 'Польша', '🇵🇱', (SELECT id FROM groups WHERE name='F')),
  ('SVK', 'Slovakia', 'Словакия', '🇸🇰', (SELECT id FROM groups WHERE name='E')),
  ('TUR', 'Turkey', 'Турция', '🇹🇷', (SELECT id FROM groups WHERE name='D')),
  ('UKR', 'Ukraine', 'Украина', '🇺🇦', (SELECT id FROM groups WHERE name='C')),
  ('WAL', 'Wales', 'Уэльс', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', (SELECT id FROM groups WHERE name='B')),
  ('SVN', 'Slovenia', 'Словения', '🇸🇮', (SELECT id FROM groups WHERE name='A')),
  ('SCO', 'Scotland', 'Шотландия', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', (SELECT id FROM groups WHERE name='K')),
  ('GRE', 'Greece', 'Греция', '🇬🇷', (SELECT id FROM groups WHERE name='L')),
  ('VEN', 'Venezuela', 'Венесуэла', '🇻🇪', (SELECT id FROM groups WHERE name='L')),
  ('CHL', 'Chile', 'Чили', '🇨🇱', (SELECT id FROM groups WHERE name='J')),
  ('PER', 'Peru', 'Перу', '🇵🇪', (SELECT id FROM groups WHERE name='I')),
  ('CRC', 'Costa Rica', 'Коста-Рика', '🇨🇷', (SELECT id FROM groups WHERE name='H')),
  ('HND', 'Honduras', 'Гондурас', '🇭🇳', (SELECT id FROM groups WHERE name='G')),
  ('NZL', 'New Zealand', 'Новая Зеландия', '🇳🇿', (SELECT id FROM groups WHERE name='F')),
  ('VAN', 'Vanuatu', 'Вануату', '🇻🇺', (SELECT id FROM groups WHERE name='E')),
  ('PHI', 'Philippines', 'Филиппины', '🇵🇭', (SELECT id FROM groups WHERE name='D'))
ON CONFLICT DO NOTHING;
