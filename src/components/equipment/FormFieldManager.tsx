import React, { useState, useRef, useEffect } from 'react';
import { FormField, Equipment, CategoryCode } from '../../types';

interface FormFieldManagerProps {
  formFields: FormField[];
  equipmentData: Equipment[];
  onSaveFormFields: (fields: FormField[]) => void;
  onLogChange: (action: string, itemCode: string, oldData: any, newData: any, userId?: string) => void;
  onClose: () => void;
}

export const FormFieldManager: React.FC<FormFieldManagerProps> = ({
  formFields,
  equipmentData,
  onSaveFormFields,
  onLogChange,
  onClose
}) => {
  const [fields, setFields] = useState<FormField[]>([...formFields]);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditModal, setShowFieldEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newFieldData, setNewFieldData] = useState({
    name: '',
    label: '',
    type: 'text' as FormField['type']
  });
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 관리코드 설정 모달 관련 state
  const [showCategoryCodeModal, setShowCategoryCodeModal] = useState(false);
  const [categoryCodes, setCategoryCodes] = useState<CategoryCode[]>([]);
  const [newCategoryCode, setNewCategoryCode] = useState({ code: '', name: '' });

  // categoryCodes 로드
  useEffect(() => {
    const savedCategoryCodes = localStorage.getItem('category-codes');
    if (savedCategoryCodes) {
      setCategoryCodes(JSON.parse(savedCategoryCodes));
    }
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 활성 필드와 비활성 필드 분리
  const activeFields = fields.filter(field => field.active !== false);
  const inactiveFields = fields.filter(field => field.active === false);
  
  console.log('🔍 [FormFieldManager] 활성 필드 수:', activeFields.length);
  console.log('🔍 [FormFieldManager] 비활성 필드 수:', inactiveFields.length);
  console.log('🔍 [FormFieldManager] showFieldEditModal:', showFieldEditModal);
  console.log('🔍 [FormFieldManager] newFieldData:', newFieldData);

  // 필드 추가/수정 모달 열기
  const handleAddField = () => {
    console.log('🔍 [FormFieldManager] 새 필드 추가 버튼 클릭');
    
    // 버튼 클릭 효과를 위한 짧은 지연
    setTimeout(() => {
      setEditingField(null);
      setNewFieldData({ name: '', label: '', type: 'text' });
      setIsTypeDropdownOpen(false);
      setShowFieldEditModal(true);
    }, 100);
  };

  const handleEditField = (field: FormField) => {
    console.log('🔍 [FormFieldManager] 필드 수정 버튼 클릭:', field.label);
    setEditingField(field);
    setNewFieldData({
      name: field.name,
      label: field.label,
      type: field.type
    });
    setIsTypeDropdownOpen(false);
    setShowFieldEditModal(true);
  };

  // 필드 숨기기/활성화
  const handleToggleField = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    
    if (field.core && field.active !== false) {
      alert(`'${field.label}'은(는) 핵심 필드로 숨길 수 없습니다.\n\n핵심 필드는 시스템 안정성을 위해 항상 활성 상태를 유지해야 합니다.`);
      return;
    }

    const affectedItems = equipmentData.filter(item => 
      item[field.name] && item[field.name] !== ''
    ).length;

    const message = field.active !== false
      ? affectedItems > 0 
        ? `'${field.label}' 항목을 숨기시겠습니까?\n\n영향받는 데이터: ${affectedItems}개\n\n※ 데이터는 안전하게 보존되며, CSV 출력에 포함됩니다.\n※ 언제든지 다시 활성화할 수 있습니다.`
        : `'${field.label}' 항목을 숨기시겠습니까?`
      : `'${field.label}' 필드를 다시 활성화하시겠습니까?`;

    if (confirm(message)) {
      const oldField = { ...field };
      const newFields = [...fields];
      newFields[fieldIndex] = {
        ...field,
        active: field.active !== false ? false : true,
        hiddenAt: field.active !== false ? new Date().toISOString() : undefined
      };
      
      setFields(newFields);
      onLogChange(
        field.active !== false ? '양식 항목 숨김' : '양식 항목 활성화',
        'N/A',
        oldField,
        newFields[fieldIndex],
        'system'
      );
      
      alert(`'${field.label}' 항목이 ${field.active !== false ? '숨김' : '활성화'}되었습니다.`);
    }
  };

  // 필드 삭제
  const handleDeleteField = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    
    if (field.core) {
      alert(`'${field.label}'은(는) 핵심 필드로 삭제할 수 없습니다.\n\n핵심 필드는 시스템 안정성을 위해 필수적으로 유지되어야 합니다.`);
      return;
    }

    const affectedItems = equipmentData.filter(item => 
      item[field.name] && item[field.name] !== ''
    ).length;

    const message = affectedItems > 0
      ? `'${field.label}' 항목을 완전히 삭제하시겠습니까?\n\n영향받는 데이터: ${affectedItems}개\n\n⚠️ 이 작업은 되돌릴 수 없습니다!`
      : `'${field.label}' 항목을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;

    if (confirm(message)) {
      const oldField = { ...field };
      const newFields = fields.filter((_, index) => index !== fieldIndex);
      
      setFields(newFields);
      onLogChange('양식 항목 삭제', 'N/A', oldField, null, 'system');
      
      alert(`'${field.label}' 항목이 삭제되었습니다.`);
    }
  };

  // 필드 저장
  const handleSaveField = async () => {
    console.log('🔍 [FormFieldManager] 필드 저장 버튼 클릭:', newFieldData);
    console.log('🔍 [FormFieldManager] editingField:', editingField);
    
    if (!newFieldData.name.trim() || !newFieldData.label.trim()) {
      alert('필드 이름과 라벨을 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    
    try {
      // 짧은 지연으로 시각적 피드백 제공
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (editingField) {
        // 기존 필드 수정
        const fieldIndex = fields.findIndex(f => f.name === editingField.name);
        if (fieldIndex !== -1) {
          const oldField = { ...fields[fieldIndex] };
          const newFields = [...fields];
          newFields[fieldIndex] = {
            ...newFields[fieldIndex],
            label: newFieldData.label,
            type: newFieldData.type
          };
          
          setFields(newFields);
          onLogChange('양식 항목 수정', 'N/A', oldField, newFields[fieldIndex], 'system');
          
          // 성공 피드백
          alert(`'${newFieldData.label}' 필드가 성공적으로 수정되었습니다.`);
        }
      } else {
        // 새 필드 추가
        const isNameTaken = fields.some(f => f.name === newFieldData.name);
        if (isNameTaken) {
          alert('이미 존재하는 필드 이름입니다. 다른 이름을 사용해주세요.');
          return;
        }

        const newField: FormField = {
          id: `reg-${newFieldData.name}`,
          label: newFieldData.label,
          name: newFieldData.name,
          type: newFieldData.type,
          required: false,
          disabledOnEdit: false,
          group: "custom",
          active: true,
          core: false
        };

        const newFields = [...fields, newField];
        setFields(newFields);
        onLogChange('양식 항목 추가', 'N/A', null, newField, 'system');
        
        // 성공 피드백
        alert(`'${newFieldData.label}' 필드가 성공적으로 추가되었습니다.`);
      }

      setShowFieldEditModal(false);
      setEditingField(null);
      setNewFieldData({ name: '', label: '', type: 'text' });
      setIsTypeDropdownOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 변경사항 저장
  const handleSaveChanges = () => {
    console.log('🔍 [FormFieldManager] 변경사항 저장 버튼 클릭');
    console.log('🔍 [FormFieldManager] 저장할 필드:', fields);
    
    // 핵심 필드 검증
    const coreFieldNames = ['registrationDate', 'code', 'name', 'category', 'manufacturer', 'rental', 'deposit', 'totalStock', 'availableStock'];
    const missingCoreFields = coreFieldNames.filter(name => 
      !fields.find(field => field.name === name && field.core && field.active !== false)
    );
    
    if (missingCoreFields.length > 0) {
      alert(`핵심 필드가 누락되었습니다: ${missingCoreFields.join(', ')}\n\n시스템에서 자동으로 복원됩니다.`);
    }
    
    onSaveFormFields(fields);
    onClose();
  };

  // 변경사항 확인 함수
  const hasChanges = () => {
    return JSON.stringify(fields) !== JSON.stringify(formFields);
  };

  // 변경사항 취소
  const handleCancel = () => {
    if (hasChanges()) {
      if (confirm('변경사항을 저장하지 않고 닫으시겠습니까?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // 관리코드 관련 핸들러
  const saveCategoryCodes = (codes: CategoryCode[]) => {
    localStorage.setItem('category-codes', JSON.stringify(codes));
    setCategoryCodes(codes);
  };

  const handleAddCategoryCode = () => {
    if (!newCategoryCode.code.trim() || !newCategoryCode.name.trim()) {
      alert('코드와 이름을 모두 입력해주세요.');
      return;
    }

    // 영문, 숫자 조합 50자 제한 검증
    const codeRegex = /^[a-zA-Z0-9]{1,50}$/;
    if (!codeRegex.test(newCategoryCode.code)) {
      alert('코드는 영문, 숫자 조합으로 최대 50자까지 입력 가능합니다.');
      return;
    }

    // 중복 검사
    if (categoryCodes.some(cc => cc.code === newCategoryCode.code)) {
      alert('이미 존재하는 코드입니다.');
      return;
    }

    const newCode: CategoryCode = {
      id: `cc-${Date.now()}`,
      code: newCategoryCode.code,
      name: newCategoryCode.name,
      createdAt: new Date().toISOString()
    };

    const updatedCodes = [...categoryCodes, newCode];
    saveCategoryCodes(updatedCodes);
    
    // 로그 기록 추가
    onLogChange('관리코드 추가', 'N/A', null, newCode, 'system');
    
    setNewCategoryCode({ code: '', name: '' });
    alert('제품군 분류코드가 추가되었습니다.');
  };

  const handleDeleteCategoryCode = (id: string) => {
    const code = categoryCodes.find(cc => cc.id === id);
    if (!code) return;

    if (confirm(`'${code.name}' 코드를 삭제하시겠습니까?`)) {
      const updatedCodes = categoryCodes.filter(cc => cc.id !== id);
      saveCategoryCodes(updatedCodes);
      
      // 로그 기록 추가
      onLogChange('관리코드 삭제', 'N/A', code, null, 'system');
      
      alert('제품군 분류코드가 삭제되었습니다.');
    }
  };

  return (
    <>
      {/* 메인 모달 */}
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible">
          <div className="p-6 border-b border-stone-200 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-stone-800">제품 등록 양식 항목 관리</h2>
              <button 
                onClick={handleCancel}
                className="text-stone-500 hover:text-stone-800 text-2xl"
              >
                &times;
              </button>
            </div>
            <p className="text-stone-500 text-sm mt-1">
              제품 등록 시 사용되는 양식 항목을 추가, 수정, 삭제할 수 있습니다. 변경 사항은 즉시 반영됩니다.
            </p>
          </div>

          <div className="p-6">
            {/* 활성 필드 섹션 */}
            {activeFields.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-green-700 mb-3">✅ 활성 필드</h3>
                <div className="space-y-2">
                  {activeFields.map((field) => {
                    const fieldIndex = fields.findIndex(f => f.name === field.name);
                    return (
                      <div key={field.name} className={`flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg ${
                        field.core 
                          ? 'bg-blue-50' 
                          : 'bg-green-50'
                      }`}>
                        <div className="flex-grow flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-0">
                          <span className={`text-sm font-bold ${field.core ? 'text-blue-700' : 'text-green-700'}`}>
                            {field.core && '🔒 '}{field.label}
                          </span>
                          <span className={`text-xs ${field.core ? 'text-blue-500' : 'text-green-500'}`}>({field.name})</span>
                          {field.core && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                              핵심 필드
                            </span>
                          )}
                        </div>
                        <div className="space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditField(field)}
                            className="px-3 py-1 text-xs font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                          >
                            수정
                          </button>
                          {!field.core && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleField(fieldIndex)}
                                className="px-3 py-1 text-xs font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                              >
                                숨김
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteField(fieldIndex)}
                                className="px-3 py-1 text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 비활성 필드 섹션 */}
            {inactiveFields.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  💼 숨겨진 필드 ({inactiveFields.length}개)
                </h3>
                <div className="space-y-2">
                  {inactiveFields.map((field) => {
                    const fieldIndex = fields.findIndex(f => f.name === field.name);
                    const affectedItems = equipmentData.filter(item => 
                      item[field.name] && item[field.name] !== ''
                    ).length;
                    
                    return (
                      <div key={field.name} className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <div className="flex-grow flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-0">
                          <span className="text-sm font-bold text-gray-600">{field.label}</span>
                          <span className="text-xs text-gray-400">({field.name})</span>
                          <span className="text-xs text-blue-500">데이터: {affectedItems}개</span>
                        </div>
                        <div className="space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleField(fieldIndex)}
                            className="px-3 py-1 text-xs font-medium rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors"
                          >
                            활성화
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteField(fieldIndex)}
                            className="px-3 py-1 text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 새 항목 추가 버튼 */}
            <button
              type="button"
              onClick={handleAddField}
              className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all duration-200 mb-3 shadow-md hover:shadow-lg"
            >
              <span className="inline-flex items-center">
                <span className="text-lg mr-2">+</span>
                새 항목 추가
              </span>
            </button>

            {/* 관리코드 설정 버튼 */}
            <button
              type="button"
              onClick={() => setShowCategoryCodeModal(true)}
              className="w-full px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-md hover:bg-purple-600 hover:scale-105 active:scale-95 transition-all duration-200 mb-6 shadow-md hover:shadow-lg"
            >
              <span className="inline-flex items-center">
                <span className="text-lg mr-2">⚙️</span>
                관리코드 설정
              </span>
            </button>

            {/* 저장/취소 버튼 */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSaveChanges}
                className="flex-1 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-md hover:bg-teal-600 transition-colors duration-200"
              >
                변경사항 저장
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 필드 추가/수정 모달 */}
      {showFieldEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl p-6" style={{ maxHeight: 'none', overflow: 'visible' }}>
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-2xl font-bold text-stone-800">
                {editingField ? '양식 항목 수정' : '새 양식 항목 추가'}
              </h2>
              <button 
                onClick={() => {
                  setShowFieldEditModal(false);
                  setIsTypeDropdownOpen(false);
                }}
                className="text-stone-500 hover:text-stone-800 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  필드 이름 (고유값) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFieldData.name}
                  onChange={(e) => setNewFieldData({...newFieldData, name: e.target.value})}
                  className={`block w-full rounded-md border border-stone-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-1 p-3 text-sm ${
                    !!editingField 
                      ? 'bg-stone-100 text-stone-500 cursor-not-allowed' 
                      : 'bg-white'
                  }`}
                  placeholder="예: productWeight"
                  disabled={!!editingField} // 수정 시에는 이름 변경 불가
                  required
                />
                <p className="text-xs text-stone-500 mt-1">
                  영문, 숫자, 언더스코어만 사용 가능 (공백 없음)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  라벨 (사용자에게 보이는 이름) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFieldData.label}
                  onChange={(e) => setNewFieldData({...newFieldData, label: e.target.value})}
                  className="block w-full rounded-md border border-stone-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-1 p-3 text-sm"
                  placeholder="예: 제품 무게"
                  required
                />
              </div>

              {/* 타입 선택 필드 - 커스텀 드롭다운 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">타입</label>
                <div className="relative" ref={dropdownRef}>
                  {/* 드롭다운 버튼 */}
                  <button
                    type="button"
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    className="w-full h-12 px-3 py-2 border border-stone-300 rounded-md bg-white text-stone-900 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <span>
                      {newFieldData.type === 'text' && '텍스트'}
                      {newFieldData.type === 'number' && '숫자'}
                      {newFieldData.type === 'date' && '날짜'}
                      {newFieldData.type === 'textarea' && '긴 텍스트'}
                      {newFieldData.type === 'url' && '웹 링크'}
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* 드롭다운 메뉴 */}
                  {isTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-300 rounded-md shadow-lg z-[9999]">
                      <div className="py-1">
                        {[
                          { value: 'text', label: '텍스트' },
                          { value: 'number', label: '숫자' },
                          { value: 'date', label: '날짜' },
                          { value: 'textarea', label: '긴 텍스트' },
                          { value: 'url', label: '웹 링크' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setNewFieldData({...newFieldData, type: option.value as FormField['type']});
                              setIsTypeDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                              newFieldData.type === option.value ? 'bg-blue-50 text-blue-600' : 'text-stone-900'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 현재 선택된 값 표시 (디버그용) */}
                  <div className="text-xs text-gray-500 mt-1">
                    현재 선택: {newFieldData.type} | 커스텀 드롭다운 v3.0
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldEditModal(false);
                    setIsTypeDropdownOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-md text-white bg-stone-500 hover:bg-stone-600 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveField}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-md text-white transition-colors ${
                    isLoading 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      저장 중...
                    </div>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 관리코드 설정 모달 */}
      {showCategoryCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4" style={{ zIndex: 1100 }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-stone-800">제품군 분류코드 관리</h2>
                <button 
                  onClick={() => setShowCategoryCodeModal(false)}
                  className="text-stone-500 hover:text-stone-800 text-2xl"
                >
                  &times;
                </button>
              </div>
              <p className="text-stone-500 text-sm mt-1">
                장비 등록 시 사용할 제품군 분류코드를 관리합니다.
              </p>
            </div>

            <div className="p-6">
              {/* 새 코드 추가 */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border">
                <h3 className="text-lg font-semibold text-purple-800 mb-3">새 코드 추가</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      코드 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCategoryCode.code}
                      onChange={(e) => setNewCategoryCode({...newCategoryCode, code: e.target.value})}
                      className="w-full rounded-md border border-stone-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:ring-1 p-2 text-sm"
                      placeholder="예: CAMERA01"
                      maxLength={50}
                    />
                    <p className="text-xs text-stone-500 mt-1">영문, 숫자 조합 최대 50자</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCategoryCode.name}
                      onChange={(e) => setNewCategoryCode({...newCategoryCode, name: e.target.value})}
                      className="w-full rounded-md border border-stone-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:ring-1 p-2 text-sm"
                      placeholder="예: 카메라 장비"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCategoryCode}
                  className="mt-3 px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-md hover:bg-purple-600 transition-colors"
                >
                  추가
                </button>
              </div>

              {/* 기존 코드 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-stone-800 mb-3">등록된 코드 ({categoryCodes.length}개)</h3>
                {categoryCodes.length === 0 ? (
                  <p className="text-stone-500 text-center py-8">등록된 분류코드가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {categoryCodes.map((code) => (
                      <div key={code.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-md">
                        <div>
                          <span className="font-medium text-stone-800">{code.code}</span>
                          <span className="text-stone-500 ml-2">- {code.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategoryCode(code.id)}
                          className="px-3 py-1 text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="mt-6 text-right">
                <button
                  type="button"
                  onClick={() => setShowCategoryCodeModal(false)}
                  className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
