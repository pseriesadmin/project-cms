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
    syncInterval = 15000, // 15초로 단축 (실시간성 향상)
    pauseSync = false,
    syncStrategy = 'debounce'
  } = options;

  // 백업 타임아웃 참조 추가
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 실시간 백업 시스템 통합 (사용자 ID 개선)
  const {
    saveToCloud: cloudSave,
    restoreFromCloud: cloudRestore,
    backupState,
    isOnline
  } = useRealtimeBackup<ProjectData>({
    dataType: 'project',
    userId: localStorage.getItem('crazyshot_session_id') || localStorage.getItem('userId') || 'anonymous',
    autoSaveInterval: 300000 // 5분 (트래픽 최적화)
  });

  // 로컬 저장소에서 프로젝트 데이터 복원 (강화된 검증 로직)
  const restoreFromLocal = useCallback(() => {
    try {
      const savedData = localStorage.getItem('crazyshot_project_data');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          
          // 데이터 구조 엄격 검증
          const isValidData = 
            parsedData && 
            Array.isArray(parsedData.projectPhases) && 
            Array.isArray(parsedData.logs) &&
            typeof parsedData.version === 'string';
          
          if (!isValidData) {
            console.warn('⚠️ 유효하지 않은 로컬 데이터 구조');
            localStorage.removeItem('crazyshot_project_data');
            return null;
          }
          
          setProjectData(parsedData);
          setLastSyncTime(new Date());
          return parsedData;
        } catch (parseError) {
          console.error('❌ 로컬 데이터 파싱 오류:', parseError);
          localStorage.removeItem('crazyshot_project_data');
          return null;
        }
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ 로컬 복원 중 예상치 못한 오류:', error);
      return null;
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
        // console.log('⚡ [useProjectSync] 즉시 동기화 완료'); // 트래픽 최적화
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
        // console.log('📁 [useProjectSync] 디바운스된 클라우드 백업 실행'); // 트래픽 최적화
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
        
        // 로그 정리 및 중복 제거 (공격적 정리)
        const cleanLogs = (logs: any[]) => {
          // 중복 제거
          const uniqueLogs = logs.filter((log, index, arr) => 
            index === arr.findIndex(l => l.timestamp === log.timestamp && l.message === log.message)
          );
          
          // 데이터 크기가 큰 경우 더 공격적으로 정리
          const dataSize = JSON.stringify(uniqueLogs).length;
          let maxLogs = 50;
          
          if (dataSize > 500000) { // 500KB 초과 시
            maxLogs = 20; // 20개만 유지
            console.warn('⚠️ 로그 데이터 크기 초과 - 공격적 정리 (20개 유지)');
          } else if (dataSize > 200000) { // 200KB 초과 시
            maxLogs = 30; // 30개만 유지
            console.warn('⚠️ 로그 데이터 크기 주의 - 중간 정리 (30개 유지)');
          }
          
          return uniqueLogs.slice(-maxLogs);
        };

        const newLog = {
          timestamp,
          message: `데이터 업데이트 (버전: ${version})`,
          version
        };

        const updatedData = {
          ...finalData,
          logs: cleanLogs([...finalData.logs, newLog])
        };
        
        if (autoSave) {
          try {
            // 1. 즉시 로컬 저장
            saveToLocal(updatedData);
            
            // 2. 조건부 즉시 클라우드 백업 (온라인 상태 + 사용자 활성 상태 + 데이터 크기 검증)
            if (backupState.isOnline && !pauseSync) {
              const dataSize = JSON.stringify(updatedData).length;
              if (dataSize < 1000000) { // 1MB 미만만 백업
                cloudSave(updatedData, { backupType: 'MANUAL' });
                console.log('📁 [useProjectSync] 즉시 로컬 저장 + 즉시 클라우드 백업');
              } else {
                console.warn('⚠️ [useProjectSync] 페이로드 크기 초과 - 클라우드 백업 생략 (자동 저장)');
              }
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
            
            // 2. 조건부 즉시 클라우드 백업 (온라인 상태 + 사용자 활성 상태 + 데이터 크기 검증)
            if (backupState.isOnline && !pauseSync) {
              const dataSize = JSON.stringify(updatedData).length;
              if (dataSize < 1000000) { // 1MB 미만만 백업
                cloudSave(updatedData, { backupType: 'MANUAL' });
                console.log('📁 [useProjectSync] 즉시 로컬 저장 + 즉시 클라우드 백업 (자동 저장 비활성화)');
              } else {
                console.warn('⚠️ [useProjectSync] 페이로드 크기 초과 - 클라우드 백업 생략');
              }
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

        // 클라우드 복원 시 캐시 무시로 최신 데이터 확보
        const cloudData = await performCloudRestore(true);
        
        // 데이터 복원 및 동기화 로직 개선 (브라우저 캐시 삭제 대응)
        if (parsedLocalData && cloudData) {
          // 케이스 1: 로컬과 클라우드 데이터 모두 존재 - 병합 처리
          const mergedData = safeMergeData(parsedLocalData, cloudData);
          
          if (JSON.stringify(mergedData) !== JSON.stringify(parsedLocalData)) {
            setProjectData(mergedData);
            localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
            
            await cloudSave(mergedData, { 
              backupType: 'AUTO', 
              backupSource: '자동 동기화 - 병합'
            });
            
            setLastSyncTime(new Date());
            console.log('✅ [useProjectSync] 데이터 병합 동기화 완료');
          } else {
            console.log('🔄 [useProjectSync] 변경 사항 없음 - 동기화 생략');
          }
        } else if (!parsedLocalData && cloudData) {
          // 케이스 2: 로컬 데이터 없음 + 클라우드 데이터 존재 (브라우저 캐시 삭제 시나리오)
          console.log('🔄 [useProjectSync] 브라우저 캐시 삭제 감지 - 클라우드 데이터 복원');
          setProjectData(cloudData);
          localStorage.setItem('crazyshot_project_data', JSON.stringify(cloudData));
          setLastSyncTime(new Date());
          console.log('✅ [useProjectSync] 클라우드 데이터 복원 완료');
        } else if (parsedLocalData && !cloudData) {
          // 케이스 3: 로컬 데이터 존재 + 클라우드 데이터 없음 - 로컬 데이터를 클라우드에 백업
          console.log('🔄 [useProjectSync] 클라우드 데이터 없음 - 로컬 데이터 백업');
          setProjectData(parsedLocalData);
          
          await cloudSave(parsedLocalData, { 
            backupType: 'AUTO', 
            backupSource: '로컬 데이터 백업'
          });
          
          setLastSyncTime(new Date());
          console.log('✅ [useProjectSync] 로컬 데이터 클라우드 백업 완료');
        } else {
          // 케이스 4: 로컬과 클라우드 데이터 모두 없음 - 기본 데이터 생성
          console.log('⚠️ [useProjectSync] 모든 데이터 소스 없음 - 기본 데이터 생성');
          const defaultData = {
            projectPhases: [],
            logs: [{
              timestamp: new Date().toLocaleString('ko-KR'),
              message: '시스템 초기화 - 새로운 프로젝트 시작',
              version: `v${Date.now()}-init`
            }],
            version: `v${Date.now()}-init`
          };
          
          setProjectData(defaultData);
          localStorage.setItem('crazyshot_project_data', JSON.stringify(defaultData));
          
          // 기본 데이터를 클라우드에 백업
          await cloudSave(defaultData, { 
            backupType: 'AUTO', 
            backupSource: '초기 데이터 생성'
          });
          
          setLastSyncTime(new Date());
          console.log('✅ [useProjectSync] 기본 데이터 생성 및 백업 완료');
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

             // 클라우드 복원 시 캐시 무시로 최신 데이터 확보
             const cloudData = await performCloudRestore(true);
            
            // 데이터 복원 및 동기화 로직 개선 (주기적 동기화)
            if (parsedLocalData && cloudData) {
              const mergedData = safeMergeData(parsedLocalData, cloudData);
              
              if (JSON.stringify(mergedData) !== JSON.stringify(parsedLocalData)) {
                setProjectData(mergedData);
                localStorage.setItem('crazyshot_project_data', JSON.stringify(mergedData));
                
               await cloudSave(mergedData, { 
                 backupType: 'AUTO', 
                 backupSource: '주기적 동기화 - 병합'
               });
                
                setLastSyncTime(new Date());
                console.log('✅ [useProjectSync] 주기적 데이터 병합 완료');
              } else {
                console.log('🔄 [useProjectSync] 변경 사항 없음 - 동기화 생략');
              }
            } else if (!parsedLocalData && cloudData) {
              // 로컬 데이터 손실 감지 - 클라우드에서 복원
              console.log('🔄 [useProjectSync] 로컬 데이터 손실 감지 - 클라우드 복원');
              setProjectData(cloudData);
              localStorage.setItem('crazyshot_project_data', JSON.stringify(cloudData));
              setLastSyncTime(new Date());
              console.log('✅ [useProjectSync] 주기적 클라우드 복원 완료');
            } else if (parsedLocalData && !cloudData) {
              // 클라우드 데이터 손실 감지 - 로컬에서 백업
              console.log('🔄 [useProjectSync] 클라우드 데이터 손실 감지 - 로컬 백업');
              await cloudSave(parsedLocalData, { 
                backupType: 'AUTO', 
                backupSource: '주기적 로컬 백업'
              });
              setLastSyncTime(new Date());
              console.log('✅ [useProjectSync] 주기적 로컬 백업 완료');
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
  const performCloudRestore = async (autoSync = false) => {
    try {
      const localTimestamp = localStorage.getItem('last_backup_timestamp') || '0';
      const cloudData = await cloudRestore(true); // 클라우드 복원 시 캐시 무시

      if (cloudData && cloudData.timestamp > Number(localTimestamp)) {
        localStorage.setItem('last_backup_timestamp', cloudData.timestamp.toString());
        return cloudData.projectData;
      }

      return null;
    } catch (error) {
      console.error('❌ 클라우드 복원 중 오류:', error);
      return null;
    }
  };


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
