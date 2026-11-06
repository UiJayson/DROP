import { describe, expect, it } from 'vitest';

import {
  canReadBoardingPin,
  canReadTripData,
  cancelTransition,
  cashCompletion,
  checkBoardingPin,
  completeTransition,
  googleDirectionsUrl,
  googleEmbedUrl,
  locationAgeLabel,
  locationWriteAllowed,
  mapCaption,
  pinFailureMessage,
  projectPins,
  tripStatusLabel,
} from './trip';

const fare = 50_000;

describe('boarding PIN', () => {
  it('starts the trip only when the rider is arrived and the PIN matches', () => {
    expect(
      checkBoardingPin({
        status: 'assigned',
        pinLocked: false,
        attempts: 0,
        pin: '4821',
        entered: '4821',
      }).message,
    ).toBe('Tap Arrived before asking for the PIN.');

    const started = checkBoardingPin({
      status: 'arrived',
      pinLocked: false,
      attempts: 0,
      pin: '4821',
      entered: '4821',
    });
    expect(started).toMatchObject({ ok: true, status: 'in_progress', attempts: 0 });
  });

  it('counts wrong PINs and locks after three', () => {
    const first = checkBoardingPin({
      status: 'arrived',
      pinLocked: false,
      attempts: 0,
      pin: '4821',
      entered: '0000',
    });
    expect(first).toMatchObject({
      ok: false,
      status: 'arrived',
      attempts: 1,
      pinLocked: false,
      message: 'Wrong PIN. 2 tries left.',
    });

    const second = checkBoardingPin({
      status: 'arrived',
      pinLocked: false,
      attempts: 1,
      pin: '4821',
      entered: '1111',
    });
    expect(second.message).toBe('Wrong PIN. 1 try left.');

    const locked = checkBoardingPin({
      status: 'arrived',
      pinLocked: false,
      attempts: 2,
      pin: '4821',
      entered: '2222',
    });
    expect(locked).toMatchObject({
      ok: false,
      attempts: 3,
      pinLocked: true,
      message: pinFailureMessage(3),
    });

    const again = checkBoardingPin({
      status: 'arrived',
      pinLocked: true,
      attempts: 3,
      pin: '4821',
      entered: '4821',
    });
    expect(again.ok).toBe(false);
    expect(again.attempts).toBe(3);
    expect(again.message).toBe('Too many tries. Contact DROP support.');
  });

  it('does not spend an attempt on a partial PIN', () => {
    const check = checkBoardingPin({
      status: 'arrived',
      pinLocked: false,
      attempts: 1,
      pin: '4821',
      entered: '48',
    });
    expect(check).toMatchObject({
      ok: false,
      attempts: 1,
      message: 'Enter the 4-digit PIN.',
    });
  });
});

describe('trip state and cash', () => {
  it('moves assigned to arrived to on-trip to completed', () => {
    expect(tripStatusLabel('assigned')).toContain('Accepted');
    expect(tripStatusLabel('in_progress')).toBe('On trip');
    expect(completeTransition('assigned').ok).toBe(false);
    expect(completeTransition('in_progress')).toEqual({ ok: true, status: 'completed' });
    expect(completeTransition('completed')).toEqual({ ok: true, status: 'completed' });
  });

  it('cancels before the start and refuses a silent cancel after the start', () => {
    expect(cancelTransition('assigned', false)).toEqual({ ok: true, status: 'cancelled' });
    expect(cancelTransition('arrived', false)).toEqual({ ok: true, status: 'cancelled' });
    expect(cancelTransition('in_progress', false)).toMatchObject({
      ok: false,
      status: 'in_progress',
      message: 'This trip has started. Confirm to stop it.',
    });
    expect(cancelTransition('in_progress', true)).toEqual({ ok: true, status: 'cancelled' });
    expect(cancelTransition('completed', true).ok).toBe(false);
  });

  it('records cash only for the locked fare', () => {
    expect(cashCompletion({ agreedFareKobo: fare, method: 'cash', amountKobo: fare })).toEqual({
      ok: true,
      method: 'cash',
      amountKobo: fare,
      status: 'confirmed',
    });
    expect(
      cashCompletion({ agreedFareKobo: fare, method: 'cash', amountKobo: fare + 5000 }),
    ).toEqual({
      ok: false,
      message: 'The cash amount must match the locked fare.',
    });
    expect(cashCompletion({ agreedFareKobo: fare, method: 'card', amountKobo: fare }).ok).toBe(
      false,
    );
  });
});

describe('location access and the map', () => {
  const passenger = 'ada';
  const rider = 'chinedu';
  const other = 'emeka';

  it('shows the PIN to the passenger only', () => {
    expect(canReadBoardingPin({ actorId: passenger, passengerId: passenger, riderId: rider })).toBe(
      true,
    );
    expect(canReadBoardingPin({ actorId: rider, passengerId: passenger, riderId: rider })).toBe(
      false,
    );
    expect(canReadBoardingPin({ actorId: other, passengerId: passenger, riderId: rider })).toBe(
      false,
    );
    expect(canReadTripData({ actorId: rider, passengerId: passenger, riderId: rider })).toBe(true);
    expect(canReadTripData({ actorId: other, passengerId: passenger, riderId: rider })).toBe(false);
  });

  it('lets the assigned rider update a live trip and labels a test fix', () => {
    expect(
      locationWriteAllowed({ actorIsAssignedRider: false, status: 'assigned', source: 'device' }),
    ).toMatchObject({ ok: false });
    expect(
      locationWriteAllowed({ actorIsAssignedRider: true, status: 'completed', source: 'device' }),
    ).toMatchObject({ ok: false, message: 'This trip is no longer live.' });
    expect(
      locationWriteAllowed({ actorIsAssignedRider: true, status: 'in_progress', source: 'guess' }),
    ).toMatchObject({ ok: false });
    expect(
      locationWriteAllowed({
        actorIsAssignedRider: true,
        status: 'in_progress',
        source: 'simulated',
      }),
    ).toEqual({ ok: true, source: 'simulated' });
  });

  it('does not present a missing Google Maps key as a live street map', () => {
    expect(
      mapCaption({ mapsConfigured: false, streetMapVisible: false, locationSource: null }),
    ).toContain('Google Maps is not configured');
    expect(
      mapCaption({ mapsConfigured: true, streetMapVisible: false, locationSource: 'simulated' }),
    ).toContain('not the rider’s phone GPS');
    expect(
      mapCaption({ mapsConfigured: true, streetMapVisible: true, locationSource: 'device' }),
    ).toBe('Live map');
    expect(
      mapCaption({ mapsConfigured: true, streetMapVisible: false, locationSource: 'device' }),
    ).toContain('Turn-by-turn opens in Google Maps');
    expect(locationAgeLabel(null, Date.now(), null)).toContain('Waiting');
    expect(googleEmbedUrl('  ', { lat: 6.6, lng: 3.3 })).toBeNull();
    const url = googleEmbedUrl('test-key', { lat: 6.614, lng: 3.342 });
    expect(url).toContain('key=test-key');
    expect(url).toContain('6.614');
    expect(googleDirectionsUrl({ lat: 6.62, lng: 3.35 })).not.toContain('test-key');
    const pins = projectPins([
      { id: 'pickup', lat: 6.61, lng: 3.34 },
      { id: 'rider', lat: 6.62, lng: 3.35 },
    ]);
    expect(pins.pickup?.top).toBeGreaterThan(pins.rider?.top ?? 0);
    expect(pins.rider?.left).toBeGreaterThan(pins.pickup?.left ?? 0);
  });
});
