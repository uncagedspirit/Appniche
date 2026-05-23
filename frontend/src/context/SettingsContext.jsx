import { createContext, useContext, useState } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [country, setCountryState] = useState(
    () => localStorage.getItem('appniche_country') || 'all'
  );

  const setCountry = (c) => {
    localStorage.setItem('appniche_country', c);
    setCountryState(c);
  };

  return (
    <SettingsContext.Provider value={{ country, setCountry }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
