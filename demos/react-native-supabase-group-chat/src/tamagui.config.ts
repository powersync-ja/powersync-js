import { createTamagui } from '@tamagui/core';
import { shorthands } from '@tamagui/shorthands';
import { createInterFont } from '@tamagui/font-inter';
import { themes, tokens } from '@tamagui/themes';
import { config } from '@/lib/config';

const headingFont = createInterFont();
const bodyFont = createInterFont();

export const appConfig = createTamagui({
  themes,
  defaultTheme: 'dark',
  tokens: {
    ...tokens,
    color: {
      ...tokens.color,
      // Add PowerSync brand colours
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

export default appConfig;
