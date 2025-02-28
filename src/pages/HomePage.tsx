import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPinOff } from 'lucide-react';
import { Header } from '../components/Header';
import { CountrySelector } from '../components/CountrySelector';
import { CitySelector } from '../components/CitySelector';
import { CircularMenu } from '../components/CircularMenu';
import { HallButtons } from '../components/HallButtons';
import { getCountries, getCitiesByCountry, Country } from '../lib/location';

interface LocationState {
  countries: Country[];
  cities: string[];
  selectedCountry: string;
  selectedCity: string;
}

export function HomePage() {
  const [state, setState] = useState<LocationState>({
    countries: getCountries(),
    cities: getCountries()[0].cities,
    selectedCountry: getCountries()[0].name,
    selectedCity: getCountries()[0].cities[0]
  });

  useEffect(() => {
    if (state.selectedCountry) {
      const cities = getCitiesByCountry(state.selectedCountry);
      setState(prev => ({ ...prev, cities, selectedCity: cities[0] }));
    }
  }, [state.selectedCountry]);

  function handleCountrySelect(country: string) {
    setState(prev => ({ ...prev, selectedCountry: country }));
  }

  function handleCitySelect(city: string) {
    setState(prev => ({ ...prev, selectedCity: city }));
  }

  function handleResetLocation() {
    setState(prev => ({
      ...prev,
      selectedCountry: getCountries()[0].name,
      selectedCity: getCountries()[0].cities[0]
    }));
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center p-3 sm:p-6 lg:p-8 mt-24 sm:mt-20 mb-32 sm:mb-28 lg:mb-32">
        <div className="flex flex-col gap-2 mb-4 lg:mb-0 max-w-md lg:max-w-xl mx-auto lg:mx-0 lg:ml-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.6, -0.05, 0.01, 0.99]
            }}
          >
            <div className="glossy p-4 sm:p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sky-900 font-semibold">Ubicación</h2>
                <motion.button
                  onClick={handleResetLocation}
                  className="ml-auto glass-button flex items-center gap-2 px-3 py-1.5 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MapPinOff className="w-3.5 h-3.5 text-violet-500" strokeWidth={2.5} />
                  <span className="text-violet-600 font-medium">Reestablecer</span>
                </motion.button>
              </div>
              <div className="space-y-4">
                <CountrySelector
                  items={state.countries.map(c => c.name)}
                  selected={state.selectedCountry}
                  onSelect={handleCountrySelect}
                />
                <CitySelector
                  items={state.cities}
                  selected={state.selectedCity}
                  onSelect={handleCitySelect}
                />
              </div>
            </div>
          </motion.div>
        </div>
        
        <motion.div
          className="mt-4 lg:mt-0 max-w-md lg:max-w-xl mx-auto lg:mx-0 lg:mr-auto w-full lg:ml-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.2,
            ease: [0.6, -0.05, 0.01, 0.99]
          }}
        >
          <HallButtons />
        </motion.div>
      </div>
      <CircularMenu />
    </>
  );
} 