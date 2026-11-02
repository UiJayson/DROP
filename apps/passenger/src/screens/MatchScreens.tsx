import { formatNaira, type PrototypeOffer } from '@drop/shared';
import { Button, DemoBridge, Enter, Header, MapCanvas, Screen, StatusPill } from '@drop/ui';
import { spacing } from '@drop/ui-tokens';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function Searching() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const offers = state.route === 'offers' ? visibleOffers(state) : [];
  const viewing = state.autoAccept
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
                1:00
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
        <Button
          label="No riders yet"
          variant="secondary"
          onPress={() => dispatch({ type: 'noOffers' })}
          testID="no-offers"
        />
        <Button
          label="Cancel"
          variant="danger"
          onPress={() => dispatch({ type: 'cancel' })}
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
  const insets = useSafeAreaInsets();
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
        <Button
          label="Raise by ₦100"
          onPress={() => dispatch({ type: 'raise', naira: 100 })}
          testID="raise-100"
        />
        <Button
          label="Raise by ₦200"
          variant="secondary"
          onPress={() => dispatch({ type: 'raise', naira: 200 })}
          testID="raise-200"
        />
        <Button
          label="Keep waiting"
          variant="secondary"
          onPress={() => dispatch({ type: 'keepWaiting' })}
          testID="keep-waiting"
        />
        <Button
          label="Notify me"
          variant="ghost"
          onPress={() => dispatch({ type: 'setArea', area: 'satellite' })}
          testID="notify-from-search"
        />
        <Button label="Cancel" variant="danger" onPress={() => dispatch({ type: 'cancel' })} />
      </View>
    </Screen>
  );
}

function OfferSelected() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const offer = selectedOffer(state);
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
          onPress={() => dispatch({ type: 'confirmOffer' })}
          testID="confirm-rider"
        />
      </View>
    </Screen>
  );
}
