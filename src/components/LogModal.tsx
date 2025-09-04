import React from 'react';
import type { LogEntry } from '../types';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <h3 className="text-lg font-bold text-crazy-dark-blue">정보 변경 로그 전체보기</h3>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
          {logs.length > 0 ? (
            <ul className="space-y-3">
              {logs.map((log, index) => (
                <li key={index} className="text-sm pb-3 border-b border-slate-100 last:border-b-0">
                  <span className="font-mono text-xs text-slate-500 block mb-1">{log.timestamp}</span>
                  <p className="text-slate-800">{log.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-center py-8">기록된 로그가 없습니다.</p>
          )}
        </div>
        <div className="bg-slate-50 px-6 py-3 flex justify-end items-center gap-3 rounded-b-lg border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};