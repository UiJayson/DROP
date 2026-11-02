import { AppShell } from '@drop/ui';

import { RiderSession } from './session';

export function RiderRoot() {
  return (
    <AppShell>
      <RiderSession />
    </AppShell>
  );
}
