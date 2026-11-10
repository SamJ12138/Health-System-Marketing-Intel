// The shipped data: the verified snapshot under ./snapshot, validated on load.
import { buildDataset } from '../lib/dataset.js';
import { competitors, homeSystem } from './competitors.js';

export const dataset = buildDataset({
  competitorList: competitors,
  homeSystem,
  competitorFiles: import.meta.glob('./snapshot/competitors/*.json', { eager: true, import: 'default' }),
  trendsFiles: import.meta.glob('./snapshot/trends.json', { eager: true, import: 'default' }),
});
