import { useEffect } from 'react';

import type { RideMapViewProps } from './types';

/** Node and tests have no map canvas. Metro uses the web or native file instead. */
export function RideMapView({ onFail }: RideMapViewProps) {
  useEffect(() => {
    onFail();
  }, [onFail]);
  return null;
}
