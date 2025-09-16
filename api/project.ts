import { VercelRequest, VercelResponse } from '@vercel/node';

// 간단한 메모리 저장소 (실제 운영환경에서는 데이터베이스 사용)
const projectStorage = new Map<string, any>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await handleProjectSave(req, res);
      case 'GET':
        return await handleProjectRetrieve(req, res);
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ 
          success: false,
          error: `Method ${method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('❌ 프로젝트 API 오류:', error);
    return res.status(500).json({ 
      success: false,
      error: '서버 오류가 발생했습니다.' 
    });
  }
}

async function handleProjectSave(req: VercelRequest, res: VercelResponse) {
  const { 
    projectData, 
    userId, 
    backupType = 'AUTO', 
    backupSource = '자동 백업' 
  } = req.body;

  if (!projectData) {
    return res.status(400).json({ 
      success: false,
      error: '저장할 프로젝트 데이터가 없습니다.' 
    });
  }

  // 백업 메타데이터 생성 (동기화 로그 포함)
  const backupMetadata = {
    backupId: `backup_${userId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    version: projectData.version || `v${Date.now()}`,
    syncAction: 'BACKUP',
    backupType,  // 백업 유형 명시
    backupSource, // 백업 소스 추가
    syncLogs: [
      ...(projectData.logs || []),
      {
        timestamp: new Date().toISOString(),
        message: `클라우드 백업 동기화 (유형: ${backupType}, 소스: ${backupSource})`,
        type: 'BACKUP',
        backupType,
        backupSource
      }
    ]
  };

  // 백업 파일 구조 정의
  const backupFile = {
    projectData,
    backupMetadata
  };
  
  // 메모리에 프로젝트 데이터 저장 (실제로는 데이터베이스에 저장)
  projectStorage.set(backupMetadata.backupId, backupFile);

  console.log(`✅ 프로젝트 데이터 클라우드 저장: ${backupMetadata.backupId} (유형: ${backupType})`);
  
  return res.status(200).json({
    success: true,
    backupId: backupMetadata.backupId,
    message: `프로젝트 데이터가 성공적으로 ${backupType === 'AUTO' ? '자동' : '수동'} 백업되었습니다.`,
    savedAt: backupMetadata.timestamp,
    backupType,
    backupSource,
    dataSize: {
      워크플로우: projectData.projectPhases?.length || 0,
      로그: backupMetadata.syncLogs?.length || 0
    }
  });
}

// 초기 프로젝트 데이터 생성 함수
const createInitialProjectData = (userId: string) => {
  const initialProjectData = {
    projectPhases: [],
    logs: [{
      timestamp: new Date().toISOString(),
      message: `사용자 ${userId}의 초기 프로젝트 데이터 생성`,
      type: 'SYSTEM_INIT'
    }],
    version: `v${Date.now()}-initial`
  };

  const backupMetadata = {
    backupId: `initial_backup_${userId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    version: initialProjectData.version,
    syncLogs: initialProjectData.logs
  };

  return {
    projectData: initialProjectData,
    backupMetadata
  };
};

async function handleProjectRetrieve(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
  }

  // 해당 사용자의 최신 프로젝트 데이터 찾기
  const userProjects = Array.from(projectStorage.entries())
    .filter(([_, data]) => data.backupMetadata.userId === userId)
    .sort((a, b) => new Date(b[1].backupMetadata.timestamp).getTime() - new Date(a[1].backupMetadata.timestamp).getTime());

  // 로컬 데이터 유효성 검사 함수
  const isValidProjectData = (data: any) => {
    return data && 
           data.projectData && 
           Array.isArray(data.projectData.projectPhases) && 
           data.projectData.projectPhases.length > 0;
  };

  // 데이터 없음을 나타내는 조건을 더욱 엄격하게 설정
  if (userProjects.length === 0) {
    // 전체 스토리지에서 해당 사용자의 데이터가 정말 없는지 이중 확인
    const allUserData = Array.from(projectStorage.entries())
      .filter(([_, data]) => data.backupMetadata.userId === userId);
    
    if (allUserData.length === 0) {
      // 완전히 새로운 사용자인 경우에만 초기 데이터 생성
      const initialData = createInitialProjectData(userId as string);
      projectStorage.set(initialData.backupMetadata.backupId, initialData);

      console.log(`🌱 [API] 신규 사용자 ${userId}의 초기 프로젝트 데이터 생성`);
      
      return res.status(200).json({
        success: true,
        projectId: initialData.backupMetadata.backupId,
        projectData: initialData.projectData,
        message: '초기 프로젝트 데이터가 생성되었습니다.',
        isInitialData: true
      });
    } else {
      // 데이터가 있지만 필터링에서 제외된 경우 (데이터 보호)
      console.log(`🔒 [API] 사용자 ${userId}의 기존 데이터 보호 - 초기화 방지`);
      
      return res.status(200).json({
        success: false,
        error: '저장된 프로젝트 데이터가 없습니다.',
        projectData: null,
        isEmpty: true,
        protectedData: true // 데이터 보호 플래그
      });
    }
  }
  
  // 기존 데이터가 있지만 유효하지 않은 경우에도 데이터 보호 우선
  if (!isValidProjectData(userProjects[0][1])) {
    console.log(`🔍 [API] 사용자 ${userId}의 기존 데이터 구조 보호`);
    
    const [latestProjectId, latestProjectData] = userProjects[0];
    
    return res.status(200).json({
      success: true,
      projectId: latestProjectId,
      projectData: latestProjectData.projectData,
      message: '기존 프로젝트 데이터를 보호합니다.',
      isInitialData: false,
      dataProtected: true
    });
  }

  const [latestProjectId, latestProjectData] = userProjects[0];

  // 복원 로그 추가 (상세 메타데이터 포함)
  const restorationLog = {
    timestamp: new Date().toISOString(),
    message: `클라우드 복원 동기화 (백업ID: ${latestProjectId})`,
    type: 'RESTORE',
    backupId: latestProjectId,
    backupTimestamp: latestProjectData.backupMetadata.timestamp,
    syncAction: latestProjectData.backupMetadata.syncAction || 'RESTORE',
    // 백업 유형 메타데이터 추가
    backupType: latestProjectData.backupMetadata.backupType || 'UNKNOWN',
    backupSource: latestProjectData.backupMetadata.backupSource || '클라우드 백업'
  };

  // 복원 로그 추가된 프로젝트 데이터 (누적 저장)
  const restoredProjectData = {
    ...latestProjectData.projectData,
    logs: [
      ...(latestProjectData.projectData.logs || []),
      restorationLog
    ]
  };

  // 복원된 데이터를 백업 스토리지에 재저장 (누적 로그 유지)
  const updatedBackupMetadata = {
    ...latestProjectData.backupMetadata,
    lastRestoreTimestamp: new Date().toISOString(),
    restoreCount: (latestProjectData.backupMetadata.restoreCount || 0) + 1,
    syncLogs: [
      ...(latestProjectData.backupMetadata.syncLogs || []),
      restorationLog
    ]
  };

  const updatedBackupFile = {
    projectData: restoredProjectData,
    backupMetadata: updatedBackupMetadata
  };

  // 복원 정보가 추가된 백업 파일로 업데이트
  projectStorage.set(latestProjectId, updatedBackupFile);

  console.log(`✅ 프로젝트 데이터 클라우드 복원: ${latestProjectId}`);
  
  return res.status(200).json({
    success: true,
    projectId: latestProjectId,
    projectData: restoredProjectData,
    retrievedAt: new Date().toISOString()
  });
}