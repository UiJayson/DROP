import { createContext, useContext, type ReactNode } from 'react';

type RiderAccess = {
  banner: string | null;
  changeOnline: (online: boolean) => Promise<string | null>;
  signOut: () => void;
};

const RiderAccessContext = createContext<RiderAccess>({
  banner: null,
  changeOnline: async () => null,
  signOut: () => undefined,
});

export function RiderAccessProvider({
  value,
  children,
}: {
  value: RiderAccess;
  children: ReactNode;
}) {
  return <RiderAccessContext.Provider value={value}>{children}</RiderAccessContext.Provider>;
}

export function useRiderAccess(): RiderAccess {
  return useContext(RiderAccessContext);
}
