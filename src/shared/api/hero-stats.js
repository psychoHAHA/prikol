export async function getHeroes(signal) {
  const response = await fetch('/api/heroes', { signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось загрузить героев'); return data;
}
export async function getHeroMatchups(heroId, signal) {
  const response = await fetch(`/api/heroes/${heroId}/matchups`, { signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось загрузить матчапы'); return data;
}
export async function getPositions(signal) {
  const response = await fetch('/api/positions', { signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось загрузить позиции'); return data;
}
export async function getHeroItems(heroId, position, signal) {
  const response = await fetch(`/api/heroes/${heroId}/items?position=${position}`, { signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось загрузить предметы'); return data;
}
export async function getHeroGuide(heroId, enemyIds, position, signal) {
  const response = await fetch(`/api/heroes/${heroId}/guide?position=${position}&against=${enemyIds.join(',')}`, { signal });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось загрузить гайд'); return data;
}
