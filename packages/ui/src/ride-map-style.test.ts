import { describe, expect, it } from 'vitest';

import { framePoints, rideFrame, rideMapColors, rideMapStyle } from './ride-map-style';

describe('ride map style', () => {
  const style = rideMapStyle();

  it('uses OpenFreeMap vector tiles and no key', () => {
    expect(style.sources.openmaptiles?.url).toBe('https://tiles.openfreemap.org/planet');
    expect(JSON.stringify(style)).not.toMatch(/api[_-]?key|mapbox|googleapis/i);
  });

  it('tints land, roads, buildings, labels, and water', () => {
    const paint = (id: string) => style.layers.find((layer) => layer.id === id)?.paint;
    expect(paint('land')?.['background-color']).toBe(rideMapColors.land);
    expect(paint('water')?.['fill-color']).toBe(rideMapColors.water);
    expect(paint('building')?.['fill-color']).toBe(rideMapColors.white);
    expect(paint('building')?.['fill-outline-color']).toBe(rideMapColors.buildingEdge);
    expect(paint('highway-major')?.['line-color']).toBe(rideMapColors.road);
    expect(paint('highway-major-casing')?.['line-color']).toBe(rideMapColors.white);
    expect(paint('label-suburb')?.['text-color']).toBe(rideMapColors.label);
    expect(style.layers.some((layer) => layer.type === 'fill-extrusion')).toBe(false);
    expect(
      style.layers.filter((layer) => layer.type === 'symbol').map((layer) => layer.id),
    ).toEqual(['label-city', 'label-town', 'label-suburb', 'road-name']);
  });

  it('keeps a far user fix from moving the camera off the ride', () => {
    const festac = { lat: 6.465153, lng: 3.279827 };
    const alaba = { lat: 6.460523, lng: 3.1906 };
    expect(framePoints([festac], { lat: 51.5, lng: -0.12 })).toEqual([festac]);
    expect(framePoints([festac], { lat: 6.466, lng: 3.281 })).toHaveLength(2);
    const frame = rideFrame([festac, alaba]);
    expect(frame?.bounds?.[0]).toBeCloseTo(alaba.lng);
    expect(frame?.bounds?.[2]).toBeCloseTo(festac.lng);
    expect(frame?.zoom).toBeGreaterThan(11);
    expect(frame?.zoom).toBeLessThan(15);
    expect(rideFrame([])).toBeNull();
  });
});
