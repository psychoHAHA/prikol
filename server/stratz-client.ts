import { AppError } from './errors.js';
interface StratzData {
  constants?: { heroes?: {id: number; displayName: string}[]; items?: {id: number; displayName: string}[]; gameVersions?: {id: number; name: string; asOfDateTime: number}[] };
  heroStats?: { stats?: {heroId: number; position: string; week: number; matchCount: number}[]; itemFullPurchase?: {itemId: number; instance: number; matchCount: number; winCount: number}[]; matchUp?: {heroId: number; vs: {heroId1: number; heroId2: number; week: number; matchCount: number; winCount: number; winRateHeroId1: number; winRateHeroId2: number; synergy: number}[]}[]; guide?: {matchCount: number; guides: {matchId: number}[]}[] };
  match?: {players?: {heroId: number; isRadiant: boolean; stats?: {itemPurchases?: {time: number; itemId: number}[]}}[]};
}
export async function query(query: string, variables: Record<string, unknown> = {}): Promise<StratzData> {
  const token = process.env.STRATZ_TOKEN;
  if (!token) throw new AppError(500, 'STRATZ_TOKEN не настроен', 'internal');
  let response;
  try {
    response = await fetch('https://api.stratz.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'STRATZ_API' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000) });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new AppError(504, 'Превышено время ожидания STRATZ', 'timeout');
    throw new AppError(502, 'Не удалось связаться с STRATZ', 'stratz');
  }
  if (!response.ok) throw new AppError(502, `STRATZ ответил HTTP ${response.status}`, 'stratz');
  let body;
  try { body = await response.json(); } catch { throw new AppError(502, 'STRATZ вернул некорректный JSON', 'stratz'); }
  if (body.errors?.length) throw new AppError(502, 'STRATZ вернул ошибку', 'stratz');
  if (!body.data || typeof body.data !== 'object') throw new AppError(502, 'STRATZ не вернул данные', 'stratz');
  return body.data;
}
