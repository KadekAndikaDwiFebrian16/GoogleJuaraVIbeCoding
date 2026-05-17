import React, { createContext, useContext, useState, useCallback } from 'react';

type ActiveComponent = 'assistant' | 'filter' | 'timer' | null;

interface UIContextType {
  activeComponent: ActiveComponent;
  setActiveComponent: (component: ActiveComponent) => void;
  closeAll: () => void;
  toggleComponent: (component: ActiveComponent) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [activeComponent, setActiveComponentState] = useState<ActiveComponent>(null);

  const setActiveComponent = useCallback((component: ActiveComponent) => {
    setActiveComponentState(component);
  }, []);

  const closeAll = useCallback(() => {
    setActiveComponentState(null);
  }, []);

  const toggleComponent = useCallback((component: ActiveComponent) => {
    setActiveComponentState(current => current === component ? null : component);
  }, []);

  return (
    <UIContext.Provider value={{ activeComponent, setActiveComponent, closeAll, toggleComponent }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
