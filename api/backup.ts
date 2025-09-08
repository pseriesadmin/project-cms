import { VercelRequest, VercelResponse } from '@vercel/node';

// 간단한 메모리 저장소 (실제 운영환경에서는 데이터베이스 사용)
const backupStorage = new Map<string, any>();
const activeUsers = new Set<string>();

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
        return await handleBackup(req, res);
      case 'GET':
        return await handleRestore(req, res);
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('❌ API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

async function handleBackup(req: VercelRequest, res: VercelResponse) {
  const { equipmentData, logData, logArchive, formFields, categoryCodes, geminiApiKey } = req.body;

  if (!equipmentData) {
    return res.status(400).json({ error: '백업할 데이터가 없습니다.' });
  }

  const backupId = `backup_${Date.now()}`;
  const backupData = {
    equipmentData,
    logData,
    logArchive,
    formFields,
    categoryCodes,
    geminiApiKey,
    backupTime: new Date().toISOString(),
    backupVersion: '3.1.0'
  };

  // 메모리에 백업 저장 (실제로는 데이터베이스에 저장)
  backupStorage.set(backupId, backupData);

  console.log(`✅ 클라우드 백업 완료: ${backupId}`);
  
  return res.status(200).json({
    success: true,
    backupId,
    message: '클라우드 백업이 성공적으로 완료되었습니다.',
    dataSize: {
      장비목록: equipmentData?.length || 0,
      로그: (logData?.length || 0) + (logArchive?.length || 0),
      양식항목: formFields?.length || 0,
      분류코드: categoryCodes?.length || 0
    }
  });
}

async function handleRestore(req: VercelRequest, res: VercelResponse) {
  const { backupId } = req.query;

  if (!backupId) {
    // 최신 백업 반환
    const backupKeys = Array.from(backupStorage.keys());
    if (backupKeys.length === 0) {
      return res.status(404).json({ error: '복원할 백업이 없습니다.' });
    }

    const latestBackupId = backupKeys[backupKeys.length - 1];
    const latestBackup = backupStorage.get(latestBackupId);
    
    console.log(`✅ 최신 백업 복원: ${latestBackupId}`);
    
    return res.status(200).json({
      success: true,
      backupId: latestBackupId,
      data: latestBackup
    });
  }

  const backupData = backupStorage.get(backupId as string);
  
  if (!backupData) {
    return res.status(404).json({ error: '백업을 찾을 수 없습니다.' });
  }

  console.log(`✅ 백업 복원: ${backupId}`);
  
  return res.status(200).json({
    success: true,
    backupId,
    data: backupData
  });
}

