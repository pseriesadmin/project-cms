import React from 'react';
import { Equipment } from '../../types';

interface EquipmentKPISectionProps {
  equipmentData: Equipment[];
}

export const EquipmentKPISection: React.FC<EquipmentKPISectionProps> = ({
  equipmentData
}) => {
  const totalTypes = new Set(equipmentData.map(e => e.name)).size;
  const totalStock = equipmentData.reduce((sum, e) => sum + e.totalStock, 0);
  const totalAvailable = equipmentData.reduce((sum, e) => sum + e.availableStock, 0);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <h3 className="text-lg font-semibold text-stone-500">총 장비 종류</h3>
        <p className="text-4xl font-bold text-teal-600 mt-2">
          {totalTypes.toLocaleString()}
        </p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <h3 className="text-lg font-semibold text-stone-500">총 보유 재고</h3>
        <p className="text-4xl font-bold text-teal-600 mt-2">
          {totalStock.toLocaleString()}
        </p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <h3 className="text-lg font-semibold text-stone-500">현재 대여 가능 재고</h3>
        <p className="text-4xl font-bold text-teal-600 mt-2">
          {totalAvailable.toLocaleString()}
        </p>
      </div>
    </section>
  );
};
