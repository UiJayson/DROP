import {
  dropoffMinutes,
  etaMinutes,
  formatNaira,
  nairaToKobo,
  radiusSearchLabel,
  type PrototypeOffer,
} from '@drop/shared';
import { Button, DemoBridge, Enter, Header, MapCanvas, Notice, Screen, StatusPill } from '@drop/ui';
import { spacing } from '@drop/ui-tokens';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '../booking';
import { selectedOffer, visibleOffers } from '../flow';
import { layout } from '../layout';
import { usePassenger } from '../passenger-context';

export function MatchScreen() {
  const { state } = usePassenger();
  if (state.route === 'noOffers') {
    return <NoOffers />;
  }
  if (state.route === 'offer') {
    return <OfferSelected />;
  }
  return <Searching />;
}

function useSecondsLeft(iso: string | null): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) {
      return undefined;
    }
    const tick = () => {
      setLeft(Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 1000)));
    };
    const start = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [iso]);
  if (!iso) {
    return null;
  }
  return left;
}

function useNowMs(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const start = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, []);
  return now;
}

function clock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(seconds % 60).padStart(2, '0')}`;
}

function Searching() {
  const { state, dispatch } = usePassenger();
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const now = useNowMs();
  const liveOffers = booking.offers
    .filter((offer) => offer.status === 'open' && (now === 0 || Date.parse(offer.expiresAt) > now))
    .map((offer) => ({
      id: offer.id,
      name: offer.name,
      rating: offer.rating,
      rides: offer.rides,
      plate: offer.plate,
      colour: offer.colour,
      etaMin: etaMinutes(offer.etaS),
      dropoffMin: dropoffMinutes(offer.seats),
      seats: offer.seats,
      amountKobo: offer.amountKobo,
      kind: offer.kind,
    }));
  const offers =
    booking.enabled && state.route === 'offers'
      ? liveOffers
      : state.route === 'offers'
        ? visibleOffers(state)
        : [];
  const left = useSecondsLeft(booking.enabled ? booking.expiresAt : null);
  useEffect(() => {
    if (booking.enabled && state.route === 'searching' && left === 0) {
      dispatch({ type: 'noOffers' });
    }
  }, [booking.enabled, dispatch, left, state.route]);
  const viewing = booking.enabled
    ? booking.recipientCount === 0
      ? 'Looking for Kekes near your pickup.'
      : `${booking.recipientCount} ${booking.recipientCount === 1 ? 'rider has' : 'riders have'} your request.`
    : state.autoAccept
      ? `Looking for the first rider at ${formatNaira(state.offerKobo)}`
      : '5 riders are viewing your request';

  return (
    <Screen testID={state.route === 'offers' ? 'screen-offers' : 'screen-searching'}>
      <View style={layout.mapShort}>
        <MapCanvas title="Festac Town" radar kekes={12} />
      </View>
      <View
        style={[
          layout.sheet,
          layout.fill,
          { overflow: 'hidden', paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={layout.grabber} />
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
          keyboardShouldPersistTaps="handled"
        >
          {state.route === 'searching' ? (
            <>
              <Text style={layout.footnote}>Time left</Text>
              <Text style={layout.fare} accessibilityLiveRegion="polite">
                {left == null ? '1:00' : clock(left)}
              </Text>
              <Text style={layout.footnote}>
                {radiusSearchLabel(booking.enabled ? booking.radiusM : null)}
              </Text>
              <Text style={layout.body}>{viewing}</Text>
              <Text style={layout.headline}>{formatNaira(state.offerKobo)} · Cash</Text>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={layout.headline}>
                {offers.length} {offers.length === 1 ? 'offer' : 'offers'} · sorted by arrival
              </Text>
              {offers.map((offer, index) => (
                <OfferCard key={offer.id} offer={offer} index={index} />
              ))}
            </>
          )}
        </ScrollView>
        {booking.enabled ? null : (
          <Button
            label="No riders yet"
            variant="secondary"
            onPress={() => dispatch({ type: 'noOffers' })}
            testID="no-offers"
          />
        )}
        {booking.error ? <Notice message={booking.error} /> : null}
        <Button
          label="Cancel"
          variant="danger"
          onPress={() => {
            if (!booking.enabled) {
              dispatch({ type: 'cancel' });
              return;
            }
            void booking.cancel().then(() => dispatch({ type: 'cancel' }));
          }}
          testID="cancel-search"
        />
      </View>
    </Screen>
  );
}

function OfferCard({ offer, index }: { offer: PrototypeOffer; index: number }) {
  const { dispatch } = usePassenger();
  return (
    <Enter delay={index * 40}>
      <View style={layout.offerCard}>
        <View style={layout.row}>
          <Text style={layout.fare}>{formatNaira(offer.amountKobo)}</Text>
          <Text style={layout.headline}>{offer.etaMin} min</Text>
        </View>
        <Text style={layout.footnote}>
          {offer.kind === 'counter' ? 'Counter offer' : 'Your price'}
        </Text>
        {offer.seats > 0 ? (
          <StatusPill tone="orange" label={`Carrying ${offer.seats} passengers`} />
        ) : null}
        <View style={[layout.row, { justifyContent: 'flex-start' }]}>
          <View style={layout.avatar}>
            <Text style={layout.avatarText}>{offer.name.slice(0, 1)}</Text>
          </View>
          <View style={layout.grow}>
            <Text style={layout.headline}>{offer.name}</Text>
            <Text style={layout.secondary}>
              {offer.rating.toFixed(2)} · {offer.rides.toLocaleString('en-NG')} rides
            </Text>
          </View>
        </View>
        <Text style={layout.plate}>
          {offer.colour} Keke · {offer.plate}
        </Text>
        {offer.seats > 0 ? (
          <Text style={layout.footnote}>
            Drops them in about {offer.dropoffMin} min, then comes to you.
          </Text>
        ) : null}
        <View style={layout.actions}>
          <View style={layout.grow}>
            <Button
              size="compact"
              label="Decline"
              variant="secondary"
              onPress={() => dispatch({ type: 'declineOffer', id: offer.id })}
              testID={`decline-${offer.id}`}
            />
          </View>
          <View style={layout.grow}>
            <Button
              size="compact"
              label="Choose"
              onPress={() => dispatch({ type: 'chooseOffer', id: offer.id })}
              testID={`choose-${offer.id}`}
            />
          </View>
        </View>
      </View>
    </Enter>
  );
}

function NoOffers() {
  const { state, dispatch } = usePassenger();
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  function raise(naira: 100 | 200) {
    if (!booking.enabled) {
      dispatch({ type: 'raise', naira });
      return;
    }
    void booking.raise(state.offerKobo + nairaToKobo(naira)).then((ok) => {
      if (ok) {
        dispatch({ type: 'raise', naira });
      }
    });
  }
  return (
    <Screen testID="screen-no-offers">
      <View style={[layout.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text accessibilityRole="header" style={layout.title}>
          No riders yet
        </Text>
        <Text style={layout.secondary}>
          Your offer is still {formatNaira(state.offerKobo)}. A higher fare reaches Kekes further
          out. Or we can tell you when someone is free.
        </Text>
        <Button label="Raise by ₦100" onPress={() => raise(100)} testID="raise-100" />
        <Button
          label="Raise by ₦200"
          variant="secondary"
          onPress={() => raise(200)}
          testID="raise-200"
        />
        <Button
          label="Keep waiting"
          variant="secondary"
          onPress={() => {
            if (!booking.enabled) {
              dispatch({ type: 'keepWaiting' });
              return;
            }
            void booking.keepWaiting().then((ok) => {
              if (ok) {
                dispatch({ type: 'keepWaiting' });
              }
            });
          }}
          testID="keep-waiting"
        />
        <Button
          label="Notify me"
          variant="ghost"
          onPress={() => dispatch({ type: 'setArea', area: 'satellite' })}
          testID="notify-from-search"
        />
        {booking.error ? <Notice message={booking.error} /> : null}
        <Button
          label="Cancel"
          variant="danger"
          onPress={() => {
            if (!booking.enabled) {
              dispatch({ type: 'cancel' });
              return;
            }
            void booking.cancel().then(() => dispatch({ type: 'cancel' }));
          }}
        />
      </View>
    </Screen>
  );
}

function OfferSelected() {
  const { state, dispatch } = usePassenger();
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const live = booking.offers.find((item) => item.id === state.offerId);
  const offer = live
    ? {
        id: live.id,
        name: live.name,
        rating: live.rating,
        rides: live.rides,
        plate: live.plate,
        colour: live.colour,
        etaMin: etaMinutes(live.etaS),
        dropoffMin: dropoffMinutes(live.seats),
        seats: live.seats,
        amountKobo: live.amountKobo,
        kind: live.kind,
      }
    : selectedOffer(state);
  if (!offer) {
    return (
      <DemoBridge
        label="Back to offers"
        onPress={() => dispatch({ type: 'back' })}
        testID="missing-offer"
      />
    );
  }
  return (
    <Screen testID="screen-offer">
      <View style={{ paddingTop: Math.max(insets.top, spacing.xs) }}>
        <Header title="Confirm rider" onBack={() => dispatch({ type: 'back' })} />
      </View>
      <ScrollView contentContainerStyle={[layout.bodyPad, { paddingBottom: spacing.lg }]}>
        <Text style={layout.footnote}>Agreed fare, locked if you confirm</Text>
        <Text style={layout.fare}>{formatNaira(offer.amountKobo)}</Text>
        <View style={layout.card}>
          <Text style={layout.title}>{offer.name}</Text>
          <Text style={layout.secondary}>
            {offer.rating.toFixed(2)} · {offer.rides.toLocaleString('en-NG')} rides · {offer.etaMin}{' '}
            min
          </Text>
          <Text style={layout.plate}>
            {offer.colour} Keke · {offer.plate}
          </Text>
          {offer.seats > 0 ? (
            <StatusPill tone="orange" label={`Carrying ${offer.seats} passengers`} />
          ) : (
            <StatusPill tone="green" label="Empty Keke" />
          )}
        </View>
        <Text style={layout.secondary}>
          {state.forOther && state.riderFor.trim()
            ? `This Drop is for ${state.riderFor.trim()}. `
            : ''}
          Pickup note: {state.landmark}
        </Text>
      </ScrollView>
      <View style={[layout.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          label="Confirm rider"
          disabled={booking.busy}
          onPress={() => {
            if (!booking.enabled || !state.offerId) {
              dispatch({ type: 'confirmOffer' });
              return;
            }
            void booking.select(state.offerId).then((ok) => {
              if (ok) {
                dispatch({ type: 'confirmOffer' });
              }
            });
          }}
          testID="confirm-rider"
        />
      </View>
    </Screen>
  );
}
