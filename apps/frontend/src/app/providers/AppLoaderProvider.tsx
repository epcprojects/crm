'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

type AppLoaderContextValue = {
  isLoading: boolean;
  setLoading: (value: boolean) => void;
};

const AppLoaderContext = createContext<AppLoaderContextValue | undefined>(
  undefined,
);

export function useAppLoader() {
  const context = useContext(AppLoaderContext);
  if (!context) {
    throw new Error('useAppLoader must be used within AppLoaderProvider');
  }
  return context;
}

export default function AppLoaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const value = useMemo(
    () => ({
      isLoading,
      setLoading: setIsLoading,
    }),
    [isLoading],
  );

  return (
    <AppLoaderContext.Provider value={value}>
      {children}
      {isLoading ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 backdrop-blur-xs">
          <span className="h-5 w-5 md:w-24 md:h-24 animate-spin rounded-full md:border-8 border-2 border-gray-300 border-t-primary" />
        </div>
      ) : null}
    </AppLoaderContext.Provider>
  );
}
