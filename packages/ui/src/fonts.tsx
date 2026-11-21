import { BricolageGrotesque_400Regular } from '@expo-google-fonts/bricolage-grotesque/400Regular';
import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { fontFace } from '@drop/ui-tokens';
import { useFonts } from 'expo-font';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { fontFamilyFor } from './theme';
import { VantaFontProvider } from './vanta-font';

const faces = {
  regular: fontFamilyFor('regular'),
  medium: fontFamilyFor('medium'),
  semibold: fontFamilyFor('semibold'),
  bold: fontFamilyFor('bold'),
  mono: fontFamilyFor('mono'),
};

export function DropFonts({ children }: { children: ReactNode }) {
  const [ready] = useFonts({
    [fontFace.regular]: BricolageGrotesque_400Regular,
    [fontFace.medium]: BricolageGrotesque_500Medium,
    [fontFace.semibold]: BricolageGrotesque_600SemiBold,
    [fontFace.bold]: BricolageGrotesque_700Bold,
    [fontFace.mono]: GeistMono_500Medium,
  });

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#040405' }} />;
  }

  return <VantaFontProvider faces={faces}>{children}</VantaFontProvider>;
}
