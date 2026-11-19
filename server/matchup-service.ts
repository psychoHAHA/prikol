import { query } from './stratz-client.js';
import { cache, ttl } from './cache.js';

export async function fetchMatchups(heroId: number) {
  const key = `matchups:${heroId}`; const cached = cache.get(key); if (cached && Date.now() - cached.time < ttl) return cached.data;
  const data = await query('query Matchups($heroId: Short!) { heroStats { matchUp(heroId: $heroId, take: 150) { heroId vs { heroId1 heroId2 week matchCount winCount winRateHeroId1 winRateHeroId2 synergy } } } }', { heroId });
  const rows = data.heroStats?.matchUp?.[0]?.vs || [];
  const result = { matchups: rows, heroId, fetchedAt: new Date().toISOString(), sourceUrl: 'https://docs.stratz.com/' };
  cache.set(key, { data: result, time: Date.now() }); return result;
}
