import { useState, useCallback, useEffect, useRef } from 'react';

// 하이브리드 방식 실시간 사용자 세션 관리 (트래픽 최적화)
export const useUserSession = () => {
  const [sessionId] = useState(() => {
    // 기존 localStorage에서 사용자 ID 확인
    const storedSessionId = localStorage.getItem('crazyshot_session_id');
    
    if (storedSessionId) {
      return storedSessionId;
    }
    
    // 새로운 세션 ID 생성 및 저장
    const newSessionId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('crazyshot_session_id', newSessionId);
    return newSessionId;
  });

  const [activeUsers, setActiveUsers] = useState<{ 
    count: number; 
    lastUpdate: Date; 
    users: string[]; 
  }>(() => {
    const initial = { 
      count: 1,
      lastUpdate: new Date(),
      users: [sessionId]
    };
    return initial;
  });

  const [recentActions, setRecentActions] = useState<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // API 기반 세션 관리 및 동시 사용자 감지 (트래픽 최적화)
  useEffect(() => {
    // 세션 등록 및 하트비트 API 호출
    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            action: 'heartbeat',
            timestamp: Date.now()
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // 서버에서 받은 활성 세션 정보로 업데이트
          setActiveUsers({
            count: data.totalCount || 1,
            lastUpdate: new Date(),
            users: data.activeSessions?.map((s: any) => s.id) || [sessionId]
          });
        }
      } catch (error) {
        // 네트워크 오류 시 로컬 상태 유지
        setActiveUsers(prev => ({
          ...prev,
          count: 1,
          users: [sessionId]
        }));
      }
    };

    // 즉시 하트비트 전송
    sendHeartbeat();

    // 주기적 하트비트 전송 (30초마다 - 트래픽 최적화)
    pollingIntervalRef.current = setInterval(sendHeartbeat, 30000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [sessionId]);

  // 사용자 활동 알림 (로컬만 처리 - 트래픽 최적화)
  const notifyUserAction = useCallback((action: string, userId?: string) => {
    const actionMessage = `${userId || sessionId}: ${action}`;
    setRecentActions(prev => [actionMessage, ...prev.slice(0, 4)]); // 최근 5개만 유지
  }, [sessionId]);

  // hasMultipleUsers 상태 계산 (API 기반)
  const hasMultipleUsers = activeUsers.count > 1;
  const isMultipleUsersRef = useRef(hasMultipleUsers);
  
  // 다중 사용자 상태 변화 감지 (트래픽 최적화)
  useEffect(() => {
    if (isMultipleUsersRef.current !== hasMultipleUsers) {
      isMultipleUsersRef.current = hasMultipleUsers;
    }
  }, [hasMultipleUsers, activeUsers.count, activeUsers.users]);

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
  lastBackupData: any | null; // 마지막 백업 데이터 추적
}

// 디바운스 유틸리티 함수 추가
const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<F>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const useRealtimeBackup = <T>(options: RealtimeBackupOptions) => {
  const {
    dataType,
    userId = 'anonymous',
    maxRetries = 2, // 재시도 횟수 감소
    retryDelay = 1000 // 대기 시간 단축
  } = options;

  const [backupState, setBackupState] = useState<BackupState>({
    isOnline: navigator.onLine,
    lastBackupTime: null,
    backupError: null,
    pendingBackups: [],
    lastBackupData: null // 마지막 백업 데이터 추적
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 실제 백업 수행 함수
  const performBackup = useCallback(async (
    data: T, 
    options: { 
      backupType?: 'AUTO' | 'MANUAL', 
      backupSource?: string 
    } = {}, 
    retryCount = 0
  ): Promise<void> => {
    const { 
      backupType = 'AUTO', 
      backupSource = '자동 백업' 
    } = options;

    try {
      const apiEndpoint = dataType === 'project' ? '/api/project' : '/api/backup';
      
      const payload = dataType === 'project' 
        ? { 
            projectData: data, 
            userId: dataType === 'project' ? 'shared_project' : userId, // 공통 프로젝트 백업 
            backupType, 
            backupSource 
          }
        : { 
            ...data as any, 
            userId, // 장비 데이터는 개별 사용자 유지
            backupType, 
            backupSource 
          };

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

      console.log(`✅ 실시간 백업 성공 (${dataType}, 유형: ${backupType}):`, result);
      
    } catch (error) {
      console.error(`❌ 백업 실패 (${dataType}):`, error);
      
      // 413 에러는 재시도하지 않음 (페이로드 크기 문제)
      const is413Error = error instanceof Error && error.message.includes('413');
      
      if (!is413Error && retryCount < maxRetries && backupState.isOnline) {
        retryTimeoutRef.current = setTimeout(() => {
          performBackup(data, options, retryCount + 1);
        }, retryDelay * (retryCount + 1));
        return;
      }
      
      if (is413Error) {
        console.warn('⚠️ 413 에러 감지 - 재시도 중단, 데이터 정리 권장');
      }
      
      throw error;
    }
  }, [dataType, userId, maxRetries, retryDelay, backupState.isOnline]);

  // 조건부 백업 로직
  const shouldPerformBackup = useCallback((newData: T) => {
    const { lastBackupData } = backupState;
    
    // 데이터 실질적 변경 여부 확인 (JSON 문자열 비교)
    return !lastBackupData || 
           JSON.stringify(newData) !== JSON.stringify(lastBackupData);
  }, [backupState.lastBackupData]);

  // 디바운스 백업 함수
  const debouncedBackup = useCallback(
    debounce(async (data: T, options: { 
      backupType?: 'AUTO' | 'MANUAL', 
      backupSource?: string 
    } = {}) => {
      // 실질적 변경 데이터만 백업
      if (shouldPerformBackup(data)) {
        // 페이로드 크기 검증 추가
        const dataSize = JSON.stringify(data).length;
        if (dataSize >= 1000000) { // 1MB 이상 시 백업 생략
          console.warn('⚠️ [debouncedBackup] 페이로드 크기 초과 - 디바운스 백업 생략:', dataSize);
          return;
        }
        
        try {
          await performBackup(data, options);
          
          // 마지막 백업 데이터 업데이트
          setBackupState(prev => ({
            ...prev,
            lastBackupTime: new Date(),
            lastBackupData: data,
            backupError: null,
            pendingBackups: []
          }));
        } catch (error) {
          console.warn('🚨 디바운스 백업 실패:', error);
        }
      }
    }, 2000), // 2초 디바운스
    [performBackup, shouldPerformBackup]
  );

  // 클라우드 저장 함수 (단순화)
  const saveToCloud = useCallback(async (data: T, options: { 
    backupType?: 'AUTO' | 'MANUAL', 
    backupSource?: string
  } = {}) => {
    const { 
      backupType = 'AUTO', 
      backupSource = '자동 백업'
    } = options;

    // 페이로드 크기 사전 검증
    const dataSize = JSON.stringify(data).length;
    if (dataSize >= 1000000) { // 1MB 이상 시 백업 생략
      console.warn('⚠️ [saveToCloud] 페이로드 크기 초과 - 클라우드 백업 생략:', dataSize);
      return;
    }

    // 온라인 상태에서만 백업 실행
    if (backupState.isOnline) {
      debouncedBackup(data, { backupType, backupSource });
    } else {
      // 오프라인 시 대기열에 추가
      setBackupState(prev => ({
        ...prev,
        pendingBackups: [...prev.pendingBackups.slice(-4), { 
          data, 
          backupType, 
          backupSource 
        }]
      }));
    }
  }, [backupState.isOnline, debouncedBackup]);

  // 복원 및 기타 함수들 (기존 코드 유지)
  const restoreFromCloud = useCallback(async (ignoreCacheOption = false): Promise<T | null> => {
    try {
      if (!backupState.isOnline) {
        console.warn('오프라인 상태에서는 클라우드 복원을 사용할 수 없습니다.');
        return null;
      }

      // 캐시 무시 쿼리 파라미터 추가 (도메인 첫 진입 시 또는 요청 시)
      const cacheParam = ignoreCacheOption ? `&nocache=${Date.now()}` : '';
      const apiEndpoint = dataType === 'project' 
        ? `/api/project?userId=${dataType === 'project' ? 'shared_project' : userId}${cacheParam}`
        : `/api/backup${cacheParam ? `?nocache=${Date.now()}` : ''}`;

      console.log(`🔄 [restoreFromCloud] 클라우드 복원 시도 (캐시무시: ${ignoreCacheOption})`);

      const response = await fetch(apiEndpoint, {
        // 캐시 무시 헤더 추가 (최소한의 설정)
        ...(ignoreCacheOption && {
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      });
      
      if (!response.ok) {
        // 404는 데이터 없음을 의미하므로 null 반환 (에러 없이)
        if (response.status === 404) {
          console.log(`📭 [useRealtimeBackup] 저장된 ${dataType} 데이터 없음 (404)`);
          return null;
        }
        throw new Error(`복원 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        // success: false이지만 isEmpty: true인 경우는 정상 (데이터 없음)
        if (result.isEmpty) {
          console.log(`📭 [useRealtimeBackup] ${dataType} 데이터 없음 (빈 상태)`);
          return null;
        }
        
        // "저장된 프로젝트 데이터가 없습니다" 오류는 에러가 아닌 정상 상태로 처리
        if (result.error && result.error.includes('저장된 프로젝트 데이터가 없습니다')) {
          console.log(`📭 [useRealtimeBackup] ${dataType} 초기 상태 - 데이터 없음`);
          
          // 데이터 보호 플래그 확인
          if (result.protectedData) {
            console.log(`🔒 [useRealtimeBackup] 데이터 보호 모드 - 기존 사용자 데이터 보호`);
          }
          
          return null;
        }
        
        throw new Error(result.error || '복원 처리 실패');
      }

      const restoredData = result.projectData || result.data;
      
      if (restoredData) {
        console.log(`✅ [useRealtimeBackup] ${dataType} 클라우드 복원 성공`);
        return restoredData;
      } else {
        console.log(`📭 [useRealtimeBackup] ${dataType} 데이터 없음`);
        return null;
      }
      
    } catch (error) {
      // 네트워크 오류나 실제 서버 오류만 로그에 표시
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      // "저장된 프로젝트 데이터가 없습니다" 오류는 조용히 처리
      if (errorMessage.includes('저장된 프로젝트 데이터가 없습니다')) {
        console.log(`📭 [useRealtimeBackup] ${dataType} 초기 상태 - 데이터 없음`);
        return null;
      }
      
      // 실제 오류만 콘솔에 출력
      if (!errorMessage.includes('데이터가 없습니다') && !errorMessage.includes('404')) {
      console.error(`❌ 클라우드 복원 실패 (${dataType}):`, error);
      }
      
      // 데이터 없음 상황은 오류가 아닌 null 반환
      if (errorMessage.includes('데이터가 없습니다') || errorMessage.includes('404')) {
        return null;
      }
      
      throw error;
    }
  }, [dataType, userId, backupState.isOnline]);

  // 자동 백업 설정 (트래픽 최적화)
  const startAutoBackup = useCallback((getData: () => T) => {
    console.log('🔄 [useRealtimeBackup] 자동 백업 설정');
    
    const intervalId = setInterval(() => {
      if (backupState.isOnline) {
        try {
          const data = getData();
          if (data) {
            saveToCloud(data, { backupType: 'AUTO' });
            console.log('✅ [useRealtimeBackup] 자동 백업 완료');
          }
        } catch (error) {
          console.error('❌ [useRealtimeBackup] 자동 백업 실패:', error);
        }
      }
    }, 600000); // 10분마다 실행
    
    return () => {
      clearInterval(intervalId);
      console.log('🛑 [useRealtimeBackup] 자동 백업 정리');
    };
  }, [saveToCloud, backupState.isOnline]);

  return {
    saveToCloud,
    restoreFromCloud,
    startAutoBackup,
    backupState,
    isOnline: backupState.isOnline,
    hasPendingBackups: backupState.pendingBackups.length > 0
  };
};