import React, { useMemo } from 'react';
import type { ProjectPhase, Task } from '../types';
import { TaskRow } from './TaskRow';
import { PlusIcon, TrashIcon } from './icons';
import { EditableCell } from './EditableCell';

interface ProjectPhaseCardProps {
  phase: ProjectPhase;
  onUpdateTask: (phaseId: string, taskId: string, updates: Partial<Task>) => void;
  onAddTask: (phaseId: string) => void;
  onDeleteTask: (phaseId: string, taskId: string) => void;
  onUpdatePhase: (phaseId: string, updates: Partial<ProjectPhase>) => void;
  onDeletePhase: (phaseId: string) => void;
}

export const ProjectPhaseCard: React.FC<ProjectPhaseCardProps> = ({
  phase,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onUpdatePhase,
  onDeletePhase,
}) => {
  const { totalCheckpoints, completedCheckpoints } = useMemo(() => {
    let total = 0;
    let completed = 0;
    phase.tasks.forEach(task => {
      total += task.checkpoints.length;
      completed += task.checkpoints.filter(c => c.completed).length;
    });
    return { totalCheckpoints: total, completedCheckpoints: completed };
  }, [phase.tasks]);

  const progress = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;

  return (
    <section className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-200">
        <div className="flex justify-between items-start gap-4 mb-2">
            <div className="flex-grow">
                 <EditableCell
                    value={phase.title}
                    onSave={(newTitle) => onUpdatePhase(phase.id, { title: newTitle })}
                    className="text-xl font-semibold text-crazy-dark-blue p-1 -m-1 hover:bg-slate-100"
                    inputClassName="text-xl font-semibold"
                />
            </div>
            <button
              onClick={() => onDeletePhase(phase.id)}
              className="text-slate-400 hover:text-crazy-red p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-red flex-shrink-0"
              aria-label="워크플로우 삭제"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-crazy-bright-blue h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-slate-600 w-12 text-right">{progress}%</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100">
            <tr>
              <th scope="col" className="px-4 py-3 w-[25%]">주요 업무</th>
              <th scope="col" className="px-4 py-3 w-[10%]">담당자</th>
              <th scope="col" className="px-4 py-3 w-[10%]">진행 일정</th>
              <th scope="col" className="px-4 py-3 w-[20%]">확인 조건</th>
              <th scope="col" className="px-4 py-3 w-[20%]">성과기록</th>
              <th scope="col" className="px-4 py-3 w-[10%]">특이사항/이슈</th>
              <th scope="col" className="px-4 py-3 w-[5%] text-center">삭제</th>
            </tr>
          </thead>
          <tbody>
            {phase.tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                phaseId={phase.id}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button
          onClick={() => onAddTask(phase.id)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-crazy-blue hover:text-white border border-crazy-blue rounded-md hover:bg-crazy-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          업무 추가
        </button>
      </div>
    </section>
  );
};