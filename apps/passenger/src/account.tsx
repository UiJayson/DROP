import { createContext, useContext, type ReactNode } from 'react';

type Account = {
  phoneMask: string;
  signOut: () => void;
};

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ value, children }: { value: Account; children: ReactNode }) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): Account | null {
  return useContext(AccountContext);
}
