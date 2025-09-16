import { useState, useCallback, useEffect } from 'react';
import { ProjectData } from '../types';
import { useRealtimeBackup } from './useRealtimeBackup';

interface ProjectSyncOptions {
  autoRestore?: boolean;
  syncInterval?: number;
  autoSave?: boolean;
  saveInterval?: number;
  pauseSync?: boolean; // 트래픽 최적화: 비활성 상태에서 동기화 일시 중단
}

export const useProjectSync = (
  initialData: ProjectData, 
  options: ProjectSyncOptions = {}
) => {
  const {
    autoSave = false, // 자동 저장 비활성화 (수동 백업 사용)
    autoRestore = true, // 자동 복원 동기화 활성화
    syncInterval = 60000, // 60초마다 동기화 체크
    pauseSync = false // 트래픽 최적화: 동기화 일시 중단 제어
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
        return parsedData;
      }
      return initialData;
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

  // 버전 체크 및 자동 복원 함수 (트래픽 최적화 적용)
  const checkAndAutoRestore = useCallback(async (showLoading = false, forceSync = false) => {
    // 트래픽 최적화: 동기화 일시 중단 상태에서는 강제 동기화가 아닌 경우 중단
    if (pauseSync && !forceSync) {
      console.log('🛑 [useProjectSync] 동기화 일시 중단 상태 - 트래픽 최적화');
      return;
    }
    
    if (showLoading) {
      setIsSyncing(true);
      console.log('🔄 [useProjectSync] 초기 복원 시작 - 로딩 표시');
    }
    try {
      const response = await fetch('/api/version');
      if (!response.ok) return;
      
      const { latestVersion, hasUpdates } = await response.json();
      const localVersion = localStorage.getItem('project_version');
      
      if (hasUpdates && localVersion !== latestVersion) {
        console.log('📥 [useProjectSync] 새 버전 감지 - 백업 복원 시작');
        const restoredData = await cloudRestore();
        
        if (restoredData) {
          console.log('✅ [useProjectSync] 백업 복원 완료');
          setProjectData(restoredData);
          localStorage.setItem('project_version', latestVersion);
          setCurrentVersion(latestVersion);
        }
      }
    } catch (error) {
      console.log('버전 체크 중 오류:', error);
    } finally {
      if (showLoading) {
        setIsSyncing(false);
        console.log('🔄 [useProjectSync] 초기 복원 완료 - 로딩 해제');
      }
    }
  }, [cloudRestore, pauseSync]);

  // 데이터 업데이트 및 자동 저장 (버전 관리 포함)
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
            // cloudSave(updatedData); // 클라우드 자동 저장 비활성화 (트래픽 최적화)
            console.log('📁 [useProjectSync] 로컬 저장만 실행 (클라우드 자동 저장 비활성화)');
          } catch (error) {
            console.error('로컬 저장 실패:', error);
          }
        } else {
          // 자동 저장 비활성화 시에도 로컬 저장은 실행
          try {
            saveToLocal(updatedData);
            console.log('📁 [useProjectSync] 자동 저장 비활성화 - 로컬 저장만 실행');
          } catch (error) {
            console.error('로컬 저장 실패:', error);
          }
        }
        
        return updatedData;
      }
      return currentState;
    });
  }, [autoSave, saveToLocal, cloudSave, generateVersion]);

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
        console.log('🛑 [useProjectSync] 자동 복원 동기화 타이머 정리');
      };
    }
    
    return () => {
    };
  }, [autoRestore, syncInterval]);

  // 스마트 동기화: 필요 시점 감지하여 강제 동기화 실행
  const triggerSmartSync = useCallback(() => {
    console.log('🚀 [useProjectSync] 스마트 동기화 트리거 - 강제 실행');
    checkAndAutoRestore(false, true); // forceSync = true로 즉시 동기화
  }, [checkAndAutoRestore]);

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
