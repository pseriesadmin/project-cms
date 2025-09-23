import React from 'react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ProjectPhaseCard } from './components/ProjectPhaseCard';
import { initialData } from './data/initialData';
import type { ProjectPhase, Task, ProjectData, ChecklistItem, PerformanceRecord } from './types';
import { CrazyshotLogo, DownloadIcon, UploadIcon, PlusIcon, SaveIcon, CloudUploadIcon, CloudDownloadIcon } from './components/icons';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ChangeLogDisplay } from './components/ChangeLogDisplay';
import { LogModal } from './components/LogModal';
import { ProductDashboard } from './components/ProductDashboard';
// import { useActiveUsers } from './hooks/useActiveUsers'; // 임시 주석 처리
import { useProjectSync } from './hooks/useProjectSync';
import { TopSnackbar, BottomSnackbar } from './components/common/TopSnackbar';
import { useUserSession } from './hooks/useRealtimeBackup';
import { useActivityOptimizer } from './hooks/useActivityOptimizer';
import { advancedFileSystemBackup } from './utils/backupUtils';

type TabId = 'workflow' | 'dashboard';

const TabButton: React.FC<{
  tabId: TabId;
  title: string;
  activeTab: TabId;
  setActiveTab: (tabId: TabId) => void;
}> = ({ tabId, title, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(tabId)}
    className={`px-4 sm:px-6 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-crazy-bright-blue ${
      activeTab === tabId
        ? 'text-crazy-bright-blue border-b-2 border-crazy-bright-blue'
        : 'text-slate-500 hover:text-crazy-blue hover:bg-slate-100 rounded-t-lg'
    }`}
  >
    {title}
  </button>
);

const App: React.FC = () => {
  const [taskToDelete, setTaskToDelete] = useState<{ phaseId: string; taskId: string } | null>(null);
  const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [dataToRestore, setDataToRestore] = useState<ProjectData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 탭 상태 복원 및 저장
  const getInitialTab = (): TabId => {
    try {
      const savedTab = localStorage.getItem('activeTab');
      return (savedTab as TabId) || 'workflow';
    } catch {
      return 'workflow';
    }
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  // 탭 변경 시 localStorage에 저장
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    localStorage.setItem('activeTab', tabId);
  };
  const [showUserSnackbar, setShowUserSnackbar] = useState(false);
  const [showActivitySnackbar, setShowActivitySnackbar] = useState(false);

  // 실시간 사용자 세션 관리
  const { 
    activeUsers, 
    recentActions, 
    notifyUserAction, 
    hasMultipleUsers 
  } = useUserSession();

  // 트래픽 최적화: 사용자 활동 감지
  const { isActive } = useActivityOptimizer({
    inactivityThreshold: 5 * 60 * 1000, // 5분 비활성
    activeCheckInterval: 60000 // 1분마다 확인
  });

  // 사용자 세션 상태 기본 관리
  const status = { 
    hasMultipleUsers, 
    activeUserCount: activeUsers.count 
  };

  // 향상된 동기화 전략: 다중 사용자 환경에 따라 동적 설정
  
  // 프로젝트 데이터 동기화 (향상된 동기화 전략 적용)
  const {
    projectData,
    isSyncing, // 초기 복원 로딩 상태 
    updateProjectData, 
    lastSyncTime,
    isOnline,
    backupState,
    cloudBackup,
    cloudRestore,
    currentVersion,
    triggerSmartSync
  } = useProjectSync(initialData, { 
    pauseSync: !isActive, // 비활성 상태에서 동기화 일시 중단
    syncStrategy: hasMultipleUsers ? 'immediate' : 'debounce' // 동적 동기화 전략
  });
  
  // 자동 복원 동기화 상태 확인 (자동 백업은 비활성화)
  const isAutoSyncWorking = isOnline; // 자동 복원 동기화 활성화 상태
  const shouldShowCloudButtons = true; // 수동 백업/복원 버튼 항상 표시

  // 사용되지 않는 변수 참조 (lint 경고 해결)
  useEffect(() => {
    if (lastSyncTime) {
      // 마지막 동기화 시간 추적
    }
  }, [lastSyncTime]);


  // 타임스탬프 및 진행률 계산 함수 복원
  const getTimestamp = () => new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const { totalCheckpoints, completedCheckpoints } = useMemo(() => {
    let total = 0;
    let completed = 0;
    projectData.projectPhases.forEach((phase: ProjectPhase) => {
      phase.tasks.forEach((task: Task) => {
        total += task.checkpoints.length;
        completed += task.checkpoints.filter((c: ChecklistItem) => c.completed).length;
      });
    });
    return { totalCheckpoints: total, completedCheckpoints: completed };
  }, [projectData.projectPhases]);

  const totalProgress = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;

  // 도메인 진입 시 최초 한 번 캐시 무시 클라우드 복원 시도
  useEffect(() => {
    let isInitialLoad = true;
    
    if (isInitialLoad) {
      // console.log('🌐 [App] 도메인 첫 진입 - 캐시 무시 클라우드 복원 시도'); // 트래픽 최적화
      
      // 500ms 딜레이 후 캐시 무시 복원 시도 (초기 로딩 충돌 방지)
      const timer = setTimeout(async () => {
        try {
          await cloudRestore(true); // 캐시 무시 복원
          // console.log('✅ [App] 도메인 첫 진입 클라우드 복원 완료'); // 트래픽 최적화
        } catch (error) {
          console.warn('⚠️ [App] 도메인 첫 진입 클라우드 복원 실패:', error);
        }
      }, 500);

      // 글로벌 스마트 동기화 트리거 함수 추가
      (window as any).triggerSmartSync = () => {
        console.log('🚀 [App] 글로벌 스마트 동기화 트리거');
        triggerSmartSync();
      };
      
      isInitialLoad = false;
      return () => {
        clearTimeout(timer);
        delete (window as any).triggerSmartSync;
      };
    }
  }, []); // 빈 의존성 배열 - 첫 렌더링에만 실행

  // 다중 사용자 감지 시 스낵바 표시 및 동기화 전략
  useEffect(() => {
    if (status.hasMultipleUsers && !showUserSnackbar) {
      setShowUserSnackbar(true);
      triggerSmartSync();
    } else if (!status.hasMultipleUsers && showUserSnackbar) {
      setShowUserSnackbar(false);
    }
  }, [status.hasMultipleUsers, showUserSnackbar, triggerSmartSync]);

  // 다중 사용자 환경에서 데이터 변경 시 추가 확인
  const confirmDataChange = useCallback((action: string) => {
    if (status.hasMultipleUsers) {
      return window.confirm(
        `현재 ${status.activeUserCount}명이 동시 접속 중입니다.\n` +
        `'${action}' 작업을 계속하시겠습니까?`
      );
    }
    return true;
  }, [status.hasMultipleUsers, status.activeUserCount]);

  // 실시간 활동 알림 표시
  useEffect(() => {
    if (recentActions.length > 0 && hasMultipleUsers) {
      setShowActivitySnackbar(true);
      const timer = setTimeout(() => setShowActivitySnackbar(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [recentActions.length, hasMultipleUsers]);

  const handleUpdatePhase = useCallback((phaseId: string, updates: Partial<ProjectPhase>) => {
    if (!isOnline) {
      alert('🚨 데이터 편집을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    if (!confirmDataChange('워크플로우 수정')) return;
    
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (phase) {
        Object.assign(phase, updates);
        // 사용자 활동 알림
        notifyUserAction(`프로젝트 단계 '${phase.title}' 수정`);
        // 자동 클라우드 백업
        cloudBackup(draft, { 
          backupType: 'AUTO', 
          backupSource: '워크플로우 수정'
        });
      }
    });
  }, [updateProjectData, notifyUserAction, confirmDataChange, isOnline, cloudBackup, isActive]);

  const handleAddPhase = useCallback(() => {
    if (!isOnline) {
      alert('🚨 데이터 편집을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    if (!confirmDataChange('새 워크플로우 추가')) return;
    
    updateProjectData(draft => {
      const newPhase: ProjectPhase = {
        id: `phase-${Date.now()}`,
        title: '새 워크플로우',
        tasks: []
      };
      draft.projectPhases.push(newPhase);
      // 사용자 활동 알림
      notifyUserAction('새 워크플로우 추가');
        // 자동 클라우드 백업
        cloudBackup(draft, { 
          backupType: 'AUTO', 
          backupSource: '워크플로우 추가'
        });
    });
  }, [updateProjectData, notifyUserAction, confirmDataChange, isOnline, cloudBackup, isActive]);

  const handleDeletePhase = useCallback((phaseId: string) => {
    setPhaseToDelete(phaseId);
  }, []);

  const confirmDeletePhase = useCallback(() => {
    if (!phaseToDelete) return;
    if (!confirmDataChange('워크플로우 삭제')) {
      setPhaseToDelete(null);
      return;
    }
    
    updateProjectData(draft => {
      const phaseIndex = draft.projectPhases.findIndex((p: ProjectPhase) => p.id === phaseToDelete);
      if (phaseIndex === -1) return;
      const [removedPhase] = draft.projectPhases.splice(phaseIndex, 1);
      // 삭제된 워크플로우 이름 사용 (lint 경고 해결)
      void removedPhase.title;
    });
    setPhaseToDelete(null);
  }, [phaseToDelete, updateProjectData, confirmDataChange]);

  const handleUpdateTask = useCallback((phaseId: string, taskId: string, updates: Partial<Task>) => {
    if (!isOnline) {
      alert('🚨 데이터 편집을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const task = phase.tasks.find((t: Task) => t.id === taskId);
      if (!task) return;
      Object.assign(task, updates);
      // 자동 클라우드 백업
      cloudBackup(draft, { 
        backupType: 'AUTO', 
        backupSource: '작업 수정'
      });
    });
  }, [updateProjectData, isOnline, cloudBackup, isActive]);

  const handleAddTask = useCallback((phaseId: string) => {
    if (!isOnline) {
      alert('🚨 데이터 편집을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const newTask: Task = {
        id: `task-${Date.now()}`,
        mainTask: ['새 업무'],
        personInCharge: '',
        schedule: '',
        checkpoints: [],
        performance: { date: '', docLink: '', comment: '' },
        issues: ''
      };
      phase.tasks.push(newTask);
      // 자동 클라우드 백업
      cloudBackup(draft, { 
        backupType: 'AUTO', 
        backupSource: '작업 추가'
      });
    });
  }, [updateProjectData, isOnline, cloudBackup, isActive]);

  const handleDeleteTask = useCallback((phaseId: string, taskId: string) => {
    setTaskToDelete({ phaseId, taskId });
  }, []);

  const confirmDeleteTask = useCallback(() => {
    if (!taskToDelete) return;
    const { phaseId, taskId } = taskToDelete;
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const taskIndex = phase.tasks.findIndex((t: Task) => t.id === taskId);
      if (taskIndex === -1) return;
      const [removedTask] = phase.tasks.splice(taskIndex, 1);
      // 삭제된 업무 이름 사용 (lint 경고 해결)
      void removedTask.mainTask;
    });
    setTaskToDelete(null);
  }, [taskToDelete, updateProjectData]);

  const downloadAsCSV = () => {
    try {
      // CSV 헤더 생성 (제거됨)
      // const headers = [
      //   '워크플로우', '업무', '담당자', '일정', 
      //   '확인 조건', '완료 여부', '기간', 
      //   '자료', '평가', '비고'
      // ];

      // CSV 데이터 타입 정의
      type CSVRow = {
        [key: string]: string;
        워크플로우: string;
        업무: string;
        담당자: string;
        일정: string;
        '확인 조건': string;
        완료여부: string;
        기간: string;
        자료: string;
        평가: string;
        비고: string;
      };

      // CSV 데이터 생성
      const csvData: CSVRow[] = projectData.projectPhases.flatMap(phase => 
        phase.tasks.map(task => ({
          워크플로우: phase.title,
          업무: task.mainTask.join(', '),
          담당자: task.personInCharge,
          일정: task.schedule,
          '확인 조건': task.checkpoints.map(cp => cp.text).join('; '),
          완료여부: task.checkpoints.map(cp => cp.completed ? '완료' : '미완료').join('; '),
          기간: task.performance.date,
          자료: task.performance.docLink,
          평가: task.performance.comment,
          비고: task.issues
        }))
      );

      // CSV 문자열 생성
      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => 
          Object.keys(row).map(header => {
            const value = row[header] || '';
            return `"${value.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Blob 및 다운로드 링크 생성
      const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const fileName = `crazyshot_project_export_${year}-${month}-${day}.csv`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      alert('엑셀 내보내기가 완료되었습니다.');
    } catch (error) {
      alert('엑셀 내보내기에 실패했습니다.');
    }
  };
  
  const handleBackup = async () => {
    try {
      // 새로운 고급 백업 함수 사용
      await advancedFileSystemBackup(projectData, {
        filePrefix: '크레이지샷_개발현황백업',
        onSuccess: (fileName) => {
          // 추가 성공 처리 로직 (옵션)
          console.log(`개발현황 백업 완료: ${fileName}`);
        },
        onError: (error) => {
          // 추가 오류 처리 로직 (옵션)
          console.error('개발현황 백업 중 오류:', error);
        }
      });
    } catch (error) {
      console.error('백업 중 예상치 못한 오류:', error);
    }
  };

  const handleCloudBackup = async () => {
    if (!isOnline) {
      alert('🚨 클라우드 백업을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    try {
      console.log('🚀 [App] 클라우드 백업 시작');
      // 백업 로그 생성 (누적 보존)
      const backupLog = {
        timestamp: new Date().toLocaleString('ko-KR'),
        message: '클라우드 백업 실행',
        version: `backup-${Date.now()}`
      };

      // 기존 로그와 새 로그를 모두 보존하는 누적 데이터 생성
      const updatedProjectData = {
        ...projectData,
        logs: [
          ...projectData.logs, 
          backupLog
        ]
      };

      // 클라우드 백업 실행 (누적 보존 모드)
      await cloudBackup(updatedProjectData, {
        backupType: 'MANUAL',
        backupSource: '클라우드 백업 버튼'
      });
      
      // 로컬 상태 업데이트
      updateProjectData(() => updatedProjectData);
      
      console.log('✅ [App] 클라우드 백업 완료');
      alert('클라우드 백업이 완료되었습니다.');
    } catch (error) {
      console.error('❌ [App] 클라우드 백업 중 오류:', error);
      alert('클라우드 백업 중 오류가 발생했습니다.');
    }
  };

  const handleCloudRestore = async () => {
    if (!isOnline) {
      alert('🚨 클라우드 복원을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    try {
      console.log('🚀 [App] 클라우드 복원 시작');
      const restoredData = await cloudRestore();
      if (restoredData) {
        // 모든 로그 누적 보존 (기존 + 복원 + 복원 로그)
        const restoredDataWithLog = {
          ...restoredData,
          logs: [
            ...(projectData.logs || []),
            ...(restoredData.logs || []),
            {
              timestamp: getTimestamp(),
              message: '클라우드 백업에서 데이터가 성공적으로 복원되었습니다.',
              version: currentVersion
            }
          ]
        };

        updateProjectData(draft => {
          Object.assign(draft, restoredDataWithLog);
        });

        console.log('✅ [App] 클라우드 복원 완료');
        alert('클라우드 백업에서 데이터를 성공적으로 복원했습니다.');
      } else {
        console.log('📭 [App] 클라우드에 복원할 데이터 없음');
        alert('클라우드에 저장된 백업 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('❌ [App] 클라우드 복원 중 오류:', error);
      alert('클라우드 백업에서 데이터를 복원할 수 없습니다.');
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const sanitizeAndUpgradeData = (parsedJson: any): ProjectData => {

    let rawPhases: any[];
    let rawLogs: any[] = [];

    // More flexible parsing logic
    if (parsedJson && typeof parsedJson === 'object') {
      if (Array.isArray(parsedJson)) {
        rawPhases = parsedJson;
      } else if (Array.isArray(parsedJson.projectPhases)) {
        rawPhases = parsedJson.projectPhases;
        rawLogs = Array.isArray(parsedJson.logs) ? parsedJson.logs : [];
      } else {
        throw new Error("지원되지 않는 백업 파일 형식입니다. 파일 구조가 손상되었을 수 있습니다.");
      }
    } else {
      throw new Error("지원되지 않는 백업 파일 형식입니다. 파일 구조가 손상되었을 수 있습니다.");
    }

    const sanitizedPhases: ProjectPhase[] = rawPhases.map((phase: any, phaseIndex: number) => {
      const sanitizedTasks: Task[] = (Array.isArray(phase.tasks) ? phase.tasks : []).map((task: any, taskIndex: number) => {
        const sanitizedCheckpoints: ChecklistItem[] = (Array.isArray(task.checkpoints) ? task.checkpoints : []).map((cp: any, cpIndex: number) => ({
          id: cp.id || `cp-restored-${Date.now()}-${cpIndex}`,
          text: typeof cp.text === 'string' ? cp.text : '항목 없음',
          completed: typeof cp.completed === 'boolean' ? cp.completed : false,
        }));
        const performance: PerformanceRecord = (task.performance && typeof task.performance === 'object')
          ? { 
              date: typeof task.performance.date === 'string' ? task.performance.date : '', 
              docLink: typeof task.performance.docLink === 'string' ? task.performance.docLink : '', 
              comment: typeof task.performance.comment === 'string' ? task.performance.comment : '' 
            }
          : { date: '', docLink: '', comment: '' };
        return {
          id: task.id || `task-restored-${Date.now()}-${taskIndex}`,
          mainTask: Array.isArray(task.mainTask) ? task.mainTask.map(String) : (typeof task.mainTask === 'string' ? [task.mainTask] : ['업무 없음']),
          personInCharge: typeof task.personInCharge === 'string' ? task.personInCharge : '',
          schedule: typeof task.schedule === 'string' ? task.schedule : '',
          checkpoints: sanitizedCheckpoints,
          performance: performance,
          issues: typeof task.issues === 'string' ? task.issues : '',
        };
      });
      return {
        id: phase.id || `phase-restored-${Date.now()}-${phaseIndex}`,
        title: typeof phase.title === 'string' ? phase.title : '제목 없음',
        tasks: sanitizedTasks,
      };
    });

    return { projectPhases: sanitizedPhases, logs: rawLogs };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('잘못된 파일 형식입니다. JSON 파일을 선택해주세요.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      alert('파일을 읽는 도중 오류가 발생했습니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error('파일이 비어있거나 읽을 수 없습니다.');
        }
        const parsedJson = JSON.parse(text);
        const dataToRestoreFromFile = sanitizeAndUpgradeData(parsedJson);
        setDataToRestore(dataToRestoreFromFile);
      } catch (error) {
        alert(`파일을 복원하는 데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = useCallback(() => {
    if (!isOnline) {
      alert('🚨 데이터 복원을 위해서는 인터넷 연결이 필요합니다.');
      return;
    }
    if (!dataToRestore) {
      return;
    }
    try {
      // 파일 복원 시에도 기존 로그 누적 보존
      const restoredDataWithLog = {
        ...dataToRestore,
        logs: [
          ...(projectData.logs || []),
          ...dataToRestore.logs,
          {
            timestamp: getTimestamp(),
            message: '데이터가 백업 파일로부터 성공적으로 복원되었습니다.',
            version: currentVersion
          }
        ]
      };
      
      // 올바른 방식으로 데이터 복원
      updateProjectData(draft => {
        Object.assign(draft, restoredDataWithLog);
      });
      
      // 즉시 클라우드 백업으로 다른 사용자에게 동기화
      setTimeout(async () => {
        try {
          await cloudBackup(restoredDataWithLog);
          console.log('✅ [App] 파일 복원 후 클라우드 동기화 완료');
        } catch (backupError) {
          console.warn('⚠️ [App] 파일 복원 후 클라우드 백업 실패:', backupError);
        }
      }, 100); // 상태 업데이트 후 실행
      
      // 상태 동기화를 위한 storage 이벤트 트리거 (장비현황과 동일한 패턴)
      window.dispatchEvent(new Event('storage'));
      
      setDataToRestore(null);
      alert('데이터 복원이 완료되었습니다.');
    } catch (error) {
      alert(`데이터 복원 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [dataToRestore, updateProjectData, getTimestamp, isOnline, projectData.logs, currentVersion]);

  const cancelRestore = useCallback(() => {
    setDataToRestore(null);
    alert('복원 작업이 취소되었습니다.');
  }, []);

  // 개발용 로컬 스토리지 초기화 함수 제거됨

  // 개발용 상태 확인 함수 제거됨

  return (
    <>
      {/* 다중 사용자 강화된 경고 스낵바 */}
      <TopSnackbar
        isVisible={showUserSnackbar}
        message={`${status.activeUserCount}명 동시 사용자 확인`}
        type="warning"
        onClose={() => setShowUserSnackbar(false)}
      />
      
      {/* 실시간 활동 알림 스낵바 */}
      <BottomSnackbar
        isVisible={showActivitySnackbar}
        messages={recentActions}
        onClose={() => setShowActivitySnackbar(false)}
      />
      
      <div className="flex flex-col h-screen bg-slate-100 text-crazy-dark-gray">
        <header className="flex-shrink-0 bg-white shadow-md z-10">
            <div className="container mx-auto px-4 sm:px-8">
                <div className="flex items-center justify-between pt-4 pb-2">
                    <div className="flex items-center gap-3">
                        <CrazyshotLogo className="h-8 sm:h-10 text-crazy-red" />
                        <h1 className="text-xl sm:text-3xl font-bold text-crazy-dark-blue">
                            크레이지샷 대시보드
                        </h1>
                    </div>
                </div>
                
                <div className="border-b border-slate-200 -mx-4 sm:-mx-8 px-4 sm:px-8">
                    <nav className="flex items-center justify-between" aria-label="Tabs">
                        <div className="flex">
                            <TabButton tabId="workflow" title="개발 현황" activeTab={activeTab} setActiveTab={handleTabChange} />
                            <TabButton tabId="dashboard" title="장비 현황" activeTab={activeTab} setActiveTab={handleTabChange} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs text-gray-600">
                                {isOnline ? '온라인' : '오프라인'}
                            </span>
                            {backupState.pendingBackups.length > 0 && (
                                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                            )}
                        </div>
                    </nav>
                </div>
            </div>
        </header>

        <main className="flex-grow">
            <div className="container mx-auto p-4 sm:p-8">
                {activeTab === 'workflow' && (
                  <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-12rem)]">
                    <header>
                        <p className="text-crazy-gray mb-4">
                            실시간으로 프로젝트 각 분야 별 업무현황을 기록하고 공유하세요.
                        </p>
                         <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
                             <div className="flex items-center gap-2">
                                 {shouldShowCloudButtons && (
                                   <>
                                     <button onClick={handleCloudBackup} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                         <CloudUploadIcon className="w-4 h-4" /> 로컬 백업
                                     </button>
                                     <button onClick={handleCloudRestore} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                         <CloudDownloadIcon className="w-4 h-4" /> 로컬 복원
                                     </button>
                                   </>
                                 )}
                                 <div className="text-xs text-gray-500 ml-2">
                                   {(() => {
                                     const latestLog = projectData.logs[projectData.logs.length - 1];
                                     const displayVersion = latestLog?.version || currentVersion;
                                     return displayVersion ? (
                                       <span title={displayVersion}>
                                         버전: {displayVersion.slice(-8)}
                                       </span>
                                     ) : null;
                                   })()}
                                 </div>
                                 <button onClick={downloadAsCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-crazy-blue rounded-lg shadow-md hover:bg-crazy-bright-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-bright-blue transition-colors">
                                    <DownloadIcon className="w-4 h-4" /> 엑셀 내보내기
                                </button>
                                 <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                     <SaveIcon className="w-4 h-4" /> 파일 백업
                                 </button>
                                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                 <button onClick={handleRestoreClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                     <UploadIcon className="w-4 h-4" /> 파일 복원
                                 </button>
                                {isSyncing ? (
                                    <span className="ml-2 text-xs text-blue-600">🔄 데이터 복원 중...</span>
                                ) : isAutoSyncWorking && (
                                    <span className="ml-2 text-xs text-green-600">✓ 자동 복원 동기화 활성</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-crazy-dark-blue">전체 진행률</span>
                                <span className="text-sm font-bold text-crazy-blue">{totalProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div className="bg-crazy-blue h-3 rounded-full transition-all duration-500" style={{ width: `${totalProgress}%` }}></div>
                            </div>
                        </div>
                        <ChangeLogDisplay logs={projectData.logs} onShowMore={() => setIsLogModalOpen(true)} />
                    </header>

                    {projectData.projectPhases.map(phase => (
                      <ProjectPhaseCard key={phase.id} phase={phase} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} onUpdatePhase={handleUpdatePhase} onDeletePhase={handleDeletePhase} />
                    ))}
                    <div className="pt-4">
                        <button onClick={handleAddPhase} className="flex w-full items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-crazy-blue bg-white border-2 border-dashed border-slate-300 rounded-lg hover:border-crazy-blue hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                            <PlusIcon className="w-5 h-5" /> 워크플로우 추가
                        </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'dashboard' && (
                    <ProductDashboard />
                )}
            </div>
        </main>
      </div>
      
      <ConfirmationModal isOpen={!!taskToDelete} title="삭제 확인" onCancel={() => setTaskToDelete(null)} onConfirm={confirmDeleteTask}>
        <p>정말로 이 업무를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
      </ConfirmationModal>
      <ConfirmationModal isOpen={!!phaseToDelete} title="워크플로우 삭제 확인" onCancel={() => setPhaseToDelete(null)} onConfirm={confirmDeletePhase}>
        <p>정말로 이 워크플로우를 삭제하시겠습니까? 포함된 모든 업무가 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.</p>
      </ConfirmationModal>
      <ConfirmationModal isOpen={!!dataToRestore} title="정보 복원 확인" onCancel={cancelRestore} onConfirm={confirmRestore}>
        <p>현재 데이터를 덮어쓰고 백업 파일로부터 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
      </ConfirmationModal>
      <LogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} logs={projectData.logs} />
    </>
  );
};

export default App;