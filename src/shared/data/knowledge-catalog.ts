import strength from './knowledge/strength.json'
import agility from './knowledge/agility.json'
import intelligence from './knowledge/intelligence.json'
import universal from './knowledge/universal.json'
export const knowledge = { schemaVersion: strength.schemaVersion, updatedAt: strength.updatedAt, source: 'Экспертная база Draft Lab', heroes: [...strength.heroes, ...agility.heroes, ...intelligence.heroes, ...universal.heroes] }
