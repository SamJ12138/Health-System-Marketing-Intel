import { TREND_CHANNELS, EFFORT_LEVELS } from '../lib/validateSnapshot.js';

// Quick-search buttons on the Trends tab (live research queries).
export const trendCategories = [
  { id: 'patient-acquisition', label: 'Patient Acquisition', icon: 'UserPlus', query: 'Patient acquisition digital marketing strategies for hospitals and health systems' },
  { id: 'retention', label: 'Retention & Lifecycle', icon: 'Heart', query: 'Patient retention and lifecycle marketing strategies for healthcare organizations' },
  { id: 'content', label: 'Content Marketing', icon: 'FileText', query: 'Healthcare content marketing best practices and trends for hospital systems' },
  { id: 'paid', label: 'Paid Media', icon: 'DollarSign', query: 'Healthcare paid media and digital advertising trends for health systems' },
  { id: 'martech', label: 'Marketing Technology', icon: 'Cpu', query: 'Healthcare marketing technology martech trends and tools for hospital systems' },
];

export const channelOptions = TREND_CHANNELS;
export const effortOptions = EFFORT_LEVELS;
export const impactOptions = ['High', 'Medium', 'Low'];
