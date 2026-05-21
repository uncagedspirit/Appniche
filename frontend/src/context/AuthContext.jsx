import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

const LOCAL_USER = { uid: 'local' };

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: LOCAL_USER, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
