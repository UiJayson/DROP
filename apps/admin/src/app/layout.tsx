import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { colors } from '@drop/ui-tokens';

import { SentryBoot } from '../components/SentryBoot';
import './globals.css';

export const metadata: Metadata = {
  title: 'DROP Admin',
  description: 'DROP operations for Lagos Keke bookings.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          background: `linear-gradient(180deg, ${colors.gradTop} 0%, ${colors.gradBottom} 100%)`,
          color: colors.textPrimary,
        }}
      >
        <SentryBoot />
        {children}
      </body>
    </html>
  );
}
