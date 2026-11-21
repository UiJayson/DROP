import { DropFonts } from '@drop/ui';
import { useEffect } from 'react';

import { PassengerRoot } from './src/PassengerRoot';
import { FlowPrototype, isFlowPrototype } from './src/prototype/FlowPrototype';
import { initSentry } from './src/sentry';

export default function App() {
  useEffect(() => {
    void initSentry();
  }, []);

  return <DropFonts>{isFlowPrototype() ? <FlowPrototype /> : <PassengerRoot />}</DropFonts>;
}
