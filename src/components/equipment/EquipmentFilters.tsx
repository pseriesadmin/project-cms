import React from 'react';
import { EquipmentState } from '../../types';

interface EquipmentFiltersProps {
  state: EquipmentState;
  uniqueCategories: string[];
  uniqueManufacturers: string[];
  onCategoryChange: (category: string) => void;
  onManufacturerChange: (manufacturer: string) => void;
  onPriceChange: (maxPrice: number) => void;
  onResetFilters: () => void;
}

export const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({
  state,
  uniqueCategories,
  uniqueManufacturers,
  onCategoryChange,
  onManufacturerChange,
  onPriceChange,
  onResetFilters
}) => {
  return (
    <section>
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

      {/* 필터 리셋 버튼 */}
      <div className="mt-6">
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

