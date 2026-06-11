'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { useTranslations } from 'next-intl';

interface Stream {
  id: number;
  match_id: number;
  label: string;
  source_type: 'hls' | 'iframe';
  quality: string;
  language_code: string;
  url: string;
  priority: number;
  region: string;
  commentary_type: string;
  is_active: boolean;
}

const emptyForm = {
  match_id: '',
  label: '',
  source_type: 'hls',
  quality: '720p',
  language_code: 'en',
  url: '',
  priority: '1',
  region: 'global',
  commentary_type: 'full',
  is_active: true,
};

export default function AdminStreamsPage() {
  const t = useTranslations('admin.streams');
  const tCommon = useTranslations('admin.common');
  const [streams, setStreams] = useState<Stream[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editID, setEditID] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function extractApiError(data: unknown): string | null {
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const apiError = (data as { error?: unknown }).error;
      if (typeof apiError === 'string' && apiError.trim()) return apiError;
    }
    return null;
  }

  const load = useCallback(async () => {
    try {
      const data = await adminApi.streams.list();
      const apiError = extractApiError(data);
      if (apiError) throw new Error(apiError);
      setStreams(Array.isArray(data) ? data : data.streams ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(stream: Stream) {
    setEditID(stream.id);
    setForm({
      match_id: String(stream.match_id),
      label: stream.label,
      source_type: stream.source_type ?? 'hls',
      quality: stream.quality,
      language_code: stream.language_code,
      url: stream.url,
      priority: String(stream.priority),
      region: stream.region,
      commentary_type: stream.commentary_type,
      is_active: stream.is_active,
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditID(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        match_id: Number(form.match_id),
        priority: Number(form.priority),
      };

      const res = editID !== null
        ? await adminApi.streams.update(editID, payload)
        : await adminApi.streams.create(payload);

      const apiError = extractApiError(res);
      if (apiError) throw new Error(apiError);

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
    setError('');
    try {
      await adminApi.streams.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
    }
  }

  return (
    <div className="text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('title', { count: streams.length })}</h1>
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
            <p className="mb-1 text-xs text-gray-400">{t('form.matchId')}</p>
            <input
              value={form.match_id}
              onChange={(e) => setForm({ ...form, match_id: e.target.value })}
              type="number"
              min={1}
              required
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.label')}</p>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div className="col-span-2">
            <p className="mb-1 text-xs text-gray-400">{form.source_type === 'iframe' ? t('form.iframeUrl') : t('form.hlsUrl')}</p>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.sourceType')}</p>
            <select
              value={form.source_type}
              onChange={(e) => setForm({ ...form, source_type: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              <option value="hls">{t('sourceTypes.hls')}</option>
              <option value="iframe">{t('sourceTypes.iframe')}</option>
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.quality')}</p>
            <select
              value={form.quality}
              onChange={(e) => setForm({ ...form, quality: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              {['480p', '720p', '1080p', '4K'].map((quality) => (
                <option key={quality}>{quality}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.language')}</p>
            <select
              value={form.language_code}
              onChange={(e) => setForm({ ...form, language_code: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              {['en', 'ru', 'es', 'pt', 'ar', 'fr', 'de', 'zh', 'ja', 'ko'].map((language) => (
                <option key={language} value={language}>{tCommon(`languages.${language}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.region')}</p>
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              {['global', 'eu', 'us', 'asia', 'mena'].map((region) => (
                <option key={region} value={region}>{t(`regions.${region}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.commentary')}</p>
            <select
              value={form.commentary_type}
              onChange={(e) => setForm({ ...form, commentary_type: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              {['full', 'no_commentary', 'home_team'].map((commentaryType) => (
                <option key={commentaryType} value={commentaryType}>{t(`commentaryTypes.${commentaryType}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">{t('form.priority')}</p>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>

          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            {tCommon('active')}
          </label>

          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-green-600 px-4 py-1.5 text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? tCommon('saving') : tCommon('save')}
            </button>
            <button type="button" onClick={resetForm} className="rounded bg-gray-600 px-4 py-1.5 text-sm hover:bg-gray-700">
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="py-2 pr-3 text-left">{tCommon('id')}</th>
              <th className="py-2 pr-3 text-left">{t('table.match')}</th>
              <th className="py-2 pr-3 text-left">{t('table.label')}</th>
              <th className="py-2 pr-3 text-left">{t('table.type')}</th>
              <th className="py-2 pr-3 text-left">{t('table.quality')}</th>
              <th className="py-2 pr-3 text-left">{t('table.language')}</th>
              <th className="py-2 pr-3 text-left">{t('table.region')}</th>
              <th className="py-2 pr-3 text-left">{t('table.active')}</th>
              <th className="py-2 pr-3 text-left">{t('table.url')}</th>
              <th className="py-2 text-left">{tCommon('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr key={stream.id} className="border-b border-gray-800 hover:bg-gray-900">
                <td className="py-1.5 pr-3 text-gray-400">{stream.id}</td>
                <td className="py-1.5 pr-3">{stream.match_id}</td>
                <td className="py-1.5 pr-3">{stream.label}</td>
                <td className="py-1.5 pr-3 text-gray-400">{t(`sourceTypes.${stream.source_type ?? 'hls'}`)}</td>
                <td className="py-1.5 pr-3">{stream.quality}</td>
                <td className="py-1.5 pr-3">{tCommon(`languages.${stream.language_code}`)}</td>
                <td className="py-1.5 pr-3 text-gray-400">{t(`regions.${stream.region}`)}</td>
                <td className="py-1.5 pr-3">{stream.is_active ? tCommon('yes') : tCommon('no')}</td>
                <td className="max-w-xs truncate py-1.5 pr-3 font-mono text-xs text-gray-400">{stream.url}</td>
                <td className="flex gap-1.5 py-1.5">
                  <button onClick={() => startEdit(stream)} className="text-xs text-blue-400 hover:text-blue-300">
                    {tCommon('edit')}
                  </button>
                  <button onClick={() => handleDelete(stream.id)} className="text-xs text-red-400 hover:text-red-300">
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
