import { describe, expect, it, vi } from 'vitest';
import { readAdminJson } from './admin-api';

describe('readAdminJson', () => {
  it('returns parsed JSON for successful responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readAdminJson(response)).resolves.toEqual({ ok: true });
  });

  it('invokes unauthorized callback and rejects on 401 responses', async () => {
    const onUnauthorized = vi.fn();
    const response = new Response(JSON.stringify({ error: 'invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readAdminJson(response, { onUnauthorized })).rejects.toThrow('invalid token');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
