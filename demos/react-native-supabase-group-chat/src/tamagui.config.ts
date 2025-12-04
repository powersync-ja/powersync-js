import { createTamagui } from '@tamagui/core';
import { shorthands } from '@tamagui/shorthands';
import { createInterFont } from '@tamagui/font-inter';
import { themes, tokens } from '@tamagui/themes';
import { config } from '@/lib/config';

const heading = createInterFont();
const body = createInterFont();

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
    heading,
    body
  }
});

export default appConfig;
