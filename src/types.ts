export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface PerformanceRecord {
  date: string;
  docLink: string;
  comment: string;
}

export interface Task {
  id: string;
  mainTask: string[];
  personInCharge: string;
  schedule: string;
  checkpoints: ChecklistItem[];
  performance: PerformanceRecord;
  issues: string;
}

export interface ProjectPhase {
  id: string;
  title: string;
  tasks: Task[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
  version?: string;
}

export interface ProjectData {
  projectPhases: ProjectPhase[];
  logs: LogEntry[];
  version?: string;
}

// 장비 현황 관련 타입 정의
export interface Equipment {
  registrationDate: string; // 등록일시 필드 추가
  categoryCode?: string; // 제품군 분류코드
  code: string;
  name: string;
  category: string;
  manufacturer: string;
  rental: number;
  deposit: number;
  totalStock: number;
  availableStock: number;
  specs?: string;
  features?: string[];
  components?: string;
  info?: string;
  imageUrl?: string;
  [key: string]: any; // 동적 필드 지원
}

export interface FormField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'url';
  required?: boolean;
  disabledOnEdit?: boolean;
  group?: string;
  active?: boolean;
  core?: boolean;
  hiddenAt?: string;
}

export interface EquipmentLogEntry {
  id: string;
  timestamp: string;
  action: string;
  itemCode: string;
  itemName: string;
  userId: string;
  changes?: any;
  summary: string;
}

export interface LogArchive {
  archivedAt: string;
  logs: EquipmentLogEntry[];
}

export interface EquipmentState {
  category: string;
  manufacturer: string;
  maxPrice: number;
  searchQuery: string;
}

export interface VersionHistory {
  version: string;
  date: string;
  summary: string;
  details: string;
}

// 제품군 분류코드 관련 타입 정의
export interface CategoryCode {
  id: string;
  code: string; // 영문, 숫자 조합 50자 제한
  name: string;
  createdAt: string;
}