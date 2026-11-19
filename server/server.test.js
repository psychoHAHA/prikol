import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { server } from './index.js';
import { createRateLimiter } from './rate-limit.js';
import { query } from './stratz-client.js';
import { vi } from 'vitest';

let base;
beforeAll(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => { await new Promise(resolve => server.close(resolve)); });

describe('API validation', () => {
  it.each(['/api/heroes/0/matchups', '/api/heroes/32768/items', '/api/heroes/1/items?position=bad', '/api/heroes/1/guide?against=1,no', '/api/heroes/1/guide?against=1,1', '/api/heroes/1/guide?against=1,2,3,4,5,6'])('rejects %s', async path => {
    const response = await fetch(base + path);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('client');
  });
  it('retains the empty guide response', async () => {
    const response = await fetch(base + '/api/heroes/1/guide');
    expect(await response.json()).toEqual({ guides: [], build: [] });
  });
});

it('limits each client and resets after the window', () => {
  let now = 0;
  const limit = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
  expect(limit('a').allowed).toBe(true);
  expect(limit('a').allowed).toBe(false);
  expect(limit('b').allowed).toBe(true);
  now = 1000;
  expect(limit('a').allowed).toBe(true);
});

it('classifies upstream failures and timeouts', async () => {
  const token = process.env.STRATZ_TOKEN;
  process.env.STRATZ_TOKEN = 'test';
  const mock = vi.spyOn(globalThis, 'fetch');
  try {
    mock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(query('{}')).rejects.toMatchObject({ status: 502, code: 'stratz' });
    mock.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    await expect(query('{}')).rejects.toMatchObject({ status: 504, code: 'timeout' });
  } finally {
    mock.mockRestore();
    if (token === undefined) delete process.env.STRATZ_TOKEN; else process.env.STRATZ_TOKEN = token;
  }
});
