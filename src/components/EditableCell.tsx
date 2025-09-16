import React, { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, multiline = false, className, inputClassName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);
  
  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.focus();
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = () => {
    if (currentValue !== value) {
        onSave(currentValue.trim());
        
        // 글로벌 스마트 동기화 트리거 (저장 시 즉시 반영)
        const triggerSmartSync = (window as any).triggerSmartSync;
        if (typeof triggerSmartSync === 'function') {
          triggerSmartSync();
        }
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 다중 라인 입력에서 Shift+Enter로 줄바꿈, 일반 Enter로 저장
    if (e.key === 'Enter') {
      if (multiline && e.shiftKey) {
        // Shift+Enter: 줄바꿈 (기본 동작 유지)
        return;
      }
      
      // 일반 Enter: 저장 및 동기화 (단일/다중 라인 모두 적용)
      if (currentValue !== value) {
        onSave(currentValue.trim());
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={textareaRef}
        value={currentValue}
        onChange={handleTextareaChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-crazy-blue focus:border-crazy-blue resize-none overflow-hidden bg-white ${inputClassName || ''}`}
        rows={1}
      />
    ) : (
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-crazy-blue focus:border-crazy-blue bg-white ${inputClassName || ''}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`w-full whitespace-pre-wrap cursor-pointer group rounded-md ${className || ''}`}
    >
      {value || <span className="text-slate-400 italic">내용 없음</span>}
       <span className="block text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">클릭하여 수정</span>
    </div>
  );
};