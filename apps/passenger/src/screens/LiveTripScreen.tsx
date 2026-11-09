import { readGoogleMapsKey } from '@drop/api-client';
import { formatNaira, locationAgeLabel, tripStatusLabel } from '@drop/shared';
import {
  Button,
  Field,
  Notice,
  PinDigits,
  Screen,
  Sheet,
  StatusPill,
  TripMap,
  useNow,
} from '@drop/ui';
import { spacing } from '@drop/ui-tokens';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '../booking';
import { layout } from '../layout';
import { usePassenger } from '../passenger-context';

const reasons = ['Changed my mind', 'Rider is late', 'Wrong pickup'];

export function LivePassengerTrip() {
  const booking = useBooking();
  const { dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const trip = booking.trip;
  const now = useNow(true);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const mapsKey = readGoogleMapsKey({
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  const pin = trip?.pin || booking.chosen?.pin || null;
  const fare = trip?.agreedFareKobo ?? booking.chosen?.agreedFareKobo ?? 0;
  const cashMatches =
    trip == null ||
    (trip.paymentMethod === 'cash' && trip.paymentAmountKobo === trip.agreedFareKobo);
  const status = trip?.status ?? 'assigned';
  const showPin = status === 'assigned' || status === 'arrived';
  const started = status === 'in_progress';

  const finish = () => {
    booking.clearTrip();
    dispatch({ type: 'finish' });
  };

  return (
    <Screen testID="screen-live-trip">
      <View style={layout.mapSlot}>
        <TripMap
          mapsKey={mapsKey}
          title={tripStatusLabel(status)}
          pickup={trip?.pickup ?? { lat: 6.614, lng: 3.342 }}
          dropoff={trip?.dropoff ?? { lat: 6.621, lng: 3.348 }}
          rider={trip?.location ? { lat: trip.location.lat, lng: trip.location.lng } : null}
          locationSource={trip?.location?.source ?? null}
        />
      </View>
      <Sheet style={{ maxHeight: '62%', paddingBottom: Math.max(insets.bottom, spacing.md) }}>
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
          <View style={layout.grabber} />
          <StatusPill
            tone={
              status === 'cancelled'
                ? 'orange'
                : status === 'assigned' || status === 'arrived'
                  ? 'yellow'
                  : 'green'
            }
            label={tripStatusLabel(status)}
          />
          <Text style={layout.headline}>
            {trip?.riderName ?? booking.chosen?.offer.name ?? 'Your rider'}
          </Text>
          <Text style={layout.plate}>
            {trip ? `${trip.colour} Keke · ${trip.plate}` : 'Check the plate before you board'}
          </Text>
          <Text style={layout.secondary}>
            {locationAgeLabel(
              trip?.location?.recordedAt ?? null,
              now,
              trip?.location?.source ?? null,
            )}
          </Text>
          <Text style={layout.footnote}>Agreed fare · cash</Text>
          <Text style={layout.fare}>{formatNaira(fare)}</Text>
          {cashMatches ? null : (
            <Notice message="The cash record does not match the locked fare. The fare on this screen stays the agreed amount." />
          )}
          {showPin ? (
            <View style={layout.pinHero}>
              <Text style={layout.footnote}>
                Boarding PIN · tell {trip?.riderName ?? 'the rider'}
              </Text>
              <PinDigits value={pin ?? ''} />
              <Text style={layout.footnote}>Check the plate, then tell them this PIN.</Text>
            </View>
          ) : null}
          {trip?.pinLocked ? (
            <Notice message="The rider entered the wrong PIN too many times. Contact DROP support. The trip stays open." />
          ) : null}
          {status === 'in_progress' ? (
            <Text style={layout.body}>
              Heading to {trip?.dropoffLabel ?? 'the drop-off'}. Pay {formatNaira(fare)} in cash at
              the end.
            </Text>
          ) : null}
          {status === 'completed' ? (
            <>
              <Text style={layout.headline}>Paid {formatNaira(fare)} in cash</Text>
              <Text style={layout.secondary}>
                The rider confirmed the locked fare. Nothing else is due.
              </Text>
              <Button label="Done" onPress={finish} testID="live-done" />
            </>
          ) : null}
          {status === 'cancelled' ? (
            <>
              <Notice
                message={trip?.cancelReason ?? 'This trip was cancelled. The fare stays on record.'}
              />
              <Button label="Done" onPress={finish} testID="live-done" />
            </>
          ) : null}
          {booking.error ? <Notice message={booking.error} /> : null}
          {status === 'completed' || status === 'cancelled' ? null : cancelling ? (
            <>
              <Text style={layout.secondary}>
                {started
                  ? 'This trip has started. Stopping it keeps the fare on record and does not mark the cash paid.'
                  : 'Cancelling keeps the agreed fare on record.'}
              </Text>
              <View style={[layout.actions, { flexWrap: 'wrap' }]}>
                {reasons.map((item) => (
                  <Button
                    key={item}
                    size="compact"
                    label={item}
                    variant={reason === item ? 'primary' : 'secondary'}
                    onPress={() => setReason(item)}
                  />
                ))}
              </View>
              <Field
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Say why"
                maxLength={280}
                testID="cancel-reason"
              />
              <Button
                label={started ? 'Stop this started trip' : 'Cancel trip'}
                variant="danger"
                disabled={reason.trim().length === 0 || booking.busy}
                onPress={() => {
                  void booking.cancelLive(reason.trim(), started).then((message) => {
                    if (!message) {
                      setCancelling(false);
                    }
                  });
                }}
                testID="confirm-cancel"
              />
              <Button label="Keep the trip" variant="ghost" onPress={() => setCancelling(false)} />
            </>
          ) : (
            <Button
              label="Cancel trip"
              variant="danger"
              onPress={() => setCancelling(true)}
              testID="cancel-trip"
            />
          )}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}
