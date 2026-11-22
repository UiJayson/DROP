import { phoneFromNational, placeById } from '@drop/shared';
import { CodeSignIn, NameSignIn, PhoneSignIn } from '@drop/ui';
import { useEffect, useState } from 'react';

import { AccountProvider } from '../account';
import type { PassengerState } from '../flow';
import { PassengerProvider, usePassenger } from '../passenger-context';
import { PassengerSwitch } from '../PassengerRoot';
import { HistoryScreen, ProfileScreen, SafetyScreen, SettingsScreen } from './DemoScreens';
import { DemoPlaceProvider, DemoShellProvider, type DemoPanel } from './shell';
import {
  demoUser,
  loadDemo,
  resetDemo,
  saveDemo,
  tripSnapshot,
  type DemoData,
  type DemoTrip,
} from './store';

export function DemoApp() {
  const [data, setData] = useState<DemoData>(() => loadDemo());
  const [step, setStep] = useState<'phone' | 'code' | 'name' | 'app'>(() =>
    loadDemo().user ? 'app' : 'phone',
  );
  const [national, setNational] = useState(() =>
    data.user ? nationalFromMask(data.user.phone) : '8012345678',
  );
  const [code, setCode] = useState('');
  const [name, setName] = useState(() => data.user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<DemoPanel>('app');

  function commit(next: DemoData) {
    saveDemo(next);
    setData(next);
  }

  const phone = phoneFromNational(national);

  if (step === 'phone') {
    return (
      <PhoneSignIn
        audience="Passenger"
        national={national}
        error={error}
        busy={false}
        onChange={(value) => {
          setNational(value);
          setError(null);
        }}
        onSubmit={() => {
          if (!phone) {
            setError('Enter a valid Nigerian mobile number.');
            return;
          }
          setError(null);
          setStep('code');
        }}
      />
    );
  }

  if (step === 'code') {
    return (
      <CodeSignIn
        phoneE164={phone ?? '+2348012345678'}
        code={code}
        error={error}
        busy={false}
        resendSeconds={0}
        onChange={(value) => {
          setCode(value);
          setError(null);
        }}
        onBack={() => setStep('phone')}
        onResend={() => setError('Demo only. No text is sent. Enter any 6 digits.')}
        onSubmit={() => {
          if (code.trim().length < 6) {
            setError('Enter any 6 digits. This demo does not send a text.');
            return;
          }
          setError(null);
          if (data.user) {
            setStep('app');
            return;
          }
          setStep('name');
        }}
      />
    );
  }

  if (step === 'name' || !data.user) {
    return (
      <NameSignIn
        name={name}
        error={error}
        busy={false}
        onChange={setName}
        onSubmit={() => {
          if (name.trim().length < 2) {
            setError('Enter the name riders should use.');
            return;
          }
          commit({ ...data, user: demoUser(phone ?? '+2348012345678', name) });
          setStep('app');
        }}
      />
    );
  }

  const user = data.user;

  return (
    <DemoShellProvider value={{ panel, open: setPanel, close: () => setPanel('app') }}>
      <DemoPlaceProvider
        pickupId={data.pickupId}
        onPickup={(pickupId) => commit({ ...data, pickupId })}
      >
        <AccountProvider
          value={{
            phoneMask: user.phoneMask,
            signOut: () => {
              commit({ ...data, user: null, trip: null });
              setCode('');
              setStep('phone');
              setPanel('app');
            },
          }}
        >
          <PassengerProvider seedState={data.trip ?? undefined}>
            <DemoPersist data={data} onData={commit} panel={panel} />
          </PassengerProvider>
        </AccountProvider>
      </DemoPlaceProvider>
    </DemoShellProvider>
  );
}

function DemoPersist({
  data,
  onData,
  panel,
}: {
  data: DemoData;
  onData: (next: DemoData) => void;
  panel: DemoPanel;
}) {
  const { state } = usePassenger();

  useEffect(() => {
    const previous = data.trip;
    let history = data.history;
    if (previous?.route === 'rate' && state.route === 'home') {
      const trip = historyTrip(previous);
      history = [trip, ...history.filter((item) => item.id !== trip.id)];
    }
    const trip = tripSnapshot(state);
    if (JSON.stringify(previous) === JSON.stringify(trip) && history === data.history) {
      return;
    }
    onData({ ...data, history, trip });
  }, [data, onData, state]);

  if (panel === 'account') {
    return <ProfileScreen data={data} />;
  }
  if (panel === 'settings') {
    return (
      <SettingsScreen
        data={data}
        onReset={() => {
          resetDemo();
          onData({ ...loadDemo(), user: null, history: [], trip: null });
          globalThis.location?.reload();
        }}
        onSignOut={() => {
          onData({ ...data, user: null, trip: null });
          globalThis.location?.reload();
        }}
      />
    );
  }
  if (panel === 'history') {
    return <HistoryScreen trips={data.history} />;
  }
  if (panel === 'safety') {
    return (
      <SafetyScreen
        trustedName={data.prefs.trustedName}
        trustedPhone={data.prefs.trustedPhone}
        onSave={(trustedName, trustedPhone) =>
          onData({ ...data, prefs: { trustedName, trustedPhone } })
        }
      />
    );
  }
  return <PassengerSwitch />;
}

function historyTrip(state: PassengerState): DemoTrip {
  const placeId = state.placeId && state.placeId !== 'live' ? state.placeId : 'alaba';
  const place = placeById(placeId);
  return {
    id: `trip-${placeId}-${state.offerKobo}`,
    when: 'Just now',
    from: 'Your pickup',
    to: place?.name ?? placeId,
    placeId,
    fareKobo: state.offerKobo,
    rider: 'Adaeze',
    stars: state.stars,
  };
}

function nationalFromMask(phone: string) {
  return phone.startsWith('+234') ? phone.slice(4) : phone;
}
