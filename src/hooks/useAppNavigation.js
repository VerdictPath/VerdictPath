import { useState, useCallback } from 'react';

export const useAppNavigation = (initialScreen = 'landing') => {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [navigationHistory, setNavigationHistory] = useState([initialScreen]);
  const [navigationData, setNavigationData] = useState({});

  const navigateTo = useCallback((screen, data = {}) => {
    setNavigationHistory(prev => [...prev, screen]);
    setNavigationData(data);
    setCurrentScreen(screen);
  }, []);

  const goBack = useCallback((defaultScreen = 'landing') => {
    setNavigationHistory(prev => {
      if (prev.length <= 1) {
        setCurrentScreen(defaultScreen);
        return [defaultScreen];
      }
      const newHistory = prev.slice(0, -1);
      setCurrentScreen(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  }, []);

  const resetNavigation = useCallback((screen = 'landing') => {
    setNavigationHistory([screen]);
    setNavigationData({});
    setCurrentScreen(screen);
  }, []);

  return {
    currentScreen,
    setCurrentScreen,
    navigationHistory,
    navigationData,
    navigateTo,
    goBack,
    resetNavigation
  };
};

export default useAppNavigation;
