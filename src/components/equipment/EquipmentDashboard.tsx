import React, { useState } from 'react';
import { useEquipmentData } from '../../hooks/useEquipmentData';
import { useEquipmentFilters } from '../../hooks/useEquipmentFilters';
import { EquipmentKPISection } from './EquipmentKPISection';
import { EquipmentFilters } from './EquipmentFilters';
import { EquipmentCharts } from './EquipmentCharts';
import { EquipmentTable } from './EquipmentTable';
import { EquipmentLogTable } from './EquipmentLogTable';
import { EquipmentModal } from './EquipmentModal';
import { EquipmentManagement } from './EquipmentManagement';
import { AIIdeasSection } from './AIIdeasSection';
import { FormFieldManager } from './FormFieldManager';
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
    if (editingEquipment) {
      updateEquipment(editingEquipment.code, newEquipment);
      alert('장비 정보가 수정되었습니다.');
    } else {
      // 장비 코드 중복 체크  
      const existingEquipment = equipmentData.find(e => e.code === newEquipment.code);
      if (existingEquipment) {
        alert('이미 존재하는 장비 코드입니다.');
        return;
      }
      
      // 새 장비 등록 시 등록일시 자동 설정
      const equipmentWithRegistrationDate = {
        ...newEquipment,
        registrationDate: newEquipment.registrationDate || new Date().toISOString().split('T')[0]
      };
      
      addEquipment(equipmentWithRegistrationDate);
      alert('새 장비가 등록되었습니다.');
    }
    setIsRegModalOpen(false);
    setEditingEquipment(null);
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
  };

  return (
    <div className="w-full bg-stone-100 text-stone-800 font-['Noto_Sans_KR','Inter',sans-serif]">
      <div className="container mx-auto p-4 md:p-8">
        {/* 헤더 */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
            크레이지샷 장비 현황 대시보드
          </h1>
          <p className="mt-2 text-stone-600">
            실시간으로 업데이트되는 장비 재고 및 렌탈 정보를 확인하고 관리하세요.
          </p>
        </header>

        {/* KPI 섹션 */}
        <EquipmentKPISection equipmentData={equipmentData} />

        {/* 필터 섹션 */}
        <EquipmentFilters
          state={state}
          uniqueCategories={uniqueCategories}
          uniqueManufacturers={uniqueManufacturers}
          onCategoryChange={setCategory}
          onManufacturerChange={setManufacturer}
          onPriceChange={setMaxPrice}
          onSearchChange={setSearchQuery}
          onClearSearch={clearSearch}
          onResetFilters={resetFilters}
        />

        {/* 차트 섹션 */}
        <EquipmentCharts equipmentData={filteredData} />

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
