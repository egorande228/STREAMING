'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { useTranslations } from 'next-intl';

interface Mirror {
  id: number;
  domain: string;
  region: string;
  priority: number;
  is_primary: boolean;
  is_active: boolean;
  health_status: string;
  last_checked_at: string | null;
}

const emptyForm = { domain: '', region: 'global', priority: '1' };

export default function AdminMirrorsPage() {
  const t = useTranslations('admin.mirrors');
  const tCommon = useTranslations('admin.common');
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await adminApi.mirrors.list();
    setMirrors(Array.isArray(data) ? data : data.mirrors ?? []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(m: Mirror) {
    setEditId(m.id);
    setForm({ domain: m.domain, region: m.region, priority: String(m.priority) });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, priority: Number(form.priority) };
    if (editId) {
      await adminApi.mirrors.update(editId, payload);
    } else {
      await adminApi.mirrors.create(payload);
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setLoading(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm(t('deleteConfirm'))) return;
    await adminApi.mirrors.delete(id);
    load();
  }

  async function handleActivate(id: number, domain: string) {
    if (!confirm(t('activateConfirm', { domain }))) return;
    await adminApi.mirrors.activate(id);
    load();
  }

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('title', { count: mirrors.length })}</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm">
          {t('add')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('form.domain')}</p>
            <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}
              placeholder={t('form.domainPlaceholder')} required
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-52" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('form.region')}</p>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm">
              {['global', 'eu', 'us', 'asia', 'mena'].map((region) => (
                <option key={region} value={region}>{t(`regions.${region}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('form.priority')}</p>
            <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-16" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded text-sm disabled:opacity-50">
            {loading ? tCommon('saving') : tCommon('save')}
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-1.5 rounded text-sm">{tCommon('cancel')}</button>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2 pr-4">{t('table.domain')}</th>
            <th className="text-left py-2 pr-4">{t('table.region')}</th>
            <th className="text-left py-2 pr-4">{t('table.priority')}</th>
            <th className="text-left py-2 pr-4">{t('table.primary')}</th>
            <th className="text-left py-2 pr-4">{t('table.status')}</th>
            <th className="text-left py-2 pr-4">{t('table.lastCheck')}</th>
            <th className="text-left py-2">{tCommon('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {mirrors.map((m) => (
            <tr key={m.id} className={`border-b border-gray-800 hover:bg-gray-900 ${m.is_primary ? 'bg-gray-900' : ''}`}>
              <td className="py-1.5 pr-4 font-mono text-blue-300">
                {m.domain}
                {m.is_primary && <span className="ml-2 text-yellow-400 text-xs">★</span>}
              </td>
              <td className="py-1.5 pr-4 text-gray-400">{m.region}</td>
              <td className="py-1.5 pr-4">{m.priority}</td>
              <td className="py-1.5 pr-4">
                {m.is_primary
                  ? <span className="px-2 py-0.5 rounded text-xs bg-yellow-700 text-yellow-100">{t('primary')}</span>
                  : <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">{t('standby')}</span>}
              </td>
              <td className="py-1.5 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs ${m.health_status === 'healthy' ? 'bg-green-700' : m.health_status === 'unreachable' ? 'bg-red-700' : 'bg-gray-600'}`}>
                  {t(`statuses.${m.health_status ?? 'unknown'}`)}
                </span>
              </td>
              <td className="py-1.5 pr-4 text-gray-500 text-xs">
                {m.last_checked_at ? new Date(m.last_checked_at).toLocaleString() : t('lastCheckEmpty')}
              </td>
              <td className="py-1.5 flex gap-1.5">
                {!m.is_primary && (
                  <button onClick={() => handleActivate(m.id, m.domain)}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-0.5 rounded font-semibold">
                    {t('activate')}
                  </button>
                )}
                <button onClick={() => startEdit(m)} className="text-blue-400 hover:text-blue-300 text-xs">{tCommon('edit')}</button>
                <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 text-xs">{tCommon('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
