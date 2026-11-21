import { PhoneSignIn, typeStyle } from '@drop/ui';
import { colors, spacing } from '@drop/ui-tokens';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountProvider } from '../account';
import type { PassengerRoute } from '../flow';
import { PassengerProvider, usePassenger } from '../passenger-context';
import { PassengerSwitch } from '../PassengerRoot';
import { RiderAccessProvider } from '../../../rider/src/access';
import type { RiderRoute } from '../../../rider/src/flow';
import { RiderProvider, useRider } from '../../../rider/src/rider-context';
import { RiderSwitch } from '../../../rider/src/screens/RiderScreens';

const steps = [
  { id: 'signin', label: 'Sign in', passenger: null, rider: null },
  { id: 'home', label: 'Home', passenger: 'home', rider: 'home' },
  { id: 'search', label: 'Search', passenger: 'search', rider: 'home' },
  { id: 'fare', label: 'Fare', passenger: 'fare', rider: 'home' },
  { id: 'request', label: 'Request', passenger: 'searching', rider: 'request' },
  { id: 'offer', label: 'Offer', passenger: 'offers', rider: 'waiting' },
  { id: 'accept', label: 'Accept', passenger: 'offer', rider: 'heading' },
  { id: 'arriving', label: 'Arriving', passenger: 'arriving', rider: 'heading' },
  { id: 'pin', label: 'PIN', passenger: 'arriving', rider: 'pin' },
  { id: 'trip', label: 'Trip', passenger: 'trip', rider: 'trip' },
  { id: 'cash', label: 'Cash', passenger: 'cash', rider: 'cash' },
  { id: 'rate', label: 'Rate', passenger: 'rate', rider: 'rate' },
] as const;

type StepId = (typeof steps)[number]['id'];

function locationSearch(): string {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  return typeof search === 'string' ? search : '';
}

export function isFlowPrototype(): boolean {
  return new URLSearchParams(locationSearch()).get('preview') === 'prototype';
}

function passengerAdvance(route: PassengerRoute, current: StepId): StepId | null {
  if (
    route === 'arriving' &&
    (current === 'pin' || current === 'trip' || current === 'cash' || current === 'rate')
  ) {
    return null;
  }
  switch (route) {
    case 'home':
    case 'quiet':
      return current === 'signin' ? null : 'home';
    case 'search':
      return 'search';
    case 'fare':
      return 'fare';
    case 'searching':
      return 'request';
    case 'offers':
      return 'offer';
    case 'offer':
      return 'accept';
    case 'arriving':
      return 'arriving';
    case 'trip':
      return 'trip';
    case 'cash':
      return 'cash';
    case 'rate':
      return 'rate';
    default:
      return null;
  }
}

function riderAdvance(route: RiderRoute, current: StepId): StepId | null {
  switch (route) {
    case 'request':
    case 'counter':
      return 'request';
    case 'waiting':
      return 'offer';
    case 'pin':
      return 'pin';
    case 'trip':
      return 'trip';
    case 'cash':
      return 'cash';
    case 'rate':
    case 'earnings':
      return 'rate';
    case 'home':
    case 'offline':
      return current === 'request' || current === 'offer' ? 'home' : null;
    default:
      return null;
  }
}

export function FlowPrototype() {
  return (
    <SafeAreaProvider>
      <PrototypePage />
    </SafeAreaProvider>
  );
}

function PrototypePage() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<StepId>('signin');
  const current = steps.find((item) => item.id === step) ?? steps[0];
  const index = steps.findIndex((item) => item.id === step);
  const wide = width >= 860;
  const onPassenger = useCallback((route: PassengerRoute) => {
    setStep((now) => passengerAdvance(route, now) ?? now);
  }, []);
  const onRider = useCallback((route: RiderRoute) => {
    setStep((now) => riderAdvance(route, now) ?? now);
  }, []);

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <Text style={styles.kicker}>DROP demo · sample Festac trip · nothing is sent or saved</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
      >
        {steps.map((item) => {
          const on = item.id === step;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setStep(item.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.controls}>
        <Control label="Back" disabled={index <= 0} onPress={() => setStep(steps[index - 1].id)} />
        <Control
          label="Next"
          disabled={index >= steps.length - 1}
          onPress={() => setStep(steps[index + 1].id)}
        />
        <Control label="Restart" onPress={() => setStep('signin')} />
      </View>
      <View style={[styles.stage, wide ? styles.stageRow : styles.stageStack]}>
        <Phone title="Passenger">
          {current.passenger ? (
            <PassengerProvider key={step} seedRoute={current.passenger} suspendAutoOffers>
              <AccountProvider
                value={{ phoneMask: '+234 80 ••• ••78', signOut: () => setStep('signin') }}
              >
                <PassengerWatch onRoute={onPassenger} />
              </AccountProvider>
            </PassengerProvider>
          ) : (
            <PhoneSignIn
              audience="Passenger"
              national="8012345678"
              error={null}
              busy={false}
              onChange={() => undefined}
              onSubmit={() => setStep('home')}
              onPreview={() => setStep('home')}
            />
          )}
        </Phone>
        <Phone title="Rider">
          {current.rider ? (
            <RiderProvider key={step} seedRoute={current.rider}>
              <RiderAccessProvider
                value={{
                  banner: 'Demo rider. This does not go online.',
                  changeOnline: async () => null,
                  changeSeats: async () => null,
                  signOut: () => setStep('signin'),
                }}
              >
                <RiderWatch onRoute={onRider} />
              </RiderAccessProvider>
            </RiderProvider>
          ) : (
            <PhoneSignIn
              audience="Rider"
              national="8098765432"
              error={null}
              busy={false}
              onChange={() => undefined}
              onSubmit={() => setStep('home')}
              onPreview={() => setStep('home')}
            />
          )}
        </Phone>
      </View>
    </View>
  );
}

function PassengerWatch({ onRoute }: { onRoute: (route: PassengerRoute) => void }) {
  const { state } = usePassenger();
  useEffect(() => {
    onRoute(state.route);
  }, [onRoute, state.route]);
  return <PassengerSwitch />;
}

function RiderWatch({ onRoute }: { onRoute: (route: RiderRoute) => void }) {
  const { state } = useRider();
  useEffect(() => {
    onRoute(state.route);
  }, [onRoute, state.route]);
  return <RiderSwitch />;
}

function Phone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.phoneCol}>
      <Text style={styles.phoneTitle}>{title}</Text>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

function Control({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.control, disabled && styles.controlOff]}
    >
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#070708',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    color: colors.textSecondary,
    ...typeStyle('caption'),
  },
  chipScroll: {
    flexGrow: 0,
    maxHeight: 48,
  },
  chips: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface3,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: '#F5C42E',
  },
  chipText: {
    color: colors.textPrimary,
    ...typeStyle('label'),
  },
  chipTextOn: {
    color: colors.onPrimary,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  control: {
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  controlOff: {
    opacity: 0.4,
  },
  controlText: {
    color: colors.textPrimary,
    ...typeStyle('label'),
  },
  stage: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stageStack: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  phoneCol: {
    flex: 1,
    maxWidth: 400,
    minWidth: 280,
    gap: 6,
  },
  phoneTitle: {
    color: colors.textPrimary,
    ...typeStyle('label'),
    textAlign: 'center',
  },
  phone: {
    flex: 1,
    minHeight: 640,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C2C30',
    backgroundColor: colors.bg,
  },
});
