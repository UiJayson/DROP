import type { RideFrame, RidePin } from '@drop/ui';
import type { RefObject } from 'react';

export type RideMapHandle = {
  zoomBy: (delta: number) => void;
  locate: (lng: number, lat: number) => void;
};

export type RideMapPadding = { top: number; right: number; bottom: number; left: number };

export type RideMapViewProps = {
  pins: RidePin[];
  frame: RideFrame;
  padding: RideMapPadding;
  mapRef: RefObject<RideMapHandle | null>;
  onReady: () => void;
  onFail: () => void;
};
