import { useCallback, useEffect, useState } from 'react';

/**
 * 입력 중 데이터 보호를 위한 편집 상태 관리 훅
 * 최소한의 localStorage 기반 편집 상태 추적
 */
export const useEditState = () => {
  const [isEditing, setIsEditing] = useState(false);
  
  // 편집 시작
  const startEditing = useCallback(() => {
    localStorage.setItem('crazyshot_editing_state', 'true');
    setIsEditing(true);
    console.log('🖊️ [useEditState] 편집 상태 시작 - 클라우드 복원 보호 활성화');
  }, []);

  // 편집 종료
  const stopEditing = useCallback(() => {
    localStorage.removeItem('crazyshot_editing_state');
    setIsEditing(false);
    console.log('✅ [useEditState] 편집 상태 종료 - 클라우드 복원 보호 해제');
  }, []);

  // 편집 상태 확인 (정적 메서드)
  const checkEditingState = useCallback(() => {
    return localStorage.getItem('crazyshot_editing_state') === 'true';
  }, []);

  // 컴포넌트 언마운트 시 편집 상태 정리
  useEffect(() => {
    return () => {
      // 컴포넌트가 언마운트될 때 편집 상태 정리
      if (isEditing) {
        stopEditing();
      }
    };
  }, [isEditing, stopEditing]);

  return { 
    isEditing, 
    startEditing, 
    stopEditing, 
    checkEditingState 
  };
};

// 정적 유틸리티 함수 (훅 외부에서 사용 가능)
export const isCurrentlyEditing = (): boolean => {
  return localStorage.getItem('crazyshot_editing_state') === 'true';
};
