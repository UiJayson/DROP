import { DropFonts } from '@drop/ui';
import { useEffect } from 'react';

import { RiderRoot } from './src/RiderRoot';
import { initSentry } from './src/sentry';

export default function App() {
  useEffect(() => {
    void initSentry();
  }, []);

  return (
    <DropFonts>
      <RiderRoot />
    </DropFonts>
  );
}
