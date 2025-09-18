import { useCallback } from 'react';
import Papa from 'papaparse';
import { Equipment, FormField, EquipmentLogEntry, LogArchive } from '../types';
import { advancedFileSystemBackup } from '../utils/backupUtils';

export const useEquipmentExport = () => {
  // 클라우드 백업 (Vercel 기반)
  const cloudBackup = useCallback(async (
    equipmentData: Equipment[],
    logData: EquipmentLogEntry[],
    logArchive: LogArchive[],
    formFields: FormField[],
    _versionHistory: any[]
  ) => {
    try {
      const categoryCodes = JSON.parse(localStorage.getItem('category-codes') || '[]');
      const geminiApiKey = localStorage.getItem('geminiApiKey') || null;

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentData,
          logData,
          logArchive,
          formFields,
          categoryCodes,
          geminiApiKey
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 클라우드 백업 완료:', result.backupId);
        alert(`✅ 클라우드 백업이 완료되었습니다!\n\n백업 ID: ${result.backupId}\n포함된 데이터:\n- 장비목록: ${result.dataSize.장비목록}개\n- 변경로그: ${result.dataSize.로그}개\n- 양식항목: ${result.dataSize.양식항목}개\n- 분류코드: ${result.dataSize.분류코드}개`);
        return result.backupId;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ 클라우드 백업 실패:', error);
      alert('클라우드 백업 중 오류가 발생했습니다. 로컬 백업을 사용해주세요.');
      throw error;
    }
  }, []);

  // 클라우드 복원 (Vercel 기반)
  const cloudRestore = useCallback(async (): Promise<{
    equipmentData: Equipment[];
    logData: EquipmentLogEntry[];
    logArchive: any[];
    formFields: FormField[];
    categoryCodes?: any[];
    geminiApiKey?: string;
  }> => {
    try {
      const response = await fetch('/api/backup');
      const result = await response.json();
      
      if (result.success) {
        // localStorage 완전 복원
        if (result.data.geminiApiKey) {
          localStorage.setItem('geminiApiKey', result.data.geminiApiKey);
        }
        if (result.data.categoryCodes && Array.isArray(result.data.categoryCodes)) {
          localStorage.setItem('category-codes', JSON.stringify(result.data.categoryCodes));
        }
        // 로그 데이터 localStorage 복원 추가
        if (result.data.logData) {
          localStorage.setItem('logData', JSON.stringify(result.data.logData));
        }
        if (result.data.logArchive) {
          localStorage.setItem('logArchive', JSON.stringify(result.data.logArchive));
        }

        console.log('✅ 클라우드 복원 완료:', result.backupId);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ 클라우드 복원 실패:', error);
      throw new Error('클라우드에서 데이터를 복원할 수 없습니다.');
    }
  }, []);

  // CSV 내보내기 (엑셀 호환성 향상)
  const exportToCSV = useCallback((
    equipmentData: Equipment[], 
    formFields: FormField[]
  ) => {
    if (equipmentData.length === 0) {
      alert('내보낼 장비 데이터가 없습니다.');
      return;
    }

    // 모든 데이터 포함 (활성/비활성 필드 무관)
    const exportData = equipmentData.map(item => {
      const row: { [key: string]: any } = {};
      
      // 정렬된 필드 순서로 데이터 구성 (핵심 필드 우선)
      const orderedFields = [...formFields].sort((a, b) => {
        if (a.core && !b.core) return -1;
        if (!a.core && b.core) return 1;
        return 0;
      });
      
      orderedFields.forEach(field => {
        if (item.hasOwnProperty(field.name)) {
          const value = item[field.name];
          
          // 데이터 타입별 처리
          if (Array.isArray(value)) {
            row[field.label] = value.length > 0 ? value.join(', ') : '';
          } else if (value === null || value === undefined) {
            row[field.label] = '';
          } else if (field.type === 'number') {
            row[field.label] = Number(value) || 0;
          } else if (field.type === 'date') {
            row[field.label] = value || '';
          } else {
            row[field.label] = String(value);
          }
        } else {
          row[field.label] = '';
        }
      });
      
      return row;
    });
    
    const csv = Papa.unparse(exportData, {
      quotes: true,
      header: true,
      delimiter: ','
    });
    
    // UTF-8 BOM 추가로 엑셀에서 한글 깨짐 방지
    const blob = new Blob(["\ufeff" + csv], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `크레이지샷_장비현황_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 정리
    URL.revokeObjectURL(link.href);
    
    console.log(`✅ CSV 내보내기 완료: ${exportData.length}개 항목`);
  }, []);

  // 로그 CSV 내보내기 (개선된 버전)
  const exportLogToCSV = useCallback((
    logData: EquipmentLogEntry[], 
    logArchive: any[]
  ) => {
    // 모든 로그 데이터 병합 (아카이브 + 현재)
    const allLogs = logArchive.flatMap(archive => archive.logs || []).concat(logData);
    
    if (allLogs.length === 0) {
      alert('내보낼 로그 데이터가 없습니다.');
      return;
    }
    
    // 시간순 정렬 (최신순)
    const sortedLogs = allLogs.sort((a, b) => 
      new Date(b.timestamp || b.date || '').getTime() - new Date(a.timestamp || a.date || '').getTime()
    );
    
    const csv = Papa.unparse(sortedLogs, {
      quotes: true,
      header: true,
      delimiter: ','
    });
    
    const blob = new Blob(["\ufeff" + csv], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `크레이지샷_변경로그_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 정리
    URL.revokeObjectURL(link.href);
    
    console.log(`✅ 로그 CSV 내보내기 완료: ${sortedLogs.length}개 항목`);
  }, []);

  // 오래된 백업 파일 자동 삭제 로직
  const cleanupOldBackupFiles = useCallback((maxBackupFiles = 5) => {
    try {
      // 로컬 스토리지에서 백업 파일 목록 가져오기
      const backupFiles = JSON.parse(
        localStorage.getItem('backupFileList') || '[]'
      );

      // 오래된 백업 파일 정렬 및 삭제
      if (backupFiles.length > maxBackupFiles) {
        const sortedFiles = backupFiles
          .sort((a: any, b: any) => b.timestamp - a.timestamp)
          .slice(0, maxBackupFiles);

        // 오래된 파일 삭제
        sortedFiles.forEach((file: any) => {
          localStorage.removeItem(`backup_${file.id}`);
        });

        // 백업 파일 목록 업데이트
        localStorage.setItem(
          'backupFileList', 
          JSON.stringify(sortedFiles)
        );
      }
    } catch (error) {
      console.error('백업 파일 정리 중 오류:', error);
    }
  }, []);

  // JSON 백업 (단일화된 백업 시스템)
  const backupToJSON = useCallback(async (
    equipmentData: Equipment[],
    logData: EquipmentLogEntry[],
    logArchive: LogArchive[],
    formFields: FormField[],
    versionHistory: any[]
  ) => {
    // 모든 등록 정보를 단일화하여 백업
    const allData = {
      equipmentData,
      logData,
      logArchive,
      formFields,
      versionHistory,
      categoryCodes: JSON.parse(localStorage.getItem('category-codes') || '[]'),
      geminiApiKey: localStorage.getItem('geminiApiKey') || null,
      backupTime: new Date().toISOString(),
      backupVersion: '3.1.0'
    };

    // 고급 파일 시스템 백업 함수 사용
    return await advancedFileSystemBackup(allData, {
      filePrefix: '크레이지샷_장비현황백업',
      onSuccess: (fileName) => {
        console.log(`장비현황 백업 완료: ${fileName}`);
        
        // 백업 로그 생성
        const backupLog: EquipmentLogEntry = {
          id: `backup-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: '수동 백업',
          itemCode: 'N/A',
          itemName: '장비 데이터 전체',
          userId: 'system',
          summary: `데이터가 ${fileName}으로 백업되었습니다.`
        };

        // 로그 추가 로직 (선택적)
        // setLogData(prev => [backupLog, ...prev]);
      },
      onError: (error) => {
        console.error('장비현황 백업 중 오류:', error);
      }
    });
  }, []);

  // 폴백 다운로드
  const fallbackDownload = useCallback((json: string) => {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fileName = `크레이지샷_백업_${new Date().toISOString().slice(0, 10)}.json`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 메모리 정리
      URL.revokeObjectURL(link.href);
      
      const backupData = JSON.parse(json);
      console.log(`✅ 백업 완료 (다운로드): ${fileName}`);
      alert(`✅ 모든 데이터가 ${fileName}으로 성공적으로 백업되었습니다.\n\n포함된 데이터:\n- 장비목록: ${backupData.equipmentData?.length || 0}개\n- 변경로그: ${(backupData.logData?.length || 0) + (backupData.logArchive?.flatMap((a: any) => a.logs || []).length || 0)}개\n- 양식항목: ${backupData.formFields?.length || 0}개\n- 분류코드: ${backupData.categoryCodes?.length || 0}개\n- AI API키: ${backupData.geminiApiKey ? '포함됨' : '미설정'}`);
    } catch (error) {
      console.error('❌ 백업 실패:', error);
      alert('백업 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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

  // JSON 복원 (단일화된 복원 시스템)
  const restoreFromJSON = useCallback((file: File): Promise<{
    equipmentData: Equipment[];
    logData: EquipmentLogEntry[];
    logArchive: any[];
    formFields: FormField[];
    categoryCodes?: any[];
    geminiApiKey?: string;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const restoredData = JSON.parse(e.target?.result as string);
          
          // 모든 데이터 복원
          // 1. Gemini API 키 복원
          if (restoredData.geminiApiKey) {
            localStorage.setItem('geminiApiKey', restoredData.geminiApiKey);
          }
          
          // 2. 제품군 관리코드 복원
          if (restoredData.categoryCodes && Array.isArray(restoredData.categoryCodes)) {
            localStorage.setItem('category-codes', JSON.stringify(restoredData.categoryCodes));
          }
          
          // 복원 완료 로그
          console.log('✅ 데이터 복원 완료:', {
            장비목록: restoredData.equipmentData?.length || 0,
            현재로그: restoredData.logData?.length || 0,
            아카이브로그: restoredData.logArchive?.length || 0,
            양식항목: restoredData.formFields?.length || 0,
            분류코드: restoredData.categoryCodes?.length || 0,
            API키: restoredData.geminiApiKey ? '복원됨' : '없음',
            백업시간: restoredData.backupTime || '정보없음'
          });
          
           // 로그 데이터 병합 로직 추가
           const mergedLogData = [
             ...(restoredData.logData || []),
             ...(restoredData.logArchive?.flatMap((archive: LogArchive) => archive.logs || []) || [])
           ];
          
          resolve({
            equipmentData: restoredData.equipmentData || [],
            logData: mergedLogData.slice(0, 100), // 최근 100개 로그만 유지
            logArchive: restoredData.logArchive ? 
              [{
                archivedAt: new Date().toISOString(),
                logs: mergedLogData.slice(100)
              }] : 
              [],
            formFields: restoredData.formFields || [],
            categoryCodes: restoredData.categoryCodes || [],
            geminiApiKey: restoredData.geminiApiKey
          });
        } catch (error) {
          console.error('❌ 데이터 복원 실패:', error);
          reject(new Error('잘못된 JSON 파일 형식입니다. 올바른 백업 파일인지 확인해주세요.'));
        }
      };
      reader.onerror = () => {
        console.error('❌ 파일 읽기 실패');
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
    fallbackDownload,
    cloudBackup,
    cloudRestore
  };
};
