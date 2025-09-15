import { useState, useCallback, useEffect } from 'react';
import { ProjectData } from '../types';
import { useRealtimeBackup } from './useRealtimeBackup';

interface ProjectSyncOptions {
  autoSave?: boolean;
  saveInterval?: number;
}

export const useProjectSync = (
  initialData: ProjectData, 
  options: ProjectSyncOptions = {}
) => {
  const {
    autoSave = true,
    saveInterval = 10000 // 10초마다 버전 체크
  } = options;

  // 버전 관리를 위한 상태
  const [currentVersion, setCurrentVersion] = useState<string>('');

  // 로컬 스토리지에서 저장된 데이터 먼저 확인
  const getSavedOrInitialData = () => {
    try {
      const savedData = localStorage.getItem('crazyshot_project_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('✅ 로컬 저장소에서 데이터 로드');
        return parsedData;
      }
      console.log('📝 로컬 저장소 데이터 없음, 초기 데이터 사용');
      return initialData;
    } catch (error) {
      console.error('❌ 로컬 데이터 로드 중 오류:', error);
      return initialData;
    }
  };

  const [projectData, setProjectData] = useState<ProjectData>(getSavedOrInitialData());
  const [isSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // 실시간 백업 시스템 통합
  const {
    saveToCloud: cloudSave,
    restoreFromCloud: cloudRestore,
    startAutoBackup,
    backupState,
    isOnline
  } = useRealtimeBackup<ProjectData>({
    dataType: 'project',
    userId: localStorage.getItem('userId') || 'anonymous',
    autoSaveInterval: saveInterval
  });

  // 버전 생성 함수
  const generateVersion = useCallback((data: ProjectData) => {
    const dataStr = JSON.stringify(data);
    const hash = dataStr.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `v${Date.now()}-${Math.abs(hash)}`;
  }, []);

  // 로컬 저장소에 프로젝트 데이터 저장 (버전 포함)
  const saveToLocal = useCallback((data: ProjectData) => {
    try {
      const version = generateVersion(data);
      const dataWithVersion = { ...data, version };
      
      localStorage.setItem('crazyshot_project_data', JSON.stringify(dataWithVersion));
      localStorage.setItem('project_version', version);
      setCurrentVersion(version);
      setLastSyncTime(new Date());
      
      console.log('✅ 로컬 저장 완료, 버전:', version);
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
        console.log('✅ 로컬 복원 성공');
        return parsedData;
      } else {
        console.log('📝 저장된 로컬 데이터가 없습니다.');
        return null;
      }
    } catch (error) {
      console.error('❌ 로컬 복원 중 오류:', error);
      throw error;
    }
  }, []);

  // 버전 체크 및 자동 복원 함수
  const checkAndAutoRestore = useCallback(async () => {
    try {
      const response = await fetch('/api/project/version');
      if (!response.ok) return;
      
      const { latestVersion, hasUpdates } = await response.json();
      const localVersion = localStorage.getItem('project_version');
      
      if (hasUpdates && localVersion !== latestVersion) {
        console.log('🔄 새 버전 감지, 자동 복원 중...');
        const restoredData = await cloudRestore();
        
        if (restoredData) {
          setProjectData(restoredData);
          localStorage.setItem('project_version', latestVersion);
          setCurrentVersion(latestVersion);
          console.log('✅ 자동 복원 완료');
        }
      }
    } catch (error) {
      console.log('버전 체크 중 오류:', error);
    }
  }, [cloudRestore]);

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
            cloudSave(updatedData);
          } catch (error) {
            console.error('자동 저장 실패:', error);
          }
        }
        
        return updatedData;
      }
      return currentState;
    });
  }, [autoSave, saveToLocal, cloudSave, generateVersion]);

  // 초기 로드 시 최신 버전 체크 및 복원
  useEffect(() => {
    checkAndAutoRestore();
  }, [checkAndAutoRestore]);

  // 주기적 버전 체크 및 자동 복원
  useEffect(() => {
    if (!autoSave) return;

    const versionCheckInterval = setInterval(checkAndAutoRestore, saveInterval);
    const stopAutoBackup = startAutoBackup(() => projectData);
    
    return () => {
      clearInterval(versionCheckInterval);
      stopAutoBackup();
    };
  }, [autoSave, saveInterval, checkAndAutoRestore, startAutoBackup, projectData]);

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
    currentVersion
  };
};
