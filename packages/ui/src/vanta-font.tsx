import { createContext, useContext, type ReactNode } from 'react';

export type VantaFaces = {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
  mono: string;
};

const system: VantaFaces = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  mono: 'System',
};

const FontContext = createContext<VantaFaces>(system);

export function VantaFontProvider({ faces, children }: { faces: VantaFaces; children: ReactNode }) {
  return <FontContext.Provider value={faces}>{children}</FontContext.Provider>;
}

export function useVantaFont(): VantaFaces {
  return useContext(FontContext);
}
