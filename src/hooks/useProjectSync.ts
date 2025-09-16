import { useState, useCallback, useEffect, useRef } from 'react';
import type { ProjectData } from '../types';
import { useRealtimeBackup } from './useRealtimeBackup';

interface ProjectSyncOptions {
  autoRestore?: boolean;
  syncInterval?: number;
  autoSave?: boolean;
  saveInterval?: number;
  pauseSync?: boolean;
  syncStrategy?: 'debounce' | 'immediate';
}

export const useProjectSync = (
  initialData: ProjectData, 
  options: ProjectSyncOptions = {}
) => {
  const {
    autoSave = false,
    autoRestore = true,
    syncInterval = 60000,
    pauseSync = false,
    syncStrategy = 'debounce'
  } = options;

  // 백업 타임아웃 참조 추가
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 실시간 백업 시스템 통합
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
  }, []);

  // 데이터 병합 함수 추가
  const safeMergeData = useCallback((localData: ProjectData, cloudData: ProjectData): ProjectData => {
    const mergedLogs = [
      ...(localData.logs || []),
      ...(cloudData.logs || [])
    ];

    const uniqueLogs = Array.from(
      new Set(mergedLogs.map(log => JSON.stringify(log)))
    ).map(log => JSON.parse(log));

    const mergedPhases = [
      ...localData.projectPhases,
      ...cloudData.projectPhases
    ].filter(
      (phase, index, self) => 
        index === self.findIndex(p => p.id === phase.id)
    );

    return {
      projectPhases: mergedPhases,
      logs: uniqueLogs,
      version: cloudData.version || localData.version
    };
  }, []);

  // 버전 관리를 위한 상태
  const [currentVersion, setCurrentVersion] = useState<string>('');

  // 로컬 스토리지에서 저장된 데이터 먼저 확인
  const [projectData, setProjectData] = useState<ProjectData>(initialData);
  const [isSyncing, setIsSyncing] = useState(false); // 초기 복원 로딩 상태
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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
      
      return { success: true, message: '로컬 저장 완료', version };
    } catch (error) {
      console.error('❌ 로컬 저장 중 오류:', error);
      throw error;
    }
  }, [generateVersion]);

  // 향상된 동기화: 전략별 클라우드 백업
  const smartCloudSave = useCallback((data: ProjectData, forceImmediate = false) => {
    if (syncStrategy === 'immediate' || forceImmediate) {
      // 즉시 동기화: 로컬과 클라우드 병렬 처리
      Promise.all([
        Promise.resolve(), // 로컬은 이미 저장됨
        cloudSave(data, { backupType: 'MANUAL' })
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
        cloudSave(data, { backupType: 'MANUAL' });
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
              cloudSave(updatedData, { backupType: 'MANUAL' });
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
              cloudSave(updatedData, { backupType: 'MANUAL' });
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
  }, [autoSave, saveToLocal, cloudSave, generateVersion, backupState.isOnline, pauseSync]);

  // 초기 로드 시 최신 버전 체크 및 복원 (로딩 표시 포함)
  useEffect(() => {
    // 동기화 가능 여부 판단
    const canSync = true; // 자동 복원은 수동 트리거로 처리

    if (!canSync) return;

    const checkAndAutoRestore = async (showLoading = false) => {
      try {
        if (showLoading) {
          setIsSyncing(true);
          console.log('🔄 [useProjectSync] 초기 복원 시작 - 로딩 표시');
        }

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
        const cloudData = await performCloudRestore(false);
        
        // 데이터 병합 및 동기화 로직 최적화
        if (parsedLocalData && cloudData) {
          const mergedData = safeMergeData(parsedLocalData, cloudData);
          
          // 실질적인 변경이 있는 경우에만 상태 및 저장소 업데이트
          if (JSON.stringify(mergedData) !== JSON.stringify(parsedLocalData)) {
            setProjectData(mergedData);
            localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
            
            // 변경 시에만 클라우드 백업
            await cloudSave(mergedData, { 
              backupType: 'AUTO', 
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
      } finally {
        if (showLoading) {
          setIsSyncing(false);
          console.log('🔄 [useProjectSync] 초기 복원 완료 - 로딩 해제');
        }
      }
    };

    checkAndAutoRestore(true); // 초기 로드 시 로딩 표시
  }, [cloudRestore, cloudSave, safeMergeData]);

  // 주기적 버전 체크 및 자동 복원 (자동 복원만 활성화)
  useEffect(() => {
    console.log('✅ [useProjectSync] 자동 복원 동기화 활성화 - 백업은 수동');
    
    // 자동 복원 동기화 활성화 (백업은 수동)
    if (autoRestore) {
      const versionCheckInterval = setInterval(() => {
        // 동기화 가능 여부 판단
        const canSync = true; // 자동 복원은 수동 트리거로 처리

        if (!canSync) return;

        const checkAndAutoRestore = async () => {
          try {
            // 동기화 가능 여부 판단
            const canSync = true; // 자동 복원은 수동 트리거로 처리

            if (!canSync) return;

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
             const cloudData = await performCloudRestore(false);
            
            // 데이터 병합 및 동기화 로직 최적화
            if (parsedLocalData && cloudData) {
              const mergedData = safeMergeData(parsedLocalData, cloudData);
              
              // 실질적인 변경이 있는 경우에만 상태 및 저장소 업데이트
              if (JSON.stringify(mergedData) !== JSON.stringify(parsedLocalData)) {
                setProjectData(mergedData);
                localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
                
               // 변경 시에만 클라우드 백업
               await cloudSave(mergedData, { 
                 backupType: 'AUTO', 
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
          } finally {
            // 백업 타이머도 정리
            if (backupTimeoutRef.current) {
              clearTimeout(backupTimeoutRef.current);
            }
          }
        };

        checkAndAutoRestore();
      }, syncInterval);
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
  }, [autoRestore, syncInterval, cloudRestore, cloudSave, safeMergeData]);

  // 스마트 동기화: 필요 시점 감지하여 강제 동기화 실행 (로컬스토리지 기반)
  const triggerSmartSyncFromLocal = useCallback(() => {
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
        console.log('✅ 클라우드 복원 성공');
        return cloudData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 클라우드 복원 중 오류:', error);
      return null;
    }
  }, [cloudRestore, backupState.isOnline]);


  return {
    projectData,
    updateProjectData,
    saveToLocal,
    restoreFromLocal,
    cloudBackup: cloudSave,
    cloudRestore: performCloudRestore,
    lastSyncTime,
    isSyncing,
    isOnline,
    backupState,
    currentVersion,
    triggerSmartSync: () => smartCloudSave(projectData, true), // 현재 상태 기반 동기화
    triggerSmartSyncFromLocal // 로컬스토리지 기반 동기화
  };
};
