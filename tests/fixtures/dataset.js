// Fixture dataset with the same shape as src/data/dataset.js. Loaded by Vite
// only in "fixture" mode (npm run dev:fixture / build:fixture) and by tests.
import { buildDataset } from '../../src/lib/dataset.js';
import { fixtureCompetitors, fixtureHomeSystem } from './competitors.js';

export const dataset = buildDataset({
  competitorList: fixtureCompetitors,
  homeSystem: fixtureHomeSystem,
  competitorFiles: import.meta.glob('./snapshot/competitors/*.json', { eager: true, import: 'default' }),
  trendsFiles: import.meta.glob('./snapshot/trends.json', { eager: true, import: 'default' }),
  isFixture: true,
});
