import { OTP_LENGTH, maskNigerianPhone } from '@drop/shared';
import { colors, radii, spacing, tapTarget } from '@drop/ui-tokens';
import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Notice } from './controls';
import { Screen } from './shell';
import { typeStyle } from './theme';

function SignInFrame({ testID, children }: { testID: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(insets.top, spacing.lg),
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export function PhoneSignIn({
  audience,
  national,
  error,
  busy,
  onChange,
  onSubmit,
  onPreview,
}: {
  audience: 'Passenger' | 'Rider';
  national: string;
  error: string | null;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPreview?: () => void;
}) {
  return (
    <SignInFrame testID="screen-phone">
      <View style={styles.copy}>
        <Text style={styles.wordmark}>DROP</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {audience === 'Rider' ? 'Ride with DROP' : 'Where to?'}
        </Text>
        <Text style={styles.body}>
          {audience === 'Rider'
            ? 'Sign in with your Nigerian mobile number. We will text you a code.'
            : 'Book a Keke to yourself. Sign in with your Nigerian mobile number.'}
        </Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Mobile number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefix} accessibilityLabel="Nigeria country code +234">
            <Text style={styles.prefixText}>+234</Text>
          </View>
          <TextInput
            accessibilityLabel="Mobile number"
            accessibilityHint="Enter the number without the first 0, or with it."
            value={national}
            onChangeText={onChange}
            placeholder="801 234 5678"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={11}
            testID="phone-input"
            style={styles.phoneInput}
          />
        </View>
        <Text style={styles.hint}>
          We text a code. Your number stays off other people's screens.
        </Text>
        {error ? <Notice message={error} /> : null}
        <Button
          label={busy ? 'Sending code…' : 'Send code'}
          onPress={onSubmit}
          disabled={busy}
          testID="send-code"
        />
        {onPreview ? (
          <Button
            label="Preview the screens"
            variant="ghost"
            onPress={onPreview}
            testID="preview"
          />
        ) : null}
      </View>
    </SignInFrame>
  );
}

export function CodeSignIn({
  phoneE164,
  code,
  error,
  busy,
  resendSeconds,
  onChange,
  onSubmit,
  onResend,
  onBack,
}: {
  phoneE164: string;
  code: string;
  error: string | null;
  busy: boolean;
  resendSeconds: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const cells = Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? '');
  return (
    <SignInFrame testID="screen-code">
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          Enter the code
        </Text>
        <Text style={styles.body}>
          Sent by text to {maskNigerianPhone(phoneE164)}. It expires soon.
        </Text>
      </View>
      <View style={styles.form}>
        <View style={styles.codeWrap}>
          <View style={styles.codeRow} accessibilityElementsHidden pointerEvents="none">
            {cells.map((digit, index) => (
              <View key={index} style={styles.codeCell}>
                <Text style={styles.codeDigit}>{digit}</Text>
              </View>
            ))}
          </View>
          <TextInput
            accessibilityLabel="6 digit text message code"
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={OTP_LENGTH}
            testID="code-input"
            style={styles.codeInput}
          />
        </View>
        {error ? <Notice message={error} /> : null}
        <Button
          label={busy ? 'Checking…' : 'Continue'}
          onPress={onSubmit}
          disabled={busy || code.length < OTP_LENGTH}
          testID="verify-code"
        />
        <Button
          label={resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
          variant="secondary"
          onPress={onResend}
          disabled={busy || resendSeconds > 0}
          testID="resend-code"
        />
        <Button label="Change number" variant="ghost" onPress={onBack} testID="change-number" />
      </View>
    </SignInFrame>
  );
}

export function NameSignIn({
  name,
  error,
  busy,
  onChange,
  onSubmit,
}: {
  name: string;
  error: string | null;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <SignInFrame testID="screen-name">
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          What should we call you?
        </Text>
        <Text style={styles.body}>This is the name riders see. You can use your first name.</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          accessibilityLabel="Your name"
          value={name}
          onChangeText={onChange}
          placeholder="Ada Okonkwo"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={80}
          testID="name-input"
          style={styles.nameInput}
        />
        {error ? <Notice message={error} /> : null}
        <Button
          label={busy ? 'Saving…' : 'Continue'}
          onPress={onSubmit}
          disabled={busy}
          testID="save-name"
        />
      </View>
    </SignInFrame>
  );
}

export function StatusMessage({
  testID,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  testID: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <SignInFrame testID={testID}>
      <View style={styles.copy}>
        <Text style={styles.wordmark}>DROP</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <View style={styles.form}>
        {actionLabel && onAction ? (
          <Button label={actionLabel} onPress={onAction} testID="status-action" />
        ) : null}
        {secondaryLabel && onSecondary ? (
          <Button
            label={secondaryLabel}
            variant="secondary"
            onPress={onSecondary}
            testID="status-secondary"
          />
        ) : null}
      </View>
    </SignInFrame>
  );
}

export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  copy: { gap: spacing.sm },
  form: { gap: spacing.sm },
  wordmark: {
    color: colors.primary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: { color: colors.textPrimary, ...typeStyle('title') },
  body: { color: colors.textSecondary, ...typeStyle('body') },
  label: { color: colors.textSecondary, ...typeStyle('footnote') },
  hint: { color: colors.textSecondary, ...typeStyle('footnote') },
  phoneRow: { flexDirection: 'row', gap: spacing.xs },
  prefix: {
    minHeight: tapTarget.riderPrimaryHeightDp,
    minWidth: 84,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: { color: colors.textPrimary, ...typeStyle('headline') },
  phoneInput: {
    flex: 1,
    minHeight: tapTarget.riderPrimaryHeightDp,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    ...typeStyle('body'),
  },
  codeWrap: { position: 'relative' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  codeCell: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  codeInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
  },
  nameInput: {
    minHeight: tapTarget.riderPrimaryHeightDp,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    ...typeStyle('body'),
  },
});
