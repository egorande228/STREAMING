# Arabic club display names

Membership snapshot: **16 September 2026, season 2026/27**.
`team-names.js` contains all **20 Premier League clubs**, **20 LaLiga clubs**
and **36 Champions League league-phase clubs**: **66 distinct clubs** because
ten clubs also appear in one of the two domestic leagues.

Official roster sources:

- [Premier League: all 2026/27 club kits](https://www.premierleague.com/en/news/4658330/premier-league-club-kits-for-202627-season).
- [LaLiga: 2026/27 clubs](https://www.laliga.com/en-GB/laliga-easports/clubs).
- [UEFA: 2026/27 league-phase teams](https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/).

Arabic labels are editorial display translations, not official club identifiers.
Each entry includes an English name, Arabic label, competition membership and
explicit provider aliases (for example `Man City` / `Manchester City FC`).
Names are matched without case, accents or punctuation. Unknown names remain
as provided; short ambiguous words such as `City` are not guessed. A valid
upstream `name_ar` takes precedence.

Only the Arabic UI uses these labels. The original API objects, numeric team
and match IDs, crest lookup, stream selection and player URL construction are
not rewritten. The dictionary loads locally before `app.js`; no translation
service or additional API request is required.

Update the membership lists and aliases together at the next season change.
Champions League qualifying-round participants are outside this current
league-phase roster. Coverage and common provider aliases are checked by
`team-names.test.mjs`.
