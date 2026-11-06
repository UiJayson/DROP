import { readGoogleMapsKey } from '@drop/api-client';
import {
  formatNaira,
  googleDirectionsUrl,
  locationAgeLabel,
  stepToward,
  tripStatusLabel,
} from '@drop/shared';
import {
  Button,
  Field,
  Notice,
  PinDigits,
  PinPad,
  Screen,
  StatusPill,
  TripMap,
  useNow,
} from '@drop/ui';
import { colors, spacing } from '@drop/ui-tokens';
import { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../layout';
import { useTrip } from '../trip';

const reasons = ['Passenger not here', "Can't find the pickup", 'Keke problem'];

function readCoords(): Promise<{ lat: number; lng: number } | null> {
  const geo = globalThis.navigator?.geolocation;
  if (!geo) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 8_000 },
    );
  });
}

export function LiveRiderTrip() {
  const tripApi = useTrip();
  const trip = tripApi.trip;
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const now = useNow(true);
  const [gps, setGps] = useState<boolean | null>(null);
  const [testStep, setTestStep] = useState(0);
  const [confirmCash, setConfirmCash] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const mapsKey = readGoogleMapsKey({
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  const sendRef = useRef(tripApi.sendLocation);
  useEffect(() => {
    sendRef.current = tripApi.sendLocation;
  });
  const tripId = trip?.tripId ?? null;
  const sharing = trip != null && trip.status !== 'completed' && trip.status !== 'cancelled';

  useEffect(() => {
    if (!sharing || !tripId) {
      return undefined;
    }
    let active = true;
    const send = async () => {
      const point = await readCoords();
      if (!active) {
        return;
      }
      if (!point) {
        setGps(false);
        return;
      }
      setGps(true);
      await sendRef.current(point, 'device');
    };
    void send();
    const timer = setInterval(() => void send(), 5_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sharing, tripId]);

  if (!trip) {
    return null;
  }

  const started = trip.status === 'in_progress';
  const cashMatches =
    trip.paymentMethod === 'cash' && trip.paymentAmountKobo === trip.agreedFareKobo;
  const target =
    trip.status === 'in_progress' || trip.status === 'completed' ? trip.dropoff : trip.pickup;

  const addDigit = (digit: string) => {
    if (trip.pinLocked || pin.length >= 4 || tripApi.busy) {
      return;
    }
    const next = `${pin}${digit}`;
    setPin(next);
    if (next.length === 4) {
      void tripApi.submitPin(next).then(() => setPin(''));
    }
  };

  return (
    <Screen testID="screen-live-trip">
      <View style={{ flex: 1, minHeight: 180 }}>
        <TripMap
          mapsKey={mapsKey}
          title={tripStatusLabel(trip.status)}
          pickup={trip.pickup}
          dropoff={trip.dropoff}
          rider={trip.location ? { lat: trip.location.lat, lng: trip.location.lng } : null}
          locationSource={trip.location?.source ?? null}
        />
      </View>
      <ScrollView
        contentContainerStyle={[
          layout.pad,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md),
            backgroundColor: colors.surface2,
          },
        ]}
      >
        <StatusPill
          tone={
            trip.status === 'cancelled'
              ? 'orange'
              : trip.status === 'assigned' || trip.status === 'arrived'
                ? 'yellow'
                : 'green'
          }
          label={tripStatusLabel(trip.status)}
        />
        <Text style={layout.footnote}>Passenger</Text>
        <Text style={layout.title}>{trip.passengerName}</Text>
        <Text style={layout.body}>{trip.pickupNote || trip.dropoffLabel}</Text>
        <Text style={layout.secondary}>
          {locationAgeLabel(trip.location?.recordedAt ?? null, now, trip.location?.source ?? null)}
        </Text>
        <Text style={layout.footnote}>Agreed fare · locked · cash</Text>
        <Text style={layout.fare}>{formatNaira(trip.agreedFareKobo)}</Text>
        {cashMatches ? null : <Notice message="The cash record does not match the locked fare." />}
        {tripApi.error ? <Notice message={tripApi.error} /> : null}
        {trip.status === 'assigned' || trip.status === 'arrived' || started ? (
          <Button
            label="Navigate"
            variant="secondary"
            onPress={() => {
              void Linking.openURL(googleDirectionsUrl(target));
            }}
            testID="navigate"
          />
        ) : null}
        {gps === false && trip.status !== 'completed' && trip.status !== 'cancelled' ? (
          <>
            <Notice message="Phone location is off. A test pin is not your GPS and is not used to find new passengers." />
            <Button
              label="Send test location"
              variant="secondary"
              onPress={() => {
                const next = Math.min(1, testStep + 0.25);
                setTestStep(next);
                void tripApi.sendLocation(stepToward(trip.pickup, trip.dropoff, next), 'simulated');
              }}
              testID="test-location"
            />
          </>
        ) : null}
        {trip.status === 'assigned' ? (
          <Button
            label="Arrived"
            disabled={tripApi.busy}
            onPress={() => void tripApi.arrive()}
            testID="arrived"
          />
        ) : null}
        {trip.status === 'arrived' ? (
          <>
            <Text accessibilityRole="header" style={layout.title}>
              Boarding PIN
            </Text>
            <Text style={layout.secondary}>
              Ask {trip.passengerName} for the 4-digit PIN on their phone.
            </Text>
            <PinDigits value={pin} />
            {trip.pinLocked ? null : (
              <PinPad
                onDigit={addDigit}
                onBackspace={() => setPin((value) => value.slice(0, -1))}
              />
            )}
          </>
        ) : null}
        {started && !confirmCash ? (
          <Button
            label="End trip"
            disabled={!cashMatches || tripApi.busy}
            onPress={() => setConfirmCash(true)}
            testID="end-trip"
          />
        ) : null}
        {started && confirmCash ? (
          <>
            <Text style={layout.body}>
              Did you receive {formatNaira(trip.agreedFareKobo)} in cash from {trip.passengerName}?
            </Text>
            <Button
              label="Received cash"
              disabled={tripApi.busy}
              onPress={() => void tripApi.complete()}
              testID="cash-yes"
            />
            <Button label="Not yet" variant="ghost" onPress={() => setConfirmCash(false)} />
          </>
        ) : null}
        {trip.status === 'completed' ? (
          <>
            <Text style={layout.headline}>Cash received · {formatNaira(trip.agreedFareKobo)}</Text>
            <Button label="Done" onPress={tripApi.dismiss} testID="live-done" />
          </>
        ) : null}
        {trip.status === 'cancelled' ? (
          <>
            <Notice message={trip.cancelReason ?? 'This trip was cancelled.'} />
            <Button label="Done" onPress={tripApi.dismiss} testID="live-done" />
          </>
        ) : null}
        {trip.status === 'completed' || trip.status === 'cancelled' ? null : cancelling ? (
          <>
            <Text style={layout.secondary}>
              {started
                ? 'This trip has started. Stopping it keeps the fare on record and does not mark the cash paid.'
                : 'Cancelling keeps the agreed fare on record.'}
            </Text>
            {reasons.map((item) => (
              <Button
                key={item}
                size="compact"
                label={item}
                variant={reason === item ? 'primary' : 'secondary'}
                onPress={() => setReason(item)}
              />
            ))}
            <Field
              label="Reason"
              value={reason}
              onChangeText={setReason}
              maxLength={280}
              testID="cancel-reason"
            />
            <Button
              label={started ? 'Stop this started trip' : 'Cancel trip'}
              variant="danger"
              disabled={reason.trim().length === 0 || tripApi.busy}
              onPress={() => {
                void tripApi.cancel(reason.trim(), started).then((message) => {
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
    </Screen>
  );
}
