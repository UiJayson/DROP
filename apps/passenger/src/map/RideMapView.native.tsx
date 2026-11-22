import Constants from 'expo-constants';
import { useEffect, useState, type ComponentType } from 'react';

import type { RideMapViewProps } from './types';

type NativeMap = ComponentType<RideMapViewProps>;

function runningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo' || Constants.expoGoConfig != null;
}

function loadNativeMap(): NativeMap | null {
  try {
    // Loaded only in a dev build. A static import would crash Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('./RideMapNative') as { RideMapNative: NativeMap };
    return loaded.RideMapNative;
  } catch {
    return null;
  }
}

/** Expo Go has no MapLibre native module. A dev build loads it. */
export function RideMapView(props: RideMapViewProps) {
  const [Impl] = useState<NativeMap | null>(() => (runningInExpoGo() ? null : loadNativeMap()));
  const { onFail } = props;

  useEffect(() => {
    if (!Impl) {
      onFail();
    }
  }, [Impl, onFail]);

  if (!Impl) {
    return null;
  }
  return <Impl {...props} />;
}
