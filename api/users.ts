import { VercelRequest, VercelResponse } from '@vercel/node';

// 접속중인 사용자 추적 (실제 운영환경에서는 Redis 등 사용)
const activeUsers = new Set<string>();
const userHeartbeats = new Map<string, number>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await handleUserJoin(req, res);
      case 'DELETE':
        return await handleUserLeave(req, res);
      case 'GET':
        return await handleGetActiveUsers(req, res);
      default:
        res.setHeader('Allow', ['POST', 'DELETE', 'GET']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('❌ 사용자 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

async function handleUserJoin(req: VercelRequest, res: VercelResponse) {
  const { userId, sessionId, action } = req.body;

  if (!userId) {
    return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
  }

  // 기존 사용자 정리 (5분 이상 비활성)
  const now = Date.now();
  for (const [id, lastSeen] of userHeartbeats.entries()) {
    if (now - lastSeen > 300000) { // 5분
      activeUsers.delete(id);
      userHeartbeats.delete(id);
    }
  }

  const wasAlreadyActive = activeUsers.has(userId);
  activeUsers.add(userId);
  userHeartbeats.set(userId, now);

  // 사용자 활동 로그 기록
  if (action) {
    console.log(`🔄 사용자 활동: ${sessionId || userId} - ${action}`);
  }
  
  console.log(`👤 사용자 접속: ${userId} (총 ${activeUsers.size}명)`);

  return res.status(200).json({
    success: true,
    userId,
    isNewUser: !wasAlreadyActive,
    activeUserCount: activeUsers.size,
    hasMultipleUsers: activeUsers.size > 1
  });
}

async function handleUserLeave(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
  }

  activeUsers.delete(userId);
  userHeartbeats.delete(userId);

  console.log(`👋 사용자 떠남: ${userId} (남은 ${activeUsers.size}명)`);

  return res.status(200).json({
    success: true,
    userId,
    activeUserCount: activeUsers.size
  });
}

async function handleGetActiveUsers(req: VercelRequest, res: VercelResponse) {
  // 비활성 사용자 정리
  const now = Date.now();
  for (const [id, lastSeen] of userHeartbeats.entries()) {
    if (now - lastSeen > 300000) { // 5분
      activeUsers.delete(id);
      userHeartbeats.delete(id);
    }
  }

  return res.status(200).json({
    success: true,
    activeUserCount: activeUsers.size,
    hasMultipleUsers: activeUsers.size > 1,
    users: Array.from(activeUsers)
  });
}

