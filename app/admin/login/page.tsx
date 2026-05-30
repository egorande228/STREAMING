'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminApi.login(username, password);
      if (data.token) {
        localStorage.setItem('wc26_admin_token', data.token);
        router.push('/admin/matches');
      } else {
        setError(data.error ?? 'Invalid credentials');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-lg w-full max-w-sm space-y-4">
        <h1 className="text-white text-2xl font-bold text-center">WC2026 Admin</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
