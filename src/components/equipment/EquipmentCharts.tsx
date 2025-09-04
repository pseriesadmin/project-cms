import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Equipment } from '../../types';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface EquipmentChartsProps {
  equipmentData: Equipment[];
}

export const EquipmentCharts: React.FC<EquipmentChartsProps> = ({
  equipmentData
}) => {
  // 카테고리별 재고 데이터
  const categoryChartData = useMemo(() => {
    const categoryData: { [key: string]: number } = {};
    
    equipmentData.forEach(item => {
      if (categoryData[item.category]) {
        categoryData[item.category] += item.totalStock;
      } else {
        categoryData[item.category] = item.totalStock;
      }
    });

    return {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: [
          '#F97316', // orange-500
          '#22C55E', // green-500
          '#3B82F6', // blue-500
          '#8B5CF6', // violet-500
          '#EC4899', // pink-500
          '#EF4444', // red-500
          '#14B8A6', // teal-500
          '#F59E0B', // amber-500
        ],
        hoverOffset: 4
      }]
    };
  }, [equipmentData]);

  // 렌탈료 및 보증금 차트 데이터
  const rentalChartData = useMemo(() => {
    const displayData = equipmentData.slice(0, 8); // 상위 8개만 표시
    
    return {
      labels: displayData.map(item => item.name),
      datasets: [
        {
          label: '일일 렌탈료',
          data: displayData.map(item => item.rental),
          backgroundColor: '#22C55E',
          borderColor: '#15803D',
          borderWidth: 1
        },
        {
          label: '보증금',
          data: displayData.map(item => item.deposit),
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          borderWidth: 1
        }
      ]
    };
  }, [equipmentData]);

  // 차트 옵션
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString() + '원';
          }
        }
      }
    }
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-center text-stone-800">
          카테고리별 재고 현황
        </h2>
        <p className="text-center text-stone-500 mb-4 text-sm">
          각 장비 카테고리가 전체 재고에서 차지하는 비중을 시각적으로 보여줍니다.
        </p>
        <div className="chart-container relative w-full h-80 max-w-md mx-auto">
          {equipmentData.length > 0 ? (
            <Doughnut data={categoryChartData} options={doughnutOptions} />
          ) : (
            <div className="flex items-center justify-center h-full bg-stone-50 rounded-md">
              <p className="text-stone-500">등록된 장비가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-center text-stone-800">
          장비별 렌탈료 및 보증금
        </h2>
        <p className="text-center text-stone-500 mb-4 text-sm">
          선택된 장비들의 일일 렌탈료와 보증금을 비교하여 보여줍니다.
        </p>
        <div className="chart-container relative w-full h-80">
          {equipmentData.length > 0 ? (
            <Bar data={rentalChartData} options={barOptions} />
          ) : (
            <div className="flex items-center justify-center h-full bg-stone-50 rounded-md">
              <p className="text-stone-500">등록된 장비가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
