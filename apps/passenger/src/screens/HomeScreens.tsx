import {
  areas,
  formatNaira,
  passengerProfile,
  pickup,
  placeById,
  quoteForPlace,
  rebookPlaceId,
} from '@drop/shared';
import {
  Button,
  FloatingTabBar,
  GlowCard,
  IconCircleButton,
  KekeArt,
  Screen,
  StreetMap,
  useVantaFont,
  type VantaTab,
} from '@drop/ui';
import { spacing, vanta } from '@drop/ui-tokens';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '../account';
import { layout } from '../layout';
import { usePassenger } from '../passenger-context';

export function HomeScreen() {
  const { state, dispatch } = usePassenger();
  const insets = useSafeAreaInsets();
  const font = useVantaFont();
  const account = useAccount();
  const [safety, setSafety] = useState(false);
  const [pickingArea, setPickingArea] = useState(false);
  const area = areas[state.area];
  const rebookPlace = placeById(rebookPlaceId);
  const rebookQuote = quoteForPlace(rebookPlaceId);
  const hello =
    !account || account.phoneMask === '+234 80 ••• ••00'
      ? `Hello, ${passengerProfile.name}`
      : 'Hello';

  if (safety) {
    return (
      <Screen testID="screen-safety" padded tone="vanta">
        <View style={{ paddingTop: Math.max(insets.top, spacing.sm), gap: spacing.md, flex: 1 }}>
          <Text accessibilityRole="header" style={[layout.title, { fontFamily: font.bold }]}>
            Safety
          </Text>
          <Text style={[layout.body, { fontFamily: font.regular }]}>
            Share trip, call, and report sit on the trip itself. Nothing here interrupts booking.
          </Text>
          <Text style={[layout.secondary, { fontFamily: font.regular }]}>
            A trusted contact can be added after the prototype.
          </Text>
          <SignedInLine />
          <Button label="Back to booking" onPress={() => setSafety(false)} testID="close-safety" />
        </View>
      </Screen>
    );
  }

  function onTab(tab: VantaTab) {
    if (tab === 'ride') {
      dispatch({ type: 'openSearch' });
      return;
    }
    if (tab === 'safety' || tab === 'account') {
      setSafety(true);
    }
  }

  return (
    <Screen testID={state.route === 'quiet' ? 'screen-quiet' : 'screen-home'} tone="vanta">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <StreetMap />
          <View style={styles.koke} pointerEvents="none">
            <KekeArt width={210} glow />
          </View>
          <View style={[styles.heroCopy, { paddingTop: Math.max(insets.top, 12) }]}>
            <View style={styles.topRow}>
              <Text style={[styles.word, { fontFamily: font.bold }]}>DROP</Text>
              <View style={styles.topActions}>
                <IconCircleButton
                  label="Search"
                  icon="search"
                  onPress={() => dispatch({ type: 'openSearch' })}
                />
                <IconCircleButton
                  label="Safety"
                  icon="bell"
                  onPress={() => setSafety(true)}
                  testID="safety"
                />
              </View>
            </View>
            <Text accessibilityRole="header" style={[styles.hello, { fontFamily: font.bold }]}>
              {hello}
            </Text>
            <Text style={[styles.tag, { fontFamily: font.regular }]}>
              Travel where you want. Agree the fare, then pay the rider in cash.
            </Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.searchCard}>
            <View style={styles.fromTo}>
              <View style={styles.grow}>
                <View style={styles.stop}>
                  <View style={styles.dotYellow} />
                  <View>
                    <Text style={[styles.fieldLabel, { fontFamily: font.medium }]}>From</Text>
                    <Text style={[styles.fieldValue, { fontFamily: font.bold }]}>
                      {pickup.title}
                    </Text>
                  </View>
                </View>
                <View style={styles.rule} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Where to?"
                  onPress={() => dispatch({ type: 'openSearch' })}
                  style={styles.stop}
                  testID="where-to"
                >
                  <View style={styles.dotInk} />
                  <View>
                    <Text style={[styles.fieldLabel, { fontFamily: font.medium }]}>To</Text>
                    <Text style={[styles.fieldValue, { fontFamily: font.bold }]}>Where to?</Text>
                  </View>
                </Pressable>
              </View>
              <IconCircleButton
                label="Choose pickup and destination"
                icon="repeat"
                onPress={() => dispatch({ type: 'openSearch' })}
              />
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaCell}>
                <Text style={[styles.fieldLabel, { fontFamily: font.medium }]}>Now</Text>
                <Text style={[styles.fieldValue, { fontFamily: font.semibold }]}>Leave now</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaCell}>
                <Text style={[styles.fieldLabel, { fontFamily: font.medium }]}>Your offer</Text>
                <View style={styles.offerRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Lower your offer"
                    onPress={() => dispatch({ type: 'stepFare', direction: -1 })}
                    hitSlop={8}
                  >
                    <Text style={[styles.step, { fontFamily: font.bold }]}>–</Text>
                  </Pressable>
                  <Text style={[styles.fieldValue, { fontFamily: font.bold }]}>
                    {formatNaira(state.offerKobo)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Raise your offer"
                    onPress={() => dispatch({ type: 'stepFare', direction: 1 })}
                    hitSlop={8}
                  >
                    <Text style={[styles.step, { fontFamily: font.bold }]}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Find Keke"
              onPress={() => dispatch({ type: 'openSearch' })}
              style={styles.find}
            >
              <Text style={[styles.findText, { fontFamily: font.bold }]}>Find Keke</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${area.name}. ${area.nearby} Kekes near you. Change area.`}
            onPress={() => setPickingArea((open) => !open)}
            testID="area-chip"
            style={styles.area}
          >
            <View style={styles.dotYellow} />
            <Text style={[styles.areaText, { fontFamily: font.medium }]}>
              {area.nearby > 0 ? `${area.nearby} Kekes near you` : 'No Kekes near you'}
            </Text>
          </Pressable>
          {pickingArea ? (
            <View style={styles.areaPick}>
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
          ) : null}

          {state.route === 'quiet' ? (
            <QuietCopy />
          ) : rebookPlace && rebookQuote ? (
            <View style={{ gap: 12 }}>
              <Text style={[styles.section, { fontFamily: font.bold }]}>Recent trips</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rebook ${rebookPlace.name}`}
                onPress={() => dispatch({ type: 'rebook' })}
                testID="rebook"
              >
                <GlowCard contentStyle={styles.recent}>
                  <Text
                    style={[styles.fieldLabel, { color: vanta.muted, fontFamily: font.medium }]}
                  >
                    Last trip
                  </Text>
                  <Text style={[styles.fieldValue, { color: vanta.text, fontFamily: font.bold }]}>
                    {rebookPlace.name}
                  </Text>
                  <Text style={[styles.tag, { fontFamily: font.regular }]}>
                    From 23rd Road · {formatNaira(rebookQuote.midpointKobo)}
                  </Text>
                </GlowCard>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <FloatingTabBar active="home" accent="yellow" onChange={onTab} />
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
  const font = useVantaFont();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={[layout.title, { fontFamily: font.bold }]}>
        No Kekes near you
      </Text>
      <Text style={[layout.secondary, { fontFamily: font.regular }]}>
        Satellite Town is quiet. We can tell you when one is nearby, or you can set a destination
        and raise the fare.
      </Text>
      {state.notified ? (
        <Text style={[layout.body, { color: '#70DDA0', fontFamily: font.medium }]}>
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

const styles = StyleSheet.create({
  hero: {
    height: 280,
    backgroundColor: vanta.page,
    overflow: 'hidden',
  },
  koke: {
    position: 'absolute',
    right: -36,
    top: 18,
  },
  heroCopy: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  word: {
    color: vanta.yellow,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  hello: {
    color: vanta.text,
    fontSize: 28,
    lineHeight: 34,
    marginTop: 28,
  },
  tag: {
    color: vanta.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 230,
  },
  sheet: {
    marginTop: -36,
    paddingHorizontal: 16,
    gap: 16,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  fromTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grow: { flex: 1, gap: 8 },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  dotYellow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: vanta.yellow,
  },
  dotInk: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: vanta.ink,
  },
  fieldLabel: {
    color: '#6E6E73',
    fontSize: 12,
    lineHeight: 16,
  },
  fieldValue: {
    color: vanta.ink,
    fontSize: 16,
    lineHeight: 21,
  },
  rule: {
    marginLeft: 20,
    borderTopWidth: 1,
    borderColor: '#E6E6E8',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#E6E6E8',
    paddingTop: 12,
  },
  metaCell: { flex: 1, gap: 2 },
  metaDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#E6E6E8',
    marginHorizontal: 12,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  step: {
    color: vanta.ink,
    fontSize: 20,
    minWidth: 24,
    textAlign: 'center',
  },
  find: {
    backgroundColor: '#111111',
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  area: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  areaText: {
    color: vanta.text,
    fontSize: 14,
  },
  areaPick: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    color: vanta.text,
    fontSize: 18,
  },
  recent: {
    gap: 4,
  },
});
