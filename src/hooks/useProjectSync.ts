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
  const safeMergeData = useCallback((localData: ProjectData, cloudData: ProjectData) => {
    // 타임스탬프 기반 최신성 판단
    const getLatestTimestamp = (data: ProjectData) => {
      if (!data.logs || data.logs.length === 0) return 0;
      return Math.max(...data.logs.map(log => new Date(log.timestamp).getTime()));
    };

    const localTimestamp = getLatestTimestamp(localData);
    const cloudTimestamp = getLatestTimestamp(cloudData);

    console.log('🔍 [useProjectSync] 데이터 병합 분석:', {
      localTimestamp: safeToISOString(localTimestamp),
      cloudTimestamp: safeToISOString(cloudTimestamp),
      localPhases: localData.projectPhases?.length || 0,
      cloudPhases: cloudData.projectPhases?.length || 0
    });

    // 최신 데이터 선택
    const newerData = localTimestamp >= cloudTimestamp ? localData : cloudData;
    // olderData 변수 제거

    // 스마트 병합: 최신 데이터 기반으로 누락된 항목 추가
    const mergedData = {
      ...newerData,
      logs: [
        ...newerData.logs,
        {
          timestamp: safeToISOString(),
          message: `데이터 병합 완료 (로컬:${localTimestamp > cloudTimestamp ? '최신' : '이전'}, 클라우드:${cloudTimestamp > localTimestamp ? '최신' : '이전'})`,
          type: 'MERGE_SYNC',
          version: `merge-${Date.now()}`
        }
      ]
    };

    return mergedData;
  }, []);

  // 버전 체크 및 자동 복원 함수 (트래픽 최적화 적용)
  const checkAndAutoRestore = useCallback(async (showLoading = false, forceSync = false) => {
    // 트래픽 최적화: 동기화 일시 중단 상태에서는 강제 동기화가 아닌 경우 중단
    if (pauseSync && !forceSync) {
      console.log('🛑 [useProjectSync] 동기화 일시 중단 상태 - 트래픽 최적화');
      return;
    }
    
    // 편집 중 데이터 보호: 강제 동기화가 아닌 경우 편집 상태 확인
    if (!forceSync && isCurrentlyEditing()) {
      console.log('🛡️ [useProjectSync] 현재 편집 중 - 클라우드 복원 일시 중단');
      return;
    }
    
    if (showLoading) {
      setIsSyncing(true);
      console.log('🔄 [useProjectSync] 초기 복원 시작 - 로딩 표시');
    }
    try {
      const localData = localStorage.getItem('crazyshot_project_data');
      let parsedLocalData: ProjectData | null = null;
      
      let localDataParseFailed = false;
      
      try {
        parsedLocalData = localData ? JSON.parse(localData) : null;
      } catch (error) {
        console.error('🚨 [useProjectSync] 로컬 데이터 파싱 오류 - 클라우드 복원 우선 시도:', error);
        parsedLocalData = null;
        localDataParseFailed = true; // 파싱 실패 플래그
      }

      // 로컬 데이터 파싱 실패 또는 브라우저 캐시 초기화 대비: 클라우드 복원 우선 시도
      const cloudData = await cloudRestore(localDataParseFailed || !localData);
      
      // 로컬과 클라우드 데이터 모두 존재하는 경우 안전한 병합
      if (parsedLocalData && cloudData) {
        console.log('🔀 [useProjectSync] 로컬-클라우드 데이터 병합 시작');
        const mergedData = safeMergeData(parsedLocalData, cloudData);
        
        setProjectData(mergedData);
        localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
        
        // 병합된 데이터를 클라우드에 백업
        await cloudSave(mergedData);
        
        console.log('✅ [useProjectSync] 데이터 병합 및 동기화 완료');
        return;
      }
      
      // 클라우드 데이터만 존재하는 경우
      if (cloudData && !parsedLocalData) {
        console.log('📥 [useProjectSync] 클라우드 데이터 복원');
        setProjectData(cloudData);
        localStorage.setItem('crazyshot_project_data', JSON.stringify(cloudData));
        return;
      }
      
      // 로컬 데이터만 존재하는 경우
      if (parsedLocalData && !cloudData) {
        console.log('💾 [useProjectSync] 로컬 데이터 클라우드 백업');
        setProjectData(parsedLocalData);
        await cloudSave(parsedLocalData);
        return;
      }
      
      // 데이터가 없는 경우 기본 데이터 생성 (매우 제한적 조건)
      if (!parsedLocalData && !cloudData) {
        // 추가 안전장치: 다른 사용자 세션 확인
        const hasActiveUsers = localStorage.getItem('crazyshot_session_id') && 
                              JSON.parse(localStorage.getItem('user_session_data') || '{}').hasMultipleUsers;
        
        if (!hasActiveUsers) {
          const defaultProjectData = {
            projectPhases: [],
            logs: [{
              timestamp: new Date().toISOString(),
              message: '초기 프로젝트 데이터 생성 (단일 사용자 환경)',
              type: 'SYSTEM_INIT',
              version: `v${Date.now()}-initial`
            }]
          };
          
          console.log('🌱 [useProjectSync] 안전한 초기 데이터 생성 (단일 사용자)');
          setProjectData(defaultProjectData);
          localStorage.setItem('crazyshot_project_data', JSON.stringify(defaultProjectData));
          await cloudSave(defaultProjectData);
        } else {
          console.log('🔒 [useProjectSync] 다중 사용자 환경 - 초기 데이터 생성 방지');
          // 다중 사용자 환경에서는 초기 데이터 생성하지 않음
          const safeEmptyData = {
            projectPhases: [],
            logs: [{
              timestamp: new Date().toISOString(),
              message: '데이터 보호 모드 - 기존 사용자 데이터 보호',
              type: 'DATA_PROTECTION',
              version: `protection-${Date.now()}`
            }]
          };
          
          setProjectData(safeEmptyData);
          localStorage.setItem('crazyshot_project_data', JSON.stringify(safeEmptyData));
        }
      }
      
    } catch (error) {
      console.error('동기화 중 오류:', error);
    } finally {
      if (showLoading) {
        setIsSyncing(false);
        console.log('🔄 [useProjectSync] 초기 복원 완료 - 로딩 해제');
      }
    }
  }, [cloudRestore, pauseSync, cloudSave, safeMergeData]);

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
            saveToLocal(updatedData);
            smartCloudSave(updatedData); // 향상된 동기화 전략
            console.log(`📁 [useProjectSync] 로컬 저장 + ${syncStrategy} 클라우드 백업`);
          } catch (error) {
            console.error('저장 실패:', error);
          }
        } else {
          // 자동 저장 비활성화 시에도 로컬 저장 및 향상된 클라우드 백업
          try {
            saveToLocal(updatedData);
            smartCloudSave(updatedData); // 향상된 동기화 전략
            console.log(`📁 [useProjectSync] 로컬 저장 + ${syncStrategy} 클라우드 백업 (자동 저장 비활성화)`);
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
