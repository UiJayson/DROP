import {
  defaultQuote,
  earlierTrips,
  formatNaira,
  riderProfile,
  riderRequest,
  weekExtraKobo,
} from '@drop/shared';
import {
  Button,
  DemoBridge,
  FareStepper,
  Header,
  MapCanvas,
  Notice,
  PinDigits,
  PinPad,
  Screen,
  Stars,
  tapHaptic,
} from '@drop/ui';
import { colors, spacing } from '@drop/ui-tokens';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Seats } from '../flow';
import { layout } from '../layout';
import { useRider } from '../rider-context';

const offerKobo = defaultQuote().midpointKobo;

export function RiderSwitch() {
  const { state } = useRider();
  switch (state.route) {
    case 'home':
    case 'offline':
      return <Home />;
    case 'request':
      return <Request />;
    case 'counter':
      return <Counter />;
    case 'waiting':
      return <Waiting />;
    case 'heading':
      return <Heading />;
    case 'pin':
      return <Pin />;
    case 'trip':
      return <OnTrip />;
    case 'cash':
      return <Cash />;
    case 'rate':
      return <Rate />;
    case 'earnings':
      return <Earnings />;
    default:
      return <Home />;
  }
}

function Home() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  const today = earlierTrips.reduce((sum, trip) => sum + trip.fareKobo, 0);
  const shown = state.completed ? today + offerKobo : today;
  const seats: Seats[] = [0, 1, 2, 3];

  return (
    <Screen testID={state.online ? 'screen-home' : 'screen-offline'}>
      <View style={{ flex: 1 }}>
        <MapCanvas kekes={state.online ? 3 : 0} />
        <View
          style={{
            position: 'absolute',
            top: Math.max(insets.top, spacing.sm),
            left: spacing.md,
            backgroundColor: colors.surface1,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.separator,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <Text style={layout.wordmark}>DROP</Text>
          <Text style={layout.headline}>
            {riderProfile.colour} Keke · {riderProfile.plate}
          </Text>
        </View>
      </View>
      <ScrollView
        style={{ maxHeight: '68%' }}
        contentContainerStyle={[
          layout.pad,
          {
            backgroundColor: colors.surface2,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <Text style={layout.footnote}>
          {riderProfile.name} · {riderProfile.rating.toFixed(2)} ·{' '}
          {riderProfile.rides.toLocaleString('en-NG')} rides
        </Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={state.online ? 'You are online' : 'You are offline'}
          accessibilityState={{ checked: state.online }}
          onPress={() => {
            void tapHaptic('medium');
            dispatch({ type: 'toggleOnline' });
          }}
          style={[layout.online, state.online ? layout.onlineOn : layout.onlineOff]}
          testID="online-toggle"
        >
          <Text style={state.online ? layout.onlineLabelOn : layout.onlineLabelOff}>
            {state.online ? 'Online' : 'Offline'}
          </Text>
        </Pressable>
        {state.online ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={layout.headline}>Carrying passengers?</Text>
            <Text style={layout.footnote}>
              Passengers see this on your offer, with a longer ETA.
            </Text>
            <View style={layout.row}>
              {seats.map((count) => {
                const on = state.seats === count;
                return (
                  <Pressable
                    key={count}
                    accessibilityRole="button"
                    accessibilityLabel={
                      count === 0 ? 'No passengers on board' : `Carrying ${count}`
                    }
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      void tapHaptic('selection');
                      dispatch({ type: 'setSeats', seats: count });
                    }}
                    style={[layout.seat, on && layout.seatOn]}
                    testID={`seats-${count}`}
                  >
                    <Text style={[layout.seatText, on && layout.seatTextOn]}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={layout.secondary}>Go online to receive DROP requests near Festac.</Text>
        )}
        {state.notice ? <Notice message={state.notice} /> : null}
        {state.online ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New DROP request"
            onPress={() => dispatch({ type: 'openRequest' })}
            style={layout.card}
            testID="view-request"
          >
            <Text style={layout.footnote}>New DROP · {riderRequest.pickupKm} km away</Text>
            <Text style={layout.headline}>
              {riderRequest.passengerName} · {formatNaira(offerKobo)}
            </Text>
            <Text style={layout.secondary}>
              {riderRequest.pickupTitle} → {riderRequest.destination}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today's earnings"
          onPress={() => dispatch({ type: 'openEarnings' })}
          style={layout.card}
          testID="open-earnings"
        >
          <Text style={layout.footnote}>Today</Text>
          <Text style={layout.headline}>{formatNaira(shown)}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Request() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  const [left, setLeft] = useState<number>(riderRequest.countdownSec);

  useEffect(() => {
    if (!state.live) {
      return undefined;
    }
    void tapHaptic('warning');
    const timer = setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.live]);

  useEffect(() => {
    if (state.live && left === 0) {
      dispatch({ type: 'expire' });
    }
  }, [dispatch, left, state.live]);

  const clock = `0:${String(left).padStart(2, '0')}`;

  return (
    <Screen testID="screen-request">
      <ScrollView
        contentContainerStyle={[
          layout.pad,
          {
            paddingTop: Math.max(insets.top, spacing.md),
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <Text style={layout.footnote}>Time to decide</Text>
        <Text style={layout.fare} accessibilityLiveRegion="polite">
          {clock}
        </Text>
        <Text accessibilityRole="header" style={layout.title}>
          DROP request
        </Text>
        <Text style={layout.fare}>{formatNaira(offerKobo)}</Text>
        <View style={layout.card}>
          <Text style={layout.footnote}>Pickup · {riderRequest.pickupKm} km</Text>
          <Text style={layout.headline}>{riderRequest.pickupTitle}</Text>
          <Text style={layout.body}>{riderRequest.pickupNote}</Text>
        </View>
        <View style={layout.card}>
          <Text style={layout.footnote}>Drop-off · {riderRequest.tripKm} km trip</Text>
          <Text style={layout.headline}>{riderRequest.destination}</Text>
          <Text style={layout.secondary}>Passenger {riderRequest.passengerName} · Cash</Text>
        </View>
        {state.seats > 0 ? (
          <Notice
            message={`You are carrying ${state.seats}. The ETA shown to ${riderRequest.passengerName} includes dropping them first.`}
          />
        ) : null}
        <Button
          label={`Accept ${formatNaira(offerKobo)}`}
          onPress={() => dispatch({ type: 'accept' })}
          testID="accept"
        />
        <Button
          label="Counter"
          variant="secondary"
          onPress={() => dispatch({ type: 'openCounter' })}
          testID="open-counter"
        />
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => dispatch({ type: 'skip' })}
          testID="skip"
        />
      </ScrollView>
    </Screen>
  );
}

function Counter() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  const presets = [10_000, 20_000];
  return (
    <Screen testID="screen-counter">
      <View style={{ paddingTop: Math.max(insets.top, spacing.xs) }}>
        <Header title="Counter" onBack={() => dispatch({ type: 'backToRequest' })} />
      </View>
      <ScrollView contentContainerStyle={[layout.pad, { paddingBottom: spacing.lg }]}>
        <Text style={layout.secondary}>
          One counter on this request. Ada offered {formatNaira(offerKobo)}.
        </Text>
        <FareStepper
          amountKobo={state.counterKobo}
          minKobo={offerKobo + 5_000}
          onStep={(direction) => dispatch({ type: 'stepCounter', direction })}
        />
        <View style={layout.row}>
          {presets.map((extra) => {
            const amount = offerKobo + extra;
            const on = state.counterKobo === amount;
            return (
              <View key={extra} style={layout.grow}>
                <Button
                  size="compact"
                  label={`+${formatNaira(extra)}`}
                  variant={on ? 'primary' : 'secondary'}
                  onPress={() => dispatch({ type: 'setCounter', amountKobo: amount })}
                  testID={extra === 10_000 ? 'counter-100' : 'counter-200'}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={[layout.pad, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          label={`Send ${formatNaira(state.counterKobo)}`}
          onPress={() => dispatch({ type: 'sendCounter' })}
          testID="send-counter"
        />
      </View>
    </Screen>
  );
}

function Waiting() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  const amount = state.decision === 'counter' ? state.counterKobo : offerKobo;
  return (
    <Screen testID="screen-waiting">
      <View style={[layout.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text accessibilityRole="header" style={layout.title}>
          Waiting for Ada
        </Text>
        <Text style={layout.secondary}>
          You {state.decision === 'counter' ? 'countered' : 'accepted'} {formatNaira(amount)}. She
          is choosing a rider.
        </Text>
        <DemoBridge
          label="Prototype · Ada chose you"
          onPress={() => dispatch({ type: 'demoChosen' })}
          testID="demo-chosen"
        />
        <Button
          label="Withdraw offer"
          variant="danger"
          onPress={() => dispatch({ type: 'skip' })}
        />
      </View>
    </Screen>
  );
}

function Heading() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  const [nav, setNav] = useState(false);
  return (
    <Screen testID="screen-heading">
      <View style={{ flex: 1 }}>
        <MapCanvas title="To pickup" subtitle={riderRequest.pickupTitle} />
      </View>
      <View
        style={[
          layout.pad,
          { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: colors.surface2 },
        ]}
      >
        <Text style={layout.footnote}>Passenger</Text>
        <Text style={layout.title}>{riderRequest.passengerName}</Text>
        <Text style={layout.body}>{riderRequest.pickupNote}</Text>
        {state.seats > 0 ? (
          <Text style={layout.footnote}>Drop your current passengers on the way.</Text>
        ) : null}
        <Button
          label="Navigate"
          variant="secondary"
          onPress={() => setNav(true)}
          testID="navigate"
        />
        {nav ? (
          <Notice message="Google Maps would open for turn-by-turn. This prototype stays in DROP." />
        ) : null}
        <Button label="Arrived" onPress={() => dispatch({ type: 'arrived' })} testID="arrived" />
      </View>
    </Screen>
  );
}

function Pin() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  return (
    <Screen testID="screen-pin">
      <ScrollView
        contentContainerStyle={[
          layout.pad,
          {
            paddingTop: Math.max(insets.top, spacing.lg),
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <Text accessibilityRole="header" style={layout.title}>
          Boarding PIN
        </Text>
        <Text style={layout.secondary}>Ask Ada for the 4-digit PIN on her phone.</Text>
        <PinDigits value={state.pin} />
        {state.pinError ? <Notice message={state.pinError} /> : null}
        <Text style={layout.footnote}>Prototype PIN · 4821</Text>
        <PinPad
          onDigit={(digit) => dispatch({ type: 'pinDigit', digit })}
          onBackspace={() => dispatch({ type: 'pinBack' })}
        />
      </ScrollView>
    </Screen>
  );
}

function OnTrip() {
  const { dispatch } = useRider();
  const insets = useSafeAreaInsets();
  return (
    <Screen testID="screen-trip">
      <View style={{ flex: 1 }}>
        <MapCanvas
          title="On trip"
          subtitle="Updated 5s ago"
          destination={riderRequest.destination}
        />
      </View>
      <View
        style={[
          layout.pad,
          { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: colors.surface2 },
        ]}
      >
        <Text style={layout.footnote}>Agreed fare · locked</Text>
        <Text style={layout.fare}>{formatNaira(offerKobo)}</Text>
        <Text style={layout.body}>
          {riderRequest.passengerName} · {riderRequest.destination}
        </Text>
        <Button label="End trip" onPress={() => dispatch({ type: 'endTrip' })} testID="end-trip" />
      </View>
    </Screen>
  );
}

function Cash() {
  const { dispatch } = useRider();
  const insets = useSafeAreaInsets();
  return (
    <Screen testID="screen-cash">
      <View style={[layout.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={layout.footnote}>Confirm the cash</Text>
        <Text accessibilityRole="header" style={layout.fare}>
          {formatNaira(offerKobo)}
        </Text>
        <Text style={layout.body}>Did you receive {formatNaira(offerKobo)} from Ada?</Text>
        <Button
          label="Received cash"
          onPress={() => dispatch({ type: 'cashYes' })}
          testID="cash-yes"
        />
        <Button
          label="Not paid"
          variant="danger"
          onPress={() => dispatch({ type: 'cashNo' })}
          testID="cash-no"
        />
      </View>
    </Screen>
  );
}

function Rate() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  return (
    <Screen testID="screen-rate">
      <View style={[layout.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {state.notice ? <Notice message={state.notice} /> : null}
        <Text
          style={[
            layout.headline,
            { color: state.cash === 'received' ? colors.success : colors.warning },
          ]}
        >
          {state.cash === 'received' ? 'Cash received' : 'Payment flagged'}
        </Text>
        <Text accessibilityRole="header" style={layout.title}>
          Rate Ada
        </Text>
        <Stars value={state.stars} onChange={(stars) => dispatch({ type: 'setStars', stars })} />
        <Button
          label="Done"
          disabled={state.stars === 0}
          onPress={() => dispatch({ type: 'finishRating' })}
          testID="done-rate"
        />
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => dispatch({ type: 'finishRating' })}
          testID="skip-rate"
        />
      </View>
    </Screen>
  );
}

function Earnings() {
  const { state, dispatch } = useRider();
  const insets = useSafeAreaInsets();
  const [week, setWeek] = useState(false);
  const trips = state.completed
    ? [
        { id: 'now', route: 'Festac → Alaba International', fareKobo: offerKobo, when: 'Now' },
        ...earlierTrips,
      ]
    : [...earlierTrips];
  const today = trips.reduce((sum, trip) => sum + trip.fareKobo, 0);

  return (
    <Screen testID="screen-earnings">
      <View style={{ paddingTop: Math.max(insets.top, spacing.xs) }}>
        <Header title="Earnings" onBack={() => dispatch({ type: 'closeEarnings' })} />
      </View>
      <View style={[layout.pad, layout.row]}>
        <View style={layout.grow}>
          <Button
            size="compact"
            label="Today"
            variant={week ? 'secondary' : 'primary'}
            onPress={() => setWeek(false)}
            testID="earnings-today"
          />
        </View>
        <View style={layout.grow}>
          <Button
            size="compact"
            label="Week"
            variant={week ? 'primary' : 'secondary'}
            onPress={() => setWeek(true)}
            testID="earnings-week"
          />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[layout.pad, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Text style={layout.fare}>{formatNaira(week ? today + weekExtraKobo : today)}</Text>
        <Text style={layout.footnote}>
          {week ? 'Today plus earlier days this week.' : `${trips.length} trips · cash`}
        </Text>
        {week
          ? null
          : trips.map((trip) => (
              <View key={trip.id} style={layout.card}>
                <View style={layout.row}>
                  <Text style={[layout.headline, layout.grow]}>{trip.route}</Text>
                  <Text style={layout.headline}>{formatNaira(trip.fareKobo)}</Text>
                </View>
                <Text style={layout.footnote}>{trip.when}</Text>
              </View>
            ))}
        <Text style={layout.footnote}>Commission is not set yet. Totals are the cash fares.</Text>
      </ScrollView>
    </Screen>
  );
}
