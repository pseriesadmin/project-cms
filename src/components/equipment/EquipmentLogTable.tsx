import React, { useState } from 'react';
import { EquipmentLogEntry } from '../../types';
import { useEquipmentExport } from '../../hooks/useEquipmentExport';

interface EquipmentLogTableProps {
  logData: EquipmentLogEntry[];
  logArchive: any[];
}

export const EquipmentLogTable: React.FC<EquipmentLogTableProps> = ({
  logData,
  logArchive
}) => {
  const [showAllLogs, setShowAllLogs] = useState(false);
  const { exportLogToCSV } = useEquipmentExport();

  const handleExportLog = () => {
    exportLogToCSV(logData, logArchive);
  };

  const allLogs = React.useMemo(() => {
    const combined = [...logData];
    logArchive.forEach(archive => {
      combined.push(...archive.logs);
    });
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logData, logArchive]);

  const displayLogs = showAllLogs ? allLogs : logData.slice(0, 5);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-stone-800">장비 변경 로그</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAllLogs(!showAllLogs)}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap"
          >
            {showAllLogs ? '최근 로그만 보기' : '전체 로그 보기'} 📋
          </button>
          <button
            onClick={handleExportLog}
            className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200 whitespace-nowrap"
          >
            로그 파일 다운로드 💾
          </button>
        </div>
      </div>
      
      <p className="text-stone-500 mb-4 text-sm">
        {showAllLogs 
          ? '모든 장비 정보 변경 내역을 시간 순으로 보여줍니다.'
          : '최근 장비 정보 변경 내역을 시간 순으로 보여줍니다.'
        }
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                시간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                작업
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                장비 코드
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                메시지
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {displayLogs.length > 0 ? (
              displayLogs.map(log => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {log.itemCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">
                    {log.summary}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">
                  아직 변경 로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAllLogs && allLogs.length > 10 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-stone-500">
            총 {allLogs.length}개의 로그 항목이 있습니다.
          </p>
        </div>
      )}
    </section>
  );
};
