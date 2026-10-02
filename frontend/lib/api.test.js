import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client so api() gets a session without a real auth call.
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}));

import { api } from './api';

const jsonRes = (status, body) => new Response(JSON.stringify(body), { status });

describe('api()', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the Authorization header from the session', async () => {
    globalThis.fetch.mockResolvedValue(jsonRes(200, { ok: true }));
    await api('GET', '/api/students');
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/students');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.method).toBe('GET');
  });

  it('sends a JSON body with the right content type', async () => {
    globalThis.fetch.mockResolvedValue(jsonRes(201, { student: {} }));
    await api('POST', '/api/students', { name: 'A' });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'A' }));
  });

  it('omits the body for GET/DELETE', async () => {
    globalThis.fetch.mockResolvedValue(jsonRes(200, { ok: true }));
    await api('DELETE', '/api/students/1');
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('throws an Error carrying the server message', async () => {
    globalThis.fetch.mockResolvedValue(jsonRes(400, { error: 'Full name is required' }));
    await expect(api('POST', '/api/students', {})).rejects.toThrow('Full name is required');
  });

  it('falls back to the status text when the body has no message', async () => {
    globalThis.fetch.mockResolvedValue(new Response('{}', { status: 500, statusText: 'Internal Server Error' }));
    await expect(api('GET', '/api/data')).rejects.toThrow('Internal Server Error');
  });

  it('survives a non-JSON error body', async () => {
    globalThis.fetch.mockResolvedValue(new Response('not json', { status: 502, statusText: 'Bad Gateway' }));
    await expect(api('GET', '/api/data')).rejects.toThrow('Bad Gateway');
  });
});
