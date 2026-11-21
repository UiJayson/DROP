import { typeStyle } from '@drop/ui';
import { colors, radii, spacing } from '@drop/ui-tokens';
import { StyleSheet } from 'react-native';

export const layout = StyleSheet.create({
  fill: { flex: 1 },
  pad: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  wordmark: {
    color: colors.primary,
    ...typeStyle('title'),
  },
  title: { color: colors.textPrimary, ...typeStyle('title') },
  headline: { color: colors.textPrimary, ...typeStyle('headline') },
  body: { color: colors.textPrimary, ...typeStyle('body') },
  secondary: { color: colors.textSecondary, ...typeStyle('body') },
  footnote: { color: colors.textSecondary, ...typeStyle('caption') },
  fare: {
    color: colors.textPrimary,
    ...typeStyle('fare'),
  },
  timer: {
    color: colors.textPrimary,
    ...typeStyle('timer'),
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
    minHeight: 44,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seatOn: { backgroundColor: 'transparent' },
  seatText: { color: colors.textPrimary, ...typeStyle('headline') },
  seatTextOn: { color: colors.onPrimary },
  online: {
    alignSelf: 'center',
    minHeight: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  onlineOn: {},
  onlineOff: { backgroundColor: colors.surface3 },
  onlineLabelOn: { color: colors.onPrimary, ...typeStyle('button') },
  onlineLabelOff: { color: colors.textPrimary, ...typeStyle('button') },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
