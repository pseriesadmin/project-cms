import React, { useState, useEffect } from 'react';
import { useEquipmentData } from '../../hooks/useEquipmentData';
import { useEquipmentFilters } from '../../hooks/useEquipmentFilters';
// import { useActiveUsers } from '../../hooks/useActiveUsers'; // 임시 주석 처리
import { EquipmentKPISection } from './EquipmentKPISection';
import { EquipmentFilters } from './EquipmentFilters';
import { EquipmentCharts } from './EquipmentCharts';
import { EquipmentTable } from './EquipmentTable';
import { EquipmentLogTable } from './EquipmentLogTable';
import { EquipmentModal } from './EquipmentModal';
import { EquipmentManagement } from './EquipmentManagement';
import { AIIdeasSection } from './AIIdeasSection';
import { FormFieldManager } from './FormFieldManager';
import { TopSnackbar, BottomSnackbar } from '../common/TopSnackbar';
import { useUserSession } from '../../hooks/useRealtimeBackup';
import { Equipment } from '../../types';

export const EquipmentDashboard: React.FC = () => {
  const {
    equipmentData,
    logData,
    logArchive,
    formFields,
    isFirstRun,
    setIsFirstRun,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    saveData,
    saveFormFields,
    logDetailedChange,
    VERSION_HISTORY
  } = useEquipmentData();

  const {
    state,
    filteredData,
    paginatedData,
    currentPage,
    totalPages,
    uniqueCategories,
    uniqueManufacturers,
    setCategory,
    setManufacturer,
    setMaxPrice,
    setSearchQuery,
    setCurrentPage,
    clearSearch,
    resetFilters
  } = useEquipmentFilters(equipmentData);

  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [showUserSnackbar, setShowUserSnackbar] = useState(false);
  const [showActivitySnackbar, setShowActivitySnackbar] = useState(false);
  const [isFilterSectionExpanded, setIsFilterSectionExpanded] = useState(false);
  const [isKPISectionExpanded, setIsKPISectionExpanded] = useState(false);
  const [isRentalSectionExpanded, setIsRentalSectionExpanded] = useState(false);

  // 섹션 토글 함수들
  const toggleFilterSection = () => setIsFilterSectionExpanded(!isFilterSectionExpanded);
  const toggleKPISection = () => setIsKPISectionExpanded(!isKPISectionExpanded);
  const toggleRentalSection = () => setIsRentalSectionExpanded(!isRentalSectionExpanded);

  // 데이터 디버깅
  useEffect(() => {
    console.group('🔍 장비 목록 디버깅');
    console.log('전체 장비 수:', equipmentData.length);
    console.log('전체 장비 목록:', equipmentData);
    console.log('필터링된 장비 수:', filteredData.length);
    console.log('필터링된 장비 목록:', filteredData);
    console.log('현재 페이지 장비 수:', paginatedData.length);
    console.log('현재 페이지 장비 목록:', paginatedData);
    console.log('현재 필터 상태:', state);
    console.log('현재 페이지:', currentPage, '/ 총 페이지:', totalPages);
    
    // localStorage 데이터 직접 확인
    const storageData = localStorage.getItem('equipmentData');
    const parsedStorageData = storageData ? JSON.parse(storageData) : [];
    console.log('🗃️ localStorage 직접 확인 - 데이터 수:', parsedStorageData.length);
    console.log('🗃️ localStorage 데이터:', parsedStorageData);
    
    if (filteredData.length === 0 && equipmentData.length > 0) {
      console.warn('⚠️ 필터 조건으로 인해 모든 장비가 숨겨졌습니다!');
      console.log('⚠️ 숨겨진 원인 분석:');
      equipmentData.forEach((item, index) => {
        const matchesCategory = state.category === '전체' || item.category === state.category;
        const matchesManufacturer = state.manufacturer === '전체' || item.manufacturer === state.manufacturer;
        const matchesPrice = item.rental <= state.maxPrice;
        const matchesSearch = item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                             item.code.toLowerCase().includes(state.searchQuery.toLowerCase());
        
        console.log(`   ${index}: ${item.name} - 카테고리:${matchesCategory}, 제조사:${matchesManufacturer}, 가격:${matchesPrice}, 검색:${matchesSearch}`);
      });
    }
    console.groupEnd();
  }, [equipmentData, filteredData, paginatedData, state, currentPage, totalPages]);

  // 실시간 사용자 세션 관리
  const { 
    recentActions, 
    notifyUserAction, 
    hasMultipleUsers 
  } = useUserSession();

  const status = { hasMultipleUsers };

  // 장비 상세보기
  const handleViewEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  // 장비 수정
  const handleEditEquipment = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsRegModalOpen(true);
  };

  // 새 장비 등록
  const handleAddEquipment = () => {
    setEditingEquipment(null);
    setIsRegModalOpen(true);
  };

  // 장비 삭제
  const handleDeleteEquipment = (code: string) => {
    const equipment = equipmentData.find(e => e.code === code);
    if (!equipment) return;

    if (confirm(`'${equipment.name}' 장비를 정말로 삭제하시겠습니까?`)) {
      deleteEquipment(code);
      alert('장비가 삭제되었습니다.');
    }
  };

  // 폼 제출
  const handleFormSubmit = (newEquipment: Equipment) => {
    console.log('🔍 [DEBUG] handleFormSubmit 시작');
    console.log('🔍 [DEBUG] newEquipment:', newEquipment);
    console.log('🔍 [DEBUG] editingEquipment:', editingEquipment);
    console.log('🔍 [DEBUG] selectedEquipment:', selectedEquipment);
    
    try {
      // 수정 모드 확인: editingEquipment가 있거나 selectedEquipment가 있으면 수정 모드
      const isEditMode = editingEquipment || selectedEquipment;
      
      if (isEditMode) {
        console.log('🔍 [DEBUG] 장비 수정 모드');
        const originalCode = editingEquipment?.code || selectedEquipment?.code;
        updateEquipment(originalCode!, newEquipment);
        alert('장비 정보가 수정되었습니다.');
        // 사용자 활동 알림
        notifyUserAction(`장비 '${newEquipment.name}' 수정`);
        
        // 수정 완료 후 상세보기 모달로 전환
        setSelectedEquipment(newEquipment);
        setIsRegModalOpen(false);
      } else {
        console.log('🔍 [DEBUG] 새 장비 등록 모드');
        
        // 장비 코드 중복 체크  
        const existingEquipment = equipmentData.find(e => e.code === newEquipment.code);
        console.log('🔍 [DEBUG] 중복 체크 결과:', existingEquipment);
        
        if (existingEquipment) {
          alert('이미 존재하는 장비 코드입니다.');
          return;
        }
        
        // 새 장비 등록 시 등록일시 자동 설정
        const equipmentWithRegistrationDate = {
          ...newEquipment,
          registrationDate: newEquipment.registrationDate || new Date().toISOString().split('T')[0]
        };
        
        console.log('🔍 [DEBUG] 등록할 장비 데이터:', equipmentWithRegistrationDate);
        
        addEquipment(equipmentWithRegistrationDate);
        alert('새 장비가 등록되었습니다.');
        setIsRegModalOpen(false);
      }
      
      console.log('🔍 [DEBUG] 폼 제출 성공');
      setEditingEquipment(null);
    } catch (error) {
      console.error('🚨 [DEBUG] handleFormSubmit 에러:', error);
      alert('장비 처리 중 오류가 발생했습니다: ' + error);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleCloseRegModal = () => {
    setIsRegModalOpen(false);
    setEditingEquipment(null);
  };

  // 첫 사용자 안내 모달 닫기
  const handleCloseFirstTimeGuide = () => {
    setIsFirstRun(false);
    localStorage.setItem('equipment-dashboard-first-visit', 'true');
  };

  // 다중 사용자 감지 시 스낵바 표시
  React.useEffect(() => {
    if (status.hasMultipleUsers && !showUserSnackbar) {
      setShowUserSnackbar(true);
      // 10초 후 자동 숨김
      setTimeout(() => setShowUserSnackbar(false), 10000);
    }
  }, [status.hasMultipleUsers, showUserSnackbar]);

  // 최초 접속 여부 확인 및 설정
  useEffect(() => {
    const hasVisitedEquipmentDashboard = localStorage.getItem('equipment-dashboard-first-visit');
    
    if (!hasVisitedEquipmentDashboard) {
      // 최초 접속이 확실한 경우에만 isFirstRun을 true로 설정
      if (equipmentData.length === 1 && equipmentData[0].code === 'SAMPLE-001') {
        setIsFirstRun(true);
        localStorage.setItem('equipment-dashboard-first-visit', 'true');
      }
    } else {
      setIsFirstRun(false);
    }
  }, [equipmentData]);

  return (
    <div className="w-full bg-stone-100 text-stone-800 font-['Noto_Sans_KR','Inter',sans-serif]">
      {/* 다중 사용자 알림 스낵바 */}
      <TopSnackbar
        isVisible={showUserSnackbar}
        message={`⚠️ 다중 사용자가 동시에 접속중입니다. 데이터 변경 시 주의하세요.`}
        type="warning"
        onClose={() => setShowUserSnackbar(false)}
      />
      
      {/* 실시간 활동 알림 스낵바 */}
      <BottomSnackbar
        isVisible={showActivitySnackbar}
        messages={recentActions}
        onClose={() => setShowActivitySnackbar(false)}
      />

      <div className="container mx-auto p-4 md:p-8">
        {/* 헤더 */}
        <header className="text-left mb-4">
            실시간으로 업데이트되는 장비 재고 및 렌탈 정보를 확인하고 관리하세요.
        </header>

        {/* 장비 관리 섹션 */}
        <EquipmentManagement
          equipmentData={equipmentData}
          logData={logData}
          logArchive={logArchive}
          formFields={formFields}
          onAddEquipment={handleAddEquipment}
          onManageFields={() => setIsManagementModalOpen(true)}
          saveData={saveData}
          saveFormFields={saveFormFields}
          logDetailedChange={logDetailedChange}
          versionHistory={VERSION_HISTORY}
        />

        {/* KPI 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 mb-4">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors duration-200 rounded-t-lg"
            onClick={toggleKPISection}
          >
            <h2 className="text-lg font-semibold text-stone-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              재고 정보
            </h2>
            <div className="text-stone-600 hover:text-stone-900 transition-colors">
              {isKPISectionExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          {isKPISectionExpanded && (
            <div className="p-4 border-t border-stone-200">
              <EquipmentKPISection equipmentData={equipmentData} />
            </div>
          )}
        </div>

        {/* 필터 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 mb-4">
          <div className="p-4 rounded-t-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 16v-4.414L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-semibold text-stone-800">분류 검색</span>
              </div>
              <button
                onClick={toggleFilterSection}
                className="text-stone-600 hover:text-stone-900 transition-colors"
              >
                {isFilterSectionExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            {/* 검색바 */}
            <div className="relative">
              <input
                type="text"
                placeholder="품명 또는 제품 코드로 검색..."
                value={state.searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && !isFilterSectionExpanded) {
                    setIsFilterSectionExpanded(true);
                  }
                }}
                className="w-full rounded-md border-stone-300 shadow-sm p-2 pr-10 text-sm"
              />
              {state.searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="검색 지우기"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {isFilterSectionExpanded && (
            <div className="p-4 border-t border-stone-200">
              <EquipmentFilters
                state={state}
                uniqueCategories={uniqueCategories}
                uniqueManufacturers={uniqueManufacturers}
                onCategoryChange={setCategory}
                onManufacturerChange={setManufacturer}
                onPriceChange={setMaxPrice}
                onResetFilters={resetFilters}
              />
            </div>
          )}
        </div>

        {/* 차트 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 mb-4">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors duration-200 rounded-t-lg"
            onClick={toggleRentalSection}
          >
            <h2 className="text-lg font-semibold text-stone-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
              대여료 및 보증금 구성 비중
            </h2>
            <div className="text-stone-600 hover:text-stone-900 transition-colors">
              {isRentalSectionExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          {isRentalSectionExpanded && (
            <div className="p-4 border-t border-stone-200">
              <EquipmentCharts equipmentData={filteredData} />
            </div>
          )}
        </div>

        {/* 장비 테이블 섹션 */}
        <EquipmentTable
          paginatedData={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          searchQuery={state.searchQuery}
          onPageChange={setCurrentPage}
          onViewEquipment={handleViewEquipment}
          onEditEquipment={handleEditEquipment}
          onDeleteEquipment={handleDeleteEquipment}
        />

        {/* 로그 테이블 섹션 */}
        <EquipmentLogTable
          logData={logData}
          logArchive={logArchive}
        />

        {/* AI 아이디어 섹션 */}
        <AIIdeasSection equipmentData={equipmentData} />

        {/* 상세보기 모달 */}
        {isModalOpen && selectedEquipment && (
          <EquipmentModal
            equipment={selectedEquipment}
            formFields={formFields}
            onClose={handleCloseModal}
            onSubmit={handleFormSubmit}
          />
        )}

        {/* 등록/수정 모달 */}
        {isRegModalOpen && (
          <EquipmentModal
            equipment={editingEquipment}
            formFields={formFields}
            isEditing={true}
            onClose={handleCloseRegModal}
            onSubmit={handleFormSubmit}
          />
        )}

        {/* 필드 관리 모달 */}
        {isManagementModalOpen && (
          <FormFieldManager
            formFields={formFields}
            equipmentData={equipmentData}
            onSaveFormFields={saveFormFields}
            onLogChange={logDetailedChange}
            onClose={() => setIsManagementModalOpen(false)}
          />
        )}

        {/* 첫 사용자 안내 모달 */}
        {isFirstRun && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 text-center">
              <h2 className="text-2xl font-bold text-stone-800 mb-4">
                🎉 크레이지샷 장비 관리 시작하기
              </h2>
              <p className="text-stone-600 mb-4">
                첫 방문을 환영합니다! 아래 단계를 따라 장비 관리를 시작하세요:
              </p>
              <ol className="text-left text-stone-500 list-decimal list-inside mb-4 space-y-2">
                <li>오른쪽 상단의 "새 장비 등록" 버튼을 클릭하세요.</li>
                <li>샘플 데이터를 참고하여 실제 장비 정보를 입력하세요.</li>
                <li>필요한 경우 "양식 항목 관리"로 등록 양식을 커스터마이즈할 수 있습니다.</li>
              </ol>
              <button
                onClick={handleCloseFirstTimeGuide}
                className="w-full bg-teal-500 text-white py-2 rounded-md hover:bg-teal-600"
              >
                시작하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
