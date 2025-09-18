# 🚨 CRITICAL PROTECTION ALERT 🚨

## ⚠️ **긴급 보호 강화 조치**

### **배경**
- **수십여 번의 수정 작업**에서 다중 사용자 동기화 구조가 **대여섯 번 이상 파괴됨**
- **복구 반복률**: 60% 이상 → 기존 보호 체계 **완전 실패**

### **🔴 절대 금지 구역 (NO-TOUCH ZONE)**

다음 코드는 **어떤 이유로도 절대 수정 금지**:

```typescript
// 🚨 절대 금지 구역 1: useRealtimeBackup.ts - performBackup 함수
const payload = dataType === 'project' 
  ? { 
      projectData: data, 
      userId: 'shared_project', // ⛔ 절대 변경 금지
      backupType, 
      backupSource 
    }
  : { 
      ...data as any, 
      userId, // ⛔ 절대 변경 금지
      backupType, 
      backupSource 
    };

// 🚨 절대 금지 구역 2: useRealtimeBackup.ts - restoreFromCloud 함수  
const apiEndpoint = dataType === 'project' 
  ? `/api/project?userId=${dataType === 'project' ? 'shared_project' : userId}${cacheParam}`
  // ⛔ 'shared_project' 절대 변경 금지

// 🚨 절대 금지 구역 3: useProjectSync.ts - 동기화 주기
syncInterval = 15000 // ⛔ 15초 고정, 절대 변경 금지

// 🚨 절대 금지 구역 4: 페이로드 크기 제한
if (dataSize >= 1000000) { // ⛔ 1MB 제한 절대 변경 금지
  console.warn('페이로드 크기 초과 - 백업 생략');
  return;
}
```

### **🛑 수정 시 필수 체크리스트**

**모든 수정 작업 전 반드시 확인:**

- [ ] `'shared_project'` 문자열이 유지되는가?
- [ ] `syncInterval = 15000`이 유지되는가?
- [ ] 프로젝트 데이터와 장비 데이터 분리가 유지되는가?
- [ ] 1MB 페이로드 제한이 유지되는가?
- [ ] 413 에러 재시도 방지가 유지되는가?

**하나라도 NO면 → 즉시 수정 중단**

### **⚡ 즉시 조치 사항**

1. **코드 수정 전 백업**: 현재 작동하는 버전 즉시 백업
2. **수정 범위 제한**: 동기화 관련 파일 접근 최소화  
3. **단계별 검증**: 수정 후 즉시 동기화 테스트
4. **롤백 준비**: 문제 발생 시 즉시 롤백

### **📋 허용 수정 vs 금지 수정**

#### ✅ **허용 수정**
- 로그 메시지 변경
- 주석 추가/수정  
- 타입 정의 개선 (로직 변경 없이)
- UI 컴포넌트 수정 (동기화 로직과 무관한)

#### ⛔ **절대 금지 수정**
- `'shared_project'` → 다른 문자열
- `15000` → 다른 숫자
- `dataType === 'project'` 조건 변경
- `1000000` (1MB) → 다른 크기
- userId 할당 로직 변경
- API 엔드포인트 구조 변경

---

**🔥 경고**: 이 규칙을 위반하면 **즉시 작업 중단** 및 **롤백** 필수
