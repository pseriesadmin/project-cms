import { useState, useCallback, useEffect, useRef } from 'react';

interface ActivityOptimizerOptions {
  inactivityThreshold?: number; // 비활성 상태 판단 임계값 (ms)
  activeCheckInterval?: number; // 활성 상태 확인 간격 (ms)
}

export const useActivityOptimizer = (options: ActivityOptimizerOptions = {}) => {
  const {
    inactivityThreshold = 5 * 60 * 1000, // 5분 비활성
    activeCheckInterval = 60000 // 1분마다 상태 확인
  } = options;

  const [isActive, setIsActive] = useState(true);
  const lastActivityRef = useRef(Date.now());

  // 사용자 활동 감지 및 활성 상태 갱신
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsActive(true);
  }, []);

  // 사용자 활동 이벤트 리스너 등록 및 비활성 상태 확인
  useEffect(() => {
    // 사용자 활동 이벤트들
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(event => 
      document.addEventListener(event, trackActivity, { passive: true })
    );
    
    // 페이지 포커스/블러 이벤트 추가 (탭 전환 감지)
    const handleFocus = () => trackActivity();
    const handleBlur = () => {
      // 페이지가 백그라운드로 이동 시 비활성 타이머 가속화
      lastActivityRef.current = Date.now() - (inactivityThreshold * 0.8);
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // 주기적 비활성 상태 확인
    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const shouldBeActive = timeSinceLastActivity < inactivityThreshold;
      
      if (shouldBeActive !== isActive) {
        setIsActive(shouldBeActive);
        console.log(`🔄 [useActivityOptimizer] 활성 상태 변경:`, {
          활성상태: shouldBeActive,
          마지막활동: new Date(lastActivityRef.current).toLocaleString(),
          비활성시간: Math.round(timeSinceLastActivity / 1000) + '초'
        });
      }
    }, activeCheckInterval);

    return () => {
      events.forEach(event => 
        document.removeEventListener(event, trackActivity)
      );
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(checkInactivity);
    };
  }, [trackActivity, inactivityThreshold, activeCheckInterval, isActive]);

  return { 
    isActive,
    trackActivity
  };
};
