import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Returns a narrowed color scheme (`'light' | 'dark'`). As of React Native 0.85 the built-in
 * `useColorScheme()` can also return `null`/`'unspecified'`; we treat anything that isn't `'dark'`
 * as `'light'` so the result can safely index the `Colors` map.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
