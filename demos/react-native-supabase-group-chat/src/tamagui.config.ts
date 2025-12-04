import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';
import { config } from '@/lib/config';
import { createTamagui } from '@tamagui/core';

const headingFont = createInterFont();
const bodyFont = createInterFont();

const appConfig = createTamagui({
  themes,
  defaultTheme: 'dark',
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

export default appConfig;
