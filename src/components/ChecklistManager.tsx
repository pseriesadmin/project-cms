import React from 'react';
import type { ChecklistItem as ChecklistItemType, Task } from '../types';
import { ChecklistItem } from './ChecklistItem';
import { PlusIcon } from './icons';

interface ChecklistManagerProps {
  checkpoints: ChecklistItemType[];
  onUpdate: (updates: Partial<Task>) => void;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  checkpoints,
  onUpdate,
}) => {
  const handleToggle = (itemId: string, completed: boolean) => {
    const newCheckpoints = checkpoints.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );
    onUpdate({ checkpoints: newCheckpoints });
  };

  const handleUpdateText = (itemId: string, text: string) => {
    const newCheckpoints = checkpoints.map(item =>
      item.id === itemId ? { ...item, text } : item
    );
    onUpdate({ checkpoints: newCheckpoints });
  };

  const handleDelete = (itemId: string) => {
    const newCheckpoints = checkpoints.filter(item => item.id !== itemId);
    onUpdate({ checkpoints: newCheckpoints });
  };
  
  const handleAdd = () => {
      const newCheckpoint: ChecklistItemType = {
        id: `cp-${Date.now()}`,
        text: '항목 추가',
        completed: false,
      };
      const newCheckpoints = [...checkpoints, newCheckpoint];
      onUpdate({ checkpoints: newCheckpoints });
  }

  return (
    <div className="space-y-1 p-1">
      {checkpoints.map(item => (
        <ChecklistItem
          key={item.id}
          item={item}
          onToggle={(completed) => handleToggle(item.id, completed)}
          onUpdateText={(text) => handleUpdateText(item.id, text)}
          onDelete={() => handleDelete(item.id)}
        />
      ))}
      <button 
        onClick={handleAdd}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-crazy-blue p-1 rounded-md"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        추가
      </button>
    </div>
  );
};