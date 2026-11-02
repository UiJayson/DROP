import { useEffect } from 'react';

import { PassengerRoot } from './src/PassengerRoot';
import { initSentry } from './src/sentry';

export default function App() {
  useEffect(() => {
    void initSentry();
  }, []);

  return <PassengerRoot />;
}
