import {
  initialOnboarding,
  onboardingBlocker,
  onboardingReducer,
  onboardingStepIndex,
  onboardingSteps,
  type OnboardingDraft,
  type OnboardingStep,
} from '@drop/shared';
import { Button, Field, Header, Notice, Screen } from '@drop/ui';
import { colors, radii, spacing, tapTarget } from '@drop/ui-tokens';
import * as ImagePicker from 'expo-image-picker';
import { useReducer, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../layout';

type PhotoKind = 'selfie' | 'licence' | 'keke';

export function OnboardingFlow({
  preview,
  initialStep = 'name',
  onSubmit,
  onSignOut,
}: {
  preview: boolean;
  initialStep?: OnboardingStep;
  onSubmit: (draft: OnboardingDraft, photos: Record<PhotoKind, string>) => Promise<void>;
  onSignOut: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, dispatch] = useReducer(onboardingReducer, {
    ...initialOnboarding(),
    step: initialStep,
  });
  const [photos, setPhotos] = useState<Partial<Record<PhotoKind, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNin, setShowNin] = useState(false);
  const stepIndex = onboardingStepIndex(draft.step);
  const blocker = onboardingBlocker(draft);

  async function addPhoto(kind: PhotoKind, source: 'camera' | 'library') {
    if (preview) {
      markPhoto(kind, 'preview');
      return;
    }
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera access is off. You can choose a photo instead.');
        return;
      }
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            allowsEditing: true,
          });
    if (result.canceled) {
      return;
    }
    const uri = result.assets[0]?.uri;
    if (!uri) {
      setError('That photo did not come through. Try again.');
      return;
    }
    markPhoto(kind, uri);
  }

  function markPhoto(kind: PhotoKind, uri: string) {
    setPhotos((current) => ({ ...current, [kind]: uri }));
    setError(null);
    if (kind === 'selfie') {
      dispatch({ type: 'selfie', ready: true });
    } else if (kind === 'licence') {
      dispatch({ type: 'licencePhoto', ready: true });
    } else {
      dispatch({ type: 'kekePhoto', ready: true });
    }
  }

  function continueStep() {
    const missing = onboardingBlocker(draft);
    if (missing) {
      setError(missing);
      return;
    }
    setError(null);
    if (draft.step === 'nin') {
      void finish();
      return;
    }
    dispatch({ type: 'next' });
  }

  async function finish() {
    const selfie = photos.selfie;
    const licence = photos.licence;
    const keke = photos.keke;
    if (!selfie || !licence || !keke) {
      setError('Add the face, licence, and Keke photos.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(draft, { selfie, licence, keke });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen testID="screen-onboarding">
      <View style={{ paddingTop: Math.max(insets.top, spacing.xs) }}>
        <Header
          title={`Step ${stepIndex} of ${onboardingSteps.length}`}
          onBack={
            draft.step === 'name'
              ? undefined
              : () => {
                  setError(null);
                  dispatch({ type: 'back' });
                }
          }
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        {draft.step === 'name' ? (
          <>
            <Text accessibilityRole="header" style={layout.title}>
              Your name
            </Text>
            <Text style={layout.secondary}>Passengers see this on your offer card.</Text>
            <Field
              label="Name"
              value={draft.fullName}
              onChangeText={(value) => dispatch({ type: 'name', value })}
              placeholder="Chinedu Adeyemi"
              autoCapitalize="words"
              testID="rider-name"
            />
          </>
        ) : null}
        {draft.step === 'photo' ? (
          <>
            <Text accessibilityRole="header" style={layout.title}>
              A photo of you
            </Text>
            <Text style={layout.secondary}>
              Passengers check your face before they board. Use a clear photo, in daylight if you
              can.
            </Text>
            <PhotoActions
              ready={draft.selfieReady}
              onCamera={() => void addPhoto('selfie', 'camera')}
              onLibrary={() => void addPhoto('selfie', 'library')}
            />
          </>
        ) : null}
        {draft.step === 'licence' ? (
          <>
            <Text accessibilityRole="header" style={layout.title}>
              Driver licence
            </Text>
            <Text style={layout.secondary}>The number on the card, and a photo of the card.</Text>
            <Field
              label="Licence number"
              value={draft.licenceNumber}
              onChangeText={(value) => dispatch({ type: 'licence', value })}
              placeholder="LSD1029384"
              autoCapitalize="characters"
              testID="licence-number"
            />
            <PhotoActions
              ready={draft.licencePhotoReady}
              onCamera={() => void addPhoto('licence', 'camera')}
              onLibrary={() => void addPhoto('licence', 'library')}
            />
          </>
        ) : null}
        {draft.step === 'keke' ? (
          <>
            <Text accessibilityRole="header" style={layout.title}>
              Your Keke
            </Text>
            <Text style={layout.secondary}>
              The plate passengers should look for, and a photo of the Keke.
            </Text>
            <Field
              label="Plate"
              value={draft.plateNumber}
              onChangeText={(value) => dispatch({ type: 'plate', value })}
              placeholder="KJA-204-AB"
              autoCapitalize="characters"
              testID="plate-number"
            />
            <PhotoActions
              ready={draft.kekePhotoReady}
              onCamera={() => void addPhoto('keke', 'camera')}
              onLibrary={() => void addPhoto('keke', 'library')}
            />
          </>
        ) : null}
        {draft.step === 'nin' ? (
          <>
            <Text accessibilityRole="header" style={layout.title}>
              National identification number
            </Text>
            <Text style={layout.secondary}>
              DROP checks this number and stores only the last four digits plus a reference. The
              full number is not kept.
            </Text>
            <Text style={styles.label}>NIN</Text>
            <View style={styles.ninRow}>
              <TextInput
                accessibilityLabel="National identification number"
                value={draft.nin}
                onChangeText={(value) => dispatch({ type: 'nin', value })}
                placeholder="11 digits"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                secureTextEntry={!showNin}
                maxLength={11}
                testID="nin-input"
                style={styles.ninInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showNin ? 'Hide NIN' : 'Show NIN'}
                onPress={() => setShowNin((current) => !current)}
                style={styles.show}
              >
                <Text style={styles.showText}>{showNin ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.consent }}
              accessibilityLabel="DROP can check this NIN"
              onPress={() => dispatch({ type: 'consent', value: !draft.consent })}
              style={styles.consent}
              testID="nin-consent"
            >
              <View style={[styles.box, draft.consent && styles.boxOn]}>
                <Text style={styles.boxMark}>{draft.consent ? '✓' : ''}</Text>
              </View>
              <Text style={layout.body}>I agree DROP can check this NIN.</Text>
            </Pressable>
          </>
        ) : null}
        {error ? <Notice message={error} /> : null}
        {preview ? (
          <Text style={layout.footnote}>
            Preview only. Photos are marked as added, and nothing is uploaded.
          </Text>
        ) : null}
        <Button
          label={busy ? 'Submitting…' : draft.step === 'nin' ? 'Submit for review' : 'Continue'}
          onPress={continueStep}
          disabled={busy || blocker !== null}
          testID="onboarding-next"
        />
        <Button label="Sign out" variant="ghost" onPress={onSignOut} testID="sign-out" />
      </ScrollView>
    </Screen>
  );
}

function PhotoActions({
  ready,
  onCamera,
  onLibrary,
}: {
  ready: boolean;
  onCamera: () => void;
  onLibrary: () => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={layout.body}>{ready ? 'Photo added' : 'No photo yet'}</Text>
      <Button label="Take photo" onPress={onCamera} testID="take-photo" />
      <Button label="Choose photo" variant="secondary" onPress={onLibrary} testID="choose-photo" />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  label: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  ninRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  ninInput: {
    flex: 1,
    minHeight: tapTarget.riderPrimaryHeightDp,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
  show: {
    minWidth: tapTarget.minDp,
    minHeight: tapTarget.riderPrimaryHeightDp,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  showText: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: tapTarget.riderPrimaryHeightDp,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxMark: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
