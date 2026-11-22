import { formatNaira, phoneFromNational } from '@drop/shared';
import { Button, Field, Header, Notice, Screen } from '@drop/ui';
import { spacing } from '@drop/ui-tokens';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../layout';
import { usePassenger } from '../passenger-context';
import { useDemoShell } from './shell';
import type { DemoData, DemoTrip } from './store';

export function ProfileScreen({ data }: { data: DemoData }) {
  const shell = useDemoShell();
  const insets = useSafeAreaInsets();
  const user = data.user;
  return (
    <Screen testID="screen-profile" padded tone="vanta">
      <View style={{ paddingTop: Math.max(insets.top, spacing.sm) }}>
        <Header title="Profile" onBack={() => shell?.close()} />
      </View>
      <ScrollView
        contentContainerStyle={[layout.bodyPad, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Text style={layout.title}>{user?.name ?? 'Guest'}</Text>
        <Text style={layout.secondary}>{user?.phoneMask ?? 'Demo profile'}</Text>
        <Text style={layout.footnote}>
          This profile stays on this phone. It is not an account on a DROP server.
        </Text>
        <Button label="Ride history" onPress={() => shell?.open('history')} testID="open-history" />
        <Button
          label="Settings"
          variant="secondary"
          onPress={() => shell?.open('settings')}
          testID="open-settings"
        />
        <Button
          label="Safety"
          variant="secondary"
          onPress={() => shell?.open('safety')}
          testID="open-safety"
        />
      </ScrollView>
    </Screen>
  );
}

export function HistoryScreen({ trips }: { trips: DemoTrip[] }) {
  const shell = useDemoShell();
  const { dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  return (
    <Screen testID="screen-history" padded tone="vanta">
      <View style={{ paddingTop: Math.max(insets.top, spacing.sm) }}>
        <Header title="Ride history" onBack={() => shell?.open('account')} />
      </View>
      <ScrollView
        contentContainerStyle={[layout.bodyPad, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {trips.length === 0 ? (
          <Text style={layout.secondary}>
            No rides yet. A finished demo trip will show up here.
          </Text>
        ) : (
          trips.map((trip) => (
            <Pressable
              key={trip.id}
              accessibilityRole="button"
              accessibilityLabel={`Rebook ${trip.to}`}
              onPress={() => {
                dispatch({ type: 'pickPlace', id: trip.placeId });
                shell?.close();
              }}
              style={layout.card}
              testID={`history-${trip.id}`}
            >
              <Text style={layout.footnote}>{trip.when}</Text>
              <Text style={layout.headline}>
                {trip.from} → {trip.to}
              </Text>
              <Text style={layout.secondary}>
                {formatNaira(trip.fareKobo)} · {trip.rider} ·{' '}
                {trip.stars === 0 ? 'Not rated' : `${trip.stars} stars`}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

export function SettingsScreen({
  data,
  onReset,
  onSignOut,
}: {
  data: DemoData;
  onReset: () => void;
  onSignOut: () => void;
}) {
  const shell = useDemoShell();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  return (
    <Screen testID="screen-settings" padded tone="vanta">
      <View style={{ paddingTop: Math.max(insets.top, spacing.sm) }}>
        <Header title="Settings" onBack={() => shell?.open('account')} />
      </View>
      <ScrollView
        contentContainerStyle={[layout.bodyPad, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Text style={layout.headline}>Demo data</Text>
        <Text style={layout.secondary}>
          Preferences, the demo profile, the trip in progress, and ride history are stored on this
          phone.
        </Text>
        <Text style={layout.footnote}>{data.history.length} saved rides</Text>
        {confirm ? (
          <Notice message="This clears the demo profile, history, and any trip in progress." />
        ) : null}
        <Button
          label={confirm ? 'Confirm reset' : 'Reset demo data'}
          variant="danger"
          onPress={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            onReset();
          }}
          testID="reset-demo"
        />
        <Button
          label="Sign out"
          variant="secondary"
          onPress={onSignOut}
          testID="settings-sign-out"
        />
      </ScrollView>
    </Screen>
  );
}

export function SafetyScreen({
  trustedName,
  trustedPhone,
  onSave,
}: {
  trustedName: string;
  trustedPhone: string;
  onSave: (name: string, phone: string) => void;
}) {
  const shell = useDemoShell();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(trustedName);
  const [phone, setPhone] = useState(trustedPhone);
  const [note, setNote] = useState<string | null>(null);
  return (
    <Screen testID="screen-safety" padded tone="vanta">
      <View style={{ paddingTop: Math.max(insets.top, spacing.sm) }}>
        <Header title="Safety" onBack={() => shell?.close()} />
      </View>
      <ScrollView
        contentContainerStyle={[layout.bodyPad, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Text style={layout.secondary}>
          Share, call, and report sit on an active trip. A trusted contact is saved only on this
          phone.
        </Text>
        <Field
          label="Trusted contact"
          value={name}
          onChangeText={setName}
          placeholder="Name"
          testID="trusted-name"
        />
        <Field
          label="Their mobile"
          value={phone}
          onChangeText={setPhone}
          placeholder="801 234 5678"
          testID="trusted-phone"
        />
        <Button
          label="Save contact"
          onPress={() => {
            if (phone.trim() && !phoneFromNational(phone)) {
              setNote('Enter a valid Nigerian mobile number, or leave it blank.');
              return;
            }
            onSave(name.trim(), phone.trim());
            setNote(
              name.trim() ? `${name.trim()} is saved on this phone.` : 'Trusted contact cleared.',
            );
          }}
          testID="save-trusted"
        />
        <Button
          label="Share trip details"
          variant="secondary"
          onPress={() =>
            setNote(
              'Demo share. A real trip would send the rider name, plate, and ETA to your trusted contact.',
            )
          }
          testID="share-safety"
        />
        <Button
          label="Emergency 112"
          variant="secondary"
          onPress={() =>
            setNote('Demo only. This does not place a call. In an emergency, dial 112.')
          }
          testID="emergency"
        />
        {note ? <Notice message={note} /> : null}
      </ScrollView>
    </Screen>
  );
}
