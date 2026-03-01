import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

export default function Layout() {
  const [loaded] = useFonts({
    // The keys here are the *fontFamily* names you’ll use in styles
    'Rans_font-Regular': require('../../assets/fonts/Rans_font-Regular.ttf'),
    'ArefRuqaaInk-Regular': require('../../assets/fonts/ArefRuqaaInk-Regular.ttf'),
    'ArefRuqaaInk-Bold': require('../../assets/fonts/ArefRuqaaInk-Bold.ttf'),
  });

  if (!loaded) return null; // or your splash

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}