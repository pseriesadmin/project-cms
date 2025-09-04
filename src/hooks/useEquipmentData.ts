import { useState, useEffect, useCallback } from 'react';
import { Equipment, EquipmentLogEntry, FormField, VersionHistory } from '../types';

// 초기 데이터
const initialEquipmentData: Equipment[] = [
  {
    registrationDate: new Date().toISOString().split('T')[0], // 오늘 날짜를 YYYY-MM-DD 형식으로
    code: 'SAMPLE-001',
    name: '샘플 장비',
    category: '기타',
    manufacturer: '크레이지샷',
    rental: 10000,
    deposit: 50000,
    totalStock: 1,
    availableStock: 1,
    specs: '샘플 장비입니다. 실제 장비를 등록해주세요.',
    features: ['첫 사용을 위한 샘플 데이터'],
    components: '없음',
    info: '이 장비는 시스템 초기화를 위한 샘플입니다.'
  }
];

// 기본 폼 필드
const defaultFormFields: FormField[] = [
  { id: "reg-registration-date", label: "등록일시", name: "registrationDate", type: "date", required: true, disabledOnEdit: false, group: "main", active: true, core: true },
  { id: "reg-code", label: "장비 코드", name: "code", type: "text", required: true, disabledOnEdit: true, group: "main", active: true, core: true },
  { id: "reg-name", label: "품명", name: "name", type: "text", required: true, group: "main", active: true, core: true },
  { id: "reg-category", label: "카테고리", name: "category", type: "text", required: true, group: "main", active: true, core: true },
  { id: "reg-manufacturer", label: "제조사", name: "manufacturer", type: "text", required: true, group: "main", active: true, core: true },
  { id: "reg-rental", label: "렌탈료(일)", name: "rental", type: "number", required: true, group: "price", active: true, core: true },
  { id: "reg-deposit", label: "보증금", name: "deposit", type: "number", required: true, group: "price", active: true, core: true },
  { id: "reg-total-stock", label: "총 재고", name: "totalStock", type: "number", required: true, group: "stock", active: true, core: true },
  { id: "reg-available-stock", label: "가용 재고", name: "availableStock", type: "number", required: true, group: "stock", active: true, core: true },
  { id: "reg-specs", label: "주요 스펙", name: "specs", type: "textarea", group: "details", active: true, core: false },
  { id: "reg-features", label: "세부 기능 (쉼표로 구분)", name: "features", type: "textarea", group: "details", active: true, core: false },
  { id: "reg-components", label: "기본 구성품", name: "components", type: "textarea", group: "details", active: true, core: false },
  { id: "reg-info", label: "부가 정보", name: "info", type: "textarea", group: "details", active: true, core: false },
  { id: "reg-image", label: "제품이미지 URL", name: "imageUrl", type: "url", group: "details", active: true, core: false }
];

// 버전 히스토리
const VERSION_HISTORY: VersionHistory[] = [
  {
    version: 'v1.0.0',
    date: '2024-08-15',
    summary: '크레이지샷 장비 현황 대시보드 초기 버전',
    details: '장비 목록 관리, KPI 차트, CSV/JSON 데이터 입출력 기능. 초기 데이터 셋 포함.',
  },
  {
    version: 'v2.0.0',
    date: '2024-08-18',
    summary: 'AI 기능 통합 및 동적 양식 관리 기능 추가',
    details: 'Gemini API를 활용한 AI 스펙 생성기 및 활용 아이디어 제안 기능 추가. 동적으로 양식 항목을 추가/삭제할 수 있는 관리 기능 도입.',
  },
  {
    version: 'v3.0.0',
    date: '2024-08-20',
    summary: '버전 업데이트 내역 로그 기능 추가',
    details: '대시보드 자체의 업데이트 버전과 상세 내역을 변경 로그에 자동 기록하는 기능 추가.',
  }
];

// 핵심 필드 보장 함수
const ensureCoreFields = (fields: FormField[]): FormField[] => {
  const coreFields = defaultFormFields.filter(field => field.core);
  const result = [...fields];
  
  // 핵심 필드가 누락된 경우 추가
  coreFields.forEach(coreField => {
    const existingField = result.find(field => field.name === coreField.name);
    if (!existingField) {
      // 핵심 필드를 적절한 위치에 삽입 (등록일시는 맨 앞에)
      if (coreField.name === 'registrationDate') {
        result.unshift(coreField);
      } else {
        result.push(coreField);
      }
      console.log(`🔧 핵심 필드 복원: ${coreField.label}`);
    } else if (existingField && !existingField.core) {
      // 기존 필드가 있지만 core 속성이 false인 경우 복원
      existingField.core = true;
      console.log(`🔧 핵심 필드 속성 복원: ${existingField.label}`);
    }
  });
  
  return result;
};

export const useEquipmentData = () => {
  const [equipmentData, setEquipmentData] = useState<Equipment[]>([]);
  const [logData, setLogData] = useState<EquipmentLogEntry[]>([]);
  const [logArchive, setLogArchive] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>(defaultFormFields);
  const [isFirstRun, setIsFirstRun] = useState(true);

  // localStorage 키
  const STORAGE_KEYS = {
    equipmentData: 'equipmentData',
    logData: 'logData',
    logArchive: 'logArchive',
    formFields: 'formFields',
    geminiApiKey: 'geminiApiKey'
  };

  // 데이터 로드
  const loadData = useCallback(() => {
    try {
      console.group('🔍 데이터 로드 디버그');
      
      const savedData = localStorage.getItem(STORAGE_KEYS.equipmentData);
      console.log('equipmentData 상태:', savedData ? '존재' : '없음');
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // 기존 데이터에 등록일시가 없는 경우 마이그레이션
        const migratedData = parsedData.map((equipment: Equipment) => {
          if (!equipment.registrationDate) {
            return {
              ...equipment,
              registrationDate: new Date().toISOString().split('T')[0] // 오늘 날짜로 설정
            };
          }
          return equipment;
        });
        
        setEquipmentData(migratedData);
        
        // 마이그레이션이 있었다면 저장
        if (migratedData.some((item: Equipment, index: number) => item.registrationDate !== parsedData[index]?.registrationDate)) {
          localStorage.setItem(STORAGE_KEYS.equipmentData, JSON.stringify(migratedData));
          console.log('🔄 등록일시 필드 마이그레이션 완료');
        }
      } else {
        console.log('🚨 초기 상태 처리 시작');
        setEquipmentData(initialEquipmentData);
        setIsFirstRun(true);
      }
      
      // 로그 데이터 로드
      const savedLog = localStorage.getItem(STORAGE_KEYS.logData);
      if (savedLog) {
        setLogData(JSON.parse(savedLog));
      }
      
      const savedArchive = localStorage.getItem(STORAGE_KEYS.logArchive);
      if (savedArchive) {
        setLogArchive(JSON.parse(savedArchive));
      }
      
      const savedFormFields = localStorage.getItem(STORAGE_KEYS.formFields);
      if (savedFormFields) {
        const parsedFormFields = JSON.parse(savedFormFields);
        // 핵심 필드 보장 (복원 시 누락된 핵심 필드 복구)
        const mergedFormFields = ensureCoreFields(parsedFormFields);
        setFormFields(mergedFormFields);
        
        // 핵심 필드가 추가된 경우 localStorage 업데이트
        if (mergedFormFields.length !== parsedFormFields.length) {
          localStorage.setItem(STORAGE_KEYS.formFields, JSON.stringify(mergedFormFields));
          console.log('🔄 핵심 필드 자동 복구 완료');
        }
      }
      
      console.groupEnd();
    } catch (error) {
      console.error("데이터 로드 중 오류:", error);
      setEquipmentData(initialEquipmentData);
    }
  }, []);

  // 데이터 저장
  const saveData = useCallback((data: Equipment[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.equipmentData, JSON.stringify(data));
      setEquipmentData(data);
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
    }
  }, []);

  // 로그 저장
  const saveLog = useCallback((logs: EquipmentLogEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.logData, JSON.stringify(logs));
      localStorage.setItem(STORAGE_KEYS.logArchive, JSON.stringify(logArchive));
      setLogData(logs);
    } catch (error) {
      console.error("Failed to save log to localStorage:", error);
    }
  }, [logArchive]);

  // 폼 필드 저장 (핵심 필드 보장)
  const saveFormFields = useCallback((fields: FormField[]) => {
    try {
      // 핵심 필드들이 누락되지 않도록 보장
      const mergedFields = ensureCoreFields(fields);
      localStorage.setItem(STORAGE_KEYS.formFields, JSON.stringify(mergedFields));
      setFormFields(mergedFields);
    } catch (error) {
      console.error("Failed to save form fields to localStorage:", error);
    }
  }, []);

  // 상세 변경 로그 기록
  const logDetailedChange = useCallback((
    action: string,
    itemCode: string,
    oldData: any,
    newData: any,
    userId: string = 'system'
  ) => {
    const timestamp = new Date().toISOString();
    const changes: any = {};
    
    if (action === '수정' && oldData && newData) {
      Object.keys(newData).forEach(key => {
        const newValue = newData[key];
        const oldValue = oldData[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes[key] = {
            from: oldValue,
            to: newValue
          };
        }
      });
    }
    
    const logEntry: EquipmentLogEntry = {
      id: Date.now() + Math.random() + '',
      timestamp,
      action,
      itemCode,
      itemName: newData?.name || oldData?.name || 'Unknown',
      userId,
      changes: Object.keys(changes).length > 0 ? changes : null,
      summary: generateChangeSummary(action, changes, newData?.name || oldData?.name)
    };
    
    const newLogData = [logEntry, ...logData];
    
    // 로그 아카이브 (100개마다)
    if (newLogData.length > 100) {
      const archived = newLogData.splice(100);
      setLogArchive(prev => [...prev, {
        archivedAt: new Date().toISOString(),
        logs: archived
      }]);
    }
    
    saveLog(newLogData);
  }, [logData, saveLog]);

  // 변경 요약 생성
  const generateChangeSummary = (action: string, changes: any, itemName: string) => {
    switch (action) {
      case '추가':
        return `${itemName} 장비가 새로 등록되었습니다.`;
      case '삭제':
        return `${itemName} 장비가 삭제되었습니다.`;
      case '수정':
        if (!changes || Object.keys(changes).length === 0) {
          return `${itemName} 장비 정보가 수정되었습니다.`;
        }
        const changedFields = Object.keys(changes);
        return `${itemName} 장비의 ${changedFields.join(', ')} 필드가 수정되었습니다.`;
      case '파일 가져오기':
        return `CSV 파일에서 장비 데이터가 불러와졌습니다.`;
      case '복원':
        return `백업 파일에서 데이터가 복원되었습니다.`;
      case '양식 항목 추가':
        return `${itemName} 양식 항목이 새로 추가되었습니다.`;
      case '양식 항목 수정':
        return `${itemName} 양식 항목이 수정되었습니다.`;
      case '양식 항목 삭제':
        return `${itemName} 양식 항목이 삭제되었습니다.`;
      case '버전 업데이트':
        return itemName;
      default:
        return `${itemName} 장비에 ${action} 작업이 수행되었습니다.`;
    }
  };

  // 장비 추가
  const addEquipment = useCallback((equipment: Equipment) => {
    const newData = [...equipmentData, equipment];
    saveData(newData);
    logDetailedChange('추가', equipment.code, null, equipment);
  }, [equipmentData, saveData, logDetailedChange]);

  // 장비 수정
  const updateEquipment = useCallback((code: string, updatedEquipment: Equipment) => {
    const oldItem = equipmentData.find(e => e.code === code);
    const newData = equipmentData.map(e => 
      e.code === code ? { ...e, ...updatedEquipment } : e
    );
    saveData(newData);
    logDetailedChange('수정', code, oldItem, updatedEquipment);
  }, [equipmentData, saveData, logDetailedChange]);

  // 장비 삭제
  const deleteEquipment = useCallback((code: string) => {
    const itemToDelete = equipmentData.find(e => e.code === code);
    const newData = equipmentData.filter(e => e.code !== code);
    saveData(newData);
    if (itemToDelete) {
      logDetailedChange('삭제', code, itemToDelete, null);
    }
  }, [equipmentData, saveData, logDetailedChange]);

  // 초기화 시 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 버전 히스토리 로그 추가
  useEffect(() => {
    if (logData.length === 0) return;
    
    const loggedVersions = logData
      .filter(log => log.action === '버전 업데이트')
      .map(log => log.itemCode);
    
    VERSION_HISTORY.forEach(version => {
      if (!loggedVersions.includes(version.version)) {
        const versionLog: EquipmentLogEntry = {
          id: 'version-update-' + version.version,
          timestamp: new Date(version.date).toISOString(),
          action: '버전 업데이트',
          itemCode: version.version,
          itemName: version.summary,
          userId: 'system',
          summary: `v${version.version} 업데이트: ${version.details}`
        };
        setLogData(prev => [versionLog, ...prev]);
      }
    });
  }, [logData]);

  return {
    equipmentData,
    logData,
    logArchive,
    formFields,
    isFirstRun,
    setIsFirstRun,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    saveData,
    saveLog,
    saveFormFields,
    logDetailedChange,
    loadData,
    VERSION_HISTORY
  };
};
