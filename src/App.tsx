import React from 'react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ProjectPhaseCard } from './components/ProjectPhaseCard';
import { initialData } from './data/initialData';
import type { ProjectPhase, Task, ProjectData, ChecklistItem, PerformanceRecord } from './types';
import { CrazyshotLogo, DownloadIcon, UploadIcon, PlusIcon, SaveIcon } from './components/icons';
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
  const [activeTab, setActiveTab] = useState<TabId>('workflow');
  const [showUserSnackbar, setShowUserSnackbar] = useState(false);
  const [showActivitySnackbar, setShowActivitySnackbar] = useState(false);

  // 실시간 사용자 세션 관리
  const { 
    activeUsers, 
    recentActions, 
    notifyUserAction, 
    hasMultipleUsers 
  } = useUserSession();

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
    backupState
  } = useProjectSync(initialData);

  // 사용되지 않는 변수 참조 (lint 경고 해결)
  useEffect(() => {
    if (lastSyncTime) {
      console.log('마지막 동기화 시간:', lastSyncTime);
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

  // 다중 사용자 감지 시 스낵바 표시
  useEffect(() => {
    if (status.hasMultipleUsers && !showUserSnackbar) {
      setShowUserSnackbar(true);
      // 10초 후 자동 숨김
      setTimeout(() => setShowUserSnackbar(false), 10000);
    }
  }, [status.hasMultipleUsers, showUserSnackbar]);

  // 실시간 활동 알림 표시
  useEffect(() => {
    if (recentActions.length > 0 && hasMultipleUsers) {
      setShowActivitySnackbar(true);
      const timer = setTimeout(() => setShowActivitySnackbar(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [recentActions.length, hasMultipleUsers]);

  const handleUpdatePhase = useCallback((phaseId: string, updates: Partial<ProjectPhase>) => {
    updateProjectData(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (phase) {
        Object.assign(phase, updates);
        // 사용자 활동 알림
        notifyUserAction(`프로젝트 단계 '${phase.title}' 수정`);
      }
    });
  }, [updateProjectData, notifyUserAction]);

  const handleAddPhase = useCallback(() => {
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
  }, [updateProjectData, notifyUserAction]);

  const handleDeletePhase = useCallback((phaseId: string) => {
    setPhaseToDelete(phaseId);
  }, []);

  const confirmDeletePhase = useCallback(() => {
    if (!phaseToDelete) return;
    updateProjectData(draft => {
      const phaseIndex = draft.projectPhases.findIndex((p: ProjectPhase) => p.id === phaseToDelete);
      if (phaseIndex === -1) return;
      const [removedPhase] = draft.projectPhases.splice(phaseIndex, 1);
      // 삭제된 워크플로우 이름 사용 (lint 경고 해결)
      console.log(`삭제된 워크플로우: ${removedPhase.title}`);
    });
    setPhaseToDelete(null);
  }, [phaseToDelete, updateProjectData]);

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
      console.log(`삭제된 업무: ${removedTask.mainTask.join(', ')}`);
    });
    setTaskToDelete(null);
  }, [taskToDelete, updateProjectData]);

  const downloadAsCSV = () => {
    try {
      // CSV 헤더 생성
      const headers = [
        '워크플로우', '업무', '담당자', '일정', 
        '체크포인트', '완료 여부', '성과 날짜', 
        '성과 링크', '성과 코멘트', '이슈'
      ];

      // CSV 데이터 타입 정의
      type CSVRow = {
        [key: string]: string;
        워크플로우: string;
        업무: string;
        담당자: string;
        일정: string;
        체크포인트: string;
        완료여부: string;
        성과날짜: string;
        성과링크: string;
        성과코멘트: string;
        이슈: string;
      };

      // CSV 데이터 생성
      const csvData: CSVRow[] = projectData.projectPhases.flatMap(phase => 
        phase.tasks.map(task => ({
          워크플로우: phase.title,
          업무: task.mainTask.join(', '),
          담당자: task.personInCharge,
          일정: task.schedule,
          체크포인트: task.checkpoints.map(cp => cp.text).join('; '),
          완료여부: task.checkpoints.map(cp => cp.completed ? '완료' : '미완료').join('; '),
          성과날짜: task.performance.date,
          성과링크: task.performance.docLink,
          성과코멘트: task.performance.comment,
          이슈: task.issues
        }))
      );

      // CSV 문자열 생성
      const csvString = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
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
      console.error('CSV 내보내기 중 오류:', error);
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

          console.log(`✅ 백업 완료: ${fileName}`);
          alert(`✅ 개발현황 데이터가 ${fileName}으로 성공적으로 백업되었습니다.`);
          return;
        } catch (error: any) {
          // 사용자가 취소한 경우 (AbortError 또는 NotAllowedError)
          if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
            console.log('사용자가 백업을 취소했습니다.');
            return; // 취소 시 아무것도 하지 않음
          }
          
          // 실제 오류 발생 시에만 폴백 다운로드 실행
          console.log('디렉토리 선택 중 오류 발생, 기본 다운로드 실행:', error);
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
      
      console.log(`✅ 백업 완료 (다운로드): ${fileName}`);
      alert(`✅ 개발현황 데이터가 ${fileName}으로 성공적으로 백업되었습니다.`);
    } catch (error) {
      console.error("Failed to create backup file:", error);
      alert("정보를 백업하는 데 실패했습니다.");
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const sanitizeAndUpgradeData = (parsedJson: any): ProjectData => {
    console.log('Raw parsed JSON:', parsedJson);
    console.log('Parsed JSON type:', typeof parsedJson);
    console.log('Is array:', Array.isArray(parsedJson));
    console.log('Has projectPhases:', parsedJson && parsedJson.projectPhases);

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
        console.error('Unexpected JSON structure:', parsedJson);
        throw new Error("지원되지 않는 백업 파일 형식입니다. 파일 구조가 손상되었을 수 있습니다.");
      }
    } else {
      console.error('Invalid JSON structure:', parsedJson);
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

    console.log('Sanitized Phases:', sanitizedPhases);
    console.log('Raw Logs:', rawLogs);

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
      console.error('파일 읽기 오류:', reader.error);
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
        console.log('복원할 데이터:', dataToRestoreFromFile);
        setDataToRestore(dataToRestoreFromFile);
      } catch (error) {
        console.error('파일 복원 중 오류:', error);
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
      console.error('복원할 데이터가 없습니다.');
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
      console.log('복원된 데이터:', restoredDataWithLog);
      
      // 올바른 방식으로 데이터 복원
      updateProjectData(draft => {
        Object.assign(draft, restoredDataWithLog);
      });
      
      setDataToRestore(null);
      alert('데이터 복원이 완료되었습니다.');
    } catch (error) {
      console.error('데이터 복원 중 오류:', error);
      alert(`데이터 복원 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [dataToRestore, updateProjectData, getTimestamp]);

  const cancelRestore = useCallback(() => {
    setDataToRestore(null);
    alert('복원 작업이 취소되었습니다.');
  }, []);

  return (
    <>
      {/* 다중 사용자 알림 스낵바 */}
      <TopSnackbar
        isVisible={showUserSnackbar}
        message={`⚠️ 현재 ${status.activeUserCount}명이 동시에 접속중입니다. 데이터 변경 시 주의하세요.`}
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
                            <TabButton tabId="workflow" title="개발 현황" activeTab={activeTab} setActiveTab={setActiveTab} />
                            <TabButton tabId="dashboard" title="장비 현황" activeTab={activeTab} setActiveTab={setActiveTab} />
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
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                            <p className="text-crazy-gray">
                                실시간으로 프로젝트 각 분야 별 업무현황을 기록하고 공유하세요.
                            </p>
                            <div className="flex items-center gap-2">
                                <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                    <SaveIcon className="w-4 h-4" /> 정보 백업
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                <button onClick={handleRestoreClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-crazy-blue bg-white border border-crazy-blue rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors">
                                    <UploadIcon className="w-4 h-4" /> 정보 복원
                                </button>
                                <button onClick={downloadAsCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-crazy-blue rounded-lg shadow-md hover:bg-crazy-bright-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-bright-blue transition-colors">
                                    <DownloadIcon className="w-4 h-4" /> 엑셀 내보내기
                                </button>
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