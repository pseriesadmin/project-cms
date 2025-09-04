import React, { useState, useEffect } from 'react';
import { Equipment, FormField, CategoryCode } from '../../types';
import { useGeminiAI } from '../../hooks/useGeminiAI';
import QRCode from 'qrcode';

interface EquipmentModalProps {
  equipment: Equipment | null;
  formFields: FormField[];
  isEditing?: boolean;
  onClose: () => void;
  onSubmit?: (equipment: Equipment) => void;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  equipment,
  formFields,
  isEditing = false,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Partial<Equipment>>({});
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [categoryCodes, setCategoryCodes] = useState<CategoryCode[]>([]);
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [internalIsEditing, setInternalIsEditing] = useState(isEditing);
  
  const {
    isGeneratingSpecs,
    error: aiError,
    generateSpecs,
    saveApiKey,
    getApiKey,
    setError
  } = useGeminiAI();

  useEffect(() => {
    if (equipment) {
      setFormData(equipment);
      // 기존 장비의 코드가 있으면 QR코드 미리보기 생성
      if (equipment.code) {
        generateQRCodePreview(equipment.code);
      }
    } else {
      // 새 장비 등록 시 등록일시 기본값 설정
      setFormData({
        registrationDate: new Date().toISOString().split('T')[0]
      });
      setQrCodePreview(''); // QR코드 미리보기 초기화
    }
  }, [equipment]);

  useEffect(() => {
    const savedApiKey = getApiKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [getApiKey]);

  useEffect(() => {
    const savedCategoryCodes = localStorage.getItem('category-codes');
    if (savedCategoryCodes) {
      setCategoryCodes(JSON.parse(savedCategoryCodes));
    }
  }, []);

  useEffect(() => {
    setInternalIsEditing(isEditing);
  }, [isEditing]);

  const activeFields = formFields.filter(field => field.active !== false);

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 분류코드 선택 시 카테고리 자동 입력
    if (name === 'categoryCode' && value) {
      const selectedCategory = categoryCodes.find(cc => cc.code === value);
      if (selectedCategory) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          category: selectedCategory.name
        }));
      }
    }

    // 장비코드 변경 시 QR코드 미리보기 업데이트
    if (name === 'code' && value) {
      generateQRCodePreview(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;

    // 필수 필드 검증
    const requiredFields = activeFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => 
      !formData[field.name] || formData[field.name] === ''
    );

    if (missingFields.length > 0) {
      alert(`다음 필수 필드를 입력해주세요: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    // 장비 코드 중복 체크는 부모 컴포넌트에서 처리

    onSubmit(formData as Equipment);
    
    // QR코드 생성 (장비 코드가 있는 경우)
    if (formData.code) {
      setTimeout(() => {
        generateQRCode(formData.code as string);
      }, 500); // 약간의 지연 후 QR코드 생성
    }
  };

  const handleGenerateSpecs = async () => {
    const name = formData.name as string;
    const manufacturer = formData.manufacturer as string;

    if (!name || !manufacturer) {
      setError('품명과 제조사를 먼저 입력해주세요.');
      return;
    }

    try {
      const result = await generateSpecs(name, manufacturer);
      
      if (result.specs) {
        handleInputChange('specs', result.specs);
      }
      if (result.features) {
        handleInputChange('features', result.features);
      }
      if (result.components) {
        handleInputChange('components', result.components.join(', '));
      }
    } catch (error) {
      // 에러는 훅에서 처리됨
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
      setShowApiKeyInput(false);
      alert('API 키가 저장되었습니다.');
    } else {
      alert('API 키를 입력해주세요.');
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    
    // 장비코드 필드에 제품군 분류코드 드롭다운 추가
    if (field.name === 'code') {
      return (
        <div className="flex gap-2">
          <div className="w-1/3">
            <select
              value={formData.categoryCode || ''}
              onChange={(e) => handleInputChange('categoryCode', e.target.value)}
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm p-2 text-sm"
            >
              <option value="">분류코드 선택</option>
              {categoryCodes.map((categoryCode) => (
                <option key={categoryCode.id} value={categoryCode.code}>
                  {categoryCode.code} - {categoryCode.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                // 영문, 숫자 조합 10자 제한
                const newValue = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
                handleInputChange(field.name, newValue);
              }}
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm p-2 text-sm"
              disabled={field.disabledOnEdit && !!equipment}
              required={field.required}
              placeholder="영문, 숫자 10자"
              maxLength={10}
            />
          </div>
        </div>
      );
    }
    
    if (field.type === 'textarea') {
      return (
        <textarea
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => {
            if (field.name === 'features') {
              const features = e.target.value.split(',').map(s => s.trim()).filter(s => s);
              handleInputChange(field.name, features);
            } else {
              handleInputChange(field.name, e.target.value);
            }
          }}
          className="mt-1 block w-full rounded-md border-stone-300 shadow-sm p-2 text-sm"
          disabled={field.disabledOnEdit && !!equipment}
          required={field.required}
          rows={3}
        />
      );
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleInputChange(field.name, parseInt(e.target.value) || 0)}
          className="mt-1 block w-full rounded-md border-stone-300 shadow-sm p-2 text-sm"
          disabled={field.disabledOnEdit && !!equipment}
          required={field.required}
        />
      );
    }

    if (field.type === 'date') {
      return (
        <div className="relative">
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm p-2 text-sm pr-10"
            disabled={field.disabledOnEdit && !!equipment}
            required={field.required}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => handleInputChange(field.name, e.target.value)}
        className="mt-1 block w-full rounded-md border-stone-300 shadow-sm p-2 text-sm"
        disabled={field.disabledOnEdit && !!equipment}
        required={field.required}
        placeholder={field.type === 'url' ? 'https://example.com' : ''}
      />
    );
  };

  // QR코드 미리보기 생성 함수
  const generateQRCodePreview = async (equipmentCode: string) => {
    try {
      const qrData = `https://crazyshot.kr/equipment/${equipmentCode}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodePreview(qrCodeDataURL);
    } catch (error) {
      console.error('QR코드 미리보기 생성 오류:', error);
      setQrCodePreview('');
    }
  };

  // QR코드 생성 및 다운로드 함수
  const generateQRCode = async (equipmentCode: string) => {
    try {
      const qrData = `https://crazyshot.kr/equipment/${equipmentCode}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // QR코드 이미지 다운로드
      const link = document.createElement('a');
      link.download = `QR_${equipmentCode}.png`;
      link.href = qrCodeDataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`QR코드가 생성되었습니다!\n파일명: QR_${equipmentCode}.png`);
    } catch (error) {
      console.error('QR코드 생성 오류:', error);
      alert('QR코드 생성에 실패했습니다.');
    }
  };

  // 이미지 URL 확인 함수
  const isImageUrl = (url: string) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           url.includes('unsplash') || url.includes('imgur') || url.includes('cloudinary');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-stone-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="text-2xl font-bold text-stone-900">
                {internalIsEditing 
                  ? (equipment ? '장비 정보 수정' : '새 장비 등록')
                  : equipment?.name || '장비 상세보기'
                }
              </h2>
              {/* QR코드 썸네일 (상세보기 모드에서만 표시) */}
              {!internalIsEditing && qrCodePreview && (
                <div className="ml-auto mr-4">
                  <img 
                    src={qrCodePreview} 
                    alt="QR Code" 
                    className="w-16 h-16 border border-stone-300 rounded"
                    title="제품 QR코드"
                  />
                </div>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-stone-500 hover:text-stone-800 text-2xl"
            >
              &times;
            </button>
          </div>
          {!internalIsEditing && equipment && (
            <div className="mt-2">
              <p className="text-sm text-stone-500">
                장비 코드: {equipment.categoryCode ? `${equipment.categoryCode}-${equipment.code}` : equipment.code}
              </p>
              <button
                type="button"
                onClick={() => setInternalIsEditing(true)}
                className="mt-2 px-3 py-1 text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                수정
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {internalIsEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이미지 미리보기 */}
              {formData.imageUrl && isImageUrl(formData.imageUrl as string) && (
                <div className="mb-6 text-center">
                  <img
                    src={formData.imageUrl as string}
                    alt={`${formData.name} 이미지`}
                    className="w-48 h-48 object-cover rounded-lg mx-auto border border-stone-300 shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p className="text-sm text-stone-500 mt-2">제품 이미지 미리보기</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeFields.map(field => (
                  <div key={field.id} className="form-group">
                    <label htmlFor={field.id} className="block text-sm font-medium text-stone-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>

              {/* AI 스펙 생성기 */}
              <div className="mt-6 p-4 bg-teal-50 border-l-4 border-teal-400 rounded-md">
                <p className="font-bold text-teal-800">✨AI 스펙 생성기</p>
                <p className="text-teal-700 text-sm mt-1">
                  장비의 품명과 제조사를 입력하면 AI가 자동으로 주요 스펙과 세부 기능, 구성품을 {equipment ? '수정해' : '채워'}줍니다.
                </p>
                  
                  {/* API 키 입력 섹션 */}
                  {showApiKeyInput && (
                    <div className="mt-3 p-3 bg-white border border-teal-300 rounded-md">
                      <label className="block text-xs font-medium text-teal-700 mb-1">
                        Gemini API 키
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="API 키를 입력하세요"
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={handleSaveApiKey}
                          className="px-3 py-1 bg-teal-500 text-white text-xs rounded-md hover:bg-teal-600"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowApiKeyInput(false)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleGenerateSpecs}
                      disabled={isGeneratingSpecs}
                      className="px-4 py-2 bg-teal-500 text-white text-xs font-medium rounded-md hover:bg-teal-600 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingSpecs ? '생성 중...' : '스펙 자동 생성'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyInput(true)}
                      className="px-2 py-1 text-xs text-teal-600 hover:text-teal-800 underline"
                    >
                      API키 설정
                    </button>
                    {isGeneratingSpecs && (
                      <div className="loading-spinner w-4 h-4 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                    )}
                  </div>
                  {aiError && (
                    <p className="text-red-500 text-sm mt-2">{aiError}</p>
                  )}
              </div>

              {/* QR코드 미리보기 */}
              {qrCodePreview && (
                <div className="flex justify-center mt-6">
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-stone-300 text-center">
                    <img 
                      src={qrCodePreview} 
                      alt="QR Code Preview" 
                      className="mx-auto mb-2"
                      style={{ width: '150px', height: '150px' }}
                    />
                    <p className="text-xs text-stone-500">
                      QR코드 미리보기<br/>
                      등록/수정 시 자동 다운로드됩니다
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mt-6">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  {equipment ? '수정' : '등록'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(equipment || {})}
                  className="w-full inline-flex justify-center py-2 px-4 border border-stone-300 shadow-sm text-sm font-medium rounded-md text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-200"
                >
                  초기화
                </button>
              </div>
            </form>
          ) : (
            // 상세보기 모드
            <div className="space-y-6">
              {/* 제품 이미지 */}
              {equipment?.imageUrl && isImageUrl(equipment.imageUrl) && (
                <div className="text-center">
                  <img
                    src={equipment.imageUrl}
                    alt={`${equipment.name} 이미지`}
                    className="w-48 h-48 object-cover rounded-lg mx-auto border border-stone-300 shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p className="text-sm text-stone-500 mt-2">제품 이미지</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeFields.map(field => {
                  if (field.name === 'imageUrl' && equipment?.imageUrl && isImageUrl(equipment.imageUrl)) {
                    return null; // 이미지는 위에 표시했으므로 제외
                  }

                  const value = equipment?.[field.name] || '정보 없음';
                  
                  // 장비코드 필드는 분류코드와 함께 표시
                  const formattedValue = field.name === 'code' ?
                    (equipment?.categoryCode ? `${equipment.categoryCode}-${value}` : value) :
                    field.type === 'number' ? 
                      (value as number).toLocaleString() : 
                      field.type === 'url' ? 
                        `${value}` : // URL은 그대로 표시 (링크 기능은 필요시 추가)
                      field.type === 'date' && value !== '정보 없음' ?
                        new Date(value as string).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) :
                        Array.isArray(value) ? value.join(', ') : value;

                  return (
                    <div key={field.id}>
                      <p className="font-semibold text-stone-700">{field.label}</p>
                      <p className="text-stone-500">
                        {field.type === 'url' && value !== '정보 없음' ? (
                          <a 
                            href={value as string} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {value as string}
                          </a>
                        ) : (
                          formattedValue
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
