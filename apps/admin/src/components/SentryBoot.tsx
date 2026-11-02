'use client';

import { useEffect } from 'react';

import { initAdminSentry } from '../lib/sentry';

export function SentryBoot() {
  useEffect(() => {
    void initAdminSentry();
  }, []);

  return null;
}
