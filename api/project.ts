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
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('❌ 프로젝트 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

async function handleProjectSave(req: VercelRequest, res: VercelResponse) {
  const { projectData, userId } = req.body;

  if (!projectData) {
    return res.status(400).json({ error: '저장할 프로젝트 데이터가 없습니다.' });
  }

  const projectId = `project_${userId}_${Date.now()}`;
  
  // 메모리에 프로젝트 데이터 저장 (실제로는 데이터베이스에 저장)
  projectStorage.set(projectId, {
    ...projectData,
    savedAt: new Date().toISOString(),
    userId
  });

  console.log(`✅ 프로젝트 데이터 클라우드 저장: ${projectId}`);
  
  return res.status(200).json({
    success: true,
    projectId,
    message: '프로젝트 데이터가 성공적으로 저장되었습니다.',
    savedAt: new Date().toISOString(),
    dataSize: {
      워크플로우: projectData.projectPhases?.length || 0,
      로그: projectData.logs?.length || 0
    }
  });
}

async function handleProjectRetrieve(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
  }

  // 해당 사용자의 최신 프로젝트 데이터 찾기
  const userProjects = Array.from(projectStorage.entries())
    .filter(([_, data]) => data.userId === userId)
    .sort((a, b) => new Date(b[1].savedAt).getTime() - new Date(a[1].savedAt).getTime());

  if (userProjects.length === 0) {
    return res.status(404).json({ error: '저장된 프로젝트 데이터가 없습니다.' });
  }

  const [latestProjectId, latestProjectData] = userProjects[0];

  console.log(`✅ 프로젝트 데이터 클라우드 복원: ${latestProjectId}`);
  
  return res.status(200).json({
    success: true,
    projectId: latestProjectId,
    projectData: latestProjectData,
    retrievedAt: new Date().toISOString()
  });
}

