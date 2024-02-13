import { ThemeProvider, Theme } from "@react-navigation/native";
import { useTheme } from "@tamagui/core";
import { ReactNode } from "react";
import { useColorScheme } from "react-native";

export const NavigationThemeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  const NavigationTheme: Theme = {
    dark: colorScheme === "dark",
    colors: {
      primary: theme.color.val, // "rgb(0, 122, 255)",
      background: theme.background.val, // "rgb(242, 242, 242)",
      card: theme.background.val, // "rgb(255, 255, 255)",
      text: theme.color.val, // "rgb(28, 28, 30)",
      border: theme.borderColor.val, // "rgb(216, 216, 216)",
      notification: theme.color.val, // "rgb(255, 59, 48)",
    },
  };

  return <ThemeProvider value={NavigationTheme}>{children}</ThemeProvider>;
};
