import { filterPlaces, formatNaira, pickup, placeById, quoteForPlace } from '@drop/shared';
import {
  Button,
  ChoiceRow,
  FareStepper,
  Field,
  Header,
  Notice,
  Screen,
  SearchField,
} from '@drop/ui';
import { colors, spacing } from '@drop/ui-tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '../booking';
import { useDemoPoint, useSetDemoPickup } from '../demo/shell';
import { layout } from '../layout';
import { RideMap } from '../map/RideMap';
import { usePassenger } from '../passenger-context';

/** Room for the right-hand controls and the fare sheet under the map. */
const fareCameraPadding = { top: 48, right: 96, bottom: 72, left: 56 };

function rideOptions(
  distanceM: number,
  quote: { midpointKobo: number; suggestedLowKobo: number; suggestedHighKobo: number },
) {
  const base = Math.max(4, Math.round((distanceM / 1000 / 18) * 60));
  return [
    { id: 'recommended', label: 'Recommended · solo', fare: quote.midpointKobo, eta: base },
    {
      id: 'faster',
      label: 'Faster · solo',
      fare: quote.suggestedHighKobo,
      eta: Math.max(3, base - 3),
    },
    { id: 'cheaper', label: 'Cheaper · shared', fare: quote.suggestedLowKobo, eta: base + 4 },
  ];
}

export function SearchScreen() {
  const { state, dispatch } = usePassenger();
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const setPickup = useSetDemoPickup();
  const results = booking.enabled
    ? booking.results.map((place) => ({
        id: place.id,
        name: place.name,
        detail: place.detail,
        distanceM: 0,
        restricted: false,
      }))
    : filterPlaces(state.query);

  return (
    <Screen testID="screen-search">
      <View style={{ paddingTop: Math.max(insets.top, spacing.xs) }}>
        <Header title="Where to?" onBack={() => dispatch({ type: 'back' })} />
      </View>
      <View style={layout.bodyPad}>
        {setPickup ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={layout.footnote}>Pickup</Text>
            <View style={[layout.row, { flexWrap: 'wrap' }]}>
              <Button
                size="compact"
                label="23rd Road"
                variant="secondary"
                onPress={() => setPickup('festac')}
                testID="pickup-current"
              />
              <Button
                size="compact"
                label="Shoprite gate"
                variant="secondary"
                onPress={() => setPickup('shoprite')}
                testID="pickup-shoprite"
              />
            </View>
          </View>
        ) : null}
        <Text style={layout.footnote}>Destination</Text>
        <SearchField
          value={state.query}
          onChangeText={(query) => {
            dispatch({ type: 'search', query });
            booking.setQuery(query);
          }}
          placeholder="Landmark, junction, or estate"
          autoFocus={false}
          testID="destination-search"
        />
        {state.notice ? <Notice message={state.notice} /> : null}
        {booking.error ? <Notice message={booking.error} /> : null}
        <Text style={layout.footnote}>
          {booking.enabled
            ? `Pickup: ${booking.pickupLabel}. Type 3 letters to search Google Maps.`
            : state.query.trim()
              ? 'Matches'
              : 'Recent places'}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[layout.bodyPad, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {results.length === 0 ? (
          <Text style={layout.secondary}>
            {booking.enabled
              ? 'No matches yet. Try Ikeja City Mall, or a landmark nearby.'
              : 'No matches. Try a landmark such as Shoprite gate or Mile 2.'}
          </Text>
        ) : (
          results.map((place) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              accessibilityLabel={
                place.restricted ? `${place.name}, restricted` : `${place.name}, ${place.detail}`
              }
              onPress={() => {
                if (!booking.enabled) {
                  dispatch({ type: 'pickPlace', id: place.id });
                  return;
                }
                void booking.pick(place.id).then((priced) => {
                  if (priced) {
                    dispatch({
                      type: 'armLiveFare',
                      offerKobo: priced.midpointKobo,
                      minKobo: priced.minKobo,
                    });
                  }
                });
              }}
              style={layout.place}
              testID={`place-${place.id}`}
            >
              <View style={layout.grow}>
                <Text style={layout.headline}>{place.name}</Text>
                <Text style={layout.secondary}>{place.detail}</Text>
              </View>
              <Text style={place.restricted ? layout.warning : layout.footnote}>
                {place.restricted
                  ? 'Restricted'
                  : booking.enabled
                    ? 'Map'
                    : `${(place.distanceM / 1000).toFixed(1)} km`}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

export function FareScreen() {
  const { state, dispatch } = usePassenger();
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const from = useDemoPoint();
  const live = booking.enabled && state.placeId === 'live';
  const place = live
    ? booking.destination
      ? {
          name: booking.destination.name,
          detail: booking.destination.detail,
        }
      : undefined
    : state.placeId
      ? placeById(state.placeId)
      : undefined;
  const quote = live ? booking.quote : state.placeId ? quoteForPlace(state.placeId) : undefined;
  if (!place || !quote) {
    return null;
  }
  const lowball = state.offerKobo < quote.suggestedLowKobo;
  const who = state.forOther ? state.riderFor.trim() || 'Someone else' : 'For me';
  const options = quote ? rideOptions(quote.distanceM, quote) : [];
  const pickupPoint =
    booking.enabled && booking.pickupPoint
      ? {
          lat: booking.pickupPoint.lat,
          lng: booking.pickupPoint.lng,
          label: booking.pickupLabel,
        }
      : from
        ? { lat: from.lat, lng: from.lng, label: from.title }
        : { lat: pickup.lat, lng: pickup.lng, label: pickup.title };
  const bookedPlace = !live && state.placeId ? placeById(state.placeId) : undefined;
  const dropoffPoint =
    booking.enabled && booking.dropoffPoint
      ? { ...booking.dropoffPoint, label: place.name }
      : bookedPlace
        ? { lat: bookedPlace.lat, lng: bookedPlace.lng, label: bookedPlace.name }
        : null;

  return (
    <Screen testID="screen-fare">
      <View style={layout.mapShort}>
        <RideMap
          pickup={pickupPoint}
          dropoff={dropoffPoint}
          fallbackTitle={live ? booking.pickupLabel : pickup.area}
          fallbackDetail={place.name}
          kekes={state.area === 'festac' ? 12 : 0}
          cameraPadding={fareCameraPadding}
          controlsInset={{ bottom: 16, right: 16 }}
        />
      </View>
      <ScrollView
        style={layout.fill}
        contentContainerStyle={[layout.bodyPad, { paddingBottom: spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={layout.title}>
          Your fare
        </Text>
        <Text style={layout.secondary}>
          {live ? booking.pickupLabel : (from?.title ?? pickup.title)} → {place.name}
        </Text>
        {!booking.enabled ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={layout.footnote}>Ride options</Text>
            {options.map((option) => (
              <ChoiceRow
                key={option.id}
                label={option.label}
                detail={`${(quote.distanceM / 1000).toFixed(1)} km · about ${option.eta} min · ${formatNaira(option.fare)}`}
                selected={state.offerKobo === option.fare}
                onPress={() => dispatch({ type: 'setOffer', offerKobo: option.fare })}
                testID={`option-${option.id}`}
              />
            ))}
          </View>
        ) : null}
        <View style={layout.split}>
          <View style={layout.grow}>
            <ChoiceRow
              label="For me"
              selected={!state.forOther}
              onPress={() => dispatch({ type: 'setForMe' })}
              testID="for-me"
            />
          </View>
          <View style={layout.grow}>
            <ChoiceRow
              label="Someone else"
              selected={state.forOther}
              onPress={() => dispatch({ type: 'setForOther' })}
              testID="for-other"
            />
          </View>
        </View>
        {state.forOther ? (
          <Field
            label="Their first name"
            value={state.riderFor}
            onChangeText={(name) => dispatch({ type: 'setRiderFor', name })}
            placeholder="Seyi"
            testID="rider-for"
          />
        ) : null}
        <Field
          label="Pickup note"
          value={state.landmark}
          onChangeText={(note) => dispatch({ type: 'setLandmark', note })}
          placeholder="Near the blue kiosk"
          testID="landmark"
        />
        <FareStepper
          amountKobo={state.offerKobo}
          minKobo={quote.minKobo}
          onStep={(direction) => dispatch({ type: 'stepFare', direction })}
        />
        <Text style={layout.secondary}>
          Suggested {formatNaira(quote.suggestedLowKobo)}–{formatNaira(quote.suggestedHighKobo)}.
          Most riders accept from {formatNaira(quote.suggestedLowKobo)}.
        </Text>
        {lowball ? (
          <Text style={layout.warning}>
            Offers under {formatNaira(quote.suggestedLowKobo)} are often skipped. You can still
            request it.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Accept the first rider at this price"
          accessibilityState={{ checked: state.autoAccept }}
          onPress={() => dispatch({ type: 'toggleAutoAccept' })}
          style={[layout.card, layout.row]}
          testID="auto-accept"
        >
          <View style={layout.grow}>
            <Text style={layout.headline}>Accept the first rider at this price</Text>
            <Text style={layout.footnote}>
              You will not compare offers. You can still cancel before pickup. {who}.
            </Text>
          </View>
          <View
            style={{
              width: 52,
              height: 32,
              borderRadius: 16,
              backgroundColor: state.autoAccept ? colors.primary : colors.surface3,
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: state.autoAccept ? colors.onPrimary : colors.textPrimary,
                alignSelf: state.autoAccept ? 'flex-end' : 'flex-start',
              }}
            />
          </View>
        </Pressable>
        {state.notice ? <Notice message={state.notice} /> : null}
        {booking.error ? <Notice message={booking.error} /> : null}
        {booking.enabled && !booking.pickupReady ? (
          <>
            <Notice message="Pickup is the sample point at Allen Avenue, Ikeja, not your phone." />
            <Button
              label="Use Allen Avenue as pickup"
              variant="secondary"
              onPress={booking.confirmSamplePickup}
              testID="confirm-sample-pickup"
            />
          </>
        ) : null}
      </ScrollView>
      <View style={[layout.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Text style={layout.footnote}>Cash · pay the rider at the end</Text>
        <Button
          label="Request DROP"
          disabled={booking.busy}
          onPress={() => {
            if (!booking.enabled) {
              dispatch({ type: 'request' });
              return;
            }
            const note =
              state.forOther && state.riderFor.trim()
                ? `For ${state.riderFor.trim()}. ${state.landmark}`
                : state.landmark;
            void booking.requestDrop(state.offerKobo, note).then((ok) => {
              if (ok) {
                dispatch({ type: 'request' });
              }
            });
          }}
          testID="request-drop"
        />
        <Button label="Back" variant="ghost" onPress={() => dispatch({ type: 'back' })} />
      </View>
    </Screen>
  );
}
