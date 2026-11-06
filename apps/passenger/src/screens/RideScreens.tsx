import { BOARDING_PIN, formatNaira, ratingTags } from '@drop/shared';
import { Button, DemoBridge, MapCanvas, Notice, Screen, Stars, StatusPill } from '@drop/ui';
import { colors, spacing } from '@drop/ui-tokens';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '../booking';
import { selectedOffer } from '../flow';
import { layout } from '../layout';
import { usePassenger } from '../passenger-context';
import { LivePassengerTrip } from './LiveTripScreen';

export function RideScreen() {
  const { state } = usePassenger();
  const booking = useBooking();
  if (booking.enabled && booking.chosen) {
    return <LivePassengerTrip />;
  }
  if (state.route === 'trip') {
    return <Trip />;
  }
  if (state.route === 'cash') {
    return <Cash />;
  }
  if (state.route === 'rate') {
    return <Rate />;
  }
  return <Arriving />;
}

function Arriving() {
  const { state, dispatch } = usePassenger();
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const prototype = selectedOffer(state);
  const chosen = booking.chosen?.offer;
  const offer = chosen
    ? {
        name: chosen.name,
        rating: chosen.rating,
        rides: chosen.rides,
        plate: chosen.plate,
        colour: chosen.colour,
        etaMin: Math.max(1, Math.round(chosen.etaS / 60)),
        seats: chosen.seats,
        amountKobo: booking.chosen?.agreedFareKobo ?? chosen.amountKobo,
      }
    : prototype;
  const pin = booking.enabled ? (booking.chosen?.pin ?? null) : BOARDING_PIN;
  const [tool, setTool] = useState<'call' | 'share' | 'report' | null>(null);

  return (
    <Screen testID="screen-arriving">
      <View style={layout.mapSlot}>
        <MapCanvas
          title="Rider arriving"
          subtitle={offer ? `${offer.etaMin} min` : undefined}
          kekes={1}
        />
      </View>
      <ScrollView
        style={{ maxHeight: '68%' }}
        contentContainerStyle={[
          layout.sheet,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={layout.grabber} />
        <StatusPill tone="yellow" label={offer ? `Arriving · ${offer.etaMin} min` : 'Arriving'} />
        <Text style={layout.headline}>{offer?.name ?? 'Your rider'}</Text>
        <Text style={layout.plate}>
          {offer ? `${offer.colour} Keke · ${offer.plate}` : 'Check the plate'}
        </Text>
        <Text style={layout.secondary}>
          {offer ? `${offer.rating.toFixed(2)} · ${offer.rides.toLocaleString('en-NG')} rides` : ''}
        </Text>
        {offer && offer.seats > 0 ? (
          <StatusPill tone="orange" label={`Carrying ${offer.seats} passengers`} />
        ) : null}
        <View style={layout.pinHero}>
          <Text style={layout.footnote}>Boarding PIN · tell {offer?.name ?? 'the rider'}</Text>
          <Text
            style={layout.bigPin}
            accessibilityLabel={pin ? `Boarding PIN ${pin}` : 'Boarding PIN is on its way'}
          >
            {pin ?? '····'}
          </Text>
          <Text style={layout.footnote}>
            The trip starts when they enter it. Fare {offer ? formatNaira(offer.amountKobo) : ''}
          </Text>
        </View>
        <View style={layout.actions}>
          <View style={layout.grow}>
            <Button
              size="compact"
              label="Call"
              variant="secondary"
              onPress={() => setTool('call')}
              testID="call-rider"
            />
          </View>
          <View style={layout.grow}>
            <Button
              size="compact"
              label="Share"
              variant="secondary"
              onPress={() => setTool('share')}
              testID="share-trip"
            />
          </View>
          <View style={layout.grow}>
            <Button
              size="compact"
              label="Report"
              variant="secondary"
              onPress={() => setTool('report')}
              testID="report"
            />
          </View>
        </View>
        {tool === 'call' ? (
          <Notice message="Calling Adaeze on 0803 ••• 2194. The number stays masked." />
        ) : null}
        {tool === 'share' ? (
          <Notice message="Share link ready: drop.ng/t/festac-alaba · name, plate, and ETA." />
        ) : null}
        {tool === 'report' ? (
          <Notice message="Report sent to DROP support. Your trip stays open." />
        ) : null}
        <DemoBridge
          label="Prototype · rider entered the PIN"
          onPress={() => dispatch({ type: 'demoBoarded' })}
          testID="demo-boarded"
        />
        <Button label="Cancel trip" variant="danger" onPress={() => dispatch({ type: 'cancel' })} />
      </ScrollView>
    </Screen>
  );
}

function Trip() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const offer = selectedOffer(state);
  return (
    <Screen testID="screen-trip">
      <View style={layout.mapSlot}>
        <MapCanvas title="On trip" subtitle="Updated 5s ago" destination="Alaba" kekes={0} />
      </View>
      <View
        style={[
          layout.sheet,
          { paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm },
        ]}
      >
        <View style={layout.grabber} />
        <StatusPill tone="green" label="On trip" />
        <Text accessibilityRole="header" style={layout.title}>
          Heading to {offer ? 'the drop-off' : 'Alaba'}
        </Text>
        <Text style={layout.secondary}>Location updated 5 seconds ago.</Text>
        <Text style={layout.headline}>
          Agreed fare {offer ? formatNaira(offer.amountKobo) : ''} · Cash
        </Text>
        <Text style={layout.footnote}>
          {offer?.name} · {offer?.plate}. The fare is locked.
        </Text>
        <DemoBridge
          label="Prototype · you have arrived"
          onPress={() => dispatch({ type: 'demoArrived' })}
          testID="demo-arrived"
        />
      </View>
    </Screen>
  );
}

function Cash() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const offer = selectedOffer(state);
  const amount = offer ? formatNaira(offer.amountKobo) : '';
  return (
    <Screen testID="screen-cash">
      <View style={[layout.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={layout.footnote}>Pay the rider in cash</Text>
        <Text accessibilityRole="header" style={layout.fare}>
          {amount}
        </Text>
        <Text style={layout.body}>
          Hand {amount} to {offer?.name ?? 'your rider'}. They confirm it on their phone. The fare
          cannot change.
        </Text>
        <DemoBridge
          label="Prototype · rider confirmed the cash"
          onPress={() => dispatch({ type: 'demoPaid' })}
          testID="demo-paid"
        />
        <Button
          label="Didn’t pay / dispute"
          variant="danger"
          onPress={() => dispatch({ type: 'dispute' })}
          testID="dispute"
        />
      </View>
    </Screen>
  );
}

function Rate() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const offer = selectedOffer(state);
  return (
    <Screen testID="screen-rate">
      <ScrollView
        contentContainerStyle={[
          layout.center,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            flexGrow: 1,
          },
        ]}
      >
        {state.notice ? <Notice message={state.notice} /> : null}
        <Text style={[layout.headline, { color: state.dispute ? colors.warning : colors.success }]}>
          {state.dispute ? 'Payment flagged' : 'Paid'}
        </Text>
        <Text accessibilityRole="header" style={layout.title}>
          Rate {offer?.name ?? 'your rider'}
        </Text>
        <Stars value={state.stars} onChange={(stars) => dispatch({ type: 'setStars', stars })} />
        <View style={[layout.actions, { flexWrap: 'wrap', justifyContent: 'center' }]}>
          {ratingTags.map((tag) => {
            const on = state.tags.includes(tag);
            return (
              <Pressable
                key={tag}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tag}
                onPress={() => dispatch({ type: 'toggleTag', tag })}
                style={[layout.tag, on && layout.tagOn]}
                testID={`tag-${tag.toLowerCase()}`}
              >
                <Text style={[layout.headline, on && { color: colors.onPrimary }]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Done"
          disabled={state.stars === 0}
          onPress={() => dispatch({ type: 'finish' })}
          testID="done-rate"
        />
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => dispatch({ type: 'finish' })}
          testID="skip-rate"
        />
      </ScrollView>
    </Screen>
  );
}
