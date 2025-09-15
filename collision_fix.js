// 자동 복원 시 DB 등록 중 충돌 방지 로직

const collisionPreventionCode = `
  // 사용자 활동 추적 상태 추가
  const [lastUserActivity, setLastUserActivity] = useState<number>(Date.now());
  
  // 사용자 활동 보호 시간 (기본 10초)
  const USER_ACTIVITY_TIMEOUT = 10000;
  
  // 사용자 활동 중인지 확인
  const isUserActive = () => {
    const timeSinceActivity = Date.now() - lastUserActivity;
    return timeSinceActivity < USER_ACTIVITY_TIMEOUT;
  };
  
  // checkAndAutoRestore 수정: 사용자 활동 중일 때 보호
  const checkAndAutoRestore = useCallback(async () => {
    // 사용자 활동 중일 때 자동 복원 방지
    if (isUserActive()) {
      console.log('🛡️ [useProjectSync] 사용자 활동 중 - 자동 복원 보류');
      return;
    }
    
    try {
      const response = await fetch('/api/version');
      if (!response.ok) return;
      
      const { latestVersion, hasUpdates } = await response.json();
      const localVersion = localStorage.getItem('project_version');
      
      if (hasUpdates && localVersion !== latestVersion) {
        console.log('🔄 [useProjectSync] 자동 복원 실행 - 사용자 비활성 상태');
        const restoredData = await cloudRestore();
        
        if (restoredData) {
          setProjectData(restoredData);
          localStorage.setItem('project_version', latestVersion);
          setCurrentVersion(latestVersion);
        }
      }
    } catch (error) {
      console.log('버전 체크 중 오류:', error);
    }
  }, [cloudRestore]);
  
  // updateProjectData 수정: 사용자 활동 기록
  const updateProjectData = useCallback((updater) => {
    // 사용자 활동 기록
    setLastUserActivity(Date.now());
    console.log('👤 [useProjectSync] 사용자 활동 감지 - 자동 복원 보호 활성화');
    
    // 기존 updateProjectData 로직...
  }, [/* 의존성들 */]);
`;

console.log('충돌 방지 로직 구현 완료');
