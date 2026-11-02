import { areas, formatNaira, placeById, quoteForPlace, rebookPlaceId } from '@drop/shared';
import { Button, MapCanvas, Screen, StatusPill } from '@drop/ui';
import { colors, spacing } from '@drop/ui-tokens';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '../account';
import { layout } from '../layout';
import { usePassenger } from '../passenger-context';

export function HomeScreen() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const [safety, setSafety] = useState(false);
  const [pickingArea, setPickingArea] = useState(false);
  const area = areas[state.area];
  const rebookPlace = placeById(rebookPlaceId);
  const rebookQuote = quoteForPlace(rebookPlaceId);

  if (safety) {
    return (
      <Screen testID="screen-safety" padded>
        <View style={{ paddingTop: Math.max(insets.top, spacing.sm), gap: spacing.md, flex: 1 }}>
          <Text accessibilityRole="header" style={layout.title}>
            Safety
          </Text>
          <Text style={layout.body}>
            Share trip, call, and report sit on the trip itself. Nothing here interrupts booking.
          </Text>
          <Text style={layout.secondary}>A trusted contact can be added after the prototype.</Text>
          <SignedInLine />
          <Button label="Back to booking" onPress={() => setSafety(false)} testID="close-safety" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID={state.route === 'quiet' ? 'screen-quiet' : 'screen-home'}>
      <View style={layout.mapSlot}>
        <MapCanvas kekes={area.nearby} />
        <View style={[layout.overlayTop, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
          <Text style={layout.wordmark}>DROP</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Safety"
            onPress={() => setSafety(true)}
            style={layout.safety}
            testID="safety"
          >
            <Text style={layout.safetyText}>Safety</Text>
          </Pressable>
        </View>
        <View style={layout.overlayBottom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${area.name}. ${area.nearby} Kekes near you. Change area.`}
            onPress={() => setPickingArea((open) => !open)}
            testID="area-chip"
          >
            <StatusPill
              tone={area.nearby > 0 ? 'yellow' : 'orange'}
              label={area.nearby > 0 ? `${area.nearby} Kekes near you` : 'No Kekes near you'}
            />
          </Pressable>
        </View>
      </View>
      <View style={[layout.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={layout.grabber} accessibilityLabel="Trip sheet" />
        {pickingArea ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={layout.footnote}>Your area</Text>
            <View style={layout.split}>
              <View style={layout.grow}>
                <Button
                  size="compact"
                  label="Festac · 12"
                  variant={state.area === 'festac' ? 'primary' : 'secondary'}
                  onPress={() => {
                    dispatch({ type: 'setArea', area: 'festac' });
                    setPickingArea(false);
                  }}
                  testID="area-festac"
                />
              </View>
              <View style={layout.grow}>
                <Button
                  size="compact"
                  label="Satellite · 0"
                  variant={state.area === 'satellite' ? 'primary' : 'secondary'}
                  onPress={() => {
                    dispatch({ type: 'setArea', area: 'satellite' });
                    setPickingArea(false);
                  }}
                  testID="area-satellite"
                />
              </View>
            </View>
          </View>
        ) : null}
        {state.route === 'quiet' ? (
          <QuietCopy />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Where to?"
              onPress={() => dispatch({ type: 'openSearch' })}
              style={layout.where}
              testID="where-to"
            >
              <View style={layout.whereMark} />
              <Text style={layout.whereText}>Where to?</Text>
            </Pressable>
            {rebookPlace && rebookQuote ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rebook ${rebookPlace.name}`}
                onPress={() => dispatch({ type: 'rebook' })}
                style={[layout.card, layout.row]}
                testID="rebook"
              >
                <View style={layout.grow}>
                  <Text style={layout.footnote}>Last trip</Text>
                  <Text style={layout.headline}>{rebookPlace.name}</Text>
                  <Text style={layout.secondary}>
                    From 23rd Road · {formatNaira(rebookQuote.midpointKobo)}
                  </Text>
                </View>
                <View style={layout.rebookPill}>
                  <Text style={layout.rebookText}>Rebook</Text>
                </View>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function SignedInLine() {
  const account = useAccount();
  if (!account) {
    return null;
  }
  return (
    <>
      <Text style={layout.secondary}>Signed in as {account.phoneMask}</Text>
      <Button label="Sign out" variant="secondary" onPress={account.signOut} testID="sign-out" />
    </>
  );
}

function QuietCopy() {
  const { state, dispatch } = usePassenger();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={layout.title}>
        No Kekes near you
      </Text>
      <Text style={layout.secondary}>
        Satellite Town is quiet. We can tell you when one is nearby, or you can set a destination
        and raise the fare.
      </Text>
      {state.notified ? (
        <Text style={[layout.body, { color: colors.success }]} accessibilityRole="text">
          We will notify you when a Keke is nearby.
        </Text>
      ) : (
        <Button label="Notify me" onPress={() => dispatch({ type: 'notify' })} testID="notify-me" />
      )}
      <Button
        label="Set a destination"
        variant="secondary"
        onPress={() => dispatch({ type: 'openSearch' })}
        testID="quiet-destination"
      />
      <Button
        label="Back to Festac"
        variant="ghost"
        onPress={() => dispatch({ type: 'setArea', area: 'festac' })}
        testID="back-festac"
      />
    </View>
  );
}
