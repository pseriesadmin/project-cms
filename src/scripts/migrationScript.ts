/**
 * 크레이지샷 장비 관리 시스템 Supabase 마이그레이션 실행 스크립트
 * 목적: 기존 데이터를 안전하게 Supabase로 마이그레이션
 * 
 * 사용법:
 * 1. 개발자 도구 콘솔에서 실행
 * 2. 또는 컴포넌트에서 import하여 사용
 */

import SupabaseMigrationHelper, { 
  equipmentArrayToSupabase, 
  supabaseToEquipmentArray,
  validateEquipmentForSupabase 
} from '../utils/supabaseMigration';
import type { Equipment } from '../types';

export class MigrationScript {
  /**
   * 1단계: 마이그레이션 준비 상태 확인
   */
  static async checkPreMigration(): Promise<boolean> {
    console.log('🔍 마이그레이션 준비 상태 확인 중...');
    
    const readiness = SupabaseMigrationHelper.checkMigrationReadiness();
    
    if (!readiness.ready) {
      console.error('❌ 마이그레이션 준비 미완료:', readiness.issues);
      return false;
    }
    
    console.log('✅ 마이그레이션 준비 완료');
    return true;
  }

  /**
   * 2단계: 데이터 변환 및 유효성 검증
   */
  static async validateAndConvert(): Promise<{ equipment: Equipment[], isValid: boolean }> {
    console.log('🔄 데이터 변환 및 유효성 검증 중...');
    
    try {
      // localStorage에서 기존 데이터 읽기
      const equipmentDataStr = localStorage.getItem('equipmentData');
      if (!equipmentDataStr) {
        throw new Error('장비 데이터가 없습니다.');
      }
      
      const equipmentData: Equipment[] = JSON.parse(equipmentDataStr);
      
      // 유효성 검증
      const isValid = SupabaseMigrationHelper.validateConvertedData(equipmentData);
      
      if (!isValid) {
        console.warn('⚠️ 일부 데이터가 유효하지 않습니다. 마이그레이션 전 수정이 필요합니다.');
      }
      
      console.log('✅ 데이터 변환 및 검증 완료');
      return { equipment: equipmentData, isValid };
      
    } catch (error) {
      console.error('❌ 데이터 변환 실패:', error);
      throw error;
    }
  }

  /**
   * 3단계: 백업 생성 (안전장치)
   */
  static async createBackup(): Promise<string> {
    console.log('💾 마이그레이션 백업 생성 중...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupData = {
        equipmentData: localStorage.getItem('equipmentData'),
        formFields: localStorage.getItem('formFields'),
        equipmentLogs: localStorage.getItem('equipmentLogs'),
        backupTimestamp: timestamp,
        migrationVersion: '1.0.0'
      };
      
      const backupJson = JSON.stringify(backupData, null, 2);
      const backupFileName = `crazyshot_equipment_backup_${timestamp}.json`;
      
      // 파일 다운로드
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ 백업 생성 완료:', backupFileName);
      return backupFileName;
      
    } catch (error) {
      console.error('❌ 백업 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 4단계: Supabase 연결 테스트 (실제 구현 시 추가)
   */
  static async testSupabaseConnection(): Promise<boolean> {
    console.log('🔗 Supabase 연결 테스트...');
    
    // TODO: 실제 Supabase 클라이언트 연결 테스트
    // const { createClient } = require('@supabase/supabase-js');
    // const supabase = createClient(url, key);
    
    console.log('⚠️ Supabase 연결 테스트는 실제 구현 시 추가됩니다.');
    return true;
  }

  /**
   * 5단계: 데이터 마이그레이션 실행 (시뮬레이션)
   */
  static async simulateMigration(): Promise<boolean> {
    console.log('🚀 마이그레이션 시뮬레이션 시작...');
    
    try {
      // 1. 준비 상태 확인
      const isReady = await this.checkPreMigration();
      if (!isReady) return false;
      
      // 2. 데이터 변환 및 검증
      const { equipment, isValid } = await this.validateAndConvert();
      if (!isValid) {
        const proceed = confirm('일부 데이터가 유효하지 않습니다. 계속 진행하시겠습니까?');
        if (!proceed) return false;
      }
      
      // 3. 백업 생성
      await this.createBackup();
      
      // 4. Supabase 형태로 변환
      const supabaseData = equipmentArrayToSupabase(equipment);
      console.log('📦 Supabase 형태로 변환된 데이터:', supabaseData);
      
      // 5. 변환 복원 테스트 (무결성 확인)
      const restoredData = supabaseToEquipmentArray(supabaseData);
      console.log('🔄 복원 테스트:', restoredData);
      
      // 6. 데이터 무결성 검증
      const originalCount = equipment.length;
      const convertedCount = supabaseData.length;
      const restoredCount = restoredData.length;
      
      if (originalCount === convertedCount && convertedCount === restoredCount) {
        console.log('✅ 데이터 무결성 검증 성공');
        console.log(`📊 처리된 장비 수: ${originalCount}개`);
        return true;
      } else {
        console.error('❌ 데이터 무결성 검증 실패');
        console.error(`원본: ${originalCount}, 변환: ${convertedCount}, 복원: ${restoredCount}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 마이그레이션 시뮬레이션 실패:', error);
      return false;
    }
  }

  /**
   * 전체 마이그레이션 프로세스 실행
   */
  static async runMigration(): Promise<void> {
    console.log('🎯 크레이지샷 장비 관리 시스템 Supabase 마이그레이션 시작');
    console.log('=' .repeat(60));
    
    try {
      const success = await this.simulateMigration();
      
      if (success) {
        console.log('=' .repeat(60));
        console.log('🎉 마이그레이션 시뮬레이션 성공!');
        console.log('📋 다음 단계:');
        console.log('1. Supabase 프로젝트 설정');
        console.log('2. 제공된 SQL 스키마 실행');
        console.log('3. 실제 데이터 업로드');
        console.log('4. 클라이언트 코드 Supabase 연동');
      } else {
        console.log('=' .repeat(60));
        console.log('❌ 마이그레이션 시뮬레이션 실패');
        console.log('📋 문제 해결 후 다시 시도하세요.');
      }
      
    } catch (error) {
      console.error('💥 마이그레이션 중 예상치 못한 오류:', error);
    }
  }
}

// 개발자 도구에서 직접 실행 가능하도록 전역 객체에 등록
if (typeof window !== 'undefined') {
  (window as any).MigrationScript = MigrationScript;
  (window as any).runEquipmentMigration = () => MigrationScript.runMigration();
}

export default MigrationScript;
