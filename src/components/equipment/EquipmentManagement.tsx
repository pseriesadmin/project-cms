import React, { useRef } from 'react';
import { Equipment, EquipmentLogEntry, FormField, VersionHistory } from '../../types';
import { useEquipmentExport } from '../../hooks/useEquipmentExport';

interface EquipmentManagementProps {
  equipmentData: Equipment[];
  logData: EquipmentLogEntry[];
  logArchive: any[];
  formFields: FormField[];
  onAddEquipment: () => void;
  onManageFields: () => void;
  saveData: (data: Equipment[]) => void;
  saveFormFields: (fields: FormField[]) => void;
  logDetailedChange: (action: string, itemCode: string, oldData: any, newData: any, userId?: string) => void;
  versionHistory: VersionHistory[];
}

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({
  equipmentData,
  logData,
  logArchive,
  formFields,
  onAddEquipment,
  onManageFields,
  saveData,
  saveFormFields,
  logDetailedChange,
  versionHistory
}) => {
  const importFileRef = useRef<HTMLInputElement>(null);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const {
    exportToCSV,
    backupToJSON,
    importFromCSV,
    restoreFromJSON,
    cloudBackup,
    cloudRestore
  } = useEquipmentExport();

  const handleExportCSV = () => {
    exportToCSV(equipmentData, formFields);
  };

  const handleBackup = async () => {
    try {
      await backupToJSON(equipmentData, logData, logArchive, formFields, versionHistory);
    } catch (error) {
      console.error('로컬 백업 실패:', error);
      alert('로컬 백업 중 오류가 발생했습니다.');
    }
  };

  const handleCloudBackup = async () => {
    try {
      await cloudBackup(equipmentData, logData, logArchive, formFields, versionHistory);
    } catch (error) {
      console.error('클라우드 백업 실패:', error);
      // 에러는 cloudBackup 함수에서 이미 처리됨
    }
  };

  const handleImportCSV = () => {
    importFileRef.current?.click();
  };

  const handleRestore = () => {
    restoreFileRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const newEquipment = await importFromCSV(file, formFields);
      saveData(newEquipment);
      logDetailedChange('파일 가져오기', 'N/A', null, null);
      alert('CSV 파일에서 데이터를 성공적으로 가져왔습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'CSV 파일 가져오기에 실패했습니다.');
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  const handleFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (confirm('현재 데이터를 백업 파일의 데이터로 덮어쓰시겠습니까? 모든 기존 데이터가 사라집니다.')) {
      try {
        const restoredData = await restoreFromJSON(file);
        
        saveData(restoredData.equipmentData);
        saveFormFields(restoredData.formFields);
        logDetailedChange('파일 복원', 'N/A', null, null);
        
        alert('파일에서 데이터가 성공적으로 복원되었습니다.');
        // 페이지 새로고침으로 완전한 상태 업데이트
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : '데이터 복원에 실패했습니다.');
      }
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  const handleCloudRestore = async () => {
    if (confirm('클라우드에서 데이터를 복원하시겠습니까? 현재 데이터가 덮어쓰여집니다.')) {
      try {
        const restoredData = await cloudRestore();
        
        saveData(restoredData.equipmentData);
        saveFormFields(restoredData.formFields);
        logDetailedChange('클라우드 복원', 'N/A', null, null);
        
        alert('클라우드에서 데이터가 성공적으로 복원되었습니다.');
        // 페이지 새로고침으로 완전한 상태 업데이트
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : '클라우드 복원에 실패했습니다.');
      }
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-bold text-stone-800 mb-4">장비 관리</h2>
      
      <div className="flex flex-wrap items-center justify-start gap-2 mb-4">
        <button
          onClick={onAddEquipment}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          제품 등록
        </button>
        
        <button
          onClick={onManageFields}
          className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-md hover:bg-purple-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          양식 관리
        </button>
        
        <button
          onClick={handleImportCSV}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-9.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          엑셀 입력
        </button>
        
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-9.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          엑셀 출력
        </button>
        
        <button
          onClick={handleBackup}
          className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v4m0 0l-2-2m2 2l2-2" />
          </svg>
          로컬 백업
        </button>
        
        <button
          onClick={handleRestore}
          className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          로컬 복원
        </button>
        
        <button
          onClick={handleCloudBackup}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977 4.5 4.5 0 014.496 4.97.75.75 0 01-.994.668l-.274-.097a.75.75 0 01-.394-.461 3 3 0 00-5.856-.961 3.5 3.5 0 01-4.256 4.803z" />
          </svg>
          클라우드 백업
        </button>
        
        <button
          onClick={handleCloudRestore}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977 4.5 4.5 0 014.496 4.97.75.75 0 01-.994.668l-.274-.097a.75.75 0 01-.394-.461 3 3 0 00-5.856-.961 3.5 3.5 0 01-4.256 4.803z" />
            <path fillRule="evenodd" d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977 4.5 4.5 0 014.496 4.97.75.75 0 01-.994.668l-.274-.097a.75.75 0 01-.394-.461 3 3 0 00-5.856-.961 3.5 3.5 0 01-4.256 4.803zM9 8a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 019 8z" clipRule="evenodd" />
          </svg>
          클라우드 복원
        </button>
        
        <span className="text-xs text-gray-600 ml-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977 4.5 4.5 0 014.496 4.97.75.75 0 01-.994.668l-.274-.097a.75.75 0 01-.394-.461 3 3 0 00-5.856-.961 3.5 3.5 0 01-4.256 4.803z" />
          </svg>
          자동백업: 30초마다 클라우드에 실시간 동기화
        </span>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={importFileRef}
        type="file"
        accept=".csv"
        onChange={handleFileImport}
        className="hidden"
      />
      <input
        ref={restoreFileRef}
        type="file"
        accept=".json"
        onChange={handleFileRestore}
        className="hidden"
      />
    </section>
  );
};
