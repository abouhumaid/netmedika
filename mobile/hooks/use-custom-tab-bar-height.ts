import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Keep overlays clear of the custom bar in (tabs)/_layout.tsx.
export function useCustomTabBarHeight() {
  const insets = useSafeAreaInsets();
  return 71 + (insets.bottom || 12);
}
