import { ProjectData, Equipment } from '../types';

interface BackupOptions {
  filePrefix?: string;
  type?: string;
  alertMessage?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
}

export const universalFallbackDownload = <T extends ProjectData | Equipment[]>(
  data: T, 
  options: BackupOptions = {}
): { success: boolean; fileName?: string; error?: Error } => {
  try {
    // 데이터 직렬화 및 파일명 생성
    const json = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filePrefix = options.filePrefix || '크레이지샷_백업';
    const fileName = `${filePrefix}_${timestamp}.json`;
    
    // Blob 및 다운로드 링크 생성
    const blob = new Blob([json], { type: options.type || 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    
    // 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 정리
    URL.revokeObjectURL(link.href);
    
    // 성공 알림 및 콜백
    const successMessage = options.alertMessage || 
      `✅ 데이터가 ${fileName}으로 성공적으로 백업되었습니다.`;
    
    // 사용자 정의 성공 핸들러 또는 기본 알림
    if (options.onSuccess) {
      options.onSuccess(fileName);
    } else {
      alert(successMessage);
    }
    
    return { success: true, fileName };
  } catch (error) {
    // 오류 처리
    const processedError = error instanceof Error 
      ? error 
      : new Error('알 수 없는 백업 오류가 발생했습니다.');
    
    // 사용자 정의 오류 핸들러 또는 기본 오류 처리
    if (options.onError) {
      options.onError(processedError);
    } else {
      console.error('❌ 백업 실패:', processedError);
      alert('백업 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
    
    return { 
      success: false, 
      error: processedError 
    };
  }
};

// File System Access API 기반 고급 백업 함수
export const advancedFileSystemBackup = async <T extends ProjectData | Equipment[]>(
  data: T,
  options: BackupOptions = {}
): Promise<{ success: boolean; fileName?: string; error?: Error }> => {
  const json = JSON.stringify(data, null, 2);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filePrefix = options.filePrefix || '크레이지샷_백업';
  const fileName = `${filePrefix}_${timestamp}.json`;

  // File System Access API 지원 여부 확인
  if ('showDirectoryPicker' in window && window.isSecureContext) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ 
        mode: 'readwrite' 
      });

      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();

      // 성공 처리
      if (options.onSuccess) {
        options.onSuccess(fileName);
      } else {
        alert(`✅ 데이터가 ${fileName}으로 성공적으로 백업되었습니다.`);
      }

      return { success: true, fileName };
    } catch (error: any) {
      // 사용자 취소 처리
      if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
        console.log('사용자가 백업을 취소했습니다.');
        return { success: false };
      }
      
      // 폴백 다운로드로 전환
      return universalFallbackDownload(data, options);
    }
  } else {
    // File System Access API 미지원 시 폴백 다운로드
    return universalFallbackDownload(data, options);
  }
};
