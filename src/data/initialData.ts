import type { ProjectData } from '../types';

export const initialData: ProjectData = {
  projectPhases: [
    {
      id: 'phase-service-planning',
      title: 'Service Planning (서비스 기획)',
      tasks: [
        {
          id: 'task-sp-1',
          mainTask: [
            '서비스 컨셉 확정',
            '목표 시장/타깃 정의',
            '기능 리스트화',
            '요구사항 정의서 작성'
          ],
          personInCharge: '의뢰자, 사업기획 총괄',
          schedule: '1주차 ~ 2주차',
          checkpoints: [
            { id: 'sp-c1', text: '서비스 명 확정', completed: true },
            { id: 'sp-c2', text: '타깃/기능 정의', completed: true },
            { id: 'sp-c3', text: '요구사항서 등록', completed: false }
          ],
          performance: {
            date: '',
            docLink: '',
            comment: ''
          },
          issues: '리서치 내용 기록\n피드백 반영 사항'
        }
      ]
    }
  ],
  logs: []
};