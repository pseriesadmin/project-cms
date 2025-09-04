import React from 'react';
import { Equipment } from '../../types';

interface EquipmentTableProps {
  paginatedData: Equipment[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  searchQuery: string;
  onPageChange: (page: number) => void;
  onViewEquipment: (equipment: Equipment) => void;
  onEditEquipment: (equipment: Equipment) => void;
  onDeleteEquipment: (code: string) => void;
}

export const EquipmentTable: React.FC<EquipmentTableProps> = ({
  paginatedData,
  currentPage,
  totalPages,
  totalItems,
  searchQuery,
  onPageChange,
  onViewEquipment,
  onEditEquipment,
  onDeleteEquipment
}) => {
  return (
    <section className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-bold text-stone-800 mb-4">장비 목록</h2>
      
      <p className="text-stone-500 mb-4 text-sm">
        {searchQuery ? (
          <span className="text-blue-600 font-medium">
            "{searchQuery}" 검색 결과 (총 {totalItems}개)
          </span>
        ) : (
          <span>
            아래 목록에서 장비를 클릭하면 상세 정보를 확인할 수 있습니다. 수정/삭제 버튼으로 관리도 가능합니다.
          </span>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                등록일시
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                품명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                렌탈료(일)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                가용 재고
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {paginatedData.length > 0 ? (
              paginatedData.map(item => (
                <tr 
                  key={item.code}
                  className="hover:bg-stone-50 transition-colors duration-150 cursor-pointer"
                  onClick={() => onViewEquipment(item)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {item.registrationDate ? 
                      new Date(item.registrationDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }).replace(/\./g, '.').replace(/\s/g, '') :
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {item.rental.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {item.availableStock} / {item.totalStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEquipment(item);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEquipment(item.code);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                  선택한 조건에 맞는 장비가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-4">
            <span className="text-sm text-stone-500 mr-4">
              총 {totalItems}개 장비
            </span>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  page === currentPage
                    ? 'bg-teal-500 text-white'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
