import { useState, useCallback, useEffect } from 'react';
import { ProjectData } from '../types';
import { useRealtimeBackup } from './useRealtimeBackup';

interface ProjectSyncOptions {
  autoSave?: boolean;
  autoRestore?: boolean;
  syncInterval?: number;
  pauseSync?: boolean;
}

export const useProjectSync = (
  initialData: ProjectData, 
  options: ProjectSyncOptions = {}
) => {
  // 기본 옵션과 사용자 제공 옵션 병합
  const mergedOptions: ProjectSyncOptions = {
    autoSave: options.autoSave ?? false,
    autoRestore: options.autoRestore ?? true,
    syncInterval: options.syncInterval ?? 15000,
    pauseSync: options.pauseSync ?? false
  };

  // 실시간 백업 시스템 통합
  const {
    saveToCloud: cloudSave,
    restoreFromCloud: cloudRestore,
    backupState
  } = useRealtimeBackup<ProjectData>({
    dataType: 'project',
    userId: localStorage.getItem('crazyshot_session_id') || localStorage.getItem('userId') || 'anonymous',
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
  }, []);

  // 로컬 저장소에 프로젝트 데이터 저장 (버전 포함)
  const saveToLocal = useCallback((data: ProjectData) => {
    try {
      const version = generateVersion(data);
      const dataWithVersion = { ...data, version };
      
      localStorage.setItem('crazyshot_project_data', JSON.stringify(dataWithVersion));
      localStorage.setItem('project_version', version);
      setCurrentVersion(version);
      
      return { success: true, message: '로컬 저장 완료', version };
    } catch (error) {
      console.error('❌ 로컬 저장 중 오류:', error);
      throw error;
    }
  }, [generateVersion]);

  // 클라우드 복원 함수 (타입 안전성 보장)
  const performCloudRestore = useCallback(async (ignoreCacheOption = false): Promise<ProjectData | null> => {
    try {
      // 네트워크 상태 확인
      if (!backupState.isOnline) {
        console.warn('🚫 오프라인 상태 - 클라우드 복원 불가');
        return null;
      }

      const cloudData = await cloudRestore(ignoreCacheOption);
      
      if (cloudData) {
        return cloudData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 클라우드 복원 중 오류:', error);
      return null;
    }
  }, [cloudRestore, backupState.isOnline]);

  // 프로젝트 데이터 상태 관리
  const [projectData, setProjectData] = useState<ProjectData>(initialData);

  // 버전 관리를 위한 상태
  const [currentVersion, setCurrentVersion] = useState<string>('');

  // 데이터 변경 감지 최적화
  const isDataChanged = useCallback((oldData: ProjectData, newData: ProjectData) => {
    return JSON.stringify(oldData.projectPhases) !== JSON.stringify(newData.projectPhases) ||
           JSON.stringify(oldData.logs) !== JSON.stringify(newData.logs);
  }, []);

  // 데이터 병합 함수
  const safeMergeData = useCallback((localData: ProjectData, cloudData: ProjectData): ProjectData => {
    const mergedPhases = [
      ...localData.projectPhases,
      ...cloudData.projectPhases
    ].filter(
      (phase, index, self) => 
        index === self.findIndex(p => p.id === phase.id)
    );

    const mergedLogs = Array.from(
      new Set([
        ...localData.logs,
        ...cloudData.logs
      ].map(log => JSON.stringify(log)))
    ).map(log => JSON.parse(log));

    return {
      projectPhases: mergedPhases,
      logs: mergedLogs,
      version: cloudData.version || localData.version
    };
  }, []);

  // 자동 동기화 트리거
  const triggerAutoSync = useCallback(async () => {
    try {
      // 1. 클라우드 데이터 복원
      const cloudData = await performCloudRestore(true);
      
      if (cloudData) {
        // 2. 로컬 데이터와 비교
        const localData = JSON.parse(
          localStorage.getItem('crazyshot_project_data') || '{}'
        );
        
        // 3. 데이터 변경 감지
        if (isDataChanged(localData, cloudData)) {
          // 4. 데이터 병합
          const mergedData = safeMergeData(localData, cloudData);
          
          // 5. 상태 및 로컬 스토리지 업데이트
          setProjectData(mergedData);
          localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
          
          // 6. 브라우저 간 동기화 이벤트
          window.dispatchEvent(new CustomEvent('project-sync', {
            detail: { 
              timestamp: Date.now(),
              source: 'auto-sync'
            }
          }));
          
          // 7. 클라우드 백업
          await cloudSave(mergedData, {
            backupType: 'AUTO',
            backupSource: '자동 동기화'
          });
        }
      }
    } catch (error) {
      console.error('❌ 자동 동기화 중 오류:', error);
    }
  }, [isDataChanged, safeMergeData, cloudSave, performCloudRestore]);

  // 이벤트 리스너 및 주기적 동기화
  useEffect(() => {
    // 1. 커스텀 이벤트 리스너
    const handleProjectSync = (event: CustomEvent) => {
      console.log('🔄 [AutoSync] 외부 동기화 이벤트 감지', event.detail);
      
      // 중복 동기화 방지
      if (event.detail.source !== 'auto-sync') {
        triggerAutoSync();
      }
    };

    // 2. 주기적 동기화 (15초 간격)
    const syncInterval = setInterval(triggerAutoSync, mergedOptions.syncInterval);

    // 3. 이벤트 리스너 등록
    window.addEventListener('project-sync', handleProjectSync as EventListener);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('project-sync', handleProjectSync as EventListener);
    };
  }, [triggerAutoSync, mergedOptions.syncInterval]);

  // 스마트 동기화: 필요 시점 감지하여 강제 동기화 실행 (로컬스토리지 기반)
  const triggerSmartSyncFromLocal = useCallback(() => {
    console.log('🚀 [useProjectSync] 스마트 동기화 트리거 - 로컬 데이터 즉시 백업');
    // 현재 로컬 데이터를 즉시 클라우드에 백업 (트래픽 최소화)
    const currentData = localStorage.getItem('crazyshot_project_data');
    if (currentData) {
      triggerAutoSync(); // 자동 동기화 트리거
    }
  }, [triggerAutoSync]);

  return {
    projectData,
    updateProjectData: setProjectData,
    saveToLocal,
    restoreFromLocal: () => {
      // 로컬 복원은 이제 사용되지 않으므로 빈 함수로 대체
      console.warn('restoreFromLocal은 더 이상 사용되지 않습니다.');
    },
    cloudBackup: cloudSave,
    cloudRestore: performCloudRestore,
    triggerSmartSync: () => triggerAutoSync(), // 수동 동기화 트리거
    backupState,
    currentVersion,
    triggerSmartSyncFromLocal
  };
};
