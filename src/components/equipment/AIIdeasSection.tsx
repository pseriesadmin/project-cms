import React, { useState } from 'react';
import { Equipment } from '../../types';
import { useGeminiAI } from '../../hooks/useGeminiAI';

interface AIIdeasSectionProps {
  equipmentData: Equipment[];
}

export const AIIdeasSection: React.FC<AIIdeasSectionProps> = ({
  equipmentData
}) => {
  const [ideasOutput, setIdeasOutput] = useState('아이디어 생성 버튼을 눌러보세요!');
  
  const {
    isGeneratingIdeas,
    error,
    generateIdeas,
    setError
  } = useGeminiAI();

  const handleGenerateIdeas = async () => {
    if (equipmentData.length === 0) {
      setIdeasOutput('장비 목록이 비어있습니다. 아이디어를 생성하려면 장비를 등록해주세요.');
      return;
    }

    setIdeasOutput('');
    setError(null);

    try {
      const ideas = await generateIdeas(equipmentData);
      setIdeasOutput(ideas);
    } catch (error) {
      setIdeasOutput('아이디어 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-stone-800">✨AI 활용 아이디어</h2>
        <button
          onClick={handleGenerateIdeas}
          disabled={isGeneratingIdeas || equipmentData.length === 0}
          className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 transition-colors duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingIdeas ? '생성 중...' : '아이디어 생성하기'}
        </button>
      </div>
      
      <p className="text-stone-500 mb-4 text-sm">
        현재 등록된 장비들의 조합을 바탕으로 다양한 렌탈 활용 아이디어를 제안합니다.
      </p>
      
      <div className="p-4 bg-stone-50 rounded-md text-stone-700 whitespace-pre-wrap min-h-[200px]">
        {ideasOutput}
      </div>
      
      {isGeneratingIdeas && (
        <div className="mt-4 flex justify-center items-center">
          <div className="loading-spinner w-6 h-6 border-2 border-yellow-200 border-t-yellow-500 rounded-full animate-spin"></div>
          <span className="ml-2 text-stone-500">아이디어를 생성하고 있습니다...</span>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </section>
  );
};
