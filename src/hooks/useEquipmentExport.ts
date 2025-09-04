import { useCallback } from 'react';
import Papa from 'papaparse';
import { Equipment, FormField, EquipmentLogEntry } from '../types';

export const useEquipmentExport = () => {
  // CSV 내보내기
  const exportToCSV = useCallback((
    equipmentData: Equipment[], 
    formFields: FormField[]
  ) => {
    // 모든 데이터 포함 (활성/비활성 필드 무관)
    const exportData = equipmentData.map(item => {
      const row: { [key: string]: any } = {};
      // 실제 데이터의 모든 속성 포함
      Object.keys(item).forEach(key => {
        const field = formFields.find(f => f.name === key);
        const label = field ? field.label : key;
        const value = item[key];
        row[label] = Array.isArray(value) ? value.join(', ') : value;
      });
      return row;
    });
    
    const csv = Papa.unparse(exportData, {
      quotes: true,
      header: true,
      delimiter: ','
    });
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `크레이지샷_장비현황_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }, []);

  // 로그 CSV 내보내기
  const exportLogToCSV = useCallback((
    logData: EquipmentLogEntry[], 
    logArchive: any[]
  ) => {
    const csvData = logArchive.flatMap(archive => archive.logs).concat(logData);
    const csv = Papa.unparse(csvData, {
      quotes: true,
      header: true
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `크레이지샷_변경로그_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }, []);

  // JSON 백업
  const backupToJSON = useCallback(async (
    equipmentData: Equipment[],
    logData: EquipmentLogEntry[],
    logArchive: any[],
    formFields: FormField[],
    versionHistory: any[]
  ) => {
    const allData = {
      equipmentData,
      logData,
      logArchive,
      formFields,
      versionHistory,
      geminiApiKey: localStorage.getItem('geminiApiKey') || null,
      backupTime: new Date().toISOString()
    };
    const json = JSON.stringify(allData, null, 2);

    // 브라우저 File System Access API 지원 여부 확인
    if ('showDirectoryPicker' in window && window.isSecureContext) {
      try {
        // 디렉토리 선택 대화상자 열기
        const dirHandle = await (window as any).showDirectoryPicker({ 
          mode: 'readwrite' 
        });

        // 파일명 생성
        const fileName = `크레이지샷_백업_${new Date().toISOString().slice(0, 10)}.json`;
        
        // 파일 생성 및 쓰기
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();

        alert(`데이터가 ${fileName}으로 백업되었습니다.`);
        return dirHandle;
      } catch (error) {
        // 사용자가 취소하거나 오류 발생 시 기존 방식 유지
        fallbackDownload(json);
        return null;
      }
    } else {
      // File System Access API 미지원 시 기본 다운로드
      fallbackDownload(json);
      return null;
    }
  }, []);

  // 폴백 다운로드
  const fallbackDownload = useCallback((json: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `크레이지샷_백업_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  }, []);

  // CSV 가져오기
  const importFromCSV = useCallback((
    file: File,
    formFields: FormField[]
  ): Promise<Equipment[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          try {
            if (results.data.length > 0) {
              const newEquipment = results.data.map((row: any) => {
                const item: any = {};
                Object.keys(row).forEach(key => {
                  // Match header to field name
                  const field = formFields.find(f => f.label === key);
                  if (field) {
                    if (field.type === 'number') {
                      item[field.name] = parseInt(row[key]) || 0;
                    } else if (field.name === 'features') {
                      item[field.name] = row[key] ? row[key].split(',').map((s: string) => s.trim()) : [];
                    } else {
                      item[field.name] = row[key] || '';
                    }
                  }
                });
                return item as Equipment;
              });
              resolve(newEquipment);
            } else {
              reject(new Error('CSV 파일에 데이터가 없습니다.'));
            }
          } catch (error) {
            reject(new Error('CSV 파일 처리 중 오류가 발생했습니다.'));
          }
        },
        error: function(error) {
          reject(new Error(`CSV 파싱 오류: ${error.message}`));
        }
      });
    });
  }, []);

  // JSON 복원
  const restoreFromJSON = useCallback((file: File): Promise<{
    equipmentData: Equipment[];
    logData: EquipmentLogEntry[];
    logArchive: any[];
    formFields: FormField[];
    geminiApiKey?: string;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const restoredData = JSON.parse(e.target?.result as string);
          
          // Gemini API 키 복원
          if (restoredData.geminiApiKey) {
            localStorage.setItem('geminiApiKey', restoredData.geminiApiKey);
          }
          
          resolve({
            equipmentData: restoredData.equipmentData || [],
            logData: restoredData.logData || [],
            logArchive: restoredData.logArchive || [],
            formFields: restoredData.formFields || [],
            geminiApiKey: restoredData.geminiApiKey
          });
        } catch (error) {
          reject(new Error('잘못된 JSON 파일 형식입니다.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
      };
      reader.readAsText(file);
    });
  }, []);

  return {
    exportToCSV,
    exportLogToCSV,
    backupToJSON,
    importFromCSV,
    restoreFromJSON,
    fallbackDownload
  };
};
