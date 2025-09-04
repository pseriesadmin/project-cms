import { useState, useCallback } from 'react';
import { Equipment } from '../types';

interface GenerateSpecsResult {
  specs?: string;
  features?: string[];
  components?: string[];
}

export const useGeminiAI = () => {
  const [isGeneratingSpecs, setIsGeneratingSpecs] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gemini API 호출
  const callGeminiAPI = useCallback(async (
    prompt: string, 
    config: any = {}
  ): Promise<string> => {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
      throw new Error('API 키를 먼저 설정해주세요. "API키 설정" 버튼을 클릭하세요.');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: config
    };

    let retries = 0;
    const maxRetries = 3;
    let delay = 1000;

    while (retries < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`API call rate-limited. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2;
            retries++;
            continue;
          } else {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 && 
            result.candidates[0].content && result.candidates[0].content.parts) {
          return result.candidates[0].content.parts[0].text;
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        console.error('API call failed:', error);
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
    
    throw new Error('Maximum retries exceeded');
  }, []);

  // 스펙 자동 생성
  const generateSpecs = useCallback(async (
    name: string, 
    manufacturer: string
  ): Promise<GenerateSpecsResult> => {
    if (!name.trim() || !manufacturer.trim()) {
      throw new Error('품명과 제조사를 입력해주세요.');
    }

    setIsGeneratingSpecs(true);
    setError(null);

    try {
      const prompt = `
        사용자가 장비 등록을 위해 품명과 제조사 정보를 입력했습니다.
        - 품명: ${name}
        - 제조사: ${manufacturer}

        이 정보를 바탕으로 아래 JSON 형식에 맞게 해당 장비의 주요 스펙, 세부 기능, 기본 구성품 정보를 생성해주세요.
        
        조건:
        - 스펙: 3~4개의 핵심 스펙을 설명해주세요.
        - 세부 기능: 3~5개의 주요 기능을 쉼표로 구분하여 나열해주세요.
        - 기본 구성품: 3~5개의 주요 구성품을 쉼표로 구분하여 나열해주세요.
        - 답변은 오직 JSON 객체만 포함해야 합니다. 다른 서론이나 설명은 절대 포함하지 마세요.

        결과 JSON 예시:
        {
            "specs": "이곳에 스펙 설명",
            "features": ["기능1", "기능2"],
            "components": ["구성품1", "구성품2"]
        }
      `;

      const jsonText = await callGeminiAPI(prompt, { 
        responseMimeType: "application/json" 
      });
      
      const parsedResult = JSON.parse(jsonText);
      return parsedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스펙 생성에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGeneratingSpecs(false);
    }
  }, [callGeminiAPI]);

  // 아이디어 생성
  const generateIdeas = useCallback(async (
    equipmentData: Equipment[]
  ): Promise<string> => {
    if (equipmentData.length === 0) {
      throw new Error('장비 목록이 비어있습니다. 아이디어를 생성하려면 장비를 등록해주세요.');
    }

    setIsGeneratingIdeas(true);
    setError(null);

    try {
      const equipmentList = equipmentData
        .map(item => `- ${item.name} (${item.category})`)
        .join('\n');
      
      const prompt = `
        다음은 현재 보유 중인 장비 목록입니다.
        ${equipmentList}

        위 장비들을 활용하여 '크레이지샷'의 렌탈 사업에 도움이 될 만한 3가지 렌탈 패키지 아이디어를 제안해주세요.
        각 아이디어는 아래 항목을 반드시 포함해야 합니다:
        1. 아이디어 제목
        2. 주요 장비 구성
        3. 패키지 활용 예시

        결과는 다음 형식으로 작성해주세요.
        
        ### 아이디어 1. [아이디어 제목]
        
        **주요 장비 구성**
        - [장비명]
        - [장비명]
        ...
        
        **패키지 활용 예시**
        [패키지를 활용할 수 있는 구체적인 상황이나 시나리오 설명]
        
        ---
        
        ### 아이디어 2. [아이디어 제목]
        
        **주요 장비 구성**
        - [장비명]
        - [장비명]
        ...
        
        **패키지 활용 예시**
        [패키지를 활용할 수 있는 구체적인 상황이나 시나리오 설명]
        
        ---
        
        ### 아이디어 3. [아이디어 제목]
        
        **주요 장비 구성**
        - [장비명]
        - [장비명]
        ...
        
        **패키지 활용 예시**
        [패키지를 활용할 수 있는 구체적인 상황이나 시나리오 설명]
      `;

      const ideas = await callGeminiAPI(prompt);
      return ideas;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '아이디어 생성에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGeneratingIdeas(false);
    }
  }, [callGeminiAPI]);

  // API 키 저장
  const saveApiKey = useCallback((apiKey: string) => {
    localStorage.setItem('geminiApiKey', apiKey);
  }, []);

  // API 키 가져오기
  const getApiKey = useCallback(() => {
    return localStorage.getItem('geminiApiKey');
  }, []);

  // API 키 삭제
  const removeApiKey = useCallback(() => {
    localStorage.removeItem('geminiApiKey');
  }, []);

  return {
    isGeneratingSpecs,
    isGeneratingIdeas,
    error,
    generateSpecs,
    generateIdeas,
    saveApiKey,
    getApiKey,
    removeApiKey,
    setError
  };
};
