export const DarkTheme = {
  colors: {
    bgPrimary: '#0F172A',
    bgCard: '#1E293B',
    bgCardSecondary: '#0F172A',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accentGreen: '#10B981',
    accentYellow: '#F59E0B',
    border: '#334155',
    errorText: '#FCA5A5',
    deleteButtonBg: '#7F1D1D',
  },
  gradients: {
    disponibleReal: ['#7C3AED', '#EC4899'] as [string, string],
    conGastosFuturos: ['#1D4ED8', '#06B6D4'] as [string, string],
  },
  fontWeights: {
    regular: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export type DarkThemeType = typeof DarkTheme;
