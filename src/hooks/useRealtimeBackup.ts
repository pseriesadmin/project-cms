import { useState, useCallback, useEffect, useRef } from 'react';

// 단순한 실시간 사용자 세션 관리
export const useUserSession = () => {
  const [sessionId] = useState(() => {
    // 기존 localStorage에서 사용자 ID 확인
    const storedSessionId = localStorage.getItem('crazyshot_session_id');
    
    if (storedSessionId) {
      console.log(`🆔 [useUserSession] 기존 세션 ID 로드:`, storedSessionId);
      return storedSessionId;
    }
    
    // 새로운 세션 ID 생성 및 저장
    const newSessionId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('crazyshot_session_id', newSessionId);
    console.log(`🆔 [useUserSession] 새 세션 ID 생성 및 저장:`, newSessionId);
    return newSessionId;
  });

  const [activeUsers, setActiveUsers] = useState<{ 
    count: number; 
    lastUpdate: Date; 
    users: string[]; 
  }>(() => {
    // 브로드캐스트 채널을 통한 로컬 감지 초기화 (트래픽 최적화)
    const initial = { 
      count: 0, // 서버 상태와 일치하도록 0으로 시작
      lastUpdate: new Date(),
      users: [] // 빈 배열로 시작
    };
    console.log(`👥 [useUserSession] 활성 사용자 초기값 (최적화):`, initial);
    return initial;
  });

  const [recentActions, setRecentActions] = useState<string[]>([]);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const userHeartbeatsRef = useRef<Map<string, number>>(new Map());

  // 브로드캐스트 채널 초기화 및 동시 사용자 감지
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      console.log(`⚠️ [useUserSession] BroadcastChannel API 미지원`);
      return;
    }

    const channel = new BroadcastChannel('crazyshot_user_session');
    broadcastChannelRef.current = channel;

    // 다른 탭/창에서 온 메시지 수신 (트래픽 최적화)
    channel.onmessage = (event) => {
      const { type, sessionId: otherSessionId, timestamp } = event.data;
      console.log(`📢 [useUserSession] 브로드캐스트 메시지 수신:`, event.data);

      if (otherSessionId === sessionId) return; // 자신의 메시지 무시
      
      if (type === 'USER_HEARTBEAT') {
        // 다른 사용자의 하트비트 기록
        userHeartbeatsRef.current.set(otherSessionId, timestamp);
        
        // 활성 사용자 목록 업데이트 (자신 포함)
        setActiveUsers(prev => {
          const existingUsers = new Set(prev.users);
          existingUsers.add(sessionId); // 자신을 포함
          if (!existingUsers.has(otherSessionId)) {
            existingUsers.add(otherSessionId);
            console.log(`👤 [useUserSession] 새 사용자 감지:`, otherSessionId);
          }
          
          return {
            count: existingUsers.size,
            lastUpdate: new Date(),
            users: Array.from(existingUsers)
          };
        });
      } else if (type === 'USER_ACTION') {
        // 다른 사용자의 활동 알림 수신
        const { action } = event.data;
        const actionMessage = `${otherSessionId}: ${action}`;
        setRecentActions(prev => [actionMessage, ...prev.slice(0, 4)]);
        console.log(`📢 [useUserSession] 다른 사용자 활동 감지:`, { otherSessionId, action });
      }
    };

    // 초기 하트비트 전송
    const sendHeartbeat = () => {
      const timestamp = Date.now();
      channel.postMessage({
        type: 'USER_HEARTBEAT',
        sessionId,
        timestamp
      });
      userHeartbeatsRef.current.set(sessionId, timestamp);
      console.log(`💓 [useUserSession] 하트비트 전송:`, { sessionId, timestamp });
    };

    // 즉시 하트비트 전송 및 자신을 활성 사용자에 추가
    sendHeartbeat();
    setActiveUsers(prev => ({
      ...prev,
      count: 1,
      users: [sessionId]
    }));

    // 주기적 하트비트 전송 (10초마다로 단축 - 실시간성 향상)
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    // 비활성 사용자 정리 (30초마다로 단축 - 실시간성 향상)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const activeThreshold = 25000; // 25초로 단축
      
      setActiveUsers(prev => {
        const activeUserList = prev.users.filter(userId => {
          const lastHeartbeat = userHeartbeatsRef.current.get(userId);
          const isActive = lastHeartbeat && (now - lastHeartbeat) < activeThreshold;
          
          if (!isActive && userId !== sessionId) {
            console.log(`👤 [useUserSession] 비활성 사용자 제거:`, userId);
            userHeartbeatsRef.current.delete(userId);
          }
          
          return isActive || userId === sessionId; // 자신은 항상 유지
        });
        
        return {
          count: activeUserList.length,
          lastUpdate: new Date(),
          users: activeUserList
        };
      });
    }, 30000);

    return () => {
      console.log(`🛑 [useUserSession] 브로드캐스트 채널 정리`);
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      channel.close();
    };
  }, [sessionId]);

  // 사용자 활동 알림 (트래픽 최적화 - 서버 호출 최소화)
  const notifyUserAction = useCallback((action: string, userId?: string) => {
    const actionMessage = `${userId || sessionId}: ${action}`;
    setRecentActions(prev => [actionMessage, ...prev.slice(0, 4)]); // 최근 5개만 유지
    
    // 브로드캐스트 채널을 통한 로컬 알림 (서버 API 대신 사용)
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'USER_ACTION',
        sessionId: userId || sessionId,
        action,
        timestamp: Date.now()
      });
    }
    
    console.log(`📢 [useUserSession] 사용자 활동 알림 (로컬):`, { action, sessionId: userId || sessionId });
  }, [sessionId]);

  // hasMultipleUsers 상태 계산 (브로드캐스트 채널 기반)
  const hasMultipleUsers = activeUsers.count > 1;
  const isMultipleUsersRef = useRef(hasMultipleUsers);
  
  // 다중 사용자 상태 변화 감지
  useEffect(() => {
    if (isMultipleUsersRef.current !== hasMultipleUsers) {
      console.log(`🔄 [useUserSession] 다중 사용자 상태 변화:`, {
        이전: isMultipleUsersRef.current,
        현재: hasMultipleUsers,
        사용자수: activeUsers.count,
        사용자목록: activeUsers.users,
        시간: new Date().toISOString()
      });
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
}

export const useRealtimeBackup = <T>(options: RealtimeBackupOptions) => {
  const {
    dataType,
    userId = 'anonymous',
    autoSaveInterval = 60000, // 60초마다 자동 백업 (트래픽 최적화)
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