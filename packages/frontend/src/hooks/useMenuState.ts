/**
 * Custom hook for managing sidebar menu state
 * Extracted from Layout.tsx for better maintainability
 */

import { useState, useCallback } from 'react';
import { MenuKey, MENU_KEYS, getInitialMenuState } from '../config/navigation';

export interface UseMenuStateReturn {
  menuState: Record<MenuKey, boolean>;
  toggleMenu: (path: string) => void;
  isMenuOpen: (path: string) => boolean;
  closeAllMenus: () => void;
}

export const useMenuState = (): UseMenuStateReturn => {
  const [menuState, setMenuState] = useState<Record<MenuKey, boolean>>(getInitialMenuState());

  const toggleMenu = useCallback((path: string) => {
    if (MENU_KEYS.includes(path as MenuKey)) {
      setMenuState(prev => ({
        ...prev,
        [path]: !prev[path as MenuKey],
      }));
    }
  }, []);

  const isMenuOpen = useCallback((path: string): boolean => {
    return menuState[path as MenuKey] ?? false;
  }, [menuState]);

  const closeAllMenus = useCallback(() => {
    setMenuState(getInitialMenuState());
  }, []);

  return {
    menuState,
    toggleMenu,
    isMenuOpen,
    closeAllMenus,
  };
};

export default useMenuState;
