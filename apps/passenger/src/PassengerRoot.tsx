import { AppShell } from '@drop/ui';

import { PassengerProvider, usePassenger } from './passenger-context';
import { PassengerSession } from './session';
import { HomeScreen } from './screens/HomeScreens';
import { MatchScreen } from './screens/MatchScreens';
import { FareScreen, SearchScreen } from './screens/PlanScreens';
import { RideScreen } from './screens/RideScreens';

function PassengerSwitch() {
  const { state } = usePassenger();
  switch (state.route) {
    case 'home':
    case 'quiet':
      return <HomeScreen />;
    case 'search':
      return <SearchScreen />;
    case 'fare':
      return <FareScreen />;
    case 'searching':
    case 'offers':
    case 'noOffers':
    case 'offer':
      return <MatchScreen />;
    case 'arriving':
    case 'trip':
    case 'cash':
    case 'rate':
      return <RideScreen />;
    default:
      return <HomeScreen />;
  }
}

export function PassengerRoot() {
  return (
    <AppShell>
      <PassengerSession>
        <PassengerProvider>
          <PassengerSwitch />
        </PassengerProvider>
      </PassengerSession>
    </AppShell>
  );
}
