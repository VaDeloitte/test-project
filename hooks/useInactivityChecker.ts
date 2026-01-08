import { useState, useEffect, useCallback, useRef } from 'react';

const useInactivityChecker = (inactivityTime = 1200000, inActiveCallback: () => void) => {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isInactive, setIsInactive] = useState(false);
  const [popUpVisible, setPopUpVisible] = useState(false);
  const popUpTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setIsInactive(false);
    setPopUpVisible(false);

    // Clear the existing pop-up timer if any
    if (popUpTimerRef.current) {
      clearTimeout(popUpTimerRef.current);
      popUpTimerRef.current = null;
    }
  }, []);

  const startPopUpTimer = useCallback(() => {
    setPopUpVisible(true);
    popUpTimerRef.current = setTimeout(() => {
      if (popUpVisible) {
        inActiveCallback(); // Automatically logout after 1 minute if no action is taken
      }
    }, 60000); // 1 minute
  }, [popUpVisible, inActiveCallback]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!isInactive) {
        resetTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    const inactivityCheckInterval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime - lastActivity > inactivityTime) {
        setIsInactive(true);
        startPopUpTimer(); // Start the pop-up timer when user is inactive
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheckInterval);
      if (popUpTimerRef.current) {
        clearTimeout(popUpTimerRef.current);
      }
    };
  }, [inactivityTime, resetTimer, isInactive, startPopUpTimer, lastActivity]);

  return { resetTimer, isInactive, setIsInactive, popUpVisible };
};

export default useInactivityChecker;