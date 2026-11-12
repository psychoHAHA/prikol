const heroes = {
  Juggernaut: {
    roles: [1],
    base: 'Power Treads, Maelstrom, Manta Style',
    situation:
      'Black King Bar против контроля; Butterfly против физического урона.',
    counters: ['Crystal Maiden', 'Lion'],
    synergy: ['Crystal Maiden', 'Lion'],
  },
  'Phantom Assassin': {
    roles: [1],
    base: 'Power Treads, Battle Fury, Black King Bar',
    situation: 'Desolator для урона; Abyssal Blade для контроля.',
    counters: ['Sniper', 'Crystal Maiden'],
    synergy: ['Magnus', 'Lion'],
  },
  Sven: {
    roles: [1],
    base: 'Power Treads, Mask of Madness, Black King Bar',
    situation:
      'Blink Dagger для инициации; Assault Cuirass против физического урона.',
    counters: ['Phantom Lancer', 'Naga Siren'],
    synergy: ['Magnus', 'Crystal Maiden'],
  },
  'Storm Spirit': {
    roles: [2],
    base: 'Witch Blade, Orchid Malevolence, Black King Bar',
    situation:
      'Linken’s Sphere против направленного контроля; Shiva’s Guard против лечения.',
    counters: ['Sniper', 'Drow Ranger'],
    synergy: ['Magnus', 'Earthshaker'],
  },
  'Dragon Knight': {
    roles: [2, 3],
    base: 'Power Treads, Blink Dagger, Black King Bar',
    situation:
      'Assault Cuirass против физического урона; Shiva’s Guard против лечения.',
    counters: ['Phantom Assassin', 'Sniper'],
    synergy: ['Lion', 'Crystal Maiden'],
  },
  Puck: {
    roles: [2],
    base: 'Witch Blade, Blink Dagger, Black King Bar',
    situation: 'Eul’s Scepter для защиты; Shiva’s Guard против лечения.',
    counters: ['Sniper', 'Crystal Maiden'],
    synergy: ['Magnus', 'Earthshaker'],
  },
  Axe: {
    roles: [3],
    base: 'Phase Boots, Blink Dagger, Blade Mail',
    situation: 'Black King Bar против контроля; Shiva’s Guard против лечения.',
    counters: ['Phantom Assassin', 'Phantom Lancer'],
    synergy: ['Lion', 'Crystal Maiden'],
  },
  Magnus: {
    roles: [3],
    base: 'Arcane Boots, Blink Dagger, Force Staff',
    situation:
      'Black King Bar для надёжной инициации; Refresher Orb для долгих боёв.',
    counters: ['Phantom Lancer', 'Naga Siren'],
    synergy: ['Phantom Assassin', 'Sven'],
  },
  Earthshaker: {
    roles: [3, 4],
    base: 'Arcane Boots, Blink Dagger, Aghanim’s Shard',
    situation: 'Force Staff для мобильности; Black King Bar против контроля.',
    counters: ['Phantom Lancer', 'Naga Siren'],
    synergy: ['Magnus', 'Sven'],
  },
  Lion: {
    roles: [4, 5],
    base: 'Arcane Boots, Blink Dagger, Force Staff',
    situation:
      'Gl​​immer Cape для спасения; Ghost Scepter против физического урона.',
    counters: ['Storm Spirit', 'Phantom Assassin'],
    synergy: ['Juggernaut', 'Dragon Knight'],
  },
  'Crystal Maiden': {
    roles: [5],
    base: 'Arcane Boots, Glimmer Cape, Force Staff',
    situation:
      'Ghost Scepter против физического урона; Black King Bar для ультимейта.',
    counters: ['Juggernaut', 'Phantom Lancer'],
    synergy: ['Juggernaut', 'Sven'],
  },
  'Shadow Shaman': {
    roles: [4, 5],
    base: 'Arcane Boots, Aether Lens, Blink Dagger',
    situation: 'Glimmer Cape для защиты; Force Staff для спасения.',
    counters: ['Storm Spirit', 'Phantom Assassin'],
    synergy: ['Juggernaut', 'Dragon Knight'],
  },
  Sniper: {},
  'Drow Ranger': {},
  'Phantom Lancer': {},
  'Naga Siren': {},
}
const names = Object.keys(heroes).sort()
let allies = [],
  enemies = []
const $ = (id) => document.getElementById(id)
function render() {
  for (const [side, list, limit] of [
    ['ally', allies, 4],
    ['enemy', enemies, 5],
  ]) {
    const select = $(side + 'Select')
    select.innerHTML =
      '<option value="">+ Добавить героя</option>' +
      names
        .filter((n) => !allies.includes(n) && !enemies.includes(n))
        .map((n) => `<option>${n}</option>`)
        .join('')
    select.disabled = list.length >= limit
    $(side === 'ally' ? 'allies' : 'enemies').innerHTML = list.length
      ? list
          .map(
            (n) =>
              `<button class="chip ${side === 'enemy' ? 'enemy' : ''}" data-side="${side}" data-name="${n}" title="Удалить">${n} ×</button>`,
          )
          .join('')
      : '<span class="placeholder">Пока никого</span>'
    $(side + 'Count').textContent = `${list.length} / ${limit}`
  }
}
for (const side of ['ally', 'enemy'])
  $(side + 'Select').addEventListener('change', (e) => {
    if (e.target.value)
      (side === 'ally' ? allies : enemies).push(e.target.value)
    render()
  })
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-name]')
  if (!b) return
  if (b.dataset.side === 'ally')
    allies = allies.filter((n) => n !== b.dataset.name)
  else enemies = enemies.filter((n) => n !== b.dataset.name)
  render()
})
$('reset').onclick = () => {
  allies = []
  enemies = []
  $('position').value = '1'
  $('results').innerHTML =
    '<div class="empty"><div class="emptyicon">✳</div><h3>Всё начинается с пика</h3><p>Добавь героев и выбери позицию, чтобы увидеть рекомендации.</p></div>'
  render()
}
$('analyze').onclick = () => {
  const position = Number($('position').value)
  const ranked = names
    .filter(
      (n) =>
        heroes[n].roles?.includes(position) &&
        !allies.includes(n) &&
        !enemies.includes(n),
    )
    .map((name) => {
      const h = heroes[name],
        good = enemies.filter((n) => h.counters.includes(n)),
        friends = allies.filter((n) => h.synergy.includes(n))
      return { name, h, good, friends, score: good.length + friends.length }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3)
  $('results').innerHTML = ranked.length
    ? ranked
        .map(
          (r, i) =>
            `<article class="card"><h3><span>0${i + 1}</span>${r.name}</h3><p><strong>Почему:</strong> подходит на выбранную позицию${r.good.length ? `; есть правило против ${r.good.join(', ')}` : ''}${r.friends.length ? `; отмечена связка с ${r.friends.join(', ')}` : ''}. ${r.score ? 'Это качественные подсказки, а не статистическая оценка.' : 'Для выбранных героев специальных правил пока нет.'}</p><p><strong>Базовый билд:</strong> ${r.h.base}.</p><p><strong>По ситуации:</strong> ${r.h.situation}</p><a href="https://dota2protracker.com/hero/${encodeURIComponent(r.name)}" target="_blank" rel="noopener noreferrer">Посмотреть героя на Dota2ProTracker ↗</a></article>`,
        )
        .join('')
    : '<div class="empty"><h3>Вариантов пока нет</h3><p>Для этой позиции все герои из демо-набора уже выбраны.</p></div>'
}
render()
