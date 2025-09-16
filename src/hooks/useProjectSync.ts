import { useState, useCallback, useEffect, useRef } from 'react';
import { ProjectData } from '../types';
import { useRealtimeBackup } from './useRealtimeBackup';
import { isCurrentlyEditing } from './useEditState';

interface ProjectSyncOptions {
  autoRestore?: boolean;
  syncInterval?: number;
  autoSave?: boolean;
  saveInterval?: number;
  pauseSync?: boolean; // 트래픽 최적화: 비활성 상태에서 동기화 일시 중단
  syncStrategy?: 'debounce' | 'immediate'; // 동기화 전략 선택
}

// 안전한 날짜 변환 유틸리티 함수
const safeToISOString = (date?: Date | string | number): string => {
  try {
    const validDate = date instanceof Date 
      ? date 
      : (date ? new Date(date) : new Date());
    
    // 유효한 날짜인지 확인
    if (isNaN(validDate.getTime())) {
      console.warn('🚨 [safeToISOString] 유효하지 않은 날짜:', date);
      return new Date().toISOString();
    }
    
    return validDate.toISOString();
  } catch (error) {
    console.warn('🚨 [safeToISOString] 날짜 변환 오류:', error);
    return new Date().toISOString();
  }
};

export const useProjectSync = (
  initialData: ProjectData, 
  options: ProjectSyncOptions = {}
) => {
  const {
    autoSave = false, // 자동 저장 비활성화 (수동 백업 사용)
    autoRestore = true, // 자동 복원 동기화 활성화
    syncInterval = 60000, // 60초마다 동기화 체크
    pauseSync = false, // 트래픽 최적화: 동기화 일시 중단 제어
    syncStrategy = 'debounce' // 기본값: 디바운스 전략
    // saveInterval 제거 - 사용하지 않음
  } = options;

  // 버전 관리를 위한 상태
  const [currentVersion, setCurrentVersion] = useState<string>('');

  // 로컬 스토리지에서 저장된 데이터 먼저 확인
  const getSavedOrInitialData = () => {
    try {
      const savedData = localStorage.getItem('crazyshot_project_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // 데이터 구조 유효성 검사
        if (parsedData && Array.isArray(parsedData.projectPhases)) {
        return parsedData;
        }
      }
      
      // 유효한 데이터 없을 경우 초기 데이터 생성
      const defaultProjectData = {
        projectPhases: [],
        logs: [{
          timestamp: new Date().toLocaleString('ko-KR'),
          message: '초기 프로젝트 데이터 생성',
          version: `v${Date.now()}-initial`
        }]
      };
      
      // 로컬 스토리지에 기본 데이터 저장
      localStorage.setItem('crazyshot_project_data', JSON.stringify(defaultProjectData));
      
      return defaultProjectData;
    } catch (error) {
      console.error('❌ 로컬 데이터 로드 중 오류:', error);
      return initialData;
    }
  };

  const [projectData, setProjectData] = useState<ProjectData>(getSavedOrInitialData());
  const [isSyncing, setIsSyncing] = useState(false); // 초기 복원 로딩 상태
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // 실시간 백업 시스템 통합 (트래픽 최적화 - 자동 백업 비활성화)
  const {
    saveToCloud: cloudSave,
    restoreFromCloud: cloudRestore,
    backupState,
    isOnline
  } = useRealtimeBackup<ProjectData>({
    dataType: 'project',
    userId: localStorage.getItem('userId') || 'anonymous',
    autoSaveInterval: 300000 // 5분 (트래픽 최적화)
  });

  // 버전 생성 함수
  const generateVersion = useCallback((data: ProjectData) => {
    const dataStr = JSON.stringify(data);
    const hash = dataStr.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `v${Date.now()}-${Math.abs(hash)}`;
  }, [autoRestore, syncInterval]);

  // 로컬 저장소에 프로젝트 데이터 저장 (버전 포함)
  const saveToLocal = useCallback((data: ProjectData) => {
    try {
      const version = generateVersion(data);
      const dataWithVersion = { ...data, version };
      
      localStorage.setItem('crazyshot_project_data', JSON.stringify(dataWithVersion));
      localStorage.setItem('project_version', version);
      setCurrentVersion(version);
      setLastSyncTime(new Date());
      
      return { success: true, message: '로컬 저장 완료', version };
    } catch (error) {
      console.error('❌ 로컬 저장 중 오류:', error);
      throw error;
    }
  }, [generateVersion]);

  // 로컬 저장소에서 프로젝트 데이터 복원
  const restoreFromLocal = useCallback(() => {
    try {
      const savedData = localStorage.getItem('crazyshot_project_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setProjectData(parsedData);
        setLastSyncTime(new Date());
        return parsedData;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ 로컬 복원 중 오류:', error);
      throw error;
    }
  }, [autoRestore, syncInterval]);

  // 동시 사용자 간 안전한 동기화 메커니즘
  const safeMergeData = (localData: ProjectData, cloudData: ProjectData) => {
    // 로그 누적 보존 로직 강화
    const mergedLogs = [
      ...(localData.logs || []),
      ...(cloudData.logs || [])
    ];

    // 중복 로그 제거 (선택적)
    const uniqueLogs = Array.from(new Set(mergedLogs.map(JSON.stringify)))
      .map(log => JSON.parse(log));

    // 프로젝트 단계 병합 로직
    const mergedPhases = [
      ...localData.projectPhases,
      ...cloudData.projectPhases
    ].filter(
      (phase, index, self) => 
        index === self.findIndex(p => p.id === phase.id)
    );

    return {
      projectPhases: mergedPhases,
      logs: uniqueLogs
    };
  };

  // 트래픽 최소화를 위한 동기화 전략
  const checkAndAutoRestore = useCallback(async (showLoading = false, forceSync = false) => {
    // 트래픽 최적화: 동기화 조건 엄격화
    if ((pauseSync && !forceSync) || !backupState.isOnline) {
      console.log('🛑 [useProjectSync] 동기화 중단 - 트래픽 최적화');
      return;
    }
    
    // 편집 중 데이터 보호 및 불필요한 동기화 방지
    if (!forceSync && isCurrentlyEditing()) {
      console.log('🛡️ [useProjectSync] 현재 편집 중 - 동기화 일시 중단');
      return;
    }
    
    // 마지막 동기화 시간 기반 동기화 제한
    const MIN_SYNC_INTERVAL = 300000; // 5분
    const currentTime = Date.now();
    const lastSyncTimestamp = lastSyncTime ? new Date(lastSyncTime).getTime() : 0;
    
    if (!forceSync && (currentTime - lastSyncTimestamp) < MIN_SYNC_INTERVAL) {
      console.log('⏳ [useProjectSync] 최소 동기화 간격 미충족 - 동기화 건너뜀');
      return;
    }

    try {
      const localData = localStorage.getItem('crazyshot_project_data');
      let parsedLocalData: ProjectData | null = null;
      
      // 로컬 데이터 파싱 및 유효성 검사
      try {
        parsedLocalData = localData ? JSON.parse(localData) : null;
      } catch (error) {
        console.error('🚨 [useProjectSync] 로컬 데이터 파싱 오류:', error);
        parsedLocalData = null;
      }

      // 클라우드 복원 시 최소 페이로드 요청
      const cloudData = await cloudRestore(false, {
        partialRestore: true,
        priorityFields: ['version', 'logs']
      });
      
      // 데이터 병합 및 동기화 로직 최적화
      if (parsedLocalData && cloudData) {
        const mergedData = safeMergeData(parsedLocalData, cloudData);
        
        // 실질적인 변경이 있는 경우에만 상태 및 저장소 업데이트
        if (JSON.stringify(mergedData) !== JSON.stringify(parsedLocalData)) {
        setProjectData(mergedData);
        localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
        
          // 변경 시에만 클라우드 백업
          await cloudSave(mergedData, { 
            backupType: 'SYNC', 
            backupSource: '자동 동기화' 
          });
          
          setLastSyncTime(new Date());
          console.log('✅ [useProjectSync] 선택적 데이터 동기화 완료');
        } else {
          console.log('🔄 [useProjectSync] 변경 사항 없음 - 동기화 생략');
        }
      }
    } catch (error) {
      console.error('❌ [useProjectSync] 동기화 중 오류:', error);
    }
  }, [
    pauseSync, 
    backupState.isOnline, 
    isCurrentlyEditing, 
    cloudRestore, 
    cloudSave, 
    safeMergeData,
    lastSyncTime
  ]);

  // 백업 디바운싱을 위한 타이머 관리
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 향상된 동기화: 전략별 클라우드 백업
  const smartCloudSave = useCallback((data: ProjectData, forceImmediate = false) => {
    if (syncStrategy === 'immediate' || forceImmediate) {
      // 즉시 동기화: 로컬과 클라우드 병렬 처리
      Promise.all([
        Promise.resolve(), // 로컬은 이미 저장됨
        cloudSave(data)
      ]).then(() => {
        console.log('⚡ [useProjectSync] 즉시 동기화 완료');
      }).catch(error => {
        console.error('❌ [useProjectSync] 즉시 동기화 실패:', error);
      });
    } else {
      // 디바운스 전략 (기본값)
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
      
      backupTimeoutRef.current = setTimeout(() => {
        cloudSave(data);
        console.log('📁 [useProjectSync] 디바운스된 클라우드 백업 실행');
      }, 2000); // 2초 디바운스
    }
  }, [cloudSave, syncStrategy]);

  // 데이터 업데이트 및 자동 저장 (버전 관리 포함, 트래픽 최적화)
  const updateProjectData = useCallback((updater: (draft: ProjectData) => void | ProjectData) => {
    setProjectData(currentState => {
      if (typeof updater === 'function') {
        const draft = JSON.parse(JSON.stringify(currentState));
        const result = updater(draft);
        const finalData = result || draft;
        
        // 변경 로그에 버전 정보 추가
        const timestamp = new Date().toLocaleString('ko-KR');
        const version = generateVersion(finalData);
        
        const updatedData = {
          ...finalData,
          logs: [
            ...finalData.logs,
            {
              timestamp,
              message: `데이터 업데이트 (버전: ${version})`,
              version
            }
          ]
        };
        
        if (autoSave) {
          try {
            // 1. 즉시 로컬 저장
            saveToLocal(updatedData);
            
            // 2. 조건부 즉시 클라우드 백업 (온라인 상태 + 사용자 활성 상태)
            if (backupState.isOnline && !pauseSync) {
              cloudSave(updatedData);
              console.log('📁 [useProjectSync] 즉시 로컬 저장 + 즉시 클라우드 백업');
            } else {
              console.log('📁 [useProjectSync] 즉시 로컬 저장 (클라우드 백업 조건 미충족)');
            }
          } catch (error) {
            console.error('저장 실패:', error);
          }
        } else {
          // 자동 저장 비활성화 시에도 로컬 저장 및 조건부 클라우드 백업
          try {
            // 1. 즉시 로컬 저장
            saveToLocal(updatedData);
            
            // 2. 조건부 즉시 클라우드 백업 (온라인 상태 + 사용자 활성 상태)
            if (backupState.isOnline && !pauseSync) {
              cloudSave(updatedData);
              console.log('📁 [useProjectSync] 즉시 로컬 저장 + 즉시 클라우드 백업 (자동 저장 비활성화)');
            } else {
              console.log('📁 [useProjectSync] 즉시 로컬 저장 (클라우드 백업 조건 미충족, 자동 저장 비활성화)');
            }
          } catch (error) {
            console.error('저장 실패:', error);
          }
        }
        
        return updatedData;
      }
      return currentState;
    });
  }, [autoSave, saveToLocal, smartCloudSave, generateVersion]);

  // 초기 로드 시 최신 버전 체크 및 복원 (로딩 표시 포함)
  useEffect(() => {
    checkAndAutoRestore(true); // 초기 로드 시 로딩 표시
  }, [checkAndAutoRestore]);

  // 주기적 버전 체크 및 자동 복원 (자동 복원만 활성화)
  useEffect(() => {
    console.log('✅ [useProjectSync] 자동 복원 동기화 활성화 - 백업은 수동');
    
    // 자동 복원 동기화 활성화 (백업은 수동)
    if (autoRestore) {
      const versionCheckInterval = setInterval(checkAndAutoRestore, syncInterval);
      return () => {
        clearInterval(versionCheckInterval);
        // 백업 타이머도 정리
        if (backupTimeoutRef.current) {
          clearTimeout(backupTimeoutRef.current);
        }
        console.log('🛑 [useProjectSync] 자동 복원 동기화 및 백업 타이머 정리');
      };
    }
    
    return () => {
      // 백업 타이머 정리
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
    };
  }, [autoRestore, syncInterval]);

  // 스마트 동기화: 필요 시점 감지하여 강제 동기화 실행
  const triggerSmartSync = useCallback(() => {
    console.log('🚀 [useProjectSync] 스마트 동기화 트리거 - 로컬 데이터 즉시 백업');
    // 현재 로컬 데이터를 즉시 클라우드에 백업 (트래픽 최소화)
    const currentData = localStorage.getItem('crazyshot_project_data');
    if (currentData) {
      try {
        const parsedData = JSON.parse(currentData);
        smartCloudSave(parsedData, true); // forceImmediate = true로 즉시 백업 실행
      } catch (error) {
        console.error('❌ [useProjectSync] 스마트 동기화 중 데이터 파싱 오류:', error);
      }
    }
  }, [smartCloudSave]);

  // 트래픽 최소화를 위한 복원 전략 개선
  const restoreFromCloud = useCallback(async (
    ignoreCacheOption = false, 
    options: { 
      partialRestore?: boolean; 
      priorityFields?: string[]; 
    } = {}
  ): Promise<ProjectData | null> => {
    const { 
      partialRestore = false, 
      priorityFields = ['projectPhases', 'logs'] 
    } = options;

    try {
      // 네트워크 상태 및 온라인 확인
      if (!backupState.isOnline) {
        console.warn('🚫 오프라인 상태 - 클라우드 복원 불가');
        return null;
      }

      // 캐시 무시 옵션 처리
      const cacheParam = ignoreCacheOption ? `&nocache=${Date.now()}` : '';
      const apiEndpoint = `/api/project?userId=${localStorage.getItem('userId') || 'anonymous'}${cacheParam}`;

      // 부분 복원을 위한 쿼리 파라미터 추가
      const restoreEndpoint = partialRestore 
        ? `${apiEndpoint}&partialFields=${priorityFields.join(',')}`
        : apiEndpoint;

      const response = await fetch(restoreEndpoint, {
        headers: {
          'Cache-Control': ignoreCacheOption ? 'no-cache' : 'default',
          'X-Minimal-Payload': 'true' // 서버에 최소 페이로드 요청
        }
      });

      // 응답 상태 처리
      if (!response.ok) {
        if (response.status === 404) {
          console.log('📭 저장된 프로젝트 데이터 없음');
          return null;
        }
        throw new Error(`복원 실패: ${response.status}`);
      }

      const result = await response.json();

      // 데이터 유효성 검사
      if (!result.success) {
        if (result.isEmpty) {
          console.log('📭 프로젝트 데이터 비어있음');
          return null;
        }
        throw new Error(result.error || '복원 처리 실패');
      }

      // 부분 복원 시 기존 데이터와 병합
      const restoredData = result.projectData;
      if (partialRestore && projectData) {
        priorityFields.forEach(field => {
          if (restoredData[field]) {
            projectData[field] = restoredData[field];
          }
        });
        return projectData;
      }

      console.log('✅ 클라우드 복원 성공');
      return restoredData;

    } catch (error) {
      console.error('❌ 클라우드 복원 중 오류:', error);
      
      // 오류 유형에 따른 세분화된 처리
      if (error.message.includes('네트워크')) {
        console.warn('🌐 네트워크 연결 문제');
      }

      return null;
    }
  }, [
    localStorage.getItem('userId'), 
    backupState.isOnline, 
    projectData
  ]);


  return {
    projectData,
    updateProjectData,
    saveToLocal,
    restoreFromLocal,
    cloudBackup: cloudSave,
    cloudRestore,
    lastSyncTime,
    isSyncing,
    isOnline,
    backupState,
    currentVersion,
    triggerSmartSync // 스마트 동기화 트리거 함수 노출
  };
};
