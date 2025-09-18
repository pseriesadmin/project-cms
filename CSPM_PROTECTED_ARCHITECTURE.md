# 🔒 CSPM 다중 사용자 DB 동기화 아키텍처 절대 보호 가이드라인

## 🚨 경고: 이 문서는 시스템의 핵심 동기화 아키텍처를 보호하기 위한 절대적 가이드라인입니다.

### 1. 🛡️ 보호 대상 아키텍처 구성 요소

#### 1.1 동기화 핵심 원칙
- **불변 동기화 전략**: 
  - 15초 간격 실시간 동기화
  - 1MB 페이로드 크기 제한
  - 공유 프로젝트 ID 기반 동기화

#### 1.2 보호되는 함수 및 로직
- `useRealtimeBackup.ts`:
  ```typescript
  // 절대 변경 금지 구조
  const performBackup = async (data: T, options) => {
    // 1MB 페이로드 크기 제한
    const dataSize = JSON.stringify(data).length;
    if (dataSize >= 1000000) {
      console.warn('🚫 페이로드 크기 초과 - 백업 중단');
      return;
    }

    // 프로젝트 데이터는 'shared_project' ID 사용
    const payload = dataType === 'project' 
      ? { 
          projectData: data, 
          userId: 'shared_project', 
          backupType 
        }
      : { 
          ...data, 
          userId, 
          backupType 
        };
  }
  ```

- `useProjectSync.ts`:
  ```typescript
  // 절대 변경 금지 동기화 로직
  const checkAndAutoRestore = async () => {
    const syncInterval = 15000; // 15초 고정
    const payloadSizeLimit = 1000000; // 1MB 고정

    // 로컬 및 클라우드 데이터 병합 로직
    const mergedData = safeMergeData(localData, cloudData);
  }
  ```

### 2. 🔒 절대 금지 영역

#### 2.1 수정 금지 원칙
- 다음 요소들은 **절대** 수정 불가:
  1. 15초 동기화 간격
  2. 1MB 페이로드 크기 제한
  3. 'shared_project' 공통 사용자 ID
  4. 로컬/클라우드 데이터 병합 알고리즘
  5. 로그 보존 메커니즘

### 3. 🚧 변경 프로세스

#### 3.1 변경 요청 절차
1. 변경 요청서 작성
2. 개발팀 리더 검토
3. 아키텍처 위원회 승인
4. 전체 시스템 영향도 분석
5. A/B 테스트 필수
6. 롤백 계획 수립

#### 3.2 변경 금지 조건
- 다음 상황에서는 **절대** 변경 불가:
  - 성능 저하 우려
  - 데이터 무결성 위험
  - 멀티 사용자 동기화 안정성 저해

### 4. 🛡️ 보호 메커니즘

#### 4.1 자동 방어 시스템
- CI/CD 파이프라인에 아키텍처 보호 스크립트 통합
- 코드 리뷰 시 자동 아키텍처 검증
- 변경 시도 시 즉시 차단 및 알림

### 5. 📝 문서 관리

#### 5.1 버전 관리
- **현재 버전**: v1.0.0
- **최종 업데이트**: 2024년 12월
- **담당자**: 크레이지샷 개발팀 아키텍처 위원회

### 6. 🔍 모니터링 및 감사

#### 6.1 지속적 모니터링
- 정기적 아키텍처 무결성 검사
- 성능 및 안정성 지표 추적
- 연간 아키텍처 리뷰 진행

---

**주의**: 이 문서는 시스템의 핵심 동기화 아키텍처를 보호하기 위한 것입니다. 
모든 변경은 최소 침입 원칙과 시스템 안정성을 최우선으로 고려해야 합니다.
