-- 크레이지샷 장비 관리 시스템 Supabase 테이블 스키마
-- 생성일: 2024년 12월
-- 목적: 기존 localStorage 데이터의 Supabase 마이그레이션 지원

-- 장비 테이블 (equipment)
CREATE TABLE IF NOT EXISTS equipment (
  -- Supabase 기본 필드
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 기존 시스템 호환 필드
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_code VARCHAR(50),
  code VARCHAR(100) UNIQUE NOT NULL, -- 장비 코드 (고유키)
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100),
  
  -- 가격 정보
  rental DECIMAL(10,2) DEFAULT 0,
  deposit DECIMAL(10,2) DEFAULT 0,
  
  -- 재고 정보
  total_stock INTEGER DEFAULT 0,
  available_stock INTEGER DEFAULT 0,
  
  -- 상세 정보
  specs TEXT,
  features JSONB, -- 배열 데이터 저장
  components TEXT,
  info TEXT,
  image_url VARCHAR(500),
  
  -- 추가 동적 필드 (JSON 형태)
  additional_fields JSONB DEFAULT '{}'::jsonb
);

-- 양식 필드 테이블 (form_fields)
CREATE TABLE IF NOT EXISTS form_fields (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  field_id VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'number', 'date', 'textarea', 'url')),
  required BOOLEAN DEFAULT false,
  disabled_on_edit BOOLEAN DEFAULT false,
  field_group VARCHAR(100),
  active BOOLEAN DEFAULT true,
  core BOOLEAN DEFAULT false,
  hidden_at TIMESTAMPTZ
);

-- 장비 로그 테이블 (equipment_logs)
CREATE TABLE IF NOT EXISTS equipment_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  log_id VARCHAR(100) UNIQUE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  action VARCHAR(100) NOT NULL,
  item_code VARCHAR(100),
  item_name VARCHAR(255),
  user_id VARCHAR(100),
  changes JSONB,
  summary TEXT
);

-- 로그 아카이브 테이블 (log_archives)
CREATE TABLE IF NOT EXISTS log_archives (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  archived_at TIMESTAMPTZ NOT NULL,
  logs JSONB NOT NULL
);

-- 버전 히스토리 테이블 (version_history)
CREATE TABLE IF NOT EXISTS version_history (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  version VARCHAR(100) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  summary TEXT,
  details TEXT
);

-- 제품군 분류코드 테이블 (category_codes)
CREATE TABLE IF NOT EXISTS category_codes (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  code_id VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(code);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_manufacturer ON equipment(manufacturer);
CREATE INDEX IF NOT EXISTS idx_equipment_registration_date ON equipment(registration_date);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_item_code ON equipment_logs(item_code);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_timestamp ON equipment_logs(timestamp);

-- RLS (Row Level Security) 정책 설정 (보안)
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_codes ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자만 접근 가능
CREATE POLICY IF NOT EXISTS "Equipment access for authenticated users" ON equipment
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Form fields access for authenticated users" ON form_fields
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Equipment logs access for authenticated users" ON equipment_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Log archives access for authenticated users" ON log_archives
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Version history access for authenticated users" ON version_history
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Category codes access for authenticated users" ON category_codes
  FOR ALL USING (auth.role() = 'authenticated');

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_equipment_updated_at 
  BEFORE UPDATE ON equipment 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at 
  BEFORE UPDATE ON form_fields 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_codes_updated_at 
  BEFORE UPDATE ON category_codes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
