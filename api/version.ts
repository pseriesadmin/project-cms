import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 최신 프로젝트 버전 정보 반환
    const latestVersion = `v${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const hasUpdates = Math.random() > 0.7; // 30% 확률로 업데이트 감지
    
    console.log(`🔄 버전 체크 요청: ${latestVersion}`);
    
    return res.status(200).json({
      success: true,
      latestVersion,
      hasUpdates,
      checkTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 버전 체크 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
