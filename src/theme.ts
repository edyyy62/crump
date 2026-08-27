import type { Level } from './types';

export const colors = {
  forest: '#1C3A2C',
  forestDeep: '#152C22',
  cream: '#F3EEE4',
  creamDark: '#E8E1D4',
  page: '#EFE8DC',
  ink: '#1A1A1A',
  muted: '#6B645C',
  white: '#FFFFFF',
  organic: '#2F6B45',
  organicSoft: '#DCE8DC',
  organicHeader: '#C5D6C4',
  low: '#C9A227',
  lowSoft: '#F4E9C4',
  lowHeader: '#E8D9A0',
  moderate: '#D97706',
  moderateSoft: '#F6E0C8',
  moderateHeader: '#EBC9A4',
  high: '#C44536',
  highSoft: '#F3D4CF',
  highHeader: '#E8B8B2',
  chip: '#E6E1D8',
};

export const levelSolid: Record<Level, string> = {
  organic: colors.organic,
  low: colors.low,
  moderate: colors.moderate,
  high: colors.high,
};

export const levelSoft: Record<Level, string> = {
  organic: colors.organicSoft,
  low: colors.lowSoft,
  moderate: colors.moderateSoft,
  high: colors.highSoft,
};

export const levelHeader: Record<Level, string> = {
  organic: colors.organicHeader,
  low: colors.lowHeader,
  moderate: colors.moderateHeader,
  high: colors.highHeader,
};
