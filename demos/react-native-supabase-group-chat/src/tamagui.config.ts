import { createTamagui } from "@tamagui/core";
import { shorthands } from "@tamagui/shorthands";
import { themes, tokens } from "@tamagui/themes";
import { config } from "@/lib/config";

export const appConfig = createTamagui({
  themes,
  defaultTheme: "dark",
  tokens: {
    ...tokens,
    color: {
      ...tokens.color,
      // Add PowerSync brand colours
      brand1: config.brand1,
      brand2: config.brand2
    }
  },
  shorthands
});

export default appConfig;
