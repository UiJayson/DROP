import { typeStyle } from '@drop/ui';
import { colors, radii, spacing, tapTarget } from '@drop/ui-tokens';
import { StyleSheet } from 'react-native';

export const layout = StyleSheet.create({
  fill: { flex: 1 },
  pad: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  wordmark: {
    color: colors.primary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: { color: colors.textPrimary, ...typeStyle('title') },
  headline: { color: colors.textPrimary, ...typeStyle('headline') },
  body: { color: colors.textPrimary, ...typeStyle('body') },
  secondary: { color: colors.textSecondary, ...typeStyle('callout') },
  footnote: { color: colors.textSecondary, ...typeStyle('footnote') },
  fare: {
    color: colors.textPrimary,
    ...typeStyle('fare'),
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.separator,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  grow: { flex: 1 },
  seat: {
    flex: 1,
    minHeight: tapTarget.riderPrimaryHeightDp,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatOn: { backgroundColor: colors.primary },
  seatText: { color: colors.textPrimary, ...typeStyle('headline') },
  seatTextOn: { color: colors.onPrimary },
  online: {
    minHeight: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  onlineOn: { backgroundColor: colors.primary },
  onlineOff: { backgroundColor: colors.surface3 },
  onlineLabelOn: { color: colors.onPrimary, ...typeStyle('title') },
  onlineLabelOff: { color: colors.textPrimary, ...typeStyle('title') },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
