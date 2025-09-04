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
    exportLogToCSV,
    backupToJSON,
    importFromCSV,
    restoreFromJSON
  } = useEquipmentExport();

  const handleExportCSV = () => {
    exportToCSV(equipmentData, formFields);
  };

  const handleExportLog = () => {
    exportLogToCSV(logData, logArchive);
  };

  const handleBackup = async () => {
    try {
      await backupToJSON(equipmentData, logData, logArchive, formFields, versionHistory);
    } catch (error) {
      console.error('백업 실패:', error);
      alert('백업 중 오류가 발생했습니다.');
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
        logDetailedChange('복원', 'N/A', null, null);
        
        alert('데이터가 성공적으로 복원되었습니다.');
        // 페이지 새로고침으로 완전한 상태 업데이트
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : '데이터 복원에 실패했습니다.');
      }
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-bold text-stone-800 mb-4">장비 관리</h2>
      
      <div className="flex flex-wrap items-center justify-start gap-2 mb-4">
        <button
          onClick={onAddEquipment}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap"
        >
          새 장비 등록
        </button>
        
        <button
          onClick={onManageFields}
          className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-md hover:bg-purple-600 transition-colors duration-200 whitespace-nowrap"
        >
          양식 항목 관리
        </button>
        
        <button
          onClick={handleImportCSV}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap"
        >
          엑셀 파일 가져오기 📂
        </button>
        
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors duration-200 whitespace-nowrap"
        >
          엑셀로 내보내기 💾
        </button>
        
        <button
          onClick={handleBackup}
          className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200 whitespace-nowrap"
        >
          데이터 백업 📁
        </button>
        
        <button
          onClick={handleRestore}
          className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200 whitespace-nowrap"
        >
          데이터 복원 🔄
        </button>
        
        <button
          onClick={handleExportLog}
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors duration-200 whitespace-nowrap"
        >
          로그 내보내기 📋
        </button>
        
        <span className="text-xs text-gray-600 ml-2">자동백업: 활성화</span>
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
