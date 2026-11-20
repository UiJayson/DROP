import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from '@expo-google-fonts/urbanist';
import { VantaFontProvider } from '@drop/ui';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { View } from 'react-native';

import { PassengerRoot } from './src/PassengerRoot';
import { initSentry } from './src/sentry';

export default function App() {
  const [ready] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });

  useEffect(() => {
    void initSentry();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#040405' }} />;
  }

  return (
    <VantaFontProvider
      faces={{
        regular: 'Urbanist_400Regular',
        medium: 'Urbanist_500Medium',
        semibold: 'Urbanist_600SemiBold',
        bold: 'Urbanist_700Bold',
      }}
    >
      <PassengerRoot />
    </VantaFontProvider>
  );
}
