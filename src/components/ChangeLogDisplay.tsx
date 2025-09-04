import React from 'react';
import type { LogEntry } from '../types';

interface ChangeLogDisplayProps {
  logs: LogEntry[];
  onShowMore: () => void;
}

export const ChangeLogDisplay: React.FC<ChangeLogDisplayProps> = ({ logs, onShowMore }) => {
  const latestLog = logs[0];

  return (
    <div className="mt-4 p-3 bg-slate-200 rounded-lg flex items-center justify-between text-sm">
      <div className="flex-grow overflow-hidden">
        <span className="font-semibold text-crazy-dark-blue mr-2">정보변경로그:</span>
        {latestLog ? (
          <span className="text-slate-700 truncate">
            <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded mr-2">{latestLog.timestamp}</span>
            {latestLog.message}
          </span>
        ) : (
          <span className="text-slate-500 italic">변경 내역이 없습니다.</span>
        )}
      </div>
      <button
        onClick={onShowMore}
        className="ml-4 px-3 py-1 text-xs font-semibold text-crazy-blue bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crazy-blue transition-colors flex-shrink-0"
      >
        더보기
      </button>
    </div>
  );
};