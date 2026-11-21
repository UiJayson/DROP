import { MapCanvas } from './map';

/** Native and tests keep the drawn map. Web uses the light MapLibre city. */
export function CityMap({
  title,
  subtitle,
  kekes,
  destination,
}: {
  title?: string;
  subtitle?: string;
  kekes?: number;
  destination?: string;
}) {
  return <MapCanvas title={title} subtitle={subtitle} kekes={kekes} destination={destination} />;
}
