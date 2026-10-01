export const C = {
  bg: '#f0ece8',
  ink: '#1a1f6c',
  accent: '#ff5700',
  rule: '#d6d1c4',
  surface: '#ffffff',
  muted: '#5b5f8f',
} as const;

export const FONT = 'Arial, Helvetica, sans-serif';

export type Tone = 'teal' | 'blue' | 'orange' | 'maroon' | 'yellow' | 'neutral';

export const TONES: Record<Tone, {strong: string; soft: string}> = {
  teal: {strong: '#067B86', soft: '#D5EEF0'},
  blue: {strong: '#1A1F6C', soft: '#D2E0F3'},
  orange: {strong: '#B84000', soft: '#FFE3D1'},
  maroon: {strong: '#AE3C7C', soft: '#F3DCEA'},
  yellow: {strong: '#8A5300', soft: '#FDE9CF'},
  neutral: {strong: '#1a1f6c', soft: '#e7e2da'},
};
