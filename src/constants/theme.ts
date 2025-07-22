// src/constants/theme.ts

export const Colors = {
  primary: '#FF6B6B',
  primaryLight: '#FF8E8E',
  primaryDark: '#FF5252',
  secondary: '#4ECDC4',
  background: '#F7F7F7',
  white: '#FFFFFF',
  black: '#000000',
  lightGray: '#F0F0F0',
  gray: '#9E9E9E',
  darkGray: '#424242',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  primaryText: '#212121',
  secondaryText: '#757575',
  shadow: '#000000',
};

export const Fonts = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const, // Use string literals with const assertions
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

export const Sizes = {
  padding: 16,
  base: 8,
  radius: 12,
};