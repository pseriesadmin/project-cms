import React from 'react';
import { useState, useCallback, useRef, useMemo } from 'react';
import { ProjectPhaseCard } from './components/ProjectPhaseCard';
import { initialData } from './data/initialData';
import type { ProjectPhase, Task, ProjectData, ChecklistItem, PerformanceRecord } from './types';
import { CrazyshotLogo, DownloadIcon, UploadIcon, PlusIcon, SaveIcon } from './components/icons';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ChangeLogDisplay } from './components/ChangeLogDisplay';
import { LogModal } from './components/LogModal';
import { ProductDashboard } from './components/ProductDashboard';

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
  const [projectData, setProjectData] = useState<ProjectData>(initialData);
  const [taskToDelete, setTaskToDelete] = useState<{ phaseId: string; taskId: string } | null>(null);
  const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [dataToRestore, setDataToRestore] = useState<ProjectData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('workflow');

  const { projectPhases, logs } = projectData;
  
  const getTimestamp = () => new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const updateState = useCallback((updater: (draft: ProjectData) => void) => {
    setProjectData(currentState => {
      const draft = JSON.parse(JSON.stringify(currentState));
      updater(draft);
      return draft;
    });
  }, []);

  const { totalCheckpoints, completedCheckpoints } = useMemo(() => {
    let total = 0;
    let completed = 0;
    projectPhases.forEach(phase => {
      phase.tasks.forEach(task => {
        total += task.checkpoints.length;
        completed += task.checkpoints.filter(c => c.completed).length;
      });
    });
    return { totalCheckpoints: total, completedCheckpoints: completed };
  }, [projectPhases]);

  const totalProgress = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;

  // ... (All other handler functions: handleUpdatePhase, handleAddPhase, etc. remain the same)
  const handleUpdatePhase = useCallback((phaseId: string, updates: Partial<ProjectPhase>) => {
    updateState(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const originalTitle = phase.title;
      Object.assign(phase, updates);
      if (updates.title && originalTitle !== updates.title) {
          draft.logs.unshift({
              timestamp: getTimestamp(),
              message: `워크플로우 '${originalTitle}'의 이름이 '${updates.title}'(으)로 변경되었습니다.`
          });
      }
    });
  }, [updateState]);

  const handleAddPhase = useCallback(() => {
    updateState(draft => {
      const newPhase: ProjectPhase = {
        id: `phase-${Date.now()}`,
        title: '새 워크플로우',
        tasks: [],
      };
      draft.projectPhases.push(newPhase);
      draft.logs.unshift({
          timestamp: getTimestamp(),
          message: `새 워크플로우 '${newPhase.title}'이(가) 추가되었습니다.`
      });
    });
  }, [updateState]);

  const handleDeletePhase = useCallback((phaseId: string) => {
    setPhaseToDelete(phaseId);
  }, []);

  const confirmDeletePhase = useCallback(() => {
    if (!phaseToDelete) return;
    updateState(draft => {
      const phaseIndex = draft.projectPhases.findIndex((p: ProjectPhase) => p.id === phaseToDelete);
      if (phaseIndex === -1) return;
      const [removedPhase] = draft.projectPhases.splice(phaseIndex, 1);
      draft.logs.unshift({
          timestamp: getTimestamp(),
          message: `워크플로우 '${removedPhase.title}'이(가) 삭제되었습니다.`
      });
    });
    setPhaseToDelete(null);
  }, [phaseToDelete, updateState]);

  const handleUpdateTask = useCallback((phaseId: string, taskId: string, updates: Partial<Task>) => {
    updateState(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const task = phase.tasks.find((t: Task) => t.id === taskId);
      if (!task) return;
      Object.assign(task, updates);
      draft.logs.unshift({
          timestamp: getTimestamp(),
          message: `'${phase.title}' 워크플로우의 업무가 수정되었습니다.`
      });
    });
  }, [updateState]);

  const handleAddTask = useCallback((phaseId: string) => {
    updateState(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const newTask: Task = {
        id: `task-${Date.now()}`,
        mainTask: ['새 업무'],
        personInCharge: '',
        schedule: '',
        checkpoints: [{ id: `cp-${Date.now()}`, text: '새 확인 조건', completed: false }],
        performance: { date: '', docLink: '', comment: '' },
        issues: '',
      };
      phase.tasks.push(newTask);
      draft.logs.unshift({
          timestamp: getTimestamp(),
          message: `'${phase.title}' 워크플로우에 새 업무가 추가되었습니다.`
      });
    });
  }, [updateState]);

  const handleDeleteTask = useCallback((phaseId: string, taskId: string) => {
    setTaskToDelete({ phaseId, taskId });
  }, []);

  const confirmDeleteTask = useCallback(() => {
    if (!taskToDelete) return;
    const { phaseId, taskId } = taskToDelete;
    updateState(draft => {
      const phase = draft.projectPhases.find((p: ProjectPhase) => p.id === phaseId);
      if (!phase) return;
      const taskIndex = phase.tasks.findIndex((t: Task) => t.id === taskId);
      if (taskIndex === -1) return;
      const [removedTask] = phase.tasks.splice(taskIndex, 1);
      draft.logs.unshift({
          timestamp: getTimestamp(),
          message: `'${phase.title}' 워크플로우에서 '${removedTask.mainTask.join(', ')}' 업무가 삭제되었습니다.`
      });
    });
    setTaskToDelete(null);
  }, [taskToDelete, updateState]);

  const downloadAsCSV = () => {
    const headers = ["Phase", "Main Task", "Person In Charge", "Schedule", "Checkpoints", "Performance Date", "Performance Doc Link", "Performance Comment", "Issues"];
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const rows = projectPhases.flatMap(phase =>
      phase.tasks.map(task => [
        escapeCSV(phase.title),
        escapeCSV(task.mainTask.join('\n')),
        escapeCSV(task.personInCharge),
        escapeCSV(task.schedule),
        escapeCSV(task.checkpoints.map(c => `${c.text} (${c.completed ? 'Done' : 'Pending'})`).join('\n')),
        escapeCSV(task.performance.date),
        escapeCSV(task.performance.docLink),
        escapeCSV(task.performance.comment),
        escapeCSV(task.issues),
      ].join(','))
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "crazyshot_project_workflow.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleBackup = () => {
    try {
      const dataStr = JSON.stringify(projectData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fileName = `crazyshot_backup_${year}-${month}-${day}-${hours}-${minutes}.json`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Failed to create backup file:", error);
      alert("정보를 백업하는 데 실패했습니다.");
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const sanitizeAndUpgradeData = (parsedJson: any): ProjectData => {
    let rawPhases: any[];
    let rawLogs: any[] = [];
    if (Array.isArray(parsedJson)) {
      rawPhases = parsedJson;
    } else if (parsedJson && typeof parsedJson === 'object' && Array.isArray(parsedJson.projectPhases)) {
      rawPhases = parsedJson.projectPhases;
      rawLogs = Array.isArray(parsedJson.logs) ? parsedJson.logs : [];
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
          ? { date: typeof task.performance.date === 'string' ? task.performance.date : '', docLink: typeof task.performance.docLink === 'string' ? task.performance.docLink : '', comment: typeof task.performance.comment === 'string' ? task.performance.comment : '' }
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
    if (!dataToRestore) return;
    const restoredDataWithLog = JSON.parse(JSON.stringify(dataToRestore));
    restoredDataWithLog.logs.unshift({
      timestamp: getTimestamp(),
      message: '데이터가 백업 파일로부터 성공적으로 복원되었습니다.',
    });
    setProjectData(restoredDataWithLog);
    setDataToRestore(null);
    alert('데이터 복원이 완료되었습니다.');
  }, [dataToRestore]);

  const cancelRestore = useCallback(() => {
    setDataToRestore(null);
    alert('복원 작업이 취소되었습니다.');
  }, []);

  return (
    <>
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
                    <nav className="flex" aria-label="Tabs">
                        <TabButton tabId="workflow" title="개발 현황" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton tabId="dashboard" title="장비 현황" activeTab={activeTab} setActiveTab={setActiveTab} />
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
                        <ChangeLogDisplay logs={logs} onShowMore={() => setIsLogModalOpen(true)} />
                    </header>

                    {projectPhases.map(phase => (
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
      <LogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} logs={logs} />
    </>
  );
};

export default App;