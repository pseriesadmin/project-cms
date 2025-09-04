import React, { useState, useEffect } from 'react';
import type { PerformanceRecord } from '../types';

interface PerformanceRecordEditorProps {
  record: PerformanceRecord;
  onSave: (newRecord: PerformanceRecord) => void;
}

export const PerformanceRecordEditor: React.FC<PerformanceRecordEditorProps> = ({ record, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<PerformanceRecord>(record);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setCurrentRecord(record);
    const dates = record.date.split('~').map(d => d.trim());
    setStartDate(dates[0] || '');
    setEndDate(dates[1] || '');
  }, [record]);

  const handleSave = () => {
    const newDate = [startDate, endDate].filter(Boolean).join(' ~ ');
    const newRecord = { ...currentRecord, date: newDate };
    onSave(newRecord);
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentRecord(prev => ({ ...prev, [name]: value }));
  };

  const renderDocLink = (link: string) => {
    if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
      return (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
          {link}
        </a>
      );
    }
    return <span className="break-all">{link || '...'}</span>;
  };

  if (isEditing) {
    return (
      <div className="space-y-2 p-2">
        <div>
          <label className="text-xs font-semibold text-slate-500">날짜 (시작일 ~ 완료일):</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full text-sm p-1.5 border border-slate-300 rounded-md focus:ring-crazy-blue focus:border-crazy-blue"
            />
            <span>~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full text-sm p-1.5 border border-slate-300 rounded-md focus:ring-crazy-blue focus:border-crazy-blue"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">문서링크:</label>
          <input
            type="text"
            name="docLink"
            value={currentRecord.docLink}
            onChange={handleInputChange}
            placeholder="https://..."
            className="block w-full text-sm p-1.5 border border-slate-300 rounded-md focus:ring-crazy-blue focus:border-crazy-blue"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">코멘트:</label>
          <input
            type="text"
            name="comment"
            value={currentRecord.comment}
            onChange={handleInputChange}
            placeholder="코멘트 입력"
            className="block w-full text-sm p-1.5 border border-slate-300 rounded-md focus:ring-crazy-blue focus:border-crazy-blue"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm font-medium text-white bg-crazy-blue rounded-md hover:bg-crazy-bright-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue"
          >
            저장
          </button>
           <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer group p-2 rounded-md hover:bg-slate-100 min-h-[100px] flex flex-col justify-between">
      <div>
        <p className="text-xs"><span className="font-semibold">날짜:</span> {record.date || '...'}</p>
        <div className="text-xs"><span className="font-semibold">문서링크:</span> {renderDocLink(record.docLink)}</div>
        <p className="text-xs"><span className="font-semibold">코멘트:</span> {record.comment || '...'}</p>
      </div>
      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-2">클릭하여 수정</span>
    </div>
  );
};