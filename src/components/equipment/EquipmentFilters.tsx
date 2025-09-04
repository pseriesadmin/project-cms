import React from 'react';
import { EquipmentState } from '../../types';

interface EquipmentFiltersProps {
  state: EquipmentState;
  uniqueCategories: string[];
  uniqueManufacturers: string[];
  onCategoryChange: (category: string) => void;
  onManufacturerChange: (manufacturer: string) => void;
  onPriceChange: (maxPrice: number) => void;
  onSearchChange: (searchQuery: string) => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}

export const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({
  state,
  uniqueCategories,
  uniqueManufacturers,
  onCategoryChange,
  onManufacturerChange,
  onPriceChange,
  onSearchChange,
  onClearSearch,
  onResetFilters
}) => {
  return (
    <section className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-bold mb-4 text-stone-800">장비 필터</h2>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* 카테고리 필터 */}
        <div>
          <label className="font-semibold text-stone-600">카테고리</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {uniqueCategories.map(category => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors duration-200 ${
                  state.category === category
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 제조사 필터 */}
        <div>
          <label className="font-semibold text-stone-600">제조사</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {uniqueManufacturers.map(manufacturer => (
              <button
                key={manufacturer}
                onClick={() => onManufacturerChange(manufacturer)}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors duration-200 ${
                  state.manufacturer === manufacturer
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                {manufacturer}
              </button>
            ))}
          </div>
        </div>

        {/* 가격 필터 */}
        <div className="flex-grow">
          <label htmlFor="price-range" className="font-semibold text-stone-600">
            일일 렌탈료 (최대 {state.maxPrice.toLocaleString()}원)
          </label>
          <input
            type="range"
            id="price-range"
            min="0"
            max="100000"
            step="1000"
            value={state.maxPrice}
            onChange={(e) => onPriceChange(parseInt(e.target.value))}
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer mt-2"
          />
        </div>
      </div>

      {/* 검색바 */}
      <div className="mt-6">
        <label className="font-semibold text-stone-600">검색</label>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="품명 또는 장비 코드로 검색..."
              value={state.searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-md border-stone-300 shadow-sm p-2 pr-10 text-sm"
            />
            {state.searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="검색 지우기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {state.searchQuery && (
            <button
              onClick={onClearSearch}
              className="px-3 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 transition-colors duration-200 whitespace-nowrap"
              title="전체 목록 보기"
            >
              전체
            </button>
          )}
        </div>
      </div>

      {/* 필터 리셋 버튼 */}
      <div className="mt-4">
        <button
          onClick={onResetFilters}
          className="px-4 py-2 bg-stone-500 text-white text-sm font-medium rounded-md hover:bg-stone-600 transition-colors duration-200"
        >
          필터 초기화
        </button>
      </div>
    </section>
  );
};
