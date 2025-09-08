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
    saveInterval = 60000 // 1분마다 자동 저장
  } = options;

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

  // 로컬 저장소에 프로젝트 데이터 저장
  const saveToLocal = useCallback((data: ProjectData) => {
    try {
      const dataSize = JSON.stringify(data).length;
      console.log('🔍 [DEBUG] 클라우드 저장 시도 (현재 비활성화됨), 데이터 크기:', dataSize);
      
      // 로컬 저장소에 저장
      localStorage.setItem('crazyshot_project_data', JSON.stringify(data));
      setLastSyncTime(new Date());
      console.log('✅ 로컬 저장만 완료');
      
      return { success: true, message: '로컬 저장 완료' };
    } catch (error) {
      console.error('❌ 로컬 저장 중 오류:', error);
      throw error;
    }
  }, []);

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

  // 데이터 업데이트 및 자동 저장
  const updateProjectData = useCallback((updater: (draft: ProjectData) => void | ProjectData) => {
    setProjectData(currentState => {
      // updater가 새로운 상태를 반환하는 경우 처리
      if (typeof updater === 'function') {
        const draft = JSON.parse(JSON.stringify(currentState));
        const result = updater(draft);
        
        // updater가 새로운 객체를 반환하는 경우
        const finalData = result || draft;
        
        // 로컬 및 클라우드 자동 저장
        if (autoSave) {
          try {
            saveToLocal(finalData);
            cloudSave(finalData); // 실시간 클라우드 백업
          } catch (error) {
            console.error('자동 저장 실패:', error);
          }
        }
        
        return finalData;
      }
      
      return currentState;
    });
  }, [autoSave, saveToLocal, cloudSave]);

  // 실시간 자동 백업 시작
  useEffect(() => {
    if (!autoSave) return;
    
    const stopAutoBackup = startAutoBackup(() => projectData);
    return stopAutoBackup;
  }, [autoSave, startAutoBackup, projectData]);

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
    backupState
  };
};
