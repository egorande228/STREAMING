'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { useTranslations } from 'next-intl';

interface TeamLite {
  id?: number;
  code?: string;
  name_en?: string;
  name_ru?: string;
}

interface Match {
  id: number;
  home_team?: TeamLite | null;
  away_team?: TeamLite | null;
  home_team_id?: number | null;
  away_team_id?: number | null;
  group_id?: number | null;
  scheduled_at: string;
  venue: string;
  city: string;
  stage: string;
  status: string;
  home_score: number;
  away_score: number;
  minute?: number | null;
}

const STAGE_OPTIONS = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'] as const;
const STATUS_OPTIONS = ['scheduled', 'live', 'half_time', 'finished', 'postponed'] as const;

const emptyForm = {
  home_team_id: '',
  away_team_id: '',
  group_id: '',
  scheduled_at: '',
  venue: '',
  city: '',
  stage: 'group',
  status: 'scheduled',
  home_score: '0',
  away_score: '0',
  minute: '',
  stream_redirect_url: '',
};

function toDateTimeLocal(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function teamLabel(team: TeamLite | null | undefined, teamID: number | null | undefined, tbd: string): string {
  if (!team) return teamID ? String(teamID) : tbd;
  return team.name_en ?? team.code ?? (teamID ? String(teamID) : tbd);
}

export default function AdminMatchesPage() {
  const t = useTranslations('admin.matches');
  const tCommon = useTranslations('admin.common');
  const [matches, setMatches] = useState<Match[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editID, setEditID] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [scoreEdit, setScoreEdit] = useState<{ id: number; home: number; away: number; status: string; minute: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await adminApi.matches.list();
    setMatches(Array.isArray(data) ? data : data.matches ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditID(null);
    setShowForm(false);
  }

  function startEdit(m: Match) {
    setEditID(m.id);
    setForm({
      home_team_id: String(m.home_team_id ?? m.home_team?.id ?? ''),
      away_team_id: String(m.away_team_id ?? m.away_team?.id ?? ''),
      group_id: m.group_id ? String(m.group_id) : '',
      scheduled_at: toDateTimeLocal(m.scheduled_at),
      venue: m.venue ?? '',
      city: m.city ?? '',
      stage: m.stage ?? 'group',
      status: m.status ?? 'scheduled',
      home_score: String(m.home_score ?? 0),
      away_score: String(m.away_score ?? 0),
      minute: m.minute != null ? String(m.minute) : '',
      stream_redirect_url: (m as Match & { stream_redirect_url?: string }).stream_redirect_url ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const scheduledAtISO = new Date(form.scheduled_at).toISOString();
      if (Number.isNaN(new Date(scheduledAtISO).getTime())) {
        throw new Error(t('invalidDateTime'));
      }

      const payload = {
        home_team_id: Number(form.home_team_id),
        away_team_id: Number(form.away_team_id),
        group_id: form.group_id ? Number(form.group_id) : null,
        stage: form.stage,
        venue: form.venue,
        city: form.city,
        scheduled_at: scheduledAtISO,
        status: form.status,
        home_score: Number(form.home_score || 0),
        away_score: Number(form.away_score || 0),
        minute: form.minute === '' ? null : Number(form.minute),
        stream_redirect_url: form.stream_redirect_url,
      };

      if (editID !== null) {
        await adminApi.matches.update(editID, payload);
      } else {
        await adminApi.matches.create(payload);
      }

      resetForm();
      await load();
      setMsg(editID !== null ? t('updated') : t('created'));
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t('deleteConfirm'))) return;
    await adminApi.matches.delete(id);
    await load();
  }

  async function handleScorePush() {
    if (!scoreEdit) return;
    await adminApi.matches.updateScore(scoreEdit.id, scoreEdit.home, scoreEdit.away, scoreEdit.status, scoreEdit.minute);
    setMsg(t('scorePushed'));
    setTimeout(() => setMsg(''), 2000);
    setScoreEdit(null);
    await load();
  }

  async function handleQuickStatus(match: Match, status: 'live' | 'half_time' | 'finished') {
    setError('');
    try {
      const minuteByStatus = {
        live: Math.max(1, match.minute ?? 1),
        half_time: Math.max(45, match.minute ?? 45),
        finished: Math.max(90, match.minute ?? 90),
      } as const;

      await adminApi.matches.updateScore(
        match.id,
        match.home_score,
        match.away_score,
        status,
        minuteByStatus[status]
      );

      setMsg(t('quickStatusMessage', { id: match.id, status: t(`statuses.${status}`) }));
      setTimeout(() => setMsg(''), 2000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateStatusError'));
    }
  }

  return (
    <div className="text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('title', { count: matches.length })}</h1>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditID(null);
              setForm(emptyForm);
              setShowForm(true);
            }
          }}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-700"
        >
          {showForm ? tCommon('closeForm') : t('add')}
        </button>
      </div>

      {msg && <p className="mb-2 text-green-400">{msg}</p>}
      {error && <p className="mb-2 text-red-400">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-2 gap-3 rounded bg-gray-800 p-4">
          <label className="col-span-2 text-sm font-semibold">{editID !== null ? t('edit') : t('create')}</label>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.homeTeamId')}</p>
            <input
              value={form.home_team_id}
              onChange={(e) => setForm({ ...form, home_team_id: e.target.value })}
              type="number"
              min={1}
              required
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.awayTeamId')}</p>
            <input
              value={form.away_team_id}
              onChange={(e) => setForm({ ...form, away_team_id: e.target.value })}
              type="number"
              min={1}
              required
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.groupIdOptional')}</p>
            <input
              value={form.group_id}
              onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              type="number"
              min={1}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.dateTime')}</p>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              required
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.venue')}</p>
            <input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.city')}</p>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.stage')}</p>
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {t(`stages.${stage}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.status')}</p>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.homeScore')}</p>
            <input
              type="number"
              min={0}
              value={form.home_score}
              onChange={(e) => setForm({ ...form, home_score: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.awayScore')}</p>
            <input
              type="number"
              min={0}
              value={form.away_score}
              onChange={(e) => setForm({ ...form, away_score: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.minuteOptional')}</p>
            <input
              type="number"
              min={0}
              value={form.minute}
              onChange={(e) => setForm({ ...form, minute: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div className="col-span-2">
            <p className="mb-1 text-xs text-gray-400">{t('form.streamRedirectUrl')}</p>
            <input
              type="url"
              value={form.stream_redirect_url}
              onChange={(e) => setForm({ ...form, stream_redirect_url: e.target.value })}
              placeholder={t('form.streamRedirectPlaceholder')}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-500"
            />
          </div>

          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-green-600 px-4 py-1.5 text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? tCommon('saving') : tCommon('save')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded bg-gray-600 px-4 py-1.5 text-sm hover:bg-gray-700"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      {scoreEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded bg-gray-800 p-4">
          <span className="text-sm font-semibold">{t('liveScoreTitle', { id: scoreEdit.id })}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setScoreEdit({ ...scoreEdit, home: Math.max(0, scoreEdit.home - 1) })} className="rounded bg-gray-600 px-2 py-0.5">-</button>
            <span className="w-6 text-center">{scoreEdit.home}</span>
            <button onClick={() => setScoreEdit({ ...scoreEdit, home: scoreEdit.home + 1 })} className="rounded bg-gray-600 px-2 py-0.5">+</button>
            <span className="mx-1 text-gray-400">:</span>
            <button onClick={() => setScoreEdit({ ...scoreEdit, away: Math.max(0, scoreEdit.away - 1) })} className="rounded bg-gray-600 px-2 py-0.5">-</button>
            <span className="w-6 text-center">{scoreEdit.away}</span>
            <button onClick={() => setScoreEdit({ ...scoreEdit, away: scoreEdit.away + 1 })} className="rounded bg-gray-600 px-2 py-0.5">+</button>
          </div>

          <input
            type="number"
            min={0}
            value={scoreEdit.minute}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              setScoreEdit({ ...scoreEdit, minute: Number.isNaN(parsed) ? 0 : parsed });
            }}
            className="w-20 rounded bg-gray-700 px-2 py-1 text-sm text-white"
            aria-label={t('form.minute')}
          />

          <select
            value={scoreEdit.status}
            onChange={(e) => setScoreEdit({ ...scoreEdit, status: e.target.value })}
            className="rounded bg-gray-700 px-2 py-1 text-sm text-white"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>

          <button onClick={handleScorePush} className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700">
            {t('pushLive')}
          </button>
          <button onClick={() => setScoreEdit(null)} className="rounded bg-gray-600 px-3 py-1 text-sm">
            {tCommon('cancel')}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="py-2 pr-3 text-left">{tCommon('id')}</th>
              <th className="py-2 pr-3 text-left">{t('table.home')}</th>
              <th className="py-2 pr-3 text-left">{t('table.away')}</th>
              <th className="py-2 pr-3 text-left">{t('table.score')}</th>
              <th className="py-2 pr-3 text-left">{t('table.date')}</th>
              <th className="py-2 pr-3 text-left">{t('table.stage')}</th>
              <th className="py-2 pr-3 text-left">{t('table.status')}</th>
              <th className="py-2 text-left">{tCommon('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} className="border-b border-gray-800 hover:bg-gray-900">
                <td className="py-1.5 pr-3 text-gray-400">{m.id}</td>
                <td className="py-1.5 pr-3">{teamLabel(m.home_team, m.home_team_id, t('tbd'))}</td>
                <td className="py-1.5 pr-3">{teamLabel(m.away_team, m.away_team_id, t('tbd'))}</td>
                <td className="py-1.5 pr-3 font-mono">
                  {m.home_score}:{m.away_score}
                </td>
                <td className="py-1.5 pr-3 text-gray-400">{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '-'}</td>
                <td className="py-1.5 pr-3 text-gray-400">{t(`stages.${m.stage}`)}</td>
                <td className="py-1.5 pr-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      m.status === 'live'
                        ? 'bg-red-600'
                        : m.status === 'finished'
                        ? 'bg-gray-600'
                        : 'bg-blue-900 text-blue-300'
                    }`}
                  >
                    {t(`statuses.${m.status}`)}
                  </span>
                </td>
                <td className="flex gap-1.5 py-1.5">
                  <button onClick={() => startEdit(m)} className="text-xs text-blue-400 hover:text-blue-300">
                    {tCommon('edit')}
                  </button>
                  {m.status !== 'live' && m.status !== 'finished' && (
                    <button
                      onClick={() => handleQuickStatus(m, 'live')}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      {t('start')}
                    </button>
                  )}
                  {m.status === 'live' && (
                    <button
                      onClick={() => handleQuickStatus(m, 'half_time')}
                      className="text-xs text-orange-400 hover:text-orange-300"
                    >
                      {t('halftime')}
                    </button>
                  )}
                  {m.status !== 'finished' && (
                    <button
                      onClick={() => handleQuickStatus(m, 'finished')}
                      className="text-xs text-fuchsia-400 hover:text-fuchsia-300"
                    >
                      {t('end')}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setScoreEdit({
                        id: m.id,
                        home: m.home_score,
                        away: m.away_score,
                        status: m.status,
                        minute: m.minute ?? 0,
                      })
                    }
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    {t('score')}
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-xs text-red-400 hover:text-red-300">
                    {tCommon('delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
