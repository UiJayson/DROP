import { product } from '@drop/shared';
import { colors, radii, spacing, typeScale } from '@drop/ui-tokens';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          margin: 0,
          color: colors.primary,
          fontSize: typeScale.largeTitle.fontSize,
          lineHeight: `${typeScale.largeTitle.lineHeight}px`,
          fontWeight: 700,
        }}
      >
        {product.name}
      </h1>
      <p
        style={{
          margin: `${spacing.xs}px 0 0`,
          color: colors.textPrimary,
          fontSize: typeScale.headline.fontSize,
          lineHeight: `${typeScale.headline.lineHeight}px`,
          fontWeight: 600,
        }}
      >
        Admin
      </p>
      <p
        style={{
          margin: `${spacing.sm}px 0 0`,
          color: colors.textSecondary,
          fontSize: typeScale.body.fontSize,
          lineHeight: `${typeScale.body.lineHeight}px`,
        }}
      >
        {product.tagline}
      </p>
      <span
        style={{
          marginTop: spacing.lg,
          background: colors.primary,
          color: colors.onPrimary,
          borderRadius: radii.pill,
          padding: `${spacing.xs}px ${spacing.md}px`,
          fontSize: typeScale.callout.fontSize,
          lineHeight: `${typeScale.callout.lineHeight}px`,
          fontWeight: 600,
        }}
      >
        {product.setupLabel}
      </span>
    </main>
  );
}
