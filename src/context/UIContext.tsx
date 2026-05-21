import React, { createContext, useContext, useState, useCallback } from 'react';

type ActiveComponent = 'assistant' | 'filter' | 'timer' | null;
type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  show: boolean;
  message: string;
  type: ToastType;
}

interface UIContextType {
  activeComponent: ActiveComponent;
  setActiveComponent: (component: ActiveComponent) => void;
  closeAll: () => void;
  toggleComponent: (component: ActiveComponent) => void;
  toast: ToastData;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [activeComponent, setActiveComponentState] = useState<ActiveComponent>(null);
  const [toast, setToast] = useState<ToastData>({
    show: false,
    message: '',
    type: 'success'
  });

  const setActiveComponent = useCallback((component: ActiveComponent) => {
    setActiveComponentState(component);
  }, []);

  const closeAll = useCallback(() => {
    setActiveComponentState(null);
  }, []);

  const toggleComponent = useCallback((component: ActiveComponent) => {
    setActiveComponentState(current => current === component ? null : component);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ show: false, message: '', type: 'success' });
    setTimeout(() => {
      setToast({ show: true, message, type });
    }, 50);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  return (
    <UIContext.Provider value={{ 
      activeComponent, 
      setActiveComponent, 
      closeAll, 
      toggleComponent,
      toast,
      showToast,
      hideToast
    }}>
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
