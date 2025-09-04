import React from 'react';
import type { ChecklistItem as ChecklistItemType } from '../types';
import { CheckIcon, TrashIcon } from './icons';
import { EditableCell } from './EditableCell';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (completed: boolean) => void;
  onUpdateText: (text: string) => void;
  onDelete: () => void;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({ item, onToggle, onUpdateText, onDelete }) => {
  const inputId = `checkbox-${item.id}`;

  return (
    <div className="flex items-center space-x-2 group">
      <label htmlFor={inputId} className="relative flex items-center justify-center p-1 cursor-pointer -m-1">
        <input
          id={inputId}
          type="checkbox"
          checked={item.completed}
          onChange={(e) => onToggle(e.target.checked)}
          className="peer appearance-none h-5 w-5 border-2 border-slate-300 rounded-md checked:bg-crazy-blue checked:border-crazy-blue focus:outline-none transition-colors duration-200 flex-shrink-0"
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none">
          <CheckIcon className="w-4 h-4" />
        </div>
      </label>
      <div className={`flex-grow ${item.completed ? 'line-through text-slate-400' : ''}`}>
        <EditableCell
          value={item.text}
          onSave={onUpdateText}
          className="py-1 text-sm hover:bg-slate-100"
        />
      </div>
      <button
        onClick={onDelete}
        className="text-slate-400 hover:text-crazy-red p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="확인 조건 삭제"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
};