import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AuthGate from '@/utils/AuthGate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'MonaSans-Bold': require('../assets/fonts/MonaSans-Bold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter_18pt-Regular.ttf'),
  });
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (fontsLoaded && sessionChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, sessionChecked]);

  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <AuthGate onReady={() => setSessionChecked(true)} />
      {sessionChecked && <Stack screenOptions={{ headerShown: false }} />}
    </Provider>
  );
}