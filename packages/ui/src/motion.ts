/**
 * Translated from SwiftUI spring feedback (response ~0.3, damping ~0.8):
 * a short press-in with no bounce, and a slightly bouncy release.
 * Native driver only, so low-end Android is not doing this on the JS thread.
 */
export const pressInSpring = {
  speed: 40,
  bounciness: 0,
  useNativeDriver: true,
} as const;

export const pressOutSpring = {
  speed: 18,
  bounciness: 6,
  useNativeDriver: true,
} as const;

export const enterSpring = {
  speed: 16,
  bounciness: 4,
  useNativeDriver: true,
} as const;
