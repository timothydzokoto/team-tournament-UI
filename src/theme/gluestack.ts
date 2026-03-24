import { gluestackUIConfig as baseConfig } from '@gluestack-ui/config';

export const appGluestackConfig = {
  ...baseConfig,
  tokens: {
    ...baseConfig.tokens,
    colors: {
      ...baseConfig.tokens.colors,
      amber400: '#f59e0b',
      amber500: '#d97706',
      amber300: '#fbbf24',
      emerald500: '#10b981',
      emerald400: '#34d399',
      sky500: '#0ea5e9',
      sky400: '#38bdf8',
      violet500: '#8b5cf6',
      violet400: '#a78bfa',
      rose500: '#f43f5e',
      rose400: '#fb7185',
      backgroundDark950: '#0c0a09',
      backgroundDark900: '#1c1917',
      backgroundDark850: '#292524',
      borderDark800: '#44403c',
      textLight50: '#fafaf9',
      textLight100: '#f5f5f4',
      textLight200: '#e7e5e4',
      textLight300: '#d6d3d1',
      textLight400: '#a8a29e',
    },
  },
};
