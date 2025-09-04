import { useState, useMemo, useCallback } from 'react';
import { Equipment, EquipmentState } from '../types';

export const useEquipmentFilters = (equipmentData: Equipment[]) => {
  const [state, setState] = useState<EquipmentState>({
    category: '전체',
    manufacturer: '전체',
    maxPrice: 100000,
    searchQuery: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return equipmentData.filter(item => {
      const matchesCategory = state.category === '전체' || item.category === state.category;
      const matchesManufacturer = state.manufacturer === '전체' || item.manufacturer === state.manufacturer;
      const matchesPrice = item.rental <= state.maxPrice;
      const matchesSearch = item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                           item.code.toLowerCase().includes(state.searchQuery.toLowerCase());
      
      return matchesCategory && matchesManufacturer && matchesPrice && matchesSearch;
    }).reverse(); // 최근 등록 순서로 정렬
  }, [equipmentData, state]);

  // 페이지네이션 데이터
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  // 총 페이지 수
  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / itemsPerPage);
  }, [filteredData.length]);

  // 고유 카테고리 목록
  const uniqueCategories = useMemo(() => {
    return ['전체', ...new Set(equipmentData.map(e => e.category))];
  }, [equipmentData]);

  // 고유 제조사 목록
  const uniqueManufacturers = useMemo(() => {
    return ['전체', ...new Set(equipmentData.map(e => e.manufacturer))];
  }, [equipmentData]);

  // 카테고리 필터 업데이트
  const setCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, category }));
    setCurrentPage(1);
  }, []);

  // 제조사 필터 업데이트
  const setManufacturer = useCallback((manufacturer: string) => {
    setState(prev => ({ ...prev, manufacturer }));
    setCurrentPage(1);
  }, []);

  // 가격 필터 업데이트
  const setMaxPrice = useCallback((maxPrice: number) => {
    setState(prev => ({ ...prev, maxPrice }));
    setCurrentPage(1);
  }, []);

  // 검색 쿼리 업데이트
  const setSearchQuery = useCallback((searchQuery: string) => {
    setState(prev => ({ ...prev, searchQuery }));
    setCurrentPage(1);
  }, []);

  // 검색 초기화
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  // 모든 필터 초기화
  const resetFilters = useCallback(() => {
    setState({
      category: '전체',
      manufacturer: '전체',
      maxPrice: 100000,
      searchQuery: ''
    });
    setCurrentPage(1);
  }, []);

  return {
    state,
    filteredData,
    paginatedData,
    currentPage,
    totalPages,
    itemsPerPage,
    uniqueCategories,
    uniqueManufacturers,
    setCategory,
    setManufacturer,
    setMaxPrice,
    setSearchQuery,
    setCurrentPage,
    clearSearch,
    resetFilters
  };
};
