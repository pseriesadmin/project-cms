import { useCallback } from 'react';
import Papa from 'papaparse';
import { Equipment, FormField, EquipmentLogEntry } from '../types';

export const useEquipmentExport = () => {
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
      delimiter: ',',
      encoding: 'utf-8'
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
      delimiter: ',',
      encoding: 'utf-8'
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

  // JSON 백업 (단일화된 백업 시스템)
  const backupToJSON = useCallback(async (
    equipmentData: Equipment[],
    logData: EquipmentLogEntry[],
    logArchive: any[],
    formFields: FormField[],
    versionHistory: any[]
  ) => {
    // 모든 등록 정보를 단일화하여 백업
    const allData = {
      equipmentData,                                                  // 장비목록
      logData,                                                       // 장비변경 로그 (현재)
      logArchive,                                                    // 장비변경 로그 (아카이브)
      formFields,                                                    // 제품등록 양식 항목
      versionHistory,                                                // 버전 히스토리
      categoryCodes: JSON.parse(localStorage.getItem('category-codes') || '[]'), // 제품군 관리코드 설정값
      geminiApiKey: localStorage.getItem('geminiApiKey') || null,    // AI 스펙 생성 API 키
      backupTime: new Date().toISOString(),
      backupVersion: '3.1.0'                                        // 백업 버전 추가
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

        console.log(`✅ 백업 완료: ${fileName}`);
        console.log('백업 포함 데이터:', {
          장비목록: allData.equipmentData.length + '개',
          로그: (allData.logData.length + allData.logArchive.length) + '개',
          양식항목: allData.formFields.length + '개',
          분류코드: allData.categoryCodes.length + '개',
          API키: allData.geminiApiKey ? '있음' : '없음'
        });
        
        alert(`✅ 모든 데이터가 ${fileName}으로 성공적으로 백업되었습니다.\n\n포함된 데이터:\n- 장비목록: ${allData.equipmentData.length}개\n- 변경로그: ${allData.logData.length + allData.logArchive.flatMap(a => a.logs || []).length}개\n- 양식항목: ${allData.formFields.length}개\n- 분류코드: ${allData.categoryCodes.length}개\n- AI API키: ${allData.geminiApiKey ? '포함됨' : '미설정'}`);
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
            로그: (restoredData.logData?.length || 0) + (restoredData.logArchive?.length || 0),
            양식항목: restoredData.formFields?.length || 0,
            분류코드: restoredData.categoryCodes?.length || 0,
            API키: restoredData.geminiApiKey ? '복원됨' : '없음',
            백업시간: restoredData.backupTime || '정보없음'
          });
          
          resolve({
            equipmentData: restoredData.equipmentData || [],
            logData: restoredData.logData || [],
            logArchive: restoredData.logArchive || [],
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
    fallbackDownload
  };
};
