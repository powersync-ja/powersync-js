import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';
import { createTamagui } from 'tamagui';

import { config } from './lib/config';

const headingFont = createInterFont();
const bodyFont = createInterFont();

const appConfig = createTamagui({
  themes,
  defaultTheme: 'dark',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  tokens: {
    ...tokens,
    color: {
      ...tokens.color,
      brand1: config.brand1,
      brand2: config.brand2
    }
  },
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont
  }
});

export type AppConfig = typeof appConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
