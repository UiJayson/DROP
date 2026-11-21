import { pickup, placeById } from '@drop/shared';
import { createContext, useContext, type ReactNode } from 'react';

export type DemoPanel = 'app' | 'account' | 'settings' | 'history' | 'safety';

type Shell = {
  panel: DemoPanel;
  open: (panel: DemoPanel) => void;
  close: () => void;
};

const ShellContext = createContext<Shell | null>(null);

export function DemoShellProvider({ value, children }: { value: Shell; children: ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useDemoShell(): Shell | null {
  return useContext(ShellContext);
}

export type DemoPoint = { title: string; lat: number; lng: number };

const PlaceContext = createContext<{
  point: DemoPoint;
  setPickup: (id: string) => void;
} | null>(null);

export function DemoPlaceProvider({
  pickupId,
  onPickup,
  children,
}: {
  pickupId: string;
  onPickup: (id: string) => void;
  children: ReactNode;
}) {
  const place = pickupId === 'festac' ? null : placeById(pickupId);
  const point: DemoPoint = place
    ? { title: place.name, lat: place.lat, lng: place.lng }
    : { title: pickup.title, lat: pickup.lat, lng: pickup.lng };
  return (
    <PlaceContext.Provider value={{ point, setPickup: onPickup }}>{children}</PlaceContext.Provider>
  );
}

export function useDemoPoint(): DemoPoint | null {
  return useContext(PlaceContext)?.point ?? null;
}

export function useSetDemoPickup(): ((id: string) => void) | null {
  return useContext(PlaceContext)?.setPickup ?? null;
}
