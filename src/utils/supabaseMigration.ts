/**
 * 크레이지샷 장비 관리 시스템 Supabase 마이그레이션 유틸리티
 * 목적: 기존 localStorage 데이터를 Supabase와 호환되는 형태로 변환
 */

import { 
  Equipment, 
  FormField,
  EquipmentLogEntry,
  LogArchive,
  VersionHistory,
  CategoryCode
} from '../types';

// Supabase 데이터베이스 타입 정의
export interface SupabaseEquipment {
  id?: number;
  created_at?: string;
  updated_at?: string;
  registration_date: string;
  category_code?: string;
  code: string;
  name: string;
  category: string;
  manufacturer?: string;
  rental: number;
  deposit: number;
  total_stock: number;
  available_stock: number;
  specs?: string;
  features?: string[];
  components?: string;
  info?: string;
  image_url?: string;
  additional_fields?: Record<string, any>;
}

export interface SupabaseFormField {
  id?: number;
  created_at?: string;
  updated_at?: string;
  field_id: string;
  label: string;
  name: string;
  type: string;
  required: boolean;
  disabled_on_edit: boolean;
  field_group?: string;
  active: boolean;
  core: boolean;
  hidden_at?: string;
}

// 추가된 Supabase 로그 및 아카이브 인터페이스
export interface SupabaseEquipmentLogEntry {
  id?: number;
  created_at?: string;
  log_id: string;
  timestamp: string;
  action: string;
  item_code: string;
  item_name: string;
  user_id: string;
  changes?: Record<string, any>;
  summary?: string;
}

export interface SupabaseLogArchive {
  id?: number;
  created_at?: string;
  archived_at: string;
  logs: SupabaseEquipmentLogEntry[];
}

export interface SupabaseVersionHistory {
  id?: number;
  created_at?: string;
  version: string;
  date: string;
  summary: string;
  details: string;
}

export interface SupbaseCategoryCode {
  id?: number;
  created_at?: string;
  updated_at?: string;
  code_id: string;
  code: string;
  name: string;
}

/**
 * Equipment 객체를 Supabase 형태로 변환
 * 기존 기능에 영향을 주지 않으면서 Supabase 호환성 추가
 */
export function equipmentToSupabase(equipment: Equipment): SupabaseEquipment {
  const { 
    id, 
    createdAt, 
    updatedAt, 
    registrationDate,
    categoryCode,
    code,
    name,
    category,
    manufacturer,
    rental,
    deposit,
    totalStock,
    availableStock,
    specs,
    features,
    components,
    info,
    imageUrl,
    ...additionalFields
  } = equipment;

  return {
    ...(id && { id }),
    ...(createdAt && { created_at: createdAt }),
    ...(updatedAt && { updated_at: updatedAt }),
    registration_date: registrationDate,
    category_code: categoryCode,
    code,
    name,
    category,
    manufacturer: manufacturer || '',
    rental: rental || 0,
    deposit: deposit || 0,
    total_stock: totalStock || 0,
    available_stock: availableStock || 0,
    specs,
    features,
    components,
    info,
    image_url: imageUrl,
    additional_fields: additionalFields
  };
}

/**
 * Supabase 데이터를 Equipment 객체로 변환
 * 기존 시스템과의 완전한 호환성 보장
 */
export function supabaseToEquipment(supabaseData: SupabaseEquipment): Equipment {
  const {
    id,
    created_at,
    updated_at,
    registration_date,
    category_code,
    code,
    name,
    category,
    manufacturer,
    rental,
    deposit,
    total_stock,
    available_stock,
    specs,
    features,
    components,
    info,
    image_url,
    additional_fields,
    ...rest
  } = supabaseData;

  return {
    ...(id && { id }),
    ...(created_at && { createdAt: created_at }),
    ...(updated_at && { updatedAt: updated_at }),
    registrationDate: registration_date,
    categoryCode: category_code,
    code,
    name,
    category,
    manufacturer: manufacturer || '',
    rental: rental || 0,
    deposit: deposit || 0,
    totalStock: total_stock || 0,
    availableStock: available_stock || 0,
    specs,
    features,
    components,
    info,
    imageUrl: image_url,
    ...additional_fields,
    ...rest
  };
}

/**
 * FormField 객체를 Supabase 형태로 변환
 */
export function formFieldToSupabase(formField: FormField): SupabaseFormField {
  return {
    field_id: formField.id,
    label: formField.label,
    name: formField.name,
    type: formField.type,
    required: formField.required || false,
    disabled_on_edit: formField.disabledOnEdit || false,
    field_group: formField.group,
    active: formField.active !== false, // 기본값 true
    core: formField.core || false,
    hidden_at: formField.hiddenAt
  };
}

/**
 * Supabase FormField를 기존 형태로 변환
 */
export function supabaseToFormField(supabaseData: SupabaseFormField): FormField {
  return {
    id: supabaseData.field_id,
    label: supabaseData.label,
    name: supabaseData.name,
    type: supabaseData.type as FormField['type'],
    required: supabaseData.required,
    disabledOnEdit: supabaseData.disabled_on_edit,
    group: supabaseData.field_group,
    active: supabaseData.active,
    core: supabaseData.core,
    hiddenAt: supabaseData.hidden_at
  };
}

/**
 * EquipmentLogEntry를 Supabase 형태로 변환
 */
export function logEntryToSupabase(logEntry: EquipmentLogEntry): SupabaseEquipmentLogEntry {
  return {
    log_id: logEntry.id,
    timestamp: logEntry.timestamp,
    action: logEntry.action,
    item_code: logEntry.itemCode,
    item_name: logEntry.itemName,
    user_id: logEntry.userId,
    changes: logEntry.changes || undefined,
    summary: logEntry.summary
  };
}

/**
 * Supabase 로그 엔트리를 기존 형태로 변환
 */
export function supabaseToLogEntry(supabaseLogEntry: SupabaseEquipmentLogEntry): EquipmentLogEntry {
  return {
    id: supabaseLogEntry.log_id,
    timestamp: supabaseLogEntry.timestamp,
    action: supabaseLogEntry.action,
    itemCode: supabaseLogEntry.item_code,
    itemName: supabaseLogEntry.item_name,
    userId: supabaseLogEntry.user_id,
    changes: supabaseLogEntry.changes || null,
    summary: supabaseLogEntry.summary || ''
  };
}

/**
 * LogArchive를 Supabase 형태로 변환
 */
export function logArchiveToSupabase(logArchive: LogArchive): SupabaseLogArchive {
  return {
    archived_at: logArchive.archivedAt,
    logs: logArchive.logs.map(logEntryToSupabase)
  };
}

/**
 * Supabase LogArchive를 기존 형태로 변환
 */
export function supabaseToLogArchive(supabaseLogArchive: SupabaseLogArchive): LogArchive {
  return {
    archivedAt: supabaseLogArchive.archived_at,
    logs: supabaseLogArchive.logs.map(supabaseToLogEntry)
  };
}

/**
 * VersionHistory를 Supabase 형태로 변환
 */
export function versionHistoryToSupabase(versionHistory: VersionHistory): SupabaseVersionHistory {
  return {
    version: versionHistory.version,
    date: versionHistory.date,
    summary: versionHistory.summary,
    details: versionHistory.details
  };
}

/**
 * Supabase VersionHistory를 기존 형태로 변환
 */
export function supabaseToVersionHistory(supabaseVersionHistory: SupabaseVersionHistory): VersionHistory {
  return {
    version: supabaseVersionHistory.version,
    date: supabaseVersionHistory.date,
    summary: supabaseVersionHistory.summary,
    details: supabaseVersionHistory.details
  };
}

/**
 * CategoryCode를 Supabase 형태로 변환
 */
export function categoryCodeToSupabase(categoryCode: CategoryCode): SupbaseCategoryCode {
  return {
    code_id: categoryCode.id,
    code: categoryCode.code,
    name: categoryCode.name
  };
}

/**
 * Supabase CategoryCode를 기존 형태로 변환
 */
export function supabaseToCategoryCode(supabaseCategoryCode: SupbaseCategoryCode): CategoryCode {
  return {
    id: supabaseCategoryCode.code_id,
    code: supabaseCategoryCode.code,
    name: supabaseCategoryCode.name,
    createdAt: supabaseCategoryCode.created_at || new Date().toISOString()
  };
}

/**
 * 배열 데이터 변환 (Equipment 배열)
 */
export function equipmentArrayToSupabase(equipmentArray: Equipment[]): SupabaseEquipment[] {
  return equipmentArray.map(equipmentToSupabase);
}

/**
 * Supabase 배열을 Equipment 배열로 변환
 */
export function supabaseToEquipmentArray(supabaseArray: SupabaseEquipment[]): Equipment[] {
  return supabaseArray.map(supabaseToEquipment);
}

/**
 * 데이터 유효성 검증
 */
export function validateEquipmentForSupabase(equipment: Equipment): string[] {
  const errors: string[] = [];

  if (!equipment.code) {
    errors.push('장비 코드는 필수입니다.');
  }

  if (equipment.code && equipment.code.length > 100) {
    errors.push('장비 코드는 100자를 초과할 수 없습니다.');
  }

  if (!equipment.name) {
    errors.push('장비명은 필수입니다.');
  }

  if (equipment.name && equipment.name.length > 255) {
    errors.push('장비명은 255자를 초과할 수 없습니다.');
  }

  if (!equipment.category) {
    errors.push('카테고리는 필수입니다.');
  }

  if (!equipment.registrationDate) {
    errors.push('등록일은 필수입니다.');
  }

  // 숫자 필드 유효성 검증
  if (equipment.rental < 0) {
    errors.push('대여료는 0 이상이어야 합니다.');
  }

  if (equipment.deposit < 0) {
    errors.push('보증금은 0 이상이어야 합니다.');
  }

  if (equipment.totalStock < 0) {
    errors.push('총 재고는 0 이상이어야 합니다.');
  }

  if (equipment.availableStock < 0) {
    errors.push('가용 재고는 0 이상이어야 합니다.');
  }

  return errors;
}

/**
 * 마이그레이션 헬퍼 함수
 */
export class SupabaseMigrationHelper {
  /**
   * localStorage 데이터를 Supabase 형태로 일괄 변환
   */
  static convertLocalStorageData() {
    try {
      // 장비 데이터 변환
      const equipmentData = localStorage.getItem('equipmentData');
      const formFieldsData = localStorage.getItem('formFields');
      const logData = localStorage.getItem('equipmentLogs');

      const result = {
        equipment: equipmentData ? equipmentArrayToSupabase(JSON.parse(equipmentData)) : [],
        formFields: formFieldsData ? JSON.parse(formFieldsData).map(formFieldToSupabase) : [],
        logs: logData ? JSON.parse(logData) : [],
        convertedAt: new Date().toISOString()
      };

      console.log('✅ localStorage 데이터 변환 완료:', result);
      return result;
    } catch (error) {
      console.error('❌ localStorage 데이터 변환 실패:', error);
      throw error;
    }
  }

  /**
   * 변환된 데이터의 유효성 검증
   */
  static validateConvertedData(equipment: Equipment[]): boolean {
    let isValid = true;
    const errors: string[] = [];

    equipment.forEach((item, index) => {
      const itemErrors = validateEquipmentForSupabase(item);
      if (itemErrors.length > 0) {
        isValid = false;
        errors.push(`장비 ${index + 1} (${item.name}): ${itemErrors.join(', ')}`);
      }
    });

    if (!isValid) {
      console.error('❌ 데이터 유효성 검증 실패:', errors);
    } else {
      console.log('✅ 모든 데이터가 Supabase 호환 형태입니다.');
    }

    return isValid;
  }

  /**
   * 마이그레이션 준비 상태 확인
   */
  static checkMigrationReadiness(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    // localStorage 데이터 존재 확인
    const equipmentData = localStorage.getItem('equipmentData');
    if (!equipmentData) {
      issues.push('장비 데이터가 없습니다.');
    }

    try {
      if (equipmentData) {
        const parsed = JSON.parse(equipmentData);
        if (!Array.isArray(parsed)) {
          issues.push('장비 데이터 형식이 올바르지 않습니다.');
        } else if (parsed.length === 0) {
          issues.push('장비 데이터가 비어있습니다.');
        }
      }
    } catch (error) {
      issues.push('장비 데이터 파싱에 실패했습니다.');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }
}

export default SupabaseMigrationHelper;
