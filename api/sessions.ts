import type { VercelRequest, VercelResponse } from '@vercel/node';

// 메모리 기반 세션 저장소 (간단한 구현)
const activeSessions = new Map<string, {
  id: string;
  lastSeen: number;
  userAgent?: string;
}>();

// 세션 만료 시간 (60초)
const SESSION_TIMEOUT = 60000;

// 세션 정리 함수
const cleanupExpiredSessions = () => {
  const now = Date.now();
  const expiredSessions: string[] = [];
  
  activeSessions.forEach((session, sessionId) => {
    if (now - session.lastSeen > SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  });
  
  expiredSessions.forEach(sessionId => {
    activeSessions.delete(sessionId);
  });
  
  return expiredSessions.length;
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const { sessionId, action, timestamp } = req.body;

      if (!sessionId || !action) {
        return res.status(400).json({
          success: false,
          error: 'sessionId와 action이 필요합니다.'
        });
      }

      // 세션 등록/업데이트
      if (action === 'heartbeat') {
        const now = Date.now();
        
        // 만료된 세션 정리
        const cleanedCount = cleanupExpiredSessions();
        if (cleanedCount > 0) {
          console.log(`🧹 [API/sessions] ${cleanedCount}개 만료 세션 정리`);
        }

        // 현재 세션 업데이트
        activeSessions.set(sessionId, {
          id: sessionId,
          lastSeen: timestamp || now,
          userAgent: req.headers['user-agent']
        });

        console.log(`💓 [API/sessions] 하트비트 수신:`, {
          sessionId,
          totalSessions: activeSessions.size,
          timestamp: new Date().toISOString()
        });

        // 활성 세션 목록 반환
        const sessionList = Array.from(activeSessions.values());
        
        return res.status(200).json({
          success: true,
          totalCount: sessionList.length,
          activeSessions: sessionList.map(session => ({
            id: session.id,
            lastSeen: session.lastSeen
          })),
          message: `세션 업데이트 완료 (총 ${sessionList.length}명)`
        });
      }

      return res.status(400).json({
        success: false,
        error: '지원되지 않는 액션입니다.'
      });
    }

    if (req.method === 'GET') {
      // 만료된 세션 정리
      cleanupExpiredSessions();
      
      // 현재 활성 세션 목록 반환
      const sessionList = Array.from(activeSessions.values());
      
      return res.status(200).json({
        success: true,
        totalCount: sessionList.length,
        activeSessions: sessionList.map(session => ({
          id: session.id,
          lastSeen: session.lastSeen
        }))
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });

  } catch (error) {
    console.error('❌ [API/sessions] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.'
    });
  }
}
