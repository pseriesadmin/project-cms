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

  console.log(`🏠 [App] useUserSession 호출 결과:`, {
    activeUsers,
    hasMultipleUsers,
    recentActionsCount: recentActions.length,
    현재시간: new Date().toISOString()
  });

  const status = { 
    hasMultipleUsers, 
    activeUserCount: activeUsers.count 
  };

  // 프로젝트 데이터 동기화
  const {
    projectData, 
    updateProjectData, 
    lastSyncTime,
    isOnline,
    backupState,
    cloudBackup,
    cloudRestore,
    currentVersion
  } = useProjectSync(initialData);
  
  // 자동화 시스템 작동 상태 확인 (클라우드 버튼 필요성 판단)
  const isAutoSyncWorking = isOnline && backupState.pendingBackups.length === 0;
  const shouldShowCloudButtons = !isAutoSyncWorking || hasMultipleUsers;

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

  // 다중 사용자 감지 시 강화된 경고 표시
  useEffect(() => {
    console.log(`🚨 [App] 다중 사용자 알림 useEffect 실행:`, {
      hasMultipleUsers: status.hasMultipleUsers,
      activeUserCount: status.activeUserCount,
      showUserSnackbar,
      조건충족: status.hasMultipleUsers && !showUserSnackbar,
      시간: new Date().toISOString()
    });
    
    if (status.hasMultipleUsers && !showUserSnackbar) {
      console.log(`📢 [App] 다중 사용자 감지! 경고 스낵바 표시 시작`);
      setShowUserSnackbar(true);
      // 지속적 표시 (수동 닫기 필요)
    }
  }, [status.hasMultipleUsers, status.activeUserCount, showUserSnackbar]);

  // 다중 사용자 환경에서 데이터 변경 시 추가 확인
  const confirmDataChange = useCallback((action: string) => {
    if (status.hasMultipleUsers) {
      return window.confirm(
        `⚠️ 현재 ${status.activeUserCount}명이 동시 접속 중입니다.\n` +
        `'${action}' 작업을 계속하시겠습니까?\n\n` +
        `다른 사용자의 작업과 충돌할 수 있습니다.`
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
    if (!confirmDataChange('워크플로우 수정')) return;
    
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (phase) {
        Object.assign(phase, updates);
        // 사용자 활동 알림
        notifyUserAction(`프로젝트 단계 '${phase.title}' 수정`);
      }
    });
  }, [updateProjectData, notifyUserAction, confirmDataChange]);

  const handleAddPhase = useCallback(() => {
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
    });
  }, [updateProjectData, notifyUserAction, confirmDataChange]);

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
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const task = phase.tasks.find((t: Task) => t.id === taskId);
      if (!task) return;
      Object.assign(task, updates);
    });
  }, [updateProjectData]);

  const handleAddTask = useCallback((phaseId: string) => {
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
    });
  }, [updateProjectData]);

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
      const dataStr = JSON.stringify(projectData, null, 2);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const fileName = `크레이지샷_개발현황백업_${year}-${month}-${day}.json`;

      // 브라우저 File System Access API 지원 여부 확인
      if ('showDirectoryPicker' in window && window.isSecureContext) {
        try {
          // 디렉토리 선택 대화상자 열기
          const dirHandle = await (window as any).showDirectoryPicker({ 
            mode: 'readwrite' 
          });

          // 파일 생성 및 쓰기
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(dataStr);
          await writable.close();

          alert(`✅ 개발현황 데이터가 ${fileName}으로 성공적으로 백업되었습니다.`);
          return;
        } catch (error: any) {
          // 사용자가 취소한 경우 (AbortError 또는 NotAllowedError)
          if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
            return; // 취소 시 아무것도 하지 않음
          }
          
          // 실제 오류 발생 시에만 폴백 다운로드 실행
        }
      }

      // File System Access API 미지원 시 또는 실제 오류 시에만 기본 다운로드
      const blob = new Blob([dataStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      alert(`✅ 개발현황 데이터가 ${fileName}으로 성공적으로 백업되었습니다.`);
    } catch (error) {
      alert("정보를 백업하는 데 실패했습니다.");
    }
  };

  const handleCloudBackup = async () => {
    try {
      await cloudBackup(projectData);
      alert('클라우드 백업이 완료되었습니다.');
    } catch (error) {
      alert('클라우드 백업 중 오류가 발생했습니다.');
    }
  };

  const handleCloudRestore = async () => {
    try {
      const restoredData = await cloudRestore();
      if (restoredData) {
        const restoredDataWithLog = {
          ...restoredData,
          logs: [
            ...(restoredData.logs || []),
            {
              timestamp: getTimestamp(),
              message: '클라우드 백업에서 데이터가 성공적으로 복원되었습니다.',
            }
          ]
        };

        updateProjectData(draft => {
          Object.assign(draft, restoredDataWithLog);
        });

        alert('클라우드 백업에서 데이터를 성공적으로 복원했습니다.');
      }
    } catch (error) {
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
    if (!dataToRestore) {
      return;
    }
    try {
      const restoredDataWithLog = {
        ...dataToRestore,
        logs: [
          ...dataToRestore.logs,
          {
            timestamp: getTimestamp(),
            message: '데이터가 백업 파일로부터 성공적으로 복원되었습니다.',
          }
        ]
      };
      
      // 올바른 방식으로 데이터 복원
      updateProjectData(draft => {
        Object.assign(draft, restoredDataWithLog);
      });
      
      setDataToRestore(null);
      alert('데이터 복원이 완료되었습니다.');
    } catch (error) {
      alert(`데이터 복원 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [dataToRestore, updateProjectData, getTimestamp]);

  const cancelRestore = useCallback(() => {
    setDataToRestore(null);
    alert('복원 작업이 취소되었습니다.');
  }, []);

  // 개발용: 로컬 스토리지 초기화 함수
  const clearLocalStorage = useCallback(() => {
    if (window.confirm('⚠️ 로컬 스토리지의 모든 데이터를 삭제하고 초기 상태로 리셋하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      try {
        // 삭제 전 현재 상태 로깅
        console.log('🔍 삭제 전 로컬 스토리지 상태:', {
          crazyshot_project_data: localStorage.getItem('crazyshot_project_data'),
          project_version: localStorage.getItem('project_version'),
          activeTab: localStorage.getItem('activeTab')
        });
        
        localStorage.removeItem('crazyshot_project_data');
        localStorage.removeItem('project_version');
        localStorage.removeItem('activeTab');
        console.log('🗑️ 로컬 스토리지 초기화 완료');
        alert('✅ 로컬 스토리지가 초기화되었습니다. 페이지를 새로고침하세요.');
        window.location.reload();
      } catch (error) {
        console.error('❌ 로컬 스토리지 초기화 실패:', error);
        alert('❌ 로컬 스토리지 초기화에 실패했습니다.');
      }
    }
  }, []);

  // 개발용: 현재 상태 확인 함수
  const checkCurrentState = useCallback(() => {
    console.log('📊 현재 프로젝트 상태:', {
      projectPhases: projectData.projectPhases,
      phasesCount: projectData.projectPhases.length,
      logs: projectData.logs,
      localStorage: {
        crazyshot_project_data: localStorage.getItem('crazyshot_project_data'),
        project_version: localStorage.getItem('project_version')
      }
    });
  }, [projectData]);

  return (
    <>
      {/* 다중 사용자 강화된 경고 스낵바 */}
      <TopSnackbar
        isVisible={showUserSnackbar}
        message={`🚨 위험: ${status.activeUserCount}명 동시 접속! 데이터 변경 시 충돌 위험이 높습니다. 작업 전 다른 사용자와 협의하세요.`}
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
                                         <CloudUploadIcon className="w-4 h-4" /> 클라우드 백업
                                     </button>
                                     <button onClick={handleCloudRestore} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                         <CloudDownloadIcon className="w-4 h-4" /> 클라우드 복원
                                     </button>
                                   </>
                                 )}
                                 <div className="text-xs text-gray-500">
                                   {currentVersion && (
                                     <span>현재 버전: {currentVersion.slice(-8)}</span>
                                   )}
                                   {isAutoSyncWorking && (
                                     <span className="ml-2 text-green-600">✓ 자동 동기화 활성</span>
                                   )}
                                 </div>
                                 <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                     <SaveIcon className="w-4 h-4" /> 파일 백업
                                 </button>
                                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                 <button onClick={handleRestoreClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                     <UploadIcon className="w-4 h-4" /> 파일 복원
                                 </button>
                                <button onClick={downloadAsCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-crazy-blue rounded-lg shadow-md hover:bg-crazy-bright-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-bright-blue transition-colors">
                                    <DownloadIcon className="w-4 h-4" /> 엑셀 내보내기
                                </button>
                                {/* 개발 환경에서만 표시되는 버튼들 */}
                                {process.env.NODE_ENV === 'development' && (
                                  <>
                                    <button onClick={checkCurrentState} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-white border border-blue-600 rounded-lg shadow-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors">
                                        📊 상태 확인
                                    </button>
                                    <button onClick={clearLocalStorage} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-white border border-red-600 rounded-lg shadow-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-colors">
                                        🗑️ 로컬 데이터 초기화
                                    </button>
                                  </>
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