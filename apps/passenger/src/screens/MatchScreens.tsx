import {
  dropoffMinutes,
  etaMinutes,
  formatNaira,
  nairaToKobo,
  pickup,
  placeById,
  radiusSearchLabel,
  type PrototypeOffer,
} from '@drop/shared';
import {
  Button,
  DemoBridge,
  Enter,
  FeatureChip,
  FloatingTabBar,
  GlowCard,
  HeaderSheet,
  IconCircleButton,
  InitialAvatar,
  KekeArt,
  KekeGlyph,
  YellowStar,
  MetalButton,
  Notice,
  Pill,
  RideOfferCard,
  RouteTimeline,
  Screen,
  useVantaFont,
  type VantaTab,
} from '@drop/ui';
import { vanta } from '@drop/ui-tokens';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const font = useVantaFont();
  const place = state.placeId ? placeById(state.placeId) : undefined;

  function onTab(tab: VantaTab) {
    if (tab === 'home') {
      if (!booking.enabled) {
        dispatch({ type: 'cancel' });
      }
      return;
    }
    if (tab === 'safety' || tab === 'account') {
      dispatch({ type: 'back' });
    }
  }

  return (
    <Screen testID={state.route === 'offers' ? 'screen-offers' : 'screen-searching'} tone="vanta">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderSheet style={{ paddingTop: Math.max(insets.top, 8) }}>
          <View style={styles.headerRow}>
            <IconCircleButton
              label="Back"
              icon="arrow-left"
              onPress={() => dispatch({ type: 'back' })}
            />
            <Text
              accessibilityRole="header"
              style={[styles.headerTitle, { fontFamily: font.bold }]}
            >
              {state.route === 'searching' ? 'Finding riders' : 'Rider offers'}
            </Text>
            <IconCircleButton
              label="Offers stay sorted by arrival"
              icon="sliders"
              onPress={() => undefined}
            />
          </View>
          <Text
            style={[styles.headerMeta, { fontFamily: font.medium }]}
            accessibilityLiveRegion="polite"
          >
            {state.route === 'searching'
              ? `${left == null ? '1:00' : clock(left)} · ${formatNaira(state.offerKobo)} cash`
              : `${offers.length} ${offers.length === 1 ? 'offer' : 'offers'}${left == null ? '' : ` · ${clock(left)}`}`}
          </Text>
          <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
            {state.route === 'searching'
              ? `${viewing} ${radiusSearchLabel(booking.enabled ? booking.radiusM : null)}`
              : `To ${place?.name ?? 'your drop-off'} · cash, fare locked when you accept`}
          </Text>
        </HeaderSheet>
        <View style={styles.list}>
          {state.route === 'offers'
            ? offers.map((offer, index) => (
                <Enter key={offer.id} delay={index * 40}>
                  <OfferCard offer={offer} offers={offers} />
                </Enter>
              ))
            : null}
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
      </ScrollView>
      <FloatingTabBar active="ride" accent="white" onChange={onTab} />
    </Screen>
  );
}

function offerTag(offer: PrototypeOffer, offers: PrototypeOffer[]): string {
  const cheapest = Math.min(...offers.map((item) => item.amountKobo));
  const closest = Math.min(...offers.map((item) => item.etaMin));
  if (offer.amountKobo === cheapest) {
    return 'Cheapest';
  }
  if (offer.etaMin === closest) {
    return 'Closest';
  }
  if (offer.seats > 0) {
    return 'Shared';
  }
  return offer.kind === 'counter' ? 'Counter' : 'Your price';
}

function OfferCard({ offer, offers }: { offer: PrototypeOffer; offers: PrototypeOffer[] }) {
  const { dispatch } = usePassenger();
  return (
    <RideOfferCard
      name={offer.name}
      rating={offer.rating}
      rides={offer.rides}
      tag={offerTag(offer, offers)}
      etaLabel={`${offer.etaMin} min`}
      spanLabel={offer.seats > 0 ? `${offer.dropoffMin} min` : 'Direct'}
      price={formatNaira(offer.amountKobo)}
      acceptLabel="Accept"
      onAccept={() => dispatch({ type: 'chooseOffer', id: offer.id })}
      onDecline={() => dispatch({ type: 'declineOffer', id: offer.id })}
      acceptTestID={`choose-${offer.id}`}
      declineTestID={`decline-${offer.id}`}
    />
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
  const font = useVantaFont();
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
  const place = state.placeId ? placeById(state.placeId) : undefined;

  function confirm() {
    if (!booking.enabled || !state.offerId) {
      dispatch({ type: 'confirmOffer' });
      return;
    }
    void booking.select(state.offerId).then((ok) => {
      if (ok) {
        dispatch({ type: 'confirmOffer' });
      }
    });
  }

  function onTab(tab: VantaTab) {
    if (tab === 'home' && !booking.enabled) {
      dispatch({ type: 'cancel' });
    }
    if (tab === 'ride') {
      dispatch({ type: 'back' });
    }
  }

  return (
    <Screen testID="screen-offer" tone="vanta">
      <ScrollView contentContainerStyle={{ paddingBottom: 150, gap: 14 }}>
        <View>
          <HeaderSheet style={{ paddingTop: Math.max(insets.top, 8) }}>
            <View style={styles.headerRow}>
              <IconCircleButton
                label="Back"
                icon="arrow-left"
                onPress={() => dispatch({ type: 'back' })}
              />
              <Text
                accessibilityRole="header"
                style={[styles.headerTitle, { fontFamily: font.bold }]}
              >
                Rider details
              </Text>
              <IconCircleButton
                label="Back to offers"
                icon="sliders"
                onPress={() => dispatch({ type: 'back' })}
              />
            </View>
            <View style={styles.riderRow}>
              <InitialAvatar letter={offer.name.slice(0, 1)} fontFamily={font.bold} size={52} />
              <View style={styles.riderCopy}>
                <Text style={[styles.riderName, { fontFamily: font.bold }]}>{offer.name}</Text>
                <View style={styles.riderMeta}>
                  <YellowStar />
                  <Text style={[styles.headerSub, { fontFamily: font.medium }]}>
                    {offer.rating.toFixed(1)}
                  </Text>
                  <KekeGlyph size={13} color={vanta.muted} />
                  <Text style={[styles.headerSub, { fontFamily: font.medium }]}>
                    {offer.rides.toLocaleString('en-NG')} trips
                  </Text>
                </View>
                <Pill
                  label={offer.seats > 0 ? `Carrying ${offer.seats}` : 'Verified'}
                  tone="solid"
                />
              </View>
            </View>
          </HeaderSheet>
          <View style={styles.kekeBleed} pointerEvents="none">
            <KekeArt width={230} />
          </View>
        </View>
        <View style={styles.list}>
          <RouteTimeline
            pickupTime={`${offer.etaMin} min`}
            pickupName="23rd Road"
            pickupStation="Festac Town"
            pickupAddress={state.landmark || pickup.note}
            dropoffTime="End"
            dropoffName={place?.name ?? 'Destination'}
            dropoffStation="Drop-off"
            dropoffAddress={place?.detail ?? 'Chosen on the previous step'}
          >
            <FeatureChip icon="clock" label={`${offer.etaMin} min`} />
            <FeatureChip icon="user" label={offer.seats > 0 ? 'Shared' : 'Solo Drop'} />
            <FeatureChip icon="tag" label={offer.plate} />
            <FeatureChip icon="credit-card" label="Cash" />
          </RouteTimeline>
          <GlowCard>
            <View style={styles.fareRow}>
              <View style={styles.grow}>
                <Text style={[styles.fareLabel, { fontFamily: font.medium }]}>Agreed fare</Text>
                <Text style={[styles.fareHint, { fontFamily: font.regular }]}>
                  {state.forOther && state.riderFor.trim()
                    ? `For ${state.riderFor.trim()}`
                    : 'Locked if you confirm'}
                </Text>
              </View>
              <Text style={[styles.fareValue, { fontFamily: font.bold }]}>
                {formatNaira(offer.amountKobo)}
              </Text>
            </View>
          </GlowCard>
          <GlowCard>
            <View style={styles.fareRow}>
              <View style={styles.grow}>
                <Text style={[styles.fareLabel, { fontFamily: font.medium }]}>Payment</Text>
                <Text style={[styles.fareHint, { fontFamily: font.regular }]}>
                  {offer.colour} Keke · pay the rider
                </Text>
              </View>
              <Text style={[styles.cash, { fontFamily: font.bold }]}>Cash</Text>
            </View>
          </GlowCard>
          {booking.error ? <Notice message={booking.error} /> : null}
          <MetalButton
            label="Confirm rider"
            disabled={booking.busy}
            onPress={confirm}
            testID="confirm-rider"
          />
        </View>
      </ScrollView>
      <FloatingTabBar active="ride" accent="white" onChange={onTab} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    color: vanta.text,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  headerMeta: {
    color: vanta.text,
    fontSize: 16,
    marginTop: 16,
  },
  headerSub: {
    color: vanta.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  riderCopy: { flex: 1, gap: 4, paddingRight: 88 },
  riderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kekeBleed: {
    position: 'absolute',
    right: -28,
    top: 64,
  },
  grow: { flex: 1, gap: 4 },
  riderName: {
    color: vanta.text,
    fontSize: 18,
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fareLabel: {
    color: vanta.text,
    fontSize: 15,
  },
  fareHint: {
    color: vanta.muted,
    fontSize: 13,
    marginTop: 2,
  },
  fareValue: {
    color: vanta.text,
    fontSize: 20,
  },
  cash: {
    color: vanta.yellow,
    fontSize: 16,
  },
});
