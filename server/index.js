import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const token = process.env.STRATZ_TOKEN;
const endpoint = 'https://api.stratz.com/graphql';
const cache = new Map();
const ttl = 15 * 60 * 1000;
async function query(query, variables = {}) {
  if (!token) throw new Error('STRATZ_TOKEN не настроен');
  const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'STRATZ_API' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`STRATZ ответил HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data;
}
export async function fetchHeroes() {
  const cached = cache.get('heroes'); if (cached && Date.now() - cached.time < ttl) return cached.data;
  const data = await query('{ constants { gameVersions { id name asOfDateTime } heroes { id displayName } } }');
  const versions = data.constants.gameVersions || [];
  const version = versions.reduce((a, b) => a.asOfDateTime > b.asOfDateTime ? a : b);
  const heroes = (data.constants.heroes || []).filter(h => h.id && h.displayName).map(h => ({ id: h.id, name: h.displayName }));
  const result = { heroes, gameVersion: version, fetchedAt: new Date().toISOString() };
  cache.set('heroes', { data: result, time: Date.now() }); return result;
}
export async function fetchMatchups(heroId) {
  const key = `matchups:${heroId}`; const cached = cache.get(key); if (cached && Date.now() - cached.time < ttl) return cached.data;
  const data = await query('query Matchups($heroId: Short!) { heroStats { matchUp(heroId: $heroId, take: 150) { heroId vs { heroId1 heroId2 week matchCount winCount winRateHeroId1 winRateHeroId2 synergy } } } }', { heroId });
  const rows = data.heroStats?.matchUp?.[0]?.vs || [];
  const result = { matchups: rows, heroId, fetchedAt: new Date().toISOString(), sourceUrl: 'https://docs.stratz.com/' };
  cache.set(key, { data: result, time: Date.now() }); return result;
}
export async function fetchPositions() {
  const cached = cache.get('positions');
  if (cached && Date.now() - cached.time < ttl) return cached.data;
  const data = await query('{ heroStats { stats(positionIds: [POSITION_1, POSITION_2, POSITION_3, POSITION_4, POSITION_5], groupByPosition: true) { heroId position week matchCount } } }');
  if (!Array.isArray(data.heroStats?.stats)) throw new Error('STRATZ не вернул статистику позиций');
  const result = { positions: data.heroStats.stats, fetchedAt: new Date().toISOString() };
  cache.set('positions', { data: result, time: Date.now() });
  return result;
}
export async function fetchItems(heroId, position) {
  const key = `items:${heroId}:${position}`; const cached = cache.get(key); if (cached && Date.now() - cached.time < ttl) return cached.data;
  if (!/^POSITION_[1-5]$/.test(position)) throw new Error('Неизвестная позиция');
  const data = await query('query HeroItems($heroId: Short!, $position: MatchPlayerPositionType!) { heroStats { itemFullPurchase(heroId: $heroId, positionIds: [$position], matchLimit: 1000) { itemId instance matchCount winCount } } constants { items { id displayName } } }', { heroId, position });
  const rows = data.heroStats?.itemFullPurchase || [];
  const names = new Map((data.constants?.items || []).map(item => [item.id, item.displayName]));
  const totals = new Map();
  for (const row of rows) {
    if (!row.itemId || !row.matchCount) continue;
    const item = totals.get(row.itemId) || { itemId: row.itemId, name: names.get(row.itemId) || `Предмет ${row.itemId}`, games: 0, wins: 0 };
    item.games += row.matchCount; item.wins += row.winCount || 0; totals.set(row.itemId, item);
  }
  const items = [...totals.values()].filter(item => item.games >= 20).map(item => ({ ...item, winRate: item.wins / item.games })).sort((a, b) => b.games - a.games).slice(0, 12);
  const result = { items, heroId, position, fetchedAt: new Date().toISOString(), sourceUrl: 'https://stratz.com/' };
  cache.set(key, { data: result, time: Date.now() }); return result;
}
export async function fetchGuide(heroId, enemyIds, position) {
  const ids = [...new Set(enemyIds.filter(id => Number.isInteger(id) && id > 0))].slice(0, 5); if (!ids.length) return { guides: [], build: [] };
  if (!/^POSITION_[1-5]$/.test(position)) throw new Error('Неизвестная позиция');
  const key = `guide:${heroId}:${position}:${ids.slice().sort((a,b) => a-b).join(',')}`;
  const cached = cache.get(key); if (cached && Date.now() - cached.time < ttl) return cached.data;
  const guides = await Promise.all(ids.map(async againstHeroId => {
    const data = await query('query Guide($heroId: Short!, $against: Short!, $position: MatchPlayerPositionType!) { heroStats { guide(heroId: $heroId, againstHeroId: $against, positionId: $position, take: 10) { matchCount guides { matchId } } } }', { heroId, against: againstHeroId, position });
    const row = data.heroStats?.guide?.[0];
    return { againstHeroId, matchCount: row?.matchCount || 0, matchIds: (row?.guides || []).map(item => item.matchId).filter(Boolean) };
  }));
  const matchIds = [...new Set(guides.flatMap(g => g.matchIds.slice(0, 6)))].slice(0, 20);
  const [catalog, ...matches] = await Promise.all([
    query('{ constants { items { id displayName } } }'),
    ...matchIds.map(id => query('query Match($id: Long!) { match(id: $id) { players { heroId isRadiant stats { itemPurchases { time itemId } } } } }', { id }).catch(() => null)),
  ]);
  const names = new Map((catalog.constants?.items || []).map(item => [item.id, item.displayName]));
  const totals = new Map(); let sampleSize = 0;
  for (const match of matches) {
    const players = match?.match?.players || []; const player = players.find(p => p.heroId === heroId);
    if (!player?.stats?.itemPurchases?.length || !players.some(p => ids.includes(p.heroId) && p.isRadiant !== player.isRadiant)) continue;
    sampleSize++; const seen = new Set();
    for (const purchase of player.stats.itemPurchases) {
      if (purchase.time < 0 || !names.get(purchase.itemId) || seen.has(purchase.itemId)) continue;
      seen.add(purchase.itemId); const times = totals.get(purchase.itemId) || []; times.push(purchase.time); totals.set(purchase.itemId, times);
    }
  }
  const excluded = /recipe|tango|clarity|observer ward|sentry ward|smoke of deceit|town portal scroll|dust of appearance|enchanted mango|healing salve|blood grenade/i;
  const build = sampleSize < 5 ? [] : [...totals].filter(([id, times]) => !excluded.test(names.get(id)) && times.length >= 3 && times.length / sampleSize >= 0.3).map(([itemId, times]) => {
    times.sort((a,b) => a-b); return { itemId, name: names.get(itemId), matches: times.length, medianTime: times[Math.floor(times.length / 2)] };
  }).sort((a,b) => a.medianTime - b.medianTime);
  const result = { guides, build, sampleSize, requestedMatches: matchIds.length, heroId, position, sourceUrl: 'https://stratz.com/' };
  cache.set(key, { data: result, time: Date.now() }); return result;
}
export const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') { res.writeHead(405).end(JSON.stringify({ error: 'Метод не поддерживается' })); return; }
    if (url.pathname === '/api/heroes') { res.end(JSON.stringify(await fetchHeroes())); return; }
    if (url.pathname === '/api/positions') { res.end(JSON.stringify(await fetchPositions())); return; }
    const match = url.pathname.match(/^\/api\/heroes\/(\d+)\/matchups$/);
    if (match) { res.end(JSON.stringify(await fetchMatchups(Number(match[1])))); return; }
    const items = url.pathname.match(/^\/api\/heroes\/(\d+)\/items$/);
    if (items) { res.end(JSON.stringify(await fetchItems(Number(items[1]), url.searchParams.get('position') || 'POSITION_1'))); return; }
    const guide = url.pathname.match(/^\/api\/heroes\/(\d+)\/guide$/);
    if (guide) { res.end(JSON.stringify(await fetchGuide(Number(guide[1]), (url.searchParams.get('against') || '').split(',').map(Number), url.searchParams.get('position') || 'POSITION_1'))); return; }
    if (!url.pathname.startsWith('/api/')) {
      const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.resolve(distDir, relativePath);
      if (filePath.startsWith(distDir) && contentTypes[path.extname(filePath)]) {
        try { const content = await readFile(filePath); res.setHeader('Content-Type', contentTypes[path.extname(filePath)]); res.end(content); return; }
        catch (error) { if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error; }
      }
    }
    res.writeHead(404).end(JSON.stringify({ error: 'Маршрут не найден' }));
  } catch (error) { res.writeHead(502).end(JSON.stringify({ error: error.message || 'Ошибка источника' })); }
});
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT) || 3001;
  server.listen(port, process.env.PORT ? '0.0.0.0' : '127.0.0.1', () => console.log(`Сервер запущен на порту ${port}`));
}
