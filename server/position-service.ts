import { query } from './stratz-client.js';
import { cache, ttl } from './cache.js';
import { AppError } from './errors.js';

export async function fetchPositions() {
  const cached = cache.get('positions');
  if (cached && Date.now() - cached.time < ttl) return cached.data;
  const data = await query('{ heroStats { stats(positionIds: [POSITION_1, POSITION_2, POSITION_3, POSITION_4, POSITION_5], groupByPosition: true) { heroId position week matchCount } } }');
  if (!Array.isArray(data.heroStats?.stats)) throw new AppError(502, 'STRATZ не вернул статистику позиций', 'stratz');
  const result = { positions: data.heroStats.stats, fetchedAt: new Date().toISOString() };
  cache.set('positions', { data: result, time: Date.now() });
  return result;
}
