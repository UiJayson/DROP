import { maskNigerianPhone, passengerProfile, pickup } from '@drop/shared';

import type { PassengerState } from '../flow';

const KEY = 'drop.demo.v1';

export type DemoTrip = {
  id: string;
  when: string;
  from: string;
  to: string;
  placeId: string;
  fareKobo: number;
  rider: string;
  stars: number;
};

export type DemoPrefs = {
  trustedName: string;
  trustedPhone: string;
};

export type DemoUser = {
  name: string;
  phone: string;
  phoneMask: string;
};

export type DemoData = {
  user: DemoUser | null;
  history: DemoTrip[];
  prefs: DemoPrefs;
  trip: PassengerState | null;
  pickupId: string;
};

type Memory = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memory = new Map<string, string>();
const memoryStore: Memory = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};

function browserStore(): Memory {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Private mode can throw. The demo keeps working in memory.
  }
  return memoryStore;
}

export function seedHistory(): DemoTrip[] {
  return [
    {
      id: 'seed-shoprite',
      when: 'Yesterday',
      from: pickup.title,
      to: 'Shoprite Festac',
      placeId: 'shoprite',
      fareKobo: 50_000,
      rider: 'Adaeze',
      stars: 5,
    },
    {
      id: 'seed-mile2',
      when: 'Last week',
      from: pickup.title,
      to: 'Mile 2 Bus Stop',
      placeId: 'mile2',
      fareKobo: 70_000,
      rider: 'Chinedu',
      stars: 4,
    },
  ];
}

function empty(): DemoData {
  return {
    user: null,
    history: seedHistory(),
    prefs: { trustedName: '', trustedPhone: '' },
    trip: null,
    pickupId: 'festac',
  };
}

export function loadDemo(): DemoData {
  const raw = browserStore().getItem(KEY);
  if (!raw) {
    const seeded = empty();
    saveDemo(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DemoData>;
    return {
      ...empty(),
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : seedHistory(),
      prefs: { trustedName: '', trustedPhone: '', ...parsed.prefs },
      pickupId: parsed.pickupId || 'festac',
    };
  } catch {
    return empty();
  }
}

export function saveDemo(data: DemoData) {
  browserStore().setItem(KEY, JSON.stringify(data));
}

export function resetDemo() {
  browserStore().removeItem(KEY);
  memory.clear();
}

export function demoUser(phone: string, name: string): DemoUser {
  return {
    phone,
    name: name.trim() || passengerProfile.name,
    phoneMask: maskNigerianPhone(phone),
  };
}

export function tripSnapshot(state: PassengerState): PassengerState | null {
  if (state.route === 'home' || state.route === 'quiet' || state.route === 'search') {
    return null;
  }
  return state;
}
