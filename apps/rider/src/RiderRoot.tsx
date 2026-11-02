import { AppShell } from '@drop/ui';

import { RiderProvider } from './rider-context';
import { RiderSwitch } from './screens/RiderScreens';

export function RiderRoot() {
  return (
    <AppShell>
      <RiderProvider>
        <RiderSwitch />
      </RiderProvider>
    </AppShell>
  );
}
