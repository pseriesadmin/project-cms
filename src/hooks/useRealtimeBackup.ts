import { useState, useCallback, useEffect, useRef } from 'react';

// 단순한 실시간 사용자 세션 관리
export const useUserSession = () => {
  const [sessionId] = useState(() => {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 [useUserSession] 세션 ID 생성:`, id);
    return id;
  });
  const [activeUsers, setActiveUsers] = useState<{ count: number; lastUpdate: Date }>(() => {
    const initial = { count: 1, lastUpdate: new Date() };
    console.log(`👥 [useUserSession] 활성 사용자 초기값:`, initial);
    return initial;
  });
  const [recentActions, setRecentActions] = useState<string[]>([]);
  
  // 사용자 활동 알림
  const notifyUserAction = useCallback((action: string, userId?: string) => {
    const actionMessage = `${userId || sessionId}: ${action}`;
    setRecentActions(prev => [actionMessage, ...prev.slice(0, 4)]); // 최근 5개만 유지
    
    // 다른 사용자에게 알림 전송 (단순 버전)
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action,
          timestamp: new Date().toISOString()
        })
      }).catch(() => console.log('사용자 활동 알림 실패'));
    } catch (error) {
      // 네트워크 오류 무시
    }
  }, [sessionId]);

  // 활성 사용자 수 확인
  const checkActiveUsers = useCallback(async () => {
    const timestamp = new Date().toISOString();
    const isProduction = window.location.hostname !== 'localhost';
    
    console.log(`🔄 [${timestamp}] 사용자 확인 시작`, {
      URL: `${window.location.origin}/api/users`,
      환경: isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
      호스트: window.location.hostname,
      프로토콜: window.location.protocol,
      사용자에이전트: navigator.userAgent.substring(0, 100) + '...'
    });
    
    try {
      const requestStart = performance.now();
      const response = await fetch('/api/users');
      const requestTime = Math.round(performance.now() - requestStart);
      
      console.log(`📡 [${timestamp}] /api/users 응답:`, {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${requestTime}ms`,
        url: response.url,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      if (!response.ok) {
        console.log(`⚠️ [${timestamp}] API 응답 실패 - Status: ${response.status}`);
        // API 실패 시 기본값 1명 유지
        setActiveUsers({
          count: 1,
          lastUpdate: new Date()
        });
        console.log(`🔌 [${timestamp}] API 실패로 기본값 1명 설정`);
        return;
      }
      
      const responseText = await response.text();
      console.log(`📄 [${timestamp}] 원본 응답 텍스트:`, responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      
      try {
        const result = JSON.parse(responseText);
        console.log(`📊 [${timestamp}] 파싱된 사용자 데이터:`, result);
        
        if (result.success) {
          const userCount = result.activeUserCount || 1;
          setActiveUsers({
            count: userCount,
            lastUpdate: new Date()
          });
          console.log(`✅ [${timestamp}] 활성 사용자 수 업데이트: ${userCount}명`);
        } else {
          console.log(`❌ [${timestamp}] API 응답에서 success=false`);
        }
      } catch (parseError) {
        console.error(`🚨 [${timestamp}] JSON 파싱 오류:`, parseError);
        console.log(`🔧 [${timestamp}] 파싱 실패한 응답:`, responseText);
        throw parseError;
      }
    } catch (error) {
      console.error(`❌ [${timestamp}] 사용자 확인 중 네트워크 오류:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // 네트워크 오류 시 기본값 1명 유지
      setActiveUsers({
        count: 1,
        lastUpdate: new Date()
      });
      console.log(`🔌 [${timestamp}] 네트워크 오류로 기본값 1명 설정`);
    }
  }, []);

  // 주기적 사용자 상태 확인
  useEffect(() => {
    console.log(`⏰ [useUserSession] useEffect 실행 - 사용자 상태 확인 타이머 설정`);
    console.log(`🔗 [useUserSession] checkActiveUsers 함수 의존성:`, typeof checkActiveUsers);
    
    const interval = setInterval(() => {
      console.log(`⏱️ [useUserSession] 정기 사용자 확인 실행 (10초 간격)`);
      checkActiveUsers();
    }, 10000); // 10초마다 확인
    
    console.log(`🚀 [useUserSession] 초기 사용자 확인 실행`);
    checkActiveUsers(); // 초기 확인
    
    return () => {
      console.log(`🛑 [useUserSession] useEffect 정리 - 타이머 해제`);
      clearInterval(interval);
    };
  }, [checkActiveUsers]);

  // hasMultipleUsers 상태 계산 및 로깅
  const hasMultipleUsers = activeUsers.count > 1;
  const isMultipleUsersRef = useRef(hasMultipleUsers);
  
  // 다중 사용자 상태 변화 감지
  useEffect(() => {
    if (isMultipleUsersRef.current !== hasMultipleUsers) {
      console.log(`🔄 [useUserSession] 다중 사용자 상태 변화:`, {
        이전: isMultipleUsersRef.current,
        현재: hasMultipleUsers,
        사용자수: activeUsers.count,
        시간: new Date().toISOString()
      });
      isMultipleUsersRef.current = hasMultipleUsers;
    }
  }, [hasMultipleUsers, activeUsers.count]);

  return {
    sessionId,
    activeUsers,
    recentActions,
    notifyUserAction,
    hasMultipleUsers
  };
};

interface RealtimeBackupOptions {
  dataType: 'project' | 'equipment';
  userId?: string;
  autoSaveInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface BackupState {
  isOnline: boolean;
  lastBackupTime: Date | null;
  backupError: string | null;
  pendingBackups: any[];
}

export const useRealtimeBackup = <T>(options: RealtimeBackupOptions) => {
  const {
    dataType,
    userId = 'anonymous',
    autoSaveInterval = 15000, // 15초마다 자동 백업 (성능 개선)
    maxRetries = 3,
    retryDelay = 2000
  } = options;

  const [backupState, setBackupState] = useState<BackupState>({
    isOnline: navigator.onLine,
    lastBackupTime: null,
    backupError: null,
    pendingBackups: []
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 네트워크 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setBackupState(prev => ({ ...prev, isOnline: true, backupError: null }));
      // 온라인 복구 시 대기 중인 백업 실행
      processPendingBackups();
    };

    const handleOffline = () => {
      setBackupState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  // 대기 중인 백업 처리
  const processPendingBackups = useCallback(async () => {
    if (!backupState.isOnline || backupState.pendingBackups.length === 0) return;

    const { pendingBackups } = backupState;
    const latestBackup = pendingBackups[pendingBackups.length - 1]; // 최신 백업만 처리

    try {
      await performBackup(latestBackup);
      setBackupState(prev => ({ 
        ...prev, 
        pendingBackups: [],
        lastBackupTime: new Date(),
        backupError: null
      }));
    } catch (error) {
      console.error('대기 백업 처리 실패:', error);
    }
  }, [backupState.isOnline, backupState.pendingBackups]);

  // 실제 백업 수행
  const performBackup = useCallback(async (data: T, retryCount = 0): Promise<void> => {
    const apiEndpoint = dataType === 'project' ? '/api/project' : '/api/backup';
    
    try {
      const payload = dataType === 'project' 
        ? { projectData: data, userId }
        : { ...data as any, userId };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`백업 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '백업 처리 실패');
      }

      console.log(`✅ 실시간 백업 성공 (${dataType}):`, result);
      
    } catch (error) {
      console.error(`❌ 백업 실패 (${dataType}):`, error);
      
      // 재시도 로직
      if (retryCount < maxRetries && backupState.isOnline) {
        retryTimeoutRef.current = setTimeout(() => {
          performBackup(data, retryCount + 1);
        }, retryDelay * (retryCount + 1)); // 지수 백오프
        return;
      }
      
      throw error;
    }
  }, [dataType, userId, maxRetries, retryDelay, backupState.isOnline]);

  // 백업 실행 (네트워크 상태에 따른 처리)
  const saveToCloud = useCallback(async (data: T) => {
    try {
      if (!backupState.isOnline) {
        // 오프라인 시 대기 큐에 추가
        setBackupState(prev => ({
          ...prev,
          pendingBackups: [...prev.pendingBackups.slice(-4), data] // 최대 5개 유지
        }));
        console.log('📴 오프라인 상태 - 백업을 대기열에 추가');
        return;
      }

      await performBackup(data);
      
      setBackupState(prev => ({
        ...prev,
        lastBackupTime: new Date(),
        backupError: null
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      setBackupState(prev => ({
        ...prev,
        backupError: errorMessage,
        pendingBackups: [...prev.pendingBackups.slice(-4), data] // 실패 시에도 대기열에 추가
      }));
      
      // 사용자에게 알림 (선택적)
      console.warn('⚠️ 실시간 백업 실패, 로컬 저장으로 대체:', errorMessage);
    }
  }, [backupState.isOnline, performBackup]);

  // 복원 실행
  const restoreFromCloud = useCallback(async (): Promise<T | null> => {
    try {
      if (!backupState.isOnline) {
        throw new Error('네트워크 연결이 필요합니다.');
      }

      const apiEndpoint = dataType === 'project' 
        ? `/api/project?userId=${userId}`
        : `/api/backup`;

      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`복원 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '복원 처리 실패');
      }

      console.log(`✅ 클라우드 복원 성공 (${dataType})`);
      
      return dataType === 'project' ? result.projectData : result.data;
      
    } catch (error) {
      console.error(`❌ 클라우드 복원 실패 (${dataType}):`, error);
      throw error;
    }
  }, [dataType, userId, backupState.isOnline]);

  // 자동 백업 설정
  const startAutoBackup = useCallback((getData: () => T) => {
    const performAutoBackup = () => {
      const currentData = getData();
      if (currentData) {
        saveToCloud(currentData);
      }
      
      autoSaveTimeoutRef.current = setTimeout(performAutoBackup, autoSaveInterval);
    };

    autoSaveTimeoutRef.current = setTimeout(performAutoBackup, autoSaveInterval);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSaveInterval, saveToCloud]);

  return {
    saveToCloud,
    restoreFromCloud,
    startAutoBackup,
    backupState,
    isOnline: backupState.isOnline,
    hasPendingBackups: backupState.pendingBackups.length > 0
  };
};
