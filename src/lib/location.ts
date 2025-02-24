import locations from '../data/locations.json';

export interface Country {
  name: string;
  code: string;
  cities: string[];
}

export function getCountries(): Country[] {
  return locations.countries;
}

export function getCitiesByCountry(countryName: string): string[] {
  const country = locations.countries.find(c => c.name === countryName);
  return country?.cities || [];
}