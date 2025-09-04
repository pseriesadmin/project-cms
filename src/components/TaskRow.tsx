import React from 'react';
import type { Task, PerformanceRecord } from '../types';
import { PerformanceRecordEditor } from './PerformanceRecordEditor';
import { EditableCell } from './EditableCell';
import { TrashIcon } from './icons';
import { ChecklistManager } from './ChecklistManager';

interface TaskRowProps {
  task: Task;
  phaseId: string;
  onUpdateTask: (phaseId: string, taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (phaseId: string, taskId: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  phaseId,
  onUpdateTask,
  onDeleteTask,
}) => {

  const handleTaskUpdate = (updates: Partial<Task>) => {
    onUpdateTask(phaseId, task.id, updates);
  };

  const cellClassName = "p-2 text-sm hover:bg-slate-100 min-h-[40px]";

  return (
    <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 align-top">
      <td className="px-4 py-3 font-medium text-slate-900">
        <EditableCell
          value={task.mainTask.join('\n')}
          onSave={(newValue) => handleTaskUpdate({ mainTask: newValue.split('\n').filter(line => line.trim() !== '') })}
          multiline
          className={cellClassName}
        />
      </td>
      <td className="px-4 py-3">
        <EditableCell
          value={task.personInCharge}
          onSave={(newValue) => handleTaskUpdate({ personInCharge: newValue })}
          className={cellClassName}
        />
      </td>
      <td className="px-4 py-3">
        <EditableCell
          value={task.schedule}
          onSave={(newValue) => handleTaskUpdate({ schedule: newValue })}
          className={cellClassName}
        />
      </td>
      <td className="px-4 py-3">
        <ChecklistManager
            checkpoints={task.checkpoints}
            onUpdate={handleTaskUpdate}
        />
      </td>
      <td className="px-4 py-3">
        <PerformanceRecordEditor
          record={task.performance}
          onSave={(newRecord: PerformanceRecord) => handleTaskUpdate({ performance: newRecord })}
        />
      </td>
      <td className="px-4 py-3">
        <EditableCell
          value={task.issues}
          onSave={(newValue) => handleTaskUpdate({ issues: newValue })}
          multiline
          className={cellClassName}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onDeleteTask(phaseId, task.id)}
          className="text-slate-400 hover:text-crazy-red p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-red"
          aria-label="업무 삭제"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </td>
    </tr>
  );
};