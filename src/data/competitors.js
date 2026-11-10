// The systems this dashboard tracks. Names and plain colour chips only: no
// logos, no claims. Everything else comes from the snapshot files.
export const competitors = [
  {
    id: 'cleveland-clinic',
    name: 'Cleveland Clinic',
    shortName: 'Cleveland',
    color: '#00843D',
    initials: 'CC',
  },
  {
    id: 'mayo-clinic',
    name: 'Mayo Clinic',
    shortName: 'Mayo',
    color: '#0057B8',
    initials: 'MC',
  },
  {
    id: 'penn-medicine',
    name: 'Penn Medicine',
    shortName: 'Penn',
    color: '#011F5B',
    initials: 'PM',
  },
  {
    id: 'geisinger',
    name: 'Geisinger',
    shortName: 'Geisinger',
    color: '#006272',
    initials: 'GE',
  },
  {
    id: 'kaiser-permanente',
    name: 'Kaiser Permanente',
    shortName: 'Kaiser',
    color: '#29478A',
    initials: 'KP',
  },
  {
    id: 'johns-hopkins',
    name: 'Johns Hopkins Medicine',
    shortName: 'Hopkins',
    color: '#002D72',
    initials: 'JH',
  },
  {
    id: 'mount-sinai',
    name: 'Mount Sinai Health System',
    shortName: 'Mt. Sinai',
    color: '#6F2C91',
    initials: 'MS',
  },
  {
    id: 'mass-general-brigham',
    name: 'Mass General Brigham',
    shortName: 'MGB',
    color: '#00629B',
    initials: 'MG',
  },
  {
    id: 'advocate-health',
    name: 'Advocate Health',
    shortName: 'Advocate',
    color: '#E35205',
    initials: 'AH',
  },
];

// The baseline system: the one the analysis is written for. Shown in its own panel
// when src/data/snapshot/competitors/upmc.json exists.
export const homeSystem = {
  id: 'upmc',
  name: 'UPMC',
  shortName: 'UPMC',
  color: '#005eb8',
  initials: 'UP',
};
